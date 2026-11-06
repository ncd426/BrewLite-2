ALTER TABLE "Payment"
  ADD COLUMN "providerReference" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payment_providerReference_key"
  ON "Payment"("providerReference");

UPDATE "Payment"
SET "expiresAt" = "createdAt" + INTERVAL '15 minutes'
WHERE "status" = 'PENDING';

WITH ranked_pending AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "orderId" ORDER BY "createdAt" DESC, "id" DESC
  ) AS position
  FROM "Payment"
  WHERE "status" = 'PENDING'
)
UPDATE "Payment"
SET "status" = 'FAILED'
WHERE "id" IN (SELECT "id" FROM ranked_pending WHERE position > 1);

CREATE UNIQUE INDEX "Payment_one_pending_per_order_key"
  ON "Payment"("orderId")
  WHERE "status" = 'PENDING';