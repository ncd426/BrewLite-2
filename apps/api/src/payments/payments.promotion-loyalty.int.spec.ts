import { randomUUID } from 'node:crypto';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DiscountType,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersController } from '../orders/orders.controller';
import { OrdersService } from '../orders/orders.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { createSignedVnpayIpn } from './payment-test-utils';

const dbDescribe =
  process.env.RUN_DB_INTEGRATION === '1'
    ? describe
    : describe.skip;

dbDescribe('Promotion and loyalty - PostgreSQL integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userId = 0;
  let productId = 0;
  let ingredientId = 0;
  let promotionId = 0;
  let promotionCode = '';

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
      controllers: [OrdersController, PaymentsController],
      providers: [
        OrdersService,
        PaymentsService,
        PrismaService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user?: { userId: number; email: string };
          }>();

          req.user = {
            userId,
            email: 'task10-test@example.test',
          };

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
    const suffix = randomUUID().replace(/-/g, '');

    const user = await prisma.user.create({
      data: {
        name: 'Task10 Promotion Test',
        email: `promo-${suffix}@example.test`,
        passwordHash: 'integration-test-only',
      },
    });

    userId = user.id;

    const product = await prisma.product.create({
      data: {
        name: `Promotion Test ${suffix}`,
        price: 35000,
      },
    });

    productId = product.id;
    const ingredient = await prisma.ingredient.create({
      data: {
        code: `PAYMENT-${suffix}`,
        name: `Payment ingredient ${suffix}`,
        unit: 'ml',
        stockQuantity: 10,
      },
    });
    ingredientId = ingredient.id;
    await prisma.productIngredient.create({
      data: { productId, ingredientId, quantity: 1 },
    });
    promotionCode = `T10${suffix.slice(0, 14).toUpperCase()}`;

    const promotion = await prisma.promotion.create({
      data: {
        code: promotionCode,
        type: DiscountType.PERCENT,
        value: 10,
        minOrderTotal: 80000,
        isActive: true,
      },
    });

    promotionId = promotion.id;
  });

  afterEach(async () => {
    if (!prisma) return;

    if (userId) {
      const orders = await prisma.order.findMany({
        where: { userId },
        select: { id: true },
      });

      const orderIds = orders.map((order) => order.id);

      if (orderIds.length > 0) {
        await prisma.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await prisma.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await prisma.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }
    }

    if (promotionId) {
      await prisma.promotion.deleteMany({
        where: { id: promotionId },
      });
    }

    if (productId) {
      await prisma.product.deleteMany({
        where: { id: productId },
      });
    }
    if (ingredientId) {
      await prisma.ingredient.deleteMany({
        where: { id: ingredientId },
      });
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }

    userId = 0;
    productId = 0;
    ingredientId = 0;
    promotionId = 0;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function notifyVnpay(paymentId: number, amount: number, successful = true) {
    return request(app.getHttpServer())
      .get('/payments/webhooks/vnpay')
      .query(createSignedVnpayIpn(paymentId, amount, successful));
  }

  it('applies promotion and awards loyalty only after PAID', async () => {
    // (35000 + 5000 size M + 6000 pearl) * 2 = 92000
    // 10% discount = 9200
    // Final total = 82800
    // Loyalty = floor(82800 / 10000) = 8 points

    const created = await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{
          productId,
          size: 'M',
          qty: 2,
          toppings: ['pearl'],
        }],
        promotionCode,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      status: OrderStatus.PENDING,
      subtotal: 92000,
      discountAmount: 9200,
      total: 82800,
      promotionId,
    });

    const orderId = created.body.orderId as number;

    const pendingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(pendingOrder?.promotionId).toBe(promotionId);
    expect(pendingOrder?.loyaltyAwardedAt).toBeNull();

    const beforePayment = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(beforePayment?.loyaltyPoints).toBe(0);

    const key = randomUUID();

    const paymentBody = {
      orderId,
      method: 'VNPAY',
    };

    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send(paymentBody)
      .expect(201);

    expect(first.body).toMatchObject({
      orderId,
      amount: 82800,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const replay = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', key)
      .send(paymentBody)
      .expect(201);

    expect(replay.body).toEqual(first.body);
    await notifyVnpay(first.body.id, first.body.amount).expect(200);

    const paymentCount = await prisma.payment.count({
      where: { orderId },
    });

    expect(paymentCount).toBe(1);

    const paidOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(paidOrder?.status).toBe(OrderStatus.PAID);
    expect(paidOrder?.loyaltyAwardedAt).not.toBeNull();

    const paidUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(paidUser?.loyaltyPoints).toBe(8);
  }, 30000);

  it('rejects bad promotion and gives no points on failed payment', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{
          productId,
          size: 'S',
          qty: 1,
          toppings: [],
        }],
        promotionCode: 'INVALID-TASK10-CODE',
      })
      .expect(400);

    expect(invalid.body.statusCode).toBe(400);

    const stockBefore = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    expect(stockBefore?.stockQuantity).toBe(10);

    const createdOrders = await prisma.order.count({
      where: { userId },
    });

    expect(createdOrders).toBe(0);

    const created = await request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [{
          productId,
          size: 'S',
          qty: 1,
          toppings: [],
        }],
      })
      .expect(201);

    const orderId = created.body.orderId as number;

    const failedPayment = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', randomUUID())
      .send({
        orderId,
        method: 'VNPAY',
      })
      .expect(201);

    await notifyVnpay(failedPayment.body.id, failedPayment.body.amount, false)
      .expect(200);

    expect(failedPayment.body.paymentStatus)
      .toBe(PaymentStatus.FAILED);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    expect(order?.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(order?.loyaltyAwardedAt).toBeNull();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    expect(user?.loyaltyPoints).toBe(0);

    const paymentCount = await prisma.payment.count({
      where: { orderId },
    });

    expect(paymentCount).toBe(1);
  }, 30000);
});
