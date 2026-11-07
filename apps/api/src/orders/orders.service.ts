import { transitionOrderStatus } from './order-state-machine';
import {
  cancelOrderInTransaction,
  CUSTOMER_CANCELLABLE_STATUSES,
} from './order-cancellation';
import { resolvePromotion } from './promotion-rule';
import type { Prisma } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderChannel, OrderStatus as PrismaOrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderItemDto } from './dto/create-order.dto';
import { SIZE_SURCHARGE, TOPPING_PRICE } from './pricing';
import {
  buildIngredientRequirements,
  validateIngredientAvailability,
} from '../inventory/recipe-inventory';

export type OrderStatus = PrismaOrderStatus;

export type CreateOrderInput = {
  userId: number;
  items: CreateOrderItemDto[];
  promotionCode?: string;
};

const MAX_DATABASE_INT = 2147483647;

function checkMoney(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_DATABASE_INT
  ) {
    throw new BadRequestException(
      'Order amount exceeds supported range',
    );
  }

  return value;
}

async function consumeIngredients(
  tx: Prisma.TransactionClient,
  requirements: ReturnType<typeof buildIngredientRequirements>,
) {
  for (const requirement of requirements.sort(
    (left, right) => left.ingredientId - right.ingredientId,
  )) {
    const reservation = await tx.ingredient.updateMany({
      where: {
        id: requirement.ingredientId,
        stockQuantity: { gte: requirement.quantity },
      },
      data: {
        stockQuantity: { decrement: requirement.quantity },
      },
    });

    if (reservation.count === 1) {
      continue;
    }

    throw new BadRequestException(
      `Insufficient stock for ingredient ${requirement.ingredientName}`,
      );
  }
}


const orderHistorySelect = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  discountAmount: true,
  payments: {
    where: { status: PaymentStatus.SUCCESS },
    take: 1,
    select: { amount: true, pointsUsed: true },
  },
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      productId: true,
      size: true,
      qty: true,
      unitPrice: true,
      lineTotal: true,
      toppings: true,
      product: {
        select: {
          name: true,
          imageUrl: true,
        },
      },
    },
  },
} as const satisfies Prisma.OrderSelect;

type OrderHistoryRecord = Prisma.OrderGetPayload<{
  select: typeof orderHistorySelect;
}>;

function formatOrder(order: OrderHistoryRecord) {
  const paidPayment = order.payments?.[0];
  return {
    id: order.id,
    orderId: order.id,
    status: order.status,
    total: order.total,
    discountAmount: order.discountAmount,
    pointsUsed: paidPayment?.pointsUsed ?? 0,
    paidAmount: paidPayment?.amount ?? null,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      imageUrl: item.product.imageUrl,
      size: item.size,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      toppings: item.toppings,
    })),
  };
}


