
import { createHmac } from 'node:crypto';
import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  OrderStatus,
  Payment,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

type TestOrder = {
  id: number;
  userId: number;
  total: number;
  status: OrderStatus;
  loyaltyAwardedAt: Date | null;
  items: Array<{ productId: number; qty: number }>;
  payments: Array<{ amount: number; method: string }>;
};

describe('PaymentsService State Machine integration', () => {
  let order: TestOrder;
  let nextPaymentId: number;

  const payments = new Map<string, Payment>();

  const findOrder = jest.fn<
    (args: { where: { id: number } }) =>
      Promise<TestOrder | null>
  >();

  const updateOrder = jest.fn<
    (args: {
      where: { id: number; status: OrderStatus; loyaltyAwardedAt?: Date | null };
      data: { status?: OrderStatus; loyaltyAwardedAt?: Date };
    }) => Promise<{ count: number }>
  >();

  const findPayment = jest.fn<
    (args: {
      where: { id?: number; idempotencyKey?: string; providerReference?: string };
    }) => Promise<Payment | null>
  >();

  const createPayment = jest.fn<
    (args: {
      data: Pick<
        Payment,
        'orderId' | 'amount' | 'method' |
        'idempotencyKey' | 'status' | 'expiresAt'
      >;
    }) => Promise<Payment>
  >();

  const updatePayment = jest.fn<
    (args: {
      where: { id: number };
      data: Partial<Pick<Payment, 'status' | 'providerReference' | 'checkoutUrl' | 'expiresAt'>>;
    }) => Promise<Payment>
  >();

  const tx = {
    order: {
      findUnique: findOrder,
      updateMany: updateOrder,
    },
    payment: {
      findUnique: findPayment,
      findFirst: jest.fn(async ({ where }: { where: { orderId: number; status: PaymentStatus } }) =>
        [...payments.values()].find((payment) =>
          payment.orderId === where.orderId && payment.status === where.status,
        ) ?? null,
      ),
      create: createPayment,
      update: updatePayment,
      updateMany: jest.fn(async (args: {
        where: {
          id?: number;
          orderId?: number;
          status: PaymentStatus;
          expiresAt?: { lte: Date };
        };
        data: { status: PaymentStatus };
      }) => {
        const matching = [...payments.values()].filter((item) =>
          (args.where.id === undefined || item.id === args.where.id) &&
          (args.where.orderId === undefined || item.orderId === args.where.orderId) &&
          item.status === args.where.status &&
          (!args.where.expiresAt || (item.expiresAt !== null && item.expiresAt <= args.where.expiresAt.lte)),
        );
        for (const payment of matching) {
          payments.set(payment.idempotencyKey, {
            ...payment,
            status: args.data.status,
          });
        }
        return { count: matching.length };
      }),
    },
    productIngredient: {
      findMany: jest.fn(async () => [
        { productId: 3, ingredientId: 4, quantity: 5 },
      ]),
    },
    ingredient: {
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    user: {
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
    },
  };

  const transaction = jest.fn<
    (
      callback: (client: typeof tx) => Promise<unknown>,
    ) => Promise<unknown>
  >();

  const findExpiredPayments = jest.fn(async () =>
    [...payments.values()]
      .filter((payment) =>
        payment.status === PaymentStatus.PENDING &&
        payment.expiresAt !== null &&
        payment.expiresAt <= new Date(),
      )
      .map(({ id }) => ({ id })),
  );

  const prisma = {
    $transaction: transaction,
    payment: {
      findUnique: findPayment,
      findMany: findExpiredPayments,
      update: updatePayment,
    },
  };

  const service = new PaymentsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    payments.clear();
    nextPaymentId = 1;

    order = {
      id: 8,
      userId: 7,
      total: 94000,
      status: OrderStatus.PENDING,
      loyaltyAwardedAt: null,
      items: [{ productId: 3, qty: 1 }],
      payments: [],
    };

    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'sandbox-secret';

    transaction.mockImplementation(
      async (callback) => callback(tx),
    );

    findOrder.mockImplementation(async ({ where }) =>
      where.id === order.id ? order : null,
    );

    updateOrder.mockImplementation(async ({ where, data }) => {
      if (
        where.id !== order.id ||
        where.status !== order.status ||
        ('loyaltyAwardedAt' in where && where.loyaltyAwardedAt !== order.loyaltyAwardedAt)
      ) {
        return { count: 0 };
      }

      if (data.status) order.status = data.status;
      if (data.loyaltyAwardedAt) order.loyaltyAwardedAt = data.loyaltyAwardedAt;
      return { count: 1 };
    });

    findPayment.mockImplementation(async ({ where }) =>
      [...payments.values()].find((payment) =>
        (where.id !== undefined && payment.id === where.id) ||
        (where.idempotencyKey !== undefined && payment.idempotencyKey === where.idempotencyKey) ||
        (where.providerReference !== undefined && payment.providerReference === where.providerReference),
      ) ?? null,
    );

    createPayment.mockImplementation(async ({ data }) => {
      const payment: Payment = {
        id: nextPaymentId++,
        ...data,
        providerReference: null,
        checkoutUrl: null,
        expiresAt: null,
        pointsUsed: 0,
        createdAt: new Date(),
      };

      payments.set(payment.idempotencyKey, payment);
      return payment;
    });

    updatePayment.mockImplementation(async ({ where, data }) => {
      const payment = [...payments.values()].find(
        (item) => item.id === where.id,
      );

      if (!payment) {
        throw new Error('Payment not found');
      }

      const updated = {
        ...payment,
        ...data,
      };

      payments.set(updated.idempotencyKey, updated);
      return updated;
    });
  });

  function signedVnpayIpn(overrides: Record<string, string> = {}) {
    const params = {
      vnp_Amount: '9400000',
      vnp_Command: 'pay',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: '1',
      vnp_TransactionStatus: '00',
      ...overrides,
    };
    const canonical = new URLSearchParams(
      Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
    ).toString();
    return {
      ...params,
      vnp_SecureHash: createHmac('sha512', 'sandbox-secret')
        .update(canonical, 'utf8')
        .digest('hex'),
    };
  }

  it('creates a pending payment and leaves the order pending', async () => {
    const result = await service.processPayment(
      7, 8, 94000, 'VNPAY', 'pay-success',
    );

    expect(result.status).toBe(OrderStatus.PENDING);
    expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(result.checkoutUrl).toContain('vnp_SecureHash=');
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(updateOrder).not.toHaveBeenCalled();
  });

  it('marks an order paid only after a valid VNPay IPN', async () => {
    await service.processPayment(7, 8, 94000, 'VNPAY', 'ipn-success');

    const result = await service.handleVnpayIpn(signedVnpayIpn());

    expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(order.status).toBe(OrderStatus.PAID);
    expect([...payments.values()][0].status).toBe(PaymentStatus.SUCCESS);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid VNPay signatures before looking up or changing a payment', async () => {
    const result = await service.handleVnpayIpn({
      ...signedVnpayIpn(),
      vnp_SecureHash: '0'.repeat(128),
    });

    expect(result).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    expect(findPayment).not.toHaveBeenCalled();
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('expires the QR and cancels the order when an IPN arrives after expiry', async () => {
    await service.processPayment(7, 8, 94000, 'VNPAY', 'ipn-expired');
    await updatePayment({
      where: { id: 1 },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await service.handleVnpayIpn(signedVnpayIpn());

    expect(result).toEqual({ RspCode: '02', Message: 'Payment expired' });
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect([...payments.values()][0].status).toBe(PaymentStatus.FAILED);
  });

  it('automatically cancels pending orders during the expiry sweep', async () => {
    await service.processPayment(7, 8, 94000, 'VNPAY', 'sweep-expired');
    await updatePayment({
      where: { id: 1 },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await (service as unknown as { expirePendingPayments: () => Promise<void> })
      .expirePendingPayments();

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect([...payments.values()][0].status).toBe(PaymentStatus.FAILED);
  });

  it('blocks invalid payment transition', async () => {
    order.status = OrderStatus.READY;

    await expect(
      service.processPayment(
        7, 8, 94000, 'VNPAY', 'pay-invalid',
      ),
    ).rejects.toThrow(ConflictException);

    expect(order.status).toBe(OrderStatus.READY);
  });

  it('returns same payment for same idempotency key', async () => {
    const first = await service.processPayment(
      7, 8, 94000, 'VNPAY', 'same-key',
    );

    const second = await service.processPayment(
      7, 8, 94000, 'VNPAY', 'same-key',
    );

    expect(second).toEqual(first);
    expect(createPayment).toHaveBeenCalledTimes(1);
  });

  it('reuses the existing active session when a new tab has a fresh idempotency key', async () => {
    const first = await service.processPayment(7, 8, 94000, 'VNPAY', 'active-first');
    const replay = await service.processPayment(7, 8, 94000, 'VNPAY', 'active-second');

    expect(replay).toEqual(first);
    expect(createPayment).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a pending session with a different amount', async () => {
    await service.processPayment(7, 8, 94000, 'VNPAY', 'active-first');

    await expect(
      service.processPayment(7, 8, 93000, 'VNPAY', 'active-second'),
    ).rejects.toThrow(ConflictException);

    expect(createPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects a payment amount mismatch', async () => {
    await expect(
      service.processPayment(
        7, 8, 1, 'VNPAY', 'wrong-amount',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(createPayment).not.toHaveBeenCalled();
  });
});
