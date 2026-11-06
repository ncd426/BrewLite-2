import { RolesGuard } from '../common/guards/roles.guard';
﻿import { randomUUID } from 'node:crypto';
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
import { createSignedVnpayIpn } from './payment-test-utils';

const dbDescribe =
  process.env.RUN_DB_INTEGRATION === '1'
    ? describe
    : describe.skip;

dbDescribe('Concurrent payments - PostgreSQL integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId = 0;
  let orderId = 0;

  const total = 94000;
  const expectedPoints = 9;

  beforeAll(async () => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'sandbox-secret';
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const databaseName = new URL(databaseUrl)
      .pathname.replace(/^\//, '');

    if (!databaseName.startsWith('brewlite_task10_')) {
      throw new Error(
        'Use an isolated brewlite_task10_* database',
      );
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
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$connect();
  }, 30000);

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Concurrent Payment Test',
        email: `task10-payment-${randomUUID()}@example.test`,
        passwordHash: 'integration-test-only',
      },
    });

    userId = user.id;

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        status: OrderStatus.PENDING,
      },
    });

    orderId = order.id;
  });

  afterEach(async () => {
    if (orderId) {
      await prisma.payment.deleteMany({
        where: { orderId },
      });

      await prisma.order.deleteMany({
        where: { id: orderId },
      });

      orderId = 0;
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });

      userId = 0;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function sendPayment(key: string) {
    return request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send({
        orderId,
        method: 'VNPAY',
      });
  }

  function sendIpn(paymentId: number) {
    return request(app.getHttpServer())
      .get('/payments/webhooks/vnpay')
      .query(createSignedVnpayIpn(paymentId, total));
  }

  it('same key concurrently creates one payment and awards points once', async () => {
    const key = randomUUID();

    const responses = await Promise.all([
      sendPayment(key),
      sendPayment(key),
    ]);

    if (responses.some((response) => response.status !== 201)) {
      console.error(
        'Payment responses:',
        responses.map((response) => ({
          status: response.status,
          body: response.body,
        })),
      );
    }

    expect(responses.map((response) => response.status))
      .toEqual([201, 201]);

    expect(responses[0].body).toEqual(responses[1].body);
    await sendIpn(responses[0].body.id).expect(200);

    const payments = await prisma.payment.findMany({
      where: { orderId },
    });

    expect(payments).toHaveLength(1);
    expect(payments[0].idempotencyKey).toBe(key);
    expect(payments[0].status).toBe(PaymentStatus.SUCCESS);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(order?.status).toBe(OrderStatus.PAID);
    expect(order?.loyaltyAwardedAt).not.toBeNull();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(user?.loyaltyPoints).toBe(expectedPoints);
  }, 30000);

  it('different keys cannot pay the same order twice', async () => {
    const responses = await Promise.all([
      sendPayment(randomUUID()),
      sendPayment(randomUUID()),
    ]);

    if (
      responses.some(
        (response) => ![201, 409].includes(response.status),
      )
    ) {
      console.error(
        'Payment responses:',
        responses.map((response) => ({
          status: response.status,
          body: response.body,
        })),
      );
    }

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);
    const createdResponse = responses.find((response) => response.status === 201)!;
    await sendIpn(createdResponse.body.id).expect(200);

    const payments = await prisma.payment.findMany({
      where: { orderId },
    });

    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe(PaymentStatus.SUCCESS);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(order?.status).toBe(OrderStatus.PAID);
    expect(order?.loyaltyAwardedAt).not.toBeNull();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(user?.loyaltyPoints).toBe(expectedPoints);
  }, 30000);
});
