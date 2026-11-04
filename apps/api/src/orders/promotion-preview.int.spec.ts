import { RolesGuard } from '../common/guards/roles.guard';
import { randomUUID } from 'node:crypto';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DiscountType } from '@prisma/client';
import request from 'supertest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromotionPreviewController } from './promotion-preview.controller';
import { PromotionPreviewService } from './promotion-preview.service';

const dbDescribe = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

dbDescribe('Promotion preview and checkout - PostgreSQL integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId = 0;
  let productId = 0;
  let ingredientId = 0;
  let promotionId = 0;
  let code = '';

  const items = () => [{ productId, size: 'M', qty: 2, toppings: ['pearl'] }];

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !new URL(url).pathname.replace(/^\//, '').startsWith('brewlite_task10_')) {
      throw new Error('Use isolated brewlite_task10_* PostgreSQL database');
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController, PromotionPreviewController],
      providers: [OrdersService, PromotionPreviewService, PrismaService],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{ user?: { userId: number } }>();
          req.user = { userId };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$connect();
  }, 30000);

  beforeEach(async () => {
    const suffix = randomUUID().replace(/-/g, '');
    const user = await prisma.user.create({
      data: {
        name: 'Promotion preview test',
        email: `promotion-preview-${suffix}@example.test`,
        passwordHash: 'integration-test-only',
      },
    });
    userId = user.id;

    const product = await prisma.product.create({
      data: {
        name: `Promotion product ${suffix}`,
        price: 35000,
      },
    });
    productId = product.id;
    const ingredient = await prisma.ingredient.create({
      data: {
        code: `PREVIEW-${suffix}`,
        name: `Promotion ingredient ${suffix}`,
        unit: 'ml',
        stockQuantity: 10,
      },
    });
    ingredientId = ingredient.id;
    await prisma.productIngredient.create({
      data: { productId, ingredientId, quantity: 1 },
    });

    code = `PREVIEW${suffix.slice(0, 14).toUpperCase()}`;
    const promotion = await prisma.promotion.create({
      data: {
        code,
        type: DiscountType.PERCENT,
        value: 20,
        minOrderTotal: 50000,
        isActive: true,
      },
    });
    promotionId = promotion.id;
  });

  afterEach(async () => {
    if (userId) {
      const orders = await prisma.order.findMany({
        where: { userId }, select: { id: true },
      });
      const orderIds = orders.map((order) => order.id);
      if (orderIds.length) {
        await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      }
    }
    if (promotionId) await prisma.promotion.deleteMany({ where: { id: promotionId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (ingredientId) await prisma.ingredient.deleteMany({ where: { id: ingredientId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    userId = 0;
    productId = 0;
    ingredientId = 0;
    promotionId = 0;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns an accurate DB-based quote without reserving stock, then creates a discounted order', async () => {
    const preview = await request(app.getHttpServer())
      .post('/orders/promotion-preview')
      .send({ promotionCode: code.toLowerCase(), items: items().map((x) => ({ ...x, price: 1 })) })
      .expect(201);

    expect(preview.body).toMatchObject({
      promotionCode: code,
      promotionId,
      subtotal: 92000,
      discountAmount: 18400,
      total: 73600,
    });
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect((await prisma.ingredient.findUnique({ where: { id: ingredientId } }))?.stockQuantity).toBe(10);

    const order = await request(app.getHttpServer())
      .post('/orders')
      .send({ promotionCode: code, items: items() })
      .expect(201);

    expect(order.body).toMatchObject({
      subtotal: preview.body.subtotal,
      discountAmount: preview.body.discountAmount,
      total: preview.body.total,
      promotionId,
    });
    expect((await prisma.ingredient.findUnique({ where: { id: ingredientId } }))?.stockQuantity).toBe(8);
  }, 30000);

  it('rejects an invalid promotion code without writing or reserving stock', async () => {
    await request(app.getHttpServer())
      .post('/orders/promotion-preview')
      .send({ promotionCode: 'NOT-A-REAL-CODE', items: items() })
      .expect(400);
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect((await prisma.ingredient.findUnique({ where: { id: ingredientId } }))?.stockQuantity).toBe(10);
  });

  it('rejects an inactive promotion', async () => {
    await prisma.promotion.update({ where: { id: promotionId }, data: { isActive: false } });
    await request(app.getHttpServer())
      .post('/orders/promotion-preview')
      .send({ promotionCode: code, items: items() })
      .expect(400);
  });

  it('rejects an expired promotion', async () => {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    await request(app.getHttpServer())
      .post('/orders/promotion-preview')
      .send({ promotionCode: code, items: items() })
      .expect(400);
  });
});
