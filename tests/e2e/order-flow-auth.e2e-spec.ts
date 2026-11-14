import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { createOrderFlowApp, runOrderFlow } from "./order-flow-test-kit";

describe("Order flow authentication E2E", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createOrderFlowApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects missing and invalid JWTs before accepting an authenticated order", async () => {
    await runOrderFlow(app, [{ menuIndex: 0, size: "S", qty: 1 }], {
      rejectInvalidToken: true,
    });
  });
});
