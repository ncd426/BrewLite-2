import { jest } from '@jest/globals';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BackofficeService } from './backoffice.service';

describe('BackofficeService', () => {
  it('includes cancelled orders in the staff order list', async () => {
    const findMany = jest.fn<(args: Prisma.OrderFindManyArgs) => Promise<unknown[]>>()
      .mockResolvedValue([]);
    const service = new BackofficeService({
      order: { findMany },
    } as unknown as PrismaService);

    await service.listStaffOrders();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: {
            in: expect.arrayContaining([OrderStatus.CANCELLED]),
          },
        },
      }),
    );
  });
});
