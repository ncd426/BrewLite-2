import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../src/prisma/prisma.service";
import { AppModule } from "../../src/app.module";
import request from "supertest";
import { App } from "supertest/types";
import { randomUUID } from "node:crypto";

type OrderLine = {
  menuIndex: number;
  size: "S" | "M" | "L";
  qty: number;
  toppings?: string[];
};

export async function createOrderFlowApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export async function runOrderFlow(
  app: INestApplication<App>,
  lines: OrderLine[],
  { rejectInvalidToken = false } = {},
) {
  const email = `a2-23-${randomUUID()}@brewlite.test`;
  let orderId: number | undefined;

  try {
    const registration = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "A2-23 E2E Customer",
        email,
        password: "a2-23-test-password",
      })
      .expect(201);
    const accessToken: string = registration.body.accessToken;
    expect(accessToken).toEqual(expect.any(String));

    const menuResponse = await request(app.getHttpServer())
      .get("/products")
      .expect(200);
    expect(Array.isArray(menuResponse.body)).toBe(true);

    const availableProducts = menuResponse.body.filter(
      (product: { inStock: boolean }) => product.inStock,
    );
    expect(availableProducts.length).toBeGreaterThan(
      Math.max(...lines.map((line) => line.menuIndex)),
    );

    const items = lines.map((line) => {
      const product = availableProducts[line.menuIndex];
      return {
        productId: product.id,
        size: line.size,
        qty: line.qty,
        ...(line.toppings ? { toppings: line.toppings } : {}),
      };
    });

    await request(app.getHttpServer())
      .post("/orders")
      .send({ items })
      .expect(401);

    if (rejectInvalidToken) {
      await request(app.getHttpServer())
        .post("/orders")
        .set("Authorization", "Bearer invalid-token")
        .send({ items })
        .expect(401);
    }

    const created = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ items })
      .expect(201);

    orderId = created.body.orderId;
    expect(orderId).toEqual(expect.any(Number));
    expect(created.body).toMatchObject({
      status: "PENDING",
      userId: registration.body.id,
    });
    expect(created.body.items).toHaveLength(items.length);

    const persistedOrder = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(persistedOrder.body).toMatchObject({
      id: orderId,
      orderId,
      status: "PENDING",
    });
    expect(persistedOrder.body.items).toHaveLength(items.length);
    expect(persistedOrder.body.items).toEqual(
      expect.arrayContaining(
        items.map((item) =>
          expect.objectContaining({
            productId: item.productId,
            size: item.size,
            qty: item.qty,
            toppings: item.toppings ?? [],
          }),
        ),
      ),
    );

    const history = await request(app.getHttpServer())
      .get("/orders/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(
      history.body.orders.map((order: { id: number }) => order.id),
    ).toContain(orderId);

    return { orderId, items };
  } finally {
    await cleanTestCustomer(app.get(PrismaService), email);
  }
}

async function cleanTestCustomer(prisma: PrismaService, email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      orders: {
        select: {
          id: true,
          items: { select: { productId: true, qty: true } },
        },
      },
    },
  });
  if (!user) return;

  const productIds = [
    ...new Set(
      user.orders.flatMap((order) => order.items.map((item) => item.productId)),
    ),
  ];
  const recipe = await prisma.productIngredient.findMany({
    where: { productId: { in: productIds }, isOptional: false },
    select: { ingredientId: true, productId: true, quantity: true },
  });
  const restoredStock = new Map<number, number>();
  for (const order of user.orders) {
    for (const item of order.items) {
      for (const ingredient of recipe) {
        if (ingredient.productId === item.productId) {
          restoredStock.set(
            ingredient.ingredientId,
            (restoredStock.get(ingredient.ingredientId) ?? 0) +
              ingredient.quantity * item.qty,
          );
        }
      }
    }
  }
  const orderIds = user.orders.map((order) => order.id);

  await prisma.$transaction(async (tx) => {
    for (const [ingredientId, quantity] of restoredStock) {
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: { stockQuantity: { increment: quantity } },
      });
    }
    if (orderIds.length > 0) {
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await tx.user.delete({ where: { id: user.id } });
  });
}
