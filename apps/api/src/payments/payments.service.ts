
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

export type PaymentMethod = 'MOMO' | 'CARD';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    };
  }

  async processPayment(
    userId: number,
    orderId: number,
    amount: number | undefined,
    method: PaymentMethod,
    idempotencyKey: string,
    simulateFailure = false,
    pointsToRedeem = 0,
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

    if (
      simulateFailure &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new BadRequestException(
        'Payment simulation is disabled in production',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
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

        // Luôn dùng tổng tiền từ database.
        const loyaltyDiscount = pointsToRedeem * VND_PER_REDEEMED_POINT;
        if (!Number.isSafeInteger(loyaltyDiscount) || loyaltyDiscount > order.total) {
          throw new BadRequestException('Redeemed points exceed order total');
        }

        const expectedAmount = order.total - loyaltyDiscount;
        const paymentAmount = amount ?? expectedAmount;

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
            simulateFailure,
            pointsToRedeem,
          );
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

        const nextStatus = simulateFailure
          ? OrderStatus.PAYMENT_FAILED
          : OrderStatus.PAID;

        const nextPaymentStatus = simulateFailure
          ? PaymentStatus.FAILED
          : PaymentStatus.SUCCESS;

        // State Machine kiểm tra chuyển trạng thái.
        await transitionOrderStatus(
          tx,
          order.id,
          nextStatus,
        );

        if (nextStatus === OrderStatus.PAID) {
          if (pointsToRedeem > 0) {
            const debit = await tx.user.updateMany({
              where: {
                id: userId,
                loyaltyPoints: { gte: pointsToRedeem },
              },
              data: {
                loyaltyPoints: { decrement: pointsToRedeem },
              },
            });
            if (debit.count !== 1) {
              throw new BadRequestException('Insufficient loyalty points');
            }
          }
          await awardLoyaltyPointsOnce(tx, order.id, expectedAmount);
        }

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: nextPaymentStatus,
          },
        });

        return this.formatPayment(updatedPayment);
      });
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
          return this.replayExistingPayment(
            existing,
            orderId,
            amount,
            method,
            simulateFailure,
            pointsToRedeem,
          );
        }

        throw new ConflictException(
          'Idempotency-Key already exists',
        );
      }

      throw error;

    }
  }

  
private replayExistingPayment(
  payment: Payment,
  orderId: number,
  amount: number | undefined,
  method: PaymentMethod,
  simulateFailure: boolean,
  pointsToRedeem: number,
) {
  const expectedStatus = simulateFailure
    ? PaymentStatus.FAILED
    : PaymentStatus.SUCCESS;

  if (
    payment.orderId !== orderId ||
    (amount !== undefined && payment.amount !== amount) ||
    payment.method !== method ||
    payment.status !== expectedStatus ||
    (payment.pointsUsed ?? 0) !== pointsToRedeem
  ) {
    throw new ConflictException(
      'Idempotency-Key reused with different payment data',
    );
  }

  return this.formatPayment(payment);
}

}
