import { RolesGuard } from '../common/guards/roles.guard';

import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { jest } from '@jest/globals';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

type MockOrder = {
  id: number;
  userId: number;
  total: number;
  status: OrderStatus;
};

type MockPayment = {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: PaymentStatus;
  idempotencyKey: string;
  providerReference: string | null;
  checkoutUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

describe('POST /payments', () => {
  let app: INestApplication;
  let order: MockOrder | null;
  let nextPaymentId = 9;

  const payments = new Map<string, MockPayment>();

  const tx = {
    order: {
      findUnique: jest.fn(
        async (args: { where: { id: number } }) => {
          if (!order || order.id !== args.where.id) {
            return null;
          }

          return { ...order };
        },
      ),

      updateMany: jest.fn(
        async (args: {
          where: {
            id: number;
            status: OrderStatus;
          };
          data: {
            status: OrderStatus;
          };
        }) => {
          if (
            !order ||
            order.id !== args.where.id ||
            order.status !== args.where.status
          ) {
            return { count: 0 };
          }

          order.status = args.data.status;
          return { count: 1 };
        },
      ),
    },

    payment: {
      findUnique: jest.fn(
        async (args: {
          where: { idempotencyKey: string };
        }) =>
          payments.get(args.where.idempotencyKey) ?? null,
      ),
      findFirst: jest.fn(async (args: { where: { orderId: number; status: PaymentStatus } }) =>
        [...payments.values()].find((payment) =>
          payment.orderId === args.where.orderId && payment.status === args.where.status,
        ) ?? null,
      ),

      create: jest.fn(
        async (args: {
          data: {
            orderId: number;
            amount: number;
            method: string;
            status: PaymentStatus;
            idempotencyKey: string;
            expiresAt: Date;
          };
        }) => {
          const payment: MockPayment = {
            id: nextPaymentId++,
            ...args.data,
            providerReference: null,
            checkoutUrl: null,
            createdAt: new Date(),
          };

          payments.set(payment.idempotencyKey, payment);
          return payment;
        },
      ),

      update: jest.fn(
        async (args: {
          where: { id: number };
          data: Partial<Pick<MockPayment, 'status' | 'providerReference' | 'checkoutUrl' | 'expiresAt'>>;
        }) => {
          const payment = [...payments.values()].find(
            (p) => p.id === args.where.id,
          );

          if (!payment) {
            throw new Error('Payment not found');
          }

          const updated = {
            ...payment,
            ...args.data,
          };

          payments.set(updated.idempotencyKey, updated);
          return updated;
        },
      ),
    },
  };

  const prismaMock = {
    $transaction: async <T>(
      callback: (client: typeof tx) => Promise<T>,
    ): Promise<T> => {
      const oldOrder = order ? { ...order } : null;
      const oldPayments = new Map(payments);

      try {
        return await callback(tx);
      } catch (error) {
        // Mock rollback khi transaction thất bại.
        order = oldOrder;
        payments.clear();

        for (const [key, payment] of oldPayments) {
          payments.set(key, payment);
        }

        throw error;
      }
    },

    payment: {
      findUnique: tx.payment.findUnique,
      findMany: jest.fn(async () => []),
      update: tx.payment.update,
    },
  };

  beforeAll(async () => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'sandbox-secret';

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{ user?: { userId: number } }>();

          req.user = { userId: 7 };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    payments.clear();
    nextPaymentId = 9;

    order = {
      id: 42,
      userId: 7,
      total: 94000,
      status: OrderStatus.PENDING,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a pending payment without marking the order paid', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', 'test-success-001')
      .send({
        orderId: 42,
        method: 'VNPAY',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 9,
      orderId: 42,
      amount: 94000,
      method: 'VNPAY',
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    expect(order?.status).toBe(OrderStatus.PENDING);
    expect(payments.size).toBe(1);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('does not let a client simulation flag settle a payment', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', 'test-payment-failed-001')
      .send({
        orderId: 42,
        method: 'VNPAY',
        simulateFailure: true,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      orderId: 42,
      amount: 94000,
      method: 'VNPAY',
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    expect(order?.status).toBe(OrderStatus.PENDING);

    expect(payments.size).toBe(1);
  });


  it('rejects unknown and non-pending orders without recording a payment', async () => {
    order = null;

    // Test 1: Đơn hàng không tồn tại -> HTTP 404
    await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', 'test-order-not-found-001')
      .send({
        orderId: 42,
        method: 'VNPAY',
      })
      .expect(404);

    expect(tx.payment.create).not.toHaveBeenCalled();

    // Test 2: Đơn hàng đã COMPLETED -> HTTP 409
    order = {
      id: 42,
      userId: 7,
      total: 94000,
      status: OrderStatus.COMPLETED,
    };

    await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', 'test-order-completed-001')
      .send({
        orderId: 42,
        method: 'VNPAY',
      })
      .expect(409);

    // Đơn hàng không bị thay đổi trạng thái
    expect(order.status).toBe(OrderStatus.COMPLETED);

    // Không tạo bất kỳ Payment nào
    expect(payments.size).toBe(0);
  });


  it('rejects malformed payment requests', async () => {
    const invalidRequests = [
      { orderId: 0, method: 'MOMO' },
      { orderId: 42, method: 'CASH' },
      { orderId: 'abc', method: 'VNPAY' },
      { method: 'MOMO' },
    ];

    for (const body of invalidRequests) {
      await request(app.getHttpServer())
        .post('/payments')
        .send(body)
        .expect(400);
    }

    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});
