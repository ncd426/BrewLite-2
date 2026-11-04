import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { transitionOrderStatus } from '../orders/order-state-machine';
import {
  AdjustInventoryDto, CreateIngredientDto, CreateProductDto,
  RecipeLineDto, UpdateProductDto,
} from './dto';

const staffTransitions: OrderStatus[] = [
  OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED,
];

const activeStatuses: OrderStatus[] = [
  OrderStatus.PAID, OrderStatus.PREPARING,
  OrderStatus.READY, OrderStatus.COMPLETED,
];

const productInclude = {
  productIngredients: {
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class BackofficeService {
  constructor(private readonly prisma: PrismaService) {}

  // Staff sees operational order details, not customer passwords or credentials.
  listStaffOrders() {
    return this.prisma.order.findMany({
      where: { status: { in: activeStatuses } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: {
        id: true, status: true, channel: true, total: true, createdAt: true,
        user: { select: { name: true } },
        items: {
          orderBy: { id: 'asc' as const },
          select: {
            id: true, size: true, qty: true, toppings: true,
            product: { select: { name: true } },
          },
        },
      },
    });
  }

  advanceOrder(orderId: number, next: OrderStatus) {
    if (!staffTransitions.includes(next)) {
      throw new BadRequestException('Staff may only advance preparation/delivery');
    }
    // The existing state machine validates every status transition atomically.
    return this.prisma.$transaction((tx) => transitionOrderStatus(tx, orderId, next));
  }

  async overview() {
    const [users, products, orders, completedOrders, ingredients, payments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      this.prisma.ingredient.findMany({ select: { stockQuantity: true, minStock: true } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);
    return {
      users, products, orders, completedOrders,
      lowStock: ingredients.filter((i) => i.stockQuantity <= i.minStock).length,
      simulatedRevenue: payments._sum.amount ?? 0,
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true, role: true, loyaltyPoints: true, createdAt: true },
      take: 200,
    });
  }

  async setUserRole(operatorId: number, targetId: number, role: UserRole) {
    if (operatorId === targetId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: targetId }, select: { id: true, role: true },
      });
      if (!target) throw new NotFoundException('User not found');
      if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
        const numberOfAdmins = await tx.user.count({ where: { role: UserRole.ADMIN } });
        if (numberOfAdmins <= 1) throw new ConflictException('Cannot remove last admin');
      }
      return tx.user.update({
        where: { id: targetId }, data: { role },
        select: { id: true, name: true, email: true, role: true },
      });
    });
  }

  listProducts() {
    return this.prisma.product.findMany({ orderBy: { id: 'asc' }, include: productInclude });
  }

  private async validateRecipe(tx: Prisma.TransactionClient, recipe: RecipeLineDto[]) {
    const ids = recipe.map((line) => line.ingredientId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Ingredient repeated in recipe');
    }
    const count = await tx.ingredient.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new BadRequestException('Recipe references unknown ingredients');
  }

  createProduct(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.validateRecipe(tx, dto.recipe);
      return tx.product.create({
        data: {
          name: dto.name.trim(), price: dto.price,
          category: dto.category?.trim() ?? null,
          description: dto.description?.trim() ?? null,
          imageUrl: dto.imageUrl?.trim() || null,
          productIngredients: {
            create: dto.recipe.map((line) => ({
              ingredient: { connect: { id: line.ingredientId } },
              quantity: line.quantity,
              isOptional: line.isOptional ?? false,
            })),
          },
        },
        include: productInclude,
      });
    });
  }

  updateProduct(id: number, dto: UpdateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!old) throw new NotFoundException('Product not found');
      if (dto.recipe) {
        await this.validateRecipe(tx, dto.recipe);
        await tx.productIngredient.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.category !== undefined ? { category: dto.category.trim() || null } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() || null } : {}),
          ...(dto.recipe ? {
            productIngredients: {
              create: dto.recipe.map((line) => ({
                ingredientId: line.ingredientId,
                quantity: line.quantity,
                isOptional: line.isOptional ?? false,
              })),
            },
          } : {}),
        },
        include: productInclude,
      });
    });
  }

  async deleteProduct(id: number) {
    const orderItems = await this.prisma.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      throw new ConflictException('Product has order history; edit it instead of deleting');
    }
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Product is referenced by other records');
      }
      throw error;
    }
    return { id, deleted: true };
  }

  listInventory() {
    return this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
  }

  createIngredient(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        code: dto.code.trim().toUpperCase(), name: dto.name.trim(), unit: dto.unit.trim(),
        stockQuantity: dto.stockQuantity, minStock: dto.minStock,
        ...(dto.importPrice !== undefined ? { importPrice: dto.importPrice } : {}),
      },
    });
  }

  async adjustInventory(id: number, dto: AdjustInventoryDto) {
    if (dto.delta === 0 && dto.minStock === undefined) {
      throw new BadRequestException('No stock change specified');
    }
    const changed = await this.prisma.ingredient.updateMany({
      where: {
        id,
        stockQuantity: {
          gte: Math.max(0, -dto.delta),
          lte: 2147483647 - Math.max(0, dto.delta),
        },
      },
      data: {
        stockQuantity: { increment: dto.delta },
        ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
      },
    });
    if (changed.count !== 1) {
      const exists = await this.prisma.ingredient.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Ingredient not found');
      throw new ConflictException('Stock adjustment exceeds allowed range');
    }
    return this.prisma.ingredient.findUnique({ where: { id } });
  }
}
