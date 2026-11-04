-- Non-destructive: existing orders keep their ONLINE channel.
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'COUNTER');
ALTER TABLE "Order" ADD COLUMN "channel" "OrderChannel" NOT NULL DEFAULT 'ONLINE';
CREATE INDEX "Order_channel_idx" ON "Order"("channel");
