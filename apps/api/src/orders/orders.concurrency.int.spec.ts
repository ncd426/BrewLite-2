import { RolesGuard } from '../common/guards/roles.guard';
﻿import { randomUUID } from 'node:crypto';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const dbDescribe =
  process.env.RUN_DB_INTEGRATION === '1'
    ? describe
    : describe.skip;

dbDescribe('Concurrent orders - PostgreSQL integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId = 0;
  let ingredientId = 0;

  const userIds: number[] = [];
  const initialStock = 15;
  const buyers = 10;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    const databaseName = new URL(databaseUrl)
      .pathname.replace(/^\//, '');

    if (!databaseName.startsWith('brewlite_task10_')) {
      throw new Error(
        'Use an isolated brewlite_task10_* database'
      );
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService, PrismaService],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { userId: number; email: string };
          }>();

          const userId = Number(req.headers['x-test-user-id']);

          if (!userIds.includes(userId)) {
            return false;
          }

          req.user = {
            userId,
            email: 'concurrency-test@example.test',
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

    const runId = randomUUID();

    const ingredient = await prisma.ingredient.create({
      data: {
        code: `TEST-${runId}`,
        name: `Task10 Test Ingredient ${runId}`,
        unit: 'ml',
        stockQuantity: initialStock,
      },
    });
    ingredientId = ingredient.id;

    const product = await prisma.product.create({
      data: {
        name: `Task10 Test Product ${runId}`,
        price: 30000,
      },
    });

    productId = product.id;
    await prisma.productIngredient.create({
      data: {
        productId,
        ingredientId,
        quantity: 1,
      },
    });

    for (let i = 0; i < buyers; i++) {
      const user = await prisma.user.create({
        data: {
          name: `Task10 Buyer ${i}`,
          email: `task10-${runId}-${i}@example.test`,
          passwordHash: 'integration-test-only',
        },
      });

      userIds.push(user.id);
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (prisma && userIds.length > 0) {
        const orders = await prisma.order.findMany({
          where: { userId: { in: userIds } },
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

        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      if (prisma && productId) {
        await prisma.product.deleteMany({
          where: { id: productId },
        });
      }
      if (prisma && ingredientId) {
        await prisma.ingredient.deleteMany({
          where: { id: ingredientId },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  }, 30000);

  it('does not oversell when 10 buyers compete for 15 units', async () => {
    const responses = await Promise.all(
      userIds.map((userId) =>
        request(app.getHttpServer())
          .post('/orders')
          .set('X-Test-User-Id', String(userId))
          .send({
            items: [
              {
                productId,
                size: 'S',
                qty: initialStock,
                toppings: [],
              },
            ],
          }),
      ),
    );

    const success = responses.filter(
      (response) => response.status === 201,
    );

    const rejected = responses.filter(
      (response) =>
        response.status === 400 ||
        response.status === 409,
    );

    const unexpected = responses.filter(
      (response) =>
        ![201, 400, 409].includes(response.status),
    );

    if (unexpected.length > 0) {
      console.error(
        'Unexpected responses:',
        unexpected.map((response) => ({
          status: response.status,
          body: response.body,
        })),
      );
    }

    expect(unexpected).toHaveLength(0);
    expect(success).toHaveLength(1);
    expect(rejected).toHaveLength(buyers - 1);

    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    expect(ingredient?.stockQuantity).toBe(0);

    const orders = await prisma.order.findMany({
      where: { userId: { in: userIds } },
      include: { items: true },
    });

    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe(OrderStatus.PENDING);
    expect(orders[0].items).toHaveLength(1);
    expect(orders[0].items[0].productId).toBe(productId);
    expect(orders[0].items[0].qty).toBe(initialStock);
  }, 30000);
});
