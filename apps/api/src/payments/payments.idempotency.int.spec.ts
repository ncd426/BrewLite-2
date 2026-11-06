import { RolesGuard } from '../common/guards/roles.guard';

import { randomUUID } from 'node:crypto';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { createSignedVnpayIpn } from './payment-test-utils';

// Integration test chỉ chạy khi bật cờ.
// Các unit test và CI thông thường không cần PostgreSQL.
const dbDescribe =
  process.env.RUN_DB_INTEGRATION === '1'
    ? describe
    : describe.skip;

dbDescribe('POST /payments - Idempotency Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId = 0;
  let orderId = 0;

  beforeAll(async () => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'sandbox-secret';
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        PrismaService,
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

          req.user = { userId };
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

    prisma = app.get(PrismaService);
    await prisma.$connect();

    // Tạo user chỉ phục vụ integration test.
    const user = await prisma.user.create({
      data: {
        email: `test-${randomUUID()}@example.test`,
        name: 'Idempotency Integration Test',
        passwordHash: 'test-only',
      },
    });

    userId = user.id;
  });

  beforeEach(async () => {
    // Mỗi bài test dùng một Order mới ở trạng thái PENDING.
    const order = await prisma.order.create({
      data: {
        userId,
        total: 94000,
        status: OrderStatus.PENDING,
      },
    });

    orderId = order.id;
  });

  afterEach(async () => {
    if (!orderId) return;

    // Xóa đúng dữ liệu thử nghiệm của bài test này.
    await prisma.payment.deleteMany({
      where: { orderId },
    });

    await prisma.order.delete({
      where: { id: orderId },
    });

    orderId = 0;
  });

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    if (app) {
      await app.close();
    }
  });

  function notifyVnpay(paymentId: number, successful = true) {
    return request(app.getHttpServer())
      .get('/payments/webhooks/vnpay')
      .query(createSignedVnpayIpn(paymentId, 94000, successful));
  }

  it('Test (b): same key twice creates one Payment', async () => {
    const key = randomUUID();
    const body = {
      orderId,
      method: 'VNPAY',
    };

    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    // Cùng một bản ghi, cùng nội dung phản hồi.
    expect(second.body).toEqual(first.body);
    expect(second.body.id).toBe(first.body.id);
    expect(first.body.paymentStatus).toBe('PENDING');
    await notifyVnpay(first.body.id).expect(200);

    // Kiểm tra số bản ghi thực trong PostgreSQL.
    const payments = await prisma.payment.findMany({
      where: { orderId },
    });

    expect(payments).toHaveLength(1);
    expect(payments[0].id).toBe(first.body.id);
    expect(payments[0].idempotencyKey).toBe(key);
    expect(payments[0].status).toBe(
      PaymentStatus.SUCCESS,
    );

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(order?.status).toBe(OrderStatus.PAID);
  });

  it('same key with a different method returns 409', async () => {
    const key = randomUUID();

    await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'VNPAY',
        amount: 1,
      })
      .expect(409);

    const count = await prisma.payment.count({
      where: { orderId },
    });

    expect(count).toBe(1);
  });

  it('missing Idempotency-Key returns 400', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(400);

    const count = await prisma.payment.count({
      where: { orderId },
    });

    expect(count).toBe(0);
  });

  it('different key cannot pay an already PAID order', async () => {
    const firstKey = randomUUID();
    const secondKey = randomUUID();

    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', firstKey)
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(201);

    await notifyVnpay(first.body.id).expect(200);

    await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', secondKey)
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(409);

    const count = await prisma.payment.count({
      where: { orderId },
    });

    expect(count).toBe(1);
  });

  it('replays failed payment without creating another', async () => {
    const key = randomUUID();

    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(201);

    await notifyVnpay(first.body.id, false).expect(200);

    const second = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(201);

    expect(second.body.paymentStatus).toBe(PaymentStatus.FAILED);

    const count = await prisma.payment.count({
      where: { orderId },
    });

    expect(count).toBe(1);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(order?.status).toBe(
      OrderStatus.PAYMENT_FAILED,
    );
  });
});
