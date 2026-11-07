import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('POST /orders/:id/cancel', () => {
  let app: INestApplication;
  const service = {
    cancelMyOrder: jest.fn(async () => ({
      id: 18,
      status: 'CANCELLED',
      refundRequired: false,
      refundPayments: [],
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest().user = {
            userId: 7,
            email: 'customer@brewlite.test',
          };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('passes the authenticated customer and order ID to the cancellation service', async () => {
    await request(app.getHttpServer())
      .post('/orders/18/cancel')
      .expect(201)
      .expect({ id: 18, status: 'CANCELLED', refundRequired: false, refundPayments: [] });

    expect(service.cancelMyOrder).toHaveBeenCalledWith(7, 18);
  });

  it('rejects a malformed order ID', async () => {
    await request(app.getHttpServer())
      .post('/orders/not-a-number/cancel')
      .expect(400);

    expect(service.cancelMyOrder).not.toHaveBeenCalled();
  });
});
