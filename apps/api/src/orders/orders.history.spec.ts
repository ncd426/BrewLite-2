
import { NotFoundException } from '@nestjs/common';
import { OrderChannel, OrderStatus } from '@prisma/client';
import { jest } from '@jest/globals';

import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('Orders History Service', () => {
  const sampleOrder = {
    id: 9,
    userId: 7,
    status: OrderStatus.PAID,
    total: 94000,
    discountAmount: 0,
    createdAt: new Date('2026-10-22T13:00:00Z'),
    items: [
      {
        id: 1,
        productId: 1,
        size: 'M',
        qty: 2,
        unitPrice: 47000,
        lineTotal: 94000,
        toppings: ['Trân châu'],
        product: {
          name: 'Cà phê sữa',
          imageUrl: null,
        },
      },
    ],
  };

  const findMany = jest.fn<
    (args: { where: { userId: number } }) =>
      Promise<typeof sampleOrder[]>
  >();

  const findFirst = jest.fn<
    (args: { where: { id: number; userId: number } }) =>
      Promise<typeof sampleOrder | null>
  >();

  const prisma = {
    order: {
      findMany,
      findFirst,
    },
  } as unknown as PrismaService;

  const service = new OrdersService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();

    findMany.mockResolvedValue([sampleOrder]);

    findFirst.mockImplementation(async ({ where }) => {
      if (
        where.id === sampleOrder.id &&
        where.userId === sampleOrder.userId
      ) {
        return sampleOrder;
      }

      return null;
    });
  });

  it('returns history for the authenticated user', async () => {
    const result = await service.getMyOrders(7);

    expect(result.userId).toBe(7);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]).toMatchObject({
      id: 9,
      status: OrderStatus.PAID,
      total: 94000,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 7, channel: OrderChannel.ONLINE },
      }),
    );
  });

  it('returns an empty list if the user has no orders', async () => {
    findMany.mockResolvedValue([]);

    const result = await service.getMyOrders(7);

    expect(result.orders).toEqual([]);
  });

  it('returns order details with items', async () => {
    const result = await service.getOrderById(7, 9);

    expect(result).toMatchObject({
      id: 9,
      status: OrderStatus.PAID,
      total: 94000,
      items: [
        {
          productId: 1,
          productName: 'Cà phê sữa',
          qty: 2,
          unitPrice: 47000,
          lineTotal: 94000,
        },
      ],
    });
  });

  it('rejects an order that does not exist', async () => {
    await expect(
      service.getOrderById(7, 999),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects another users order', async () => {
    await expect(
      service.getOrderById(99, 9),
    ).rejects.toThrow(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
          userId: 99,
          channel: OrderChannel.ONLINE,
        },
      }),
    );
  });
});
