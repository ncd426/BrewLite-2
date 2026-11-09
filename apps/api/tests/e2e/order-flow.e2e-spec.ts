import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { createOrderFlowApp, runOrderFlow } from "./order-flow-test-kit";

describe("Order flow E2E", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createOrderFlowApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a topped, medium-sized order from an in-stock menu product", async () => {
    await runOrderFlow(app, [
      { menuIndex: 0, size: "M", qty: 1, toppings: ["Trân châu"] },
    ]);
  });
});
