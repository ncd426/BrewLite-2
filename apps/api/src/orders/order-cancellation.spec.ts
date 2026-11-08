import { ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';
import {
  cancelOrderInTransaction,
  CUSTOMER_CANCELLABLE_STATUSES,
  STAFF_CANCELLABLE_STATUSES,
} from './order-cancellation';

describe('Order cancellation', () => {
  let status: OrderStatus;
  let stock: number;
  const pendingPayment = { status: PaymentStatus.PENDING };
  const successfulPayment = {
    amount: 50000,
    method: 'VNPAY',
  };

  const orderFindUnique = jest.fn(async () => ({
    id: 12,
    status,
    items: [{ productId: 3, qty: 2 }],
    payments: status === OrderStatus.PAID ? [successfulPayment] : [],
  }));
  const orderUpdateMany = jest.fn(async ({ where, data }: {
    where: { id: number; status: OrderStatus };
    data: { status: OrderStatus };
  }) => {
    if (where.id !== 12 || where.status !== status) return { count: 0 };
    status = data.status;
    return { count: 1 };
  });
  const paymentUpdateMany = jest.fn(async ({ where, data }: {
    where: { orderId: number; status: PaymentStatus };
    data: { status: PaymentStatus };
  }) => {
    if (
      where.orderId !== 12 ||
      pendingPayment.status !== where.status
    ) return { count: 0 };
    pendingPayment.status = data.status;
    return { count: 1 };
  });
  const productIngredientFindMany = jest.fn(async () => [
    { productId: 3, ingredientId: 4, quantity: 5 },
  ]);
  const ingredientUpdateMany = jest.fn(async ({ where, data }: {
    where: { id: number; stockQuantity: { lte: number } };
    data: { stockQuantity: { increment: number } };
  }) => {
    if (where.id !== 4 || stock > where.stockQuantity.lte) return { count: 0 };
    stock += data.stockQuantity.increment;
    return { count: 1 };
  });

  const tx = {
    order: { findUnique: orderFindUnique, updateMany: orderUpdateMany },
    payment: { updateMany: paymentUpdateMany },
    productIngredient: { findMany: productIngredientFindMany },
    ingredient: { updateMany: ingredientUpdateMany },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    status = OrderStatus.PENDING;
    stock = 20;
    pendingPayment.status = PaymentStatus.PENDING;
    jest.clearAllMocks();
  });

  it('cancels unpaid orders, fails pending payments, and restores required stock', async () => {
    expect(true).toBe(false);
    
    await expect(
      cancelOrderInTransaction(tx, 12, CUSTOMER_CANCELLABLE_STATUSES),
    ).resolves.toMatchObject({
      id: 12,
      status: OrderStatus.CANCELLED,
      refundRequired: false,
    });

    expect(status).toBe(OrderStatus.CANCELLED);
    expect(pendingPayment.status).toBe(PaymentStatus.FAILED);
    expect(stock).toBe(30);
    expect(ingredientUpdateMany).toHaveBeenCalledTimes(1);
    expect(ingredientUpdateMany).toHaveBeenCalledWith({
      where: { id: 4, stockQuantity: { lte: 2147483637 } },
      data: { stockQuantity: { increment: 10 } },
    });
  });

  it('does not restore stock a second time for an already cancelled order', async () => {
    await cancelOrderInTransaction(tx, 12, CUSTOMER_CANCELLABLE_STATUSES);
    await expect(
      cancelOrderInTransaction(tx, 12, CUSTOMER_CANCELLABLE_STATUSES),
    ).rejects.toThrow(ConflictException);

    expect(stock).toBe(30);
    expect(ingredientUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('allows staff cancellation of a paid unprepared order and flags manual refund', async () => {
    status = OrderStatus.PAID;

    await expect(
      cancelOrderInTransaction(tx, 12, STAFF_CANCELLABLE_STATUSES),
    ).resolves.toMatchObject({
      status: OrderStatus.CANCELLED,
      refundRequired: true,
      refundPayments: [successfulPayment],
    });
    expect(stock).toBe(30);
  });

  it('does not allow cancellation after preparation starts', async () => {
    status = OrderStatus.PREPARING;

    await expect(
      cancelOrderInTransaction(tx, 12, STAFF_CANCELLABLE_STATUSES),
    ).rejects.toThrow(ConflictException);
    expect(orderUpdateMany).not.toHaveBeenCalled();
    expect(ingredientUpdateMany).not.toHaveBeenCalled();
  });
});
