import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserRole, OrderStatus } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackofficeService } from './backoffice.service';
import { CounterSalesService } from './counter-sales.service';
import { AdminController } from './admin.controller';
import { StaffController } from './staff.controller';

describe('Backoffice HTTP role boundaries', () => {
  const secret = 'roles-test-secret';
  const roles: Record<number, UserRole> = {
    1: UserRole.CUSTOMER, 2: UserRole.STAFF, 3: UserRole.ADMIN,
  };
  const fakePrisma = {
    user: {
      findUnique: jest.fn<() => Promise<{ role: UserRole } | null>>(),
    },
  };
  const service = {
    listStaffOrders: jest.fn<() => Promise<unknown[]>>(),
    listUsers: jest.fn<() => Promise<unknown[]>>(),
    advanceOrder: jest.fn<() => Promise<unknown>>(),
    cancelOrder: jest.fn<() => Promise<unknown>>(),
  };
  const sales = {
    create: jest.fn<(operatorId: number, dto: unknown, key: string) => Promise<unknown>>(),
  };
  const cardSale = {
    method: 'CARD',
    items: [{ productId: 1, size: 'S', qty: 2, toppings: [] }],
  };
  const receipt = {
    orderId: 91, status: 'PAID', channel: 'COUNTER', total: 70000,
    method: 'CARD', paymentId: 12, replayed: false,
  };
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret }),
      ],
      controllers: [AdminController, StaffController],
      providers: [
        JwtStrategy, RolesGuard,
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        { provide: PrismaService, useValue: fakePrisma },
        { provide: BackofficeService, useValue: service },
        { provide: CounterSalesService, useValue: sales },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    jwt = module.get(JwtService);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fakePrisma.user.findUnique.mockImplementation(async () => ({ role: UserRole.STAFF }));
    service.listStaffOrders.mockResolvedValue([]);
    service.listUsers.mockResolvedValue([]);
    service.advanceOrder.mockResolvedValue({ id: 9, status: OrderStatus.PREPARING });
    service.cancelOrder.mockResolvedValue({
      id: 9,
      status: OrderStatus.CANCELLED,
      refundRequired: true,
    });
    sales.create.mockResolvedValue(receipt);
  });
  afterAll(async () => { await app.close(); });

  function auth(id: number) {
    return `Bearer ${jwt.sign({ sub: id, email: 'tester@brewlite.test' })}`;
  }

  it('does not expose staff orders without JWT', async () => {
    await request(app.getHttpServer()).get('/management/staff/orders').expect(401);
  });

  it.each([
    [UserRole.ADMIN, 3],
    [UserRole.STAFF, 2],
  ] as const)('allows %s to create a simulated CARD counter sale', async (role, operatorId) => {
    fakePrisma.user.findUnique.mockResolvedValue({ role });
    const response = await request(app.getHttpServer())
      .post('/management/staff/sales')
      .set('Authorization', auth(operatorId))
      .set('Idempotency-Key', 'card-sale-1')
      .send(cardSale)
      .expect(201);
    expect(response.body).toEqual(receipt);
    expect(sales.create).toHaveBeenCalledTimes(1);
    expect(sales.create).toHaveBeenCalledWith(operatorId, cardSale, 'card-sale-1');
  });

  it('rejects counter sales without JWT', async () => {
    await request(app.getHttpServer()).post('/management/staff/sales')
      .set('Idempotency-Key', 'card-sale-1').send(cardSale).expect(401);
    expect(sales.create).not.toHaveBeenCalled();
  });

  it('rejects CUSTOMER counter sales', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER });
    await request(app.getHttpServer()).post('/management/staff/sales')
      .set('Authorization', auth(1))
      .set('Idempotency-Key', 'card-sale-1').send(cardSale).expect(403);
    expect(sales.create).not.toHaveBeenCalled();
  });

  it.each([undefined, 'invalid key', 'x'.repeat(101)])(
    'rejects counter sales with missing or invalid Idempotency-Key: %s', async (key) => {
      const saleRequest = request(app.getHttpServer()).post('/management/staff/sales')
        .set('Authorization', auth(2));
      if (key !== undefined) saleRequest.set('Idempotency-Key', key);
      await saleRequest.send(cardSale).expect(400);
      expect(sales.create).not.toHaveBeenCalled();
    },
  );

  it('rejects an unsupported counter payment method before creating a sale', async () => {
    await request(app.getHttpServer()).post('/management/staff/sales')
      .set('Authorization', auth(2))
      .set('Idempotency-Key', 'card-sale-1')
      .send({ ...cardSale, method: 'VNPAY' }).expect(400);
    expect(sales.create).not.toHaveBeenCalled();
  });

  it('returns 403 to STAFF accessing ADMIN endpoint, even with valid JWT', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.STAFF });
    await request(app.getHttpServer()).get('/management/admin/users')
      .set('Authorization', auth(2)).expect(403);
    expect(service.listUsers).not.toHaveBeenCalled();
  });

  it('returns 403 to CUSTOMER accessing STAFF endpoint', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER });
    await request(app.getHttpServer()).get('/management/staff/orders')
      .set('Authorization', auth(1)).expect(403);
  });

  it('allows STAFF to view and advance only operational states', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.STAFF });
    await request(app.getHttpServer()).get('/management/staff/orders')
      .set('Authorization', auth(2)).expect(200);
    await request(app.getHttpServer()).patch('/management/staff/orders/9/status')
      .set('Authorization', auth(2)).send({ status: 'PREPARING' }).expect(200);
    await request(app.getHttpServer()).patch('/management/staff/orders/9/status')
      .set('Authorization', auth(2)).send({ status: 'PAID' }).expect(400);
    await request(app.getHttpServer())
      .post('/management/staff/orders/9/cancel')
      .set('Authorization', auth(2))
      .expect(201);
    expect(service.cancelOrder).toHaveBeenCalledWith(9);
  });

  it('allows ADMIN to use both Admin and Staff endpoints', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
    await request(app.getHttpServer()).get('/management/admin/users')
      .set('Authorization', auth(3)).expect(200);
    await request(app.getHttpServer()).get('/management/staff/orders')
      .set('Authorization', auth(3)).expect(200);
    fakePrisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER });
    await request(app.getHttpServer()).post('/management/staff/orders/9/cancel')
      .set('Authorization', auth(1)).expect(403);
  });
});
