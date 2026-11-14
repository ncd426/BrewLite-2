import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { createOrderFlowApp, runOrderFlow } from "./order-flow-test-kit";

describe("Order persistence E2E", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createOrderFlowApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("persists multiple menu items and returns them in the customer order history", async () => {
    await runOrderFlow(app, [
      { menuIndex: 0, size: "S", qty: 1 },
      { menuIndex: 1, size: "L", qty: 1, toppings: ["Thạch"] },
    ]);
  });
});
