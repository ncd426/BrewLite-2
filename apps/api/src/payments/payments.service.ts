
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { awardLoyaltyPointsOnce, VND_PER_REDEEMED_POINT } from './loyalty-points';
import {
  OrderStatus,
  OrderChannel,
  Payment,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { transitionOrderStatus } from '../orders/order-state-machine';
import {
  createVnpayPaymentUrl,
  verifyVnpaySignature,
  type VnpayParams,
} from './payment-gateways';

export type PaymentMethod = 'VNPAY';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private expiryTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.expirePendingPayments().catch((error: unknown) =>
      this.logger.error('Initial payment expiry sweep failed', error),
    );
    this.expiryTimer = setInterval(() => {
      void this.expirePendingPayments().catch((error: unknown) =>
        this.logger.error('Payment expiry sweep failed', error),
      );
    }, 15000);
    this.expiryTimer.unref();
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  private async expirePendingPayments(now = new Date()) {
    const expired = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: { lte: now },
      },
      select: { id: true },
    });

    for (const { id } of expired) {
      await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { id } });
        if (
          !payment ||
          payment.status !== PaymentStatus.PENDING ||
          !payment.expiresAt ||
          payment.expiresAt > now
        ) {
          return;
        }

        const claimed = await tx.payment.updateMany({
          where: {
            id,
            status: PaymentStatus.PENDING,
            expiresAt: { lte: now },
          },
          data: { status: PaymentStatus.FAILED },
        });
        if (claimed.count !== 1) return;

        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { status: true },
        });
        if (
          order?.status === OrderStatus.PENDING ||
          order?.status === OrderStatus.PAYMENT_FAILED
        ) {
          await transitionOrderStatus(tx, payment.orderId, OrderStatus.CANCELLED);
        }
      });
    }
  }

  private formatPayment(payment: Payment) {
    const status: OrderStatus =
      payment.status === PaymentStatus.SUCCESS
        ? OrderStatus.PAID
        : payment.status === PaymentStatus.FAILED
          ? OrderStatus.PAYMENT_FAILED
          : OrderStatus.PENDING;

    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      pointsUsed: payment.pointsUsed ?? 0,
      method: payment.method,
      idempotencyKey: payment.idempotencyKey,
      status,
      paymentStatus: payment.status,
      paymentReference: `PAY-${payment.id}`,
      checkoutUrl: payment.checkoutUrl,
      expiresAt: payment.expiresAt,
    };
  }

  private getPaymentTtlMinutes(): number {
    const minutes = Number(process.env.PAYMENT_TTL_MINUTES ?? 15);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
      throw new BadRequestException('PAYMENT_TTL_MINUTES must be between 1 and 60');
    }
    return minutes;
  }

  private async createPaymentSession(payment: Payment, clientIp: string) {
    if (payment.status !== PaymentStatus.PENDING || payment.checkoutUrl) {
      return this.formatPayment(payment);
    }

    const expiresAt = payment.expiresAt ?? new Date(
      Date.now() + this.getPaymentTtlMinutes() * 60_000,
    );
    const providerReference = String(payment.id);
    const preparedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerReference, expiresAt },
    });
    const sessionPayment = { ...preparedPayment, expiresAt };

    try {
      const checkoutUrl = createVnpayPaymentUrl(
        sessionPayment,
        clientIp,
        {
          tmnCode: process.env.VNPAY_TMN_CODE ?? '',
          hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
          payUrl: process.env.VNPAY_PAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          returnUrl: `${process.env.PAYMENT_WEB_PUBLIC_URL ?? 'http://localhost:3000'}/checkout/qr`,
        },
      );

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutUrl },
      });
      return this.formatPayment(updatedPayment);
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
        });
        if (!current || current.status !== PaymentStatus.PENDING) return;

        await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.FAILED },
        });
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { status: true },
        });
        if (order?.status === OrderStatus.PENDING) {
          await transitionOrderStatus(
            tx,
            payment.orderId,
            OrderStatus.PAYMENT_FAILED,
          );
        }
      });
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Payment provider unavailable',
      );
    }
  }

  async handleVnpayIpn(params: VnpayParams) {
    const secret = process.env.VNPAY_HASH_SECRET ?? '';
    if (
      !secret ||
      !verifyVnpaySignature(params, secret) ||
      params.vnp_TmnCode !== process.env.VNPAY_TMN_CODE
    ) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const reference = params.vnp_TxnRef;
    if (typeof reference !== 'string') {
      return { RspCode: '01', Message: 'Order not found' };
    }
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference: reference },
    });
    if (!payment || payment.method !== 'VNPAY') {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (Number(params.vnp_Amount) !== payment.amount * 100) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    const result = await this.settleProviderPayment(
      payment.id,
      params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00',
    );
    if (result === 'expired') {
      return { RspCode: '02', Message: 'Payment expired' };
    }
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async settleProviderPayment(paymentId: number, succeeded: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status !== PaymentStatus.PENDING) return 'duplicate';

      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true, userId: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      const expired = !payment.expiresAt || payment.expiresAt <= new Date();
      const nextPaymentStatus = succeeded && !expired
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: nextPaymentStatus },
      });
      if (claimed.count !== 1) return 'duplicate';

      if (expired) {
        if (
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.PAYMENT_FAILED
        ) {
          await transitionOrderStatus(tx, payment.orderId, OrderStatus.CANCELLED);
        }
        return 'expired';
      }

      if (succeeded) {
        if (payment.pointsUsed > 0) {
          const debit = await tx.user.updateMany({
            where: {
              id: order.userId,
              loyaltyPoints: { gte: payment.pointsUsed },
            },
            data: { loyaltyPoints: { decrement: payment.pointsUsed } },
          });
          if (debit.count !== 1) {
            throw new ConflictException('Insufficient loyalty points at settlement');
          }
        }
        await transitionOrderStatus(tx, payment.orderId, OrderStatus.PAID);
        await awardLoyaltyPointsOnce(tx, payment.orderId, payment.amount);
      } else if (order.status === OrderStatus.PENDING) {
        await transitionOrderStatus(tx, payment.orderId, OrderStatus.PAYMENT_FAILED);
      }

      return 'updated';
    });
  }

  async processPayment(
    userId: number,
    orderId: number,
    amount: number | undefined,
    method: PaymentMethod,
    idempotencyKey: string,
    pointsToRedeem = 0,
    clientIp = '127.0.0.1',
  ) {
    // Nếu client không gửi key, tự sinh key.
    // Để đảm bảo idempotency khi retry, client nên gửi key.
    const key = idempotencyKey.trim();

    if (!Number.isSafeInteger(pointsToRedeem) || pointsToRedeem < 0) {
      throw new BadRequestException('Invalid loyalty points');
    }

    if (!key || key.length > 128) {
      throw new BadRequestException(
        'Invalid Idempotency-Key',
      );
    }

    if (!key.trim()) {
      throw new BadRequestException(
        'Idempotency key is required',
      );
    }

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            userId: true,
            total: true,
            status: true,
            channel: true,
          },
        });

        if (!order) {
          throw new NotFoundException(
            `Order ${orderId} not found`,
          );
        }

        if (order.channel === OrderChannel.COUNTER) {
          throw new ForbiddenException('Counter sales are managed by staff');
        }

        if (order.userId !== userId) {
          throw new ForbiddenException(
            'You cannot pay for this order',
          );
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException('Order is not payable');
        }

        // Luôn dùng tổng tiền từ database.
        const loyaltyDiscount = pointsToRedeem * VND_PER_REDEEMED_POINT;
        if (!Number.isSafeInteger(loyaltyDiscount) || loyaltyDiscount > order.total) {
          throw new BadRequestException('Redeemed points exceed order total');
        }

        const expectedAmount = order.total - loyaltyDiscount;
        const paymentAmount = amount ?? expectedAmount;

        if (pointsToRedeem > 0) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { loyaltyPoints: true },
          });
          if (!user || user.loyaltyPoints < pointsToRedeem) {
            throw new BadRequestException('Insufficient loyalty points');
          }
        }

        // Kiểm tra giao dịch có cùng idempotency key.
        const existing = await tx.payment.findUnique({
          where: { idempotencyKey: key },
        });

        if (existing) {
          return this.replayExistingPayment(
            existing,
            orderId,
            amount,
            method,
            pointsToRedeem,
          );
        }

        const activePayment = await tx.payment.findFirst({
          where: {
            orderId,
            status: PaymentStatus.PENDING,
          },
        });
        if (activePayment) {
          const matchingPayment = this.replayExistingPayment(
            activePayment,
            orderId,
            amount,
            method,
            pointsToRedeem,
          );
          if (!matchingPayment.checkoutUrl) {
            throw new ConflictException('Payment session is still being prepared; retry shortly');
          }
          return matchingPayment;
        }

        // Không tin số tiền do frontend gửi.
        if (paymentAmount !== expectedAmount) {
          throw new BadRequestException(
            'Payment amount does not match order total',
          );
        }

        // Ghi Payment PENDING trong transaction.
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: expectedAmount,
            pointsUsed: pointsToRedeem,
            method,
            idempotencyKey: key,
            status: PaymentStatus.PENDING,
            expiresAt: new Date(
              Date.now() + this.getPaymentTtlMinutes() * 60_000,
            ),
          },
        });

        // Thanh toán thất bại trước đó:
        // PAYMENT_FAILED -> PENDING
        if (order.status === OrderStatus.PAYMENT_FAILED) {
          await transitionOrderStatus(
            tx,
            order.id,
            OrderStatus.PENDING,
          );
        }

        return payment;
      });
      return this.createPaymentSession(payment, clientIp);
    } catch (error) {
      // Xử lý unique constraint khi hai request
      // dùng cùng idempotency key đồng thời.
      
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.payment.findUnique({
          where: { idempotencyKey: key },
        });

        if (existing) {
          return this.createPaymentSession(
            this.replayExistingPayment(
              existing,
              orderId,
              amount,
              method,
              pointsToRedeem,
            ),
            clientIp,
          );
        }

        throw new ConflictException('An active payment already exists for this order');
      }

      throw error;

    }
  }

  
  private replayExistingPayment(
  payment: Payment,
  orderId: number,
  amount: number | undefined,
  method: PaymentMethod,
  pointsToRedeem: number,
) {
  if (
    payment.orderId !== orderId ||
    (amount !== undefined && payment.amount !== amount) ||
    payment.method !== method ||
    (payment.pointsUsed ?? 0) !== pointsToRedeem
  ) {
    throw new ConflictException(
      'Idempotency-Key reused with different payment data',
    );
  }

  return payment;
}

}
