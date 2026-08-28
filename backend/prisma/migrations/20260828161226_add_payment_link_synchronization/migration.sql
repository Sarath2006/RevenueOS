-- CreateEnum
CREATE TYPE "PaymentLinkStatus" AS ENUM ('CREATED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "RecoveryCase" ADD COLUMN     "paymentLinkId" TEXT;

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "razorpayPaymentLinkId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "environment" "Environment" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentLinkStatus" NOT NULL,
    "acceptPartial" BOOLEAN NOT NULL DEFAULT false,
    "firstMinPartialAmount" DECIMAL(18,2),
    "referenceId" TEXT,
    "description" TEXT,
    "shortUrl" TEXT,
    "expireBy" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reminderEnable" BOOLEAN,
    "upiLink" BOOLEAN,
    "whatsappLink" BOOLEAN,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentLink_merchantId_status_idx" ON "PaymentLink"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PaymentLink_customerId_idx" ON "PaymentLink"("customerId");

-- CreateIndex
CREATE INDEX "PaymentLink_razorpayOrderId_idx" ON "PaymentLink"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "PaymentLink_referenceId_idx" ON "PaymentLink"("referenceId");

-- CreateIndex
CREATE INDEX "PaymentLink_createdAt_idx" ON "PaymentLink"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_merchantId_razorpayPaymentLinkId_key" ON "PaymentLink"("merchantId", "razorpayPaymentLinkId");

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
