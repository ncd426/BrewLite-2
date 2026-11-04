import { jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersController } from '../orders/orders.controller';
import { OrdersService } from '../orders/orders.service';
import { PaymentsController } from '../payments/payments.controller';
import { PaymentsService } from '../payments/payments.service';

const jwtSecret = 'customer-only-permission-test';

describe('work accounts cannot place personal orders', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let currentRole: UserRole = UserRole.STAFF;
  const fakePrisma = {
    user: { findUnique: jest.fn<() => Promise<{ role: UserRole }>>() },
  };
  const orders = { create: jest.fn<() => Promise<unknown>>(), getMyOrders: jest.fn<() => Promise<unknown>>() };
  const payments = { processPayment: jest.fn<() => Promise<unknown>>() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: jwtSecret })],
      controllers: [OrdersController, PaymentsController],
      providers: [
        JwtStrategy, RolesGuard,
        { provide: ConfigService, useValue: { getOrThrow: () => jwtSecret } },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: OrdersService, useValue: orders },
        { provide: PaymentsService, useValue: payments },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    fakePrisma.user.findUnique.mockImplementation(async () => ({ role: currentRole }));
  });
  afterAll(async () => { await app.close(); });

  for (const role of [UserRole.STAFF, UserRole.ADMIN]) {
    it(`${role} cannot access customer order/payment endpoints`, async () => {
      currentRole = role;
      const authorization = `Bearer ${jwt.sign({ sub: 2, email: 'worker@brewlite.test' })}`;
      await request(app.getHttpServer()).get('/orders/me').set('Authorization', authorization).expect(403);
      await request(app.getHttpServer()).post('/orders').set('Authorization', authorization)
        .send({ items: [{ productId: 1, size: 'M', qty: 1 }] }).expect(403);
      await request(app.getHttpServer()).post('/payments').set('Authorization', authorization)
        .set('Idempotency-Key', 'should-not-be-processed').send({ orderId: 1, method: 'MOMO' }).expect(403);
      expect(orders.create).not.toHaveBeenCalled();
      expect(orders.getMyOrders).not.toHaveBeenCalled();
      expect(payments.processPayment).not.toHaveBeenCalled();
    });
  }
});
