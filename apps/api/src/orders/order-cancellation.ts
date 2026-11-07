import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { transitionOrderStatus } from './order-state-machine';

const MAX_DATABASE_INT = 2147483647;

export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
] as const;

export const STAFF_CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  ...CUSTOMER_CANCELLABLE_STATUSES,
  OrderStatus.PAID,
] as const;

export async function cancelOrderInTransaction(
  tx: Prisma.TransactionClient,
  orderId: number,
  allowedStatuses: readonly OrderStatus[],
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: {
        select: { productId: true, qty: true },
      },
      payments: {
        where: { status: PaymentStatus.SUCCESS },
        select: { amount: true, method: true },
      },
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }
  if (!allowedStatuses.includes(order.status)) {
    throw new ConflictException(
      `Order in ${order.status} status cannot be cancelled`,
    );
  }

  await transitionOrderStatus(tx, orderId, OrderStatus.CANCELLED);
  await tx.payment.updateMany({
    where: { orderId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.FAILED },
  });

  const productIds = [...new Set(order.items.map((item) => item.productId))];
  if (productIds.length === 0) {
    throw new ConflictException('Cannot restore inventory for an order without items');
  }

  const recipes = await tx.productIngredient.findMany({
    where: {
      productId: { in: productIds },
      isOptional: false,
    },
    select: {
      productId: true,
      ingredientId: true,
      quantity: true,
    },
  });
  const quantities = new Map<number, number>();
  for (const item of order.items) {
    for (const recipe of recipes) {
      if (recipe.productId !== item.productId) continue;
      const quantity =
        (quantities.get(recipe.ingredientId) ?? 0) +
        recipe.quantity * item.qty;
      if (!Number.isSafeInteger(quantity) || quantity > MAX_DATABASE_INT) {
        throw new ConflictException('Inventory restoration exceeds supported range');
      }
      quantities.set(recipe.ingredientId, quantity);
    }
  }

  if (quantities.size === 0) {
    throw new ConflictException('Cannot restore inventory without a required recipe');
  }

  for (const [ingredientId, quantity] of [...quantities].sort(
    ([left], [right]) => left - right,
  )) {
    const restored = await tx.ingredient.updateMany({
      where: {
        id: ingredientId,
        stockQuantity: { lte: MAX_DATABASE_INT - quantity },
      },
      data: { stockQuantity: { increment: quantity } },
    });
    if (restored.count !== 1) {
      throw new ConflictException(
        `Could not restore inventory for ingredient ${ingredientId}`,
      );
    }
  }

  return {
    id: order.id,
    status: OrderStatus.CANCELLED,
    refundRequired: order.payments.length > 0,
    refundPayments: order.payments,
  };
}
