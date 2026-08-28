-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "subscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "WebhookEvent_subscriptionId_idx" ON "WebhookEvent"("subscriptionId");

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
