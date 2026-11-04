import { RolesGuard } from '../common/guards/roles.guard';
import { randomUUID } from 'node:crypto';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const dbDescribe =
  process.env.RUN_DB_INTEGRATION === '1'
    ? describe
    : describe.skip;

dbDescribe('Loyalty redemption - PostgreSQL integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId = 0;
  let orderId = 0;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL required');

    const name = new URL(url).pathname.replace(/^\//, '');
    if (!name.startsWith('brewlite_task10_')) {
      throw new Error('Use isolated brewlite_task10_* database');
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [PaymentsService, PrismaService],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user?: { userId: number };
          }>();
          req.user = { userId };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Loyalty Redemption Test',
        email: `redeem-${randomUUID()}@example.test`,
        passwordHash: 'test-only',
        loyaltyPoints: 20,
      },
    });
    userId = user.id;

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
    if (orderId) {
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
      orderId = 0;
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
      userId = 0;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function pay(pointsToRedeem: number, key: string, simulateFailure = false) {
    return request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'MOMO',
        pointsToRedeem,
        simulateFailure,
      });
  }

  it('redeems points and awards on the actual amount only once', async () => {
    const key = randomUUID();
    const first = await pay(10, key).expect(201);
    const replay = await pay(10, key).expect(201);

    expect(replay.body).toEqual(first.body);
    expect(first.body.amount).toBe(84000);
    expect(first.body.pointsUsed).toBe(10);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].pointsUsed).toBe(10);
    expect(payments[0].status).toBe(PaymentStatus.SUCCESS);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.loyaltyPoints).toBe(18); // 20 - 10 + 8 earned

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PAID);
  });

  it('rejects insufficient points without recording a payment', async () => {
    await pay(30, randomUUID()).expect(400);

    expect(await prisma.payment.count({ where: { orderId } })).toBe(0);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.loyaltyPoints).toBe(20);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PENDING);
  });

  it('does not deduct or award points after failed payment', async () => {
    const response = await pay(10, randomUUID(), true).expect(201);

    expect(response.body.paymentStatus).toBe(PaymentStatus.FAILED);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.loyaltyPoints).toBe(20);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(order?.loyaltyAwardedAt).toBeNull();
  });

  it('rejects reuse of a key with a different points value', async () => {
    const key = randomUUID();

    await pay(3, key).expect(201);
    await pay(4, key).expect(409);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].pointsUsed).toBe(3);
  });
});
