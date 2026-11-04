import { OrderChannel, OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CounterSalesService } from './counter-sales.service';

const payload = {
  method: 'MOMO' as const,
  items: [{ productId: 1, size: 'S', qty: 2, toppings: [] }],
};

function fixture(stockOk = true) {
  let stockWriteCount = 0;
  let orderCreateCount = 0;
  let paymentRecord: any = null;
  const lines = [{ productId: 1, size: 'S', qty: 2, toppings: [], lineTotal: 70000 }];
  const tx = {
    user: { findUnique: async () => ({ id: 2 }) },
    product: {
      findMany: async () => [{
        id: 1, price: 35000,
        productIngredients: [{
          ingredientId: 4, quantity: 10, isOptional: false,
          ingredient: { name: 'Coffee', stockQuantity: 100 },
        }],
      }],
    },
    ingredient: { updateMany: async () => {
      stockWriteCount += 1;
      return { count: stockOk ? 1 : 0 };
    } },
    order: { create: async () => {
      orderCreateCount += 1;
      return { id: 91, status: OrderStatus.PAID, channel: OrderChannel.COUNTER, total: 70000 };
    } },
    payment: { create: async () => {
      paymentRecord = {
        id: 12, method: 'MOMO', status: PaymentStatus.SUCCESS,
        orderId: 91, pointsUsed: 0,
        order: {
          id: 91, status: OrderStatus.PAID, channel: OrderChannel.COUNTER,
          userId: 2, total: 70000, items: lines,
        },
      };
      return { id: 12 };
    } },
  };
  const prisma = {
    payment: { findUnique: async () => paymentRecord },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  return {
    service: new CounterSalesService(prisma),
    get stockWrites() { return stockWriteCount; },
    get orderCreates() { return orderCreateCount; },
  };
}

describe('counter sale business rules', () => {
  it('creates a PAID counter order and SUCCESS payment, deducting stock once', async () => {
    const scenario = fixture();
    const result = await scenario.service.create(2, payload, 'sale-test-1');
    expect(result).toMatchObject({
      orderId: 91, total: 70000, status: OrderStatus.PAID,
      channel: OrderChannel.COUNTER, replayed: false,
    });
    expect(scenario.orderCreates).toBe(1);
    expect(scenario.stockWrites).toBe(1);
  });

  it('replaying the same request does not create a second sale or debit stock', async () => {
    const scenario = fixture();
    const first = await scenario.service.create(2, payload, 'sale-test-2');
    const second = await scenario.service.create(2, payload, 'sale-test-2');
    expect(first.orderId).toBe(second.orderId);
    expect(second.replayed).toBe(true);
    expect(scenario.orderCreates).toBe(1);
    expect(scenario.stockWrites).toBe(1);
  });

  it('stops before order creation if ingredient stock is insufficient', async () => {
    const scenario = fixture(false);
    await expect(scenario.service.create(2, payload, 'sale-test-3'))
      .rejects.toThrow('Insufficient stock');
    expect(scenario.orderCreates).toBe(0);
  });
});