@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrderInput) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('Cart cannot be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      // User ID comes from the verified JWT.
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });

      if (!user) {
        throw new UnauthorizedException('User does not exist');
      }

      // Fetch prices from PostgreSQL, never from the request.
      const productIds = [
        ...new Set(input.items.map((item) => item.productId)),
      ];

      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: {
          id: true,
          price: true,
          productIngredients: {
            select: {
              ingredientId: true,
              quantity: true,
              isOptional: true,
              ingredient: {
                select: {
                  name: true,
                  stockQuantity: true,
                },
              },
            },
          },
        },
      });

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      for (const productId of productIds) {
        if (!productMap.has(productId)) {
          throw new BadRequestException(
            `Product ${productId} does not exist`,
          );
        }
      }

      // Check quantities across all cart lines for each product.
      const requestedQuantity = new Map<number, number>();

      for (const item of input.items) {
        requestedQuantity.set(
          item.productId,
          (requestedQuantity.get(item.productId) ?? 0) + item.qty,
        );
      }

      const ingredientRequirements = buildIngredientRequirements(
        requestedQuantity,
        productMap,
      );
      validateIngredientAvailability(ingredientRequirements);

      // Calculate each line using authoritative product prices.
      const orderItems = input.items.map((item) => {
        const product = productMap.get(item.productId)!;

        const sizeCharge =
          SIZE_SURCHARGE[
            item.size as keyof typeof SIZE_SURCHARGE
          ];

        if (sizeCharge === undefined) {
          throw new BadRequestException('Invalid product size');
        }

        const toppings = item.toppings ?? (item as any).topping ?? [];

        if (new Set(toppings).size !== toppings.length) {
          throw new BadRequestException(
            'Duplicate toppings are not allowed',
          );
        }

        let toppingCharge = 0;

        for (const topping of toppings) {
          const price =
            TOPPING_PRICE[
              topping as keyof typeof TOPPING_PRICE
            ];

          if (price === undefined) {
            throw new BadRequestException(
              `Invalid topping: ${topping}`,
            );
          }

          toppingCharge += price;
        }

        const unitPrice = checkMoney(
          product.price + sizeCharge + toppingCharge,
        );

        const lineTotal = checkMoney(
          unitPrice * item.qty,
        );

        return {
          product: {
            connect: { id: item.productId },
          },
          size: item.size,
          qty: item.qty,
          unitPrice,
          lineTotal,
          toppings,
        };
      });

      
      // 1. Tính tổng tiền sản phẩm trước giảm giá.
      const subtotal = checkMoney(
        orderItems.reduce(
          (sum, item) => sum + item.lineTotal,
          0,
        ),
      );

      // 2. Kiểm tra mã khuyến mãi và tính tiền giảm.
      const {
        promotionId,
        discountAmount,
      } = await resolvePromotion(
        tx,
        input.promotionCode,
        subtotal,
      );

      // 3. Tổng tiền khách thực sự phải thanh toán.
      const finalTotal = checkMoney(
        subtotal - discountAmount,
      );

      await consumeIngredients(tx, ingredientRequirements);

      // 4. Tạo Order và OrderItems trong transaction.
      const order = await tx.order.create({
        data: {
          user: {
            connect: { id: input.userId },
          },

          status: PrismaOrderStatus.PENDING,

          total: finalTotal,
          discountAmount,

          // Chỉ liên kết Promotion khi có mã hợp lệ.
          ...(promotionId !== null
            ? {
                promotion: {
                  connect: { id: promotionId },
                },
              }
            : {}),

          items: {
            create: orderItems,
          },
        },

        include: {
          items: {
            orderBy: { id: 'asc' },
          },
        },
      });

      // 5. Trả kết quả tạo đơn.
      return {
        orderId: order.id,
        status: order.status,
        subtotal,
        discountAmount: order.discountAmount,
        total: order.total,
        promotionId: order.promotionId,
        userId: order.userId,

        items: order.items.map((item) => ({
          productId: item.productId,
          size: item.size,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          toppings: item.toppings,
        })),
      };

    });
  }

  
async changeStatus(
  orderId: number,
  nextStatus: OrderStatus,
) {
  return this.prisma.$transaction((tx) =>
    transitionOrderStatus(tx, orderId, nextStatus),
  );
}


/**
 * GET /orders/me
 * Return order history for the authenticated user.
 */
async getMyOrders(userId: number) {
  const orders = await this.prisma.order.findMany({
    where: { userId, channel: OrderChannel.ONLINE },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    select: orderHistorySelect,
  });

  return {
    userId,
    orders: orders.map(formatOrder),
  };
}

/**
 * GET /orders/:id
 * Return an order only if it belongs to this user.
 */
async getOrderById(userId: number, orderId: number) {
  const order = await this.prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      channel: OrderChannel.ONLINE,
    },
    select: orderHistorySelect,
  });

  if (!order) {
    throw new NotFoundException(
      'Order not found',
    );
  }

  return formatOrder(order);
}

async cancelMyOrder(userId: number, orderId: number) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId,
        channel: OrderChannel.ONLINE,
      },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return cancelOrderInTransaction(
      tx,
      orderId,
      CUSTOMER_CANCELLABLE_STATUSES,
    );
  });
}

}
