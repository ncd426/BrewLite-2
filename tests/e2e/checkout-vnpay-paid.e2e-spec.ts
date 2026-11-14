import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import request from "supertest";

import { PrismaService } from "../../apps/api/src/prisma/prisma.service";
import { createSignedVnpayIpn } from "../../apps/api/src/payments/payment-test-utils";
import { createOrderFlowApp } from "./order-flow-test-kit";

describe("Checkout through simulated VNPay IPN - API E2E", () => {
  let app: INestApplication<App>;
  let previousTmnCode: string | undefined;
  let previousHashSecret: string | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for API E2E");
    const url = new URL(databaseUrl);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.port !== "5434" ||
      url.pathname !== "/brewlite_test"
    ) {
      throw new Error("Refusing checkout E2E outside isolated test DB");
    }
    previousTmnCode = process.env.VNPAY_TMN_CODE;
    previousHashSecret = process.env.VNPAY_HASH_SECRET;
    process.env.VNPAY_TMN_CODE = "E2E-SANDBOX";
    process.env.VNPAY_HASH_SECRET = "isolated-e2e-signature-secret";
    app = await createOrderFlowApp();
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (previousTmnCode === undefined) delete process.env.VNPAY_TMN_CODE;
      else process.env.VNPAY_TMN_CODE = previousTmnCode;
      if (previousHashSecret === undefined) delete process.env.VNPAY_HASH_SECRET;
      else process.env.VNPAY_HASH_SECRET = previousHashSecret;
    }
  });

  it("registers, selects menu item, orders, pays and reads PAID confirmation", async () => {
    const prisma = app.get(PrismaService);
    const email = `a2-28-${randomUUID()}@brewlite.test`;
    let userId: number | undefined;
    let orderId: number | undefined;

    try {
      const registered = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ name: "A2 E2E Buyer", email, password: "isolated-e2e-password" })
        .expect(201);
      userId = registered.body.id;
      const token: string = registered.body.accessToken;
      expect(token).toEqual(expect.any(String));

      const menu = await request(app.getHttpServer())
        .get("/products")
        .expect(200);
      const product = menu.body.find((item: { inStock: boolean }) => item.inStock);
      expect(product).toBeDefined();

      const created = await request(app.getHttpServer())
        .post("/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ items: [{ productId: product.id, size: "S", qty: 1, toppings: [] }] })
        .expect(201);
      orderId = created.body.orderId;
      expect(created.body.status).toBe("PENDING");

      const payment = await request(app.getHttpServer())
        .post("/payments")
        .set("Authorization", `Bearer ${token}`)
        .set("Idempotency-Key", randomUUID())
        .send({ orderId, method: "VNPAY" })
        .expect(201);
      expect(payment.body).toMatchObject({ orderId, paymentStatus: "PENDING" });

      const ipn = await request(app.getHttpServer())
        .get("/payments/webhooks/vnpay")
        .query(createSignedVnpayIpn(payment.body.id, payment.body.amount))
        .expect(200);
      expect(ipn.body).toEqual({ RspCode: "00", Message: "Confirm Success" });

      const confirmedOrder = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(confirmedOrder.body.status).toBe("PAID");

      const history = await request(app.getHttpServer())
        .get("/orders/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(history.body.orders).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: orderId, status: "PAID" }),
      ]));

      const persistedPayment = await prisma.payment.findUnique({
        where: { id: payment.body.id },
      });
      expect(persistedPayment?.status).toBe("SUCCESS");
    } finally {
      // Clean only this test's records and return its reserved ingredient stock.
      if (userId !== undefined) {
        const cleanupUserId = userId;
        const orders = await prisma.order.findMany({
          where: { userId: cleanupUserId },
          include: { items: true },
        });
        const orderIds = orders.map((order) => order.id);
        const recipe = await prisma.productIngredient.findMany({
          where: {
            productId: { in: orders.flatMap((order) => order.items.map((item) => item.productId)) },
            isOptional: false,
          },
        });
        const restore = new Map<number, number>();
        for (const order of orders) {
          for (const item of order.items) {
            for (const ingredient of recipe) {
              if (ingredient.productId !== item.productId) continue;
              restore.set(
                ingredient.ingredientId,
                (restore.get(ingredient.ingredientId) ?? 0) + ingredient.quantity * item.qty,
              );
            }
          }
        }
        await prisma.$transaction(async (tx) => {
          for (const [id, quantity] of restore) {
            await tx.ingredient.update({
              where: { id },
              data: { stockQuantity: { increment: quantity } },
            });
          }
          if (orderIds.length) {
            await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.order.deleteMany({ where: { id: { in: orderIds } } });
          }
          await tx.user.delete({ where: { id: cleanupUserId } });
        });
      }
    }
  }, 30000);
});
