import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  OrderChannel,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildIngredientRequirements,
  validateIngredientAvailability,
} from '../inventory/recipe-inventory';
import { SIZE_SURCHARGE, TOPPING_PRICE } from '../orders/pricing';
import { CreateCounterSaleDto } from './dto';

const MAX_INT = 2147483647;

function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_INT) {
    throw new BadRequestException('Counter sale amount exceeds supported range');
  }
  return value;
}

const itemSelect = {
  productId: true,
  size: true,
  qty: true,
  toppings: true,
  lineTotal: true,
} as const;

function normalizeItems(items: Array<{ productId: number; size: string; qty: number; toppings?: string[] | null }>) {
  // Canonical comparison prevents reusing an idempotency key with different cart items.
  return items.map((item) => ({
    productId: item.productId,
    size: item.size,
    qty: item.qty,
    toppings: [...(item.toppings ?? [])].sort(),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

@Injectable()
export class CounterSalesService {
  constructor(private readonly prisma: PrismaService) {}

  private async replay(
    key: string,
    operatorId: number,
    dto: CreateCounterSaleDto,
  ) {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      include: { order: { include: { items: { select: itemSelect } } } },
    });
    if (!existing) return null;
    const order = existing.order;
    if (
      order.userId !== operatorId ||
      order.channel !== OrderChannel.COUNTER ||
      existing.method !== dto.method ||
      existing.status !== PaymentStatus.SUCCESS ||
      JSON.stringify(normalizeItems(order.items.map((item) => ({
        productId: item.productId, size: item.size, qty: item.qty,
        toppings: Array.isArray(item.toppings) ? item.toppings as string[] : [],
      })))) !== JSON.stringify(normalizeItems(dto.items))
    ) {
      throw new ConflictException('Idempotency-Key was used for a different sale');
    }
    return {
      orderId: order.id, status: order.status, channel: order.channel,
      total: order.total, method: existing.method, paymentId: existing.id,
      replayed: true,
    };
  }

  async create(operatorId: number, dto: CreateCounterSaleDto, idempotencyKey: string) {
    if (!Array.isArray(dto.items) || dto.items.length < 1 || dto.items.length > 50) {
      throw new BadRequestException('Sale must contain 1-50 item rows');
    }
    const key = `COUNTER-${idempotencyKey}`;
    const old = await this.replay(key, operatorId, dto);
    if (old) return old;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const operator = await tx.user.findUnique({
          where: { id: operatorId }, select: { id: true },
        });
        if (!operator) throw new BadRequestException('Operator account does not exist');

        const ids = [...new Set(dto.items.map((item) => item.productId))];
        const products = await tx.product.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, price: true,
            productIngredients: {
              select: {
                ingredientId: true, quantity: true, isOptional: true,
                ingredient: { select: { name: true, stockQuantity: true } },
              },
            },
          },
        });
        if (products.length !== ids.length) {
          throw new BadRequestException('Sale contains an unknown product');
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        const quantities = new Map<number, number>();
        for (const line of dto.items) {
          const sum = (quantities.get(line.productId) ?? 0) + line.qty;
          if (!Number.isSafeInteger(sum) || sum > MAX_INT) {
            throw new BadRequestException('Invalid sale quantity');
          }
          quantities.set(line.productId, sum);
        }
        const requirements = buildIngredientRequirements(quantities, productMap);
        validateIngredientAvailability(requirements);

        const lines = dto.items.map((item) => {
          const price = productMap.get(item.productId)!.price;
          const surcharge = SIZE_SURCHARGE[item.size as keyof typeof SIZE_SURCHARGE];
          if (surcharge === undefined) throw new BadRequestException('Invalid size');
          let toppingTotal = 0;
          const toppings = item.toppings ?? [];
          if (new Set(toppings).size !== toppings.length) {
            throw new BadRequestException('Duplicate toppings');
          }
          for (const topping of toppings) {
            const toppingPrice = TOPPING_PRICE[topping as keyof typeof TOPPING_PRICE];
            if (toppingPrice === undefined) throw new BadRequestException('Invalid topping');
            toppingTotal += toppingPrice;
          }
          const unitPrice = money(price + surcharge + toppingTotal);
          return {
            productId: item.productId,
            size: item.size, qty: item.qty, toppings,
            unitPrice, lineTotal: money(unitPrice * item.qty),
          };
        });
        const total = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));

        // Atomic recipe stock consumption. All-or-nothing with Order and Payment.
        for (const requirement of requirements.sort((a, b) => a.ingredientId - b.ingredientId)) {
          const updated = await tx.ingredient.updateMany({
            where: { id: requirement.ingredientId, stockQuantity: { gte: requirement.quantity } },
            data: { stockQuantity: { decrement: requirement.quantity } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException(`Insufficient stock for ${requirement.ingredientName}`);
          }
        }

        // Operator is stored as userId for COUNTER orders; no customer loyalty is granted.
        const order = await tx.order.create({
          data: {
            userId: operatorId,
            channel: OrderChannel.COUNTER,
            status: OrderStatus.PAID,
            total,
            items: { create: lines },
          },
          select: { id: true, status: true, channel: true, total: true },
        });
        // This is an explicit demo confirmation, not a bank-verified transaction.
        const payment = await tx.payment.create({
          data: {
            orderId: order.id, method: dto.method,
            status: PaymentStatus.SUCCESS, amount: total, pointsUsed: 0,
            idempotencyKey: key,
          },
          select: { id: true },
        });
        return { orderId: order.id, status: order.status, channel: order.channel, total: order.total,
          method: dto.method, paymentId: payment.id, replayed: false };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.replay(key, operatorId, dto);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
