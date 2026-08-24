-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ENABLED', 'DISABLED', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentFailureCategory" AS ENUM ('NONE', 'INSUFFICIENT_FUNDS', 'BANK_DECLINED', 'CARD_DECLINED', 'NETWORK_ERROR', 'AUTHENTICATION_FAILED', 'OTP_FAILURE', 'LIMIT_EXCEEDED', 'EXPIRED_CARD', 'FRAUD_REVIEW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RecoveryCaseType" AS ENUM ('PAYMENT_FAILURE', 'CHECKOUT_ABANDONMENT', 'SUBSCRIPTION_FAILURE', 'RECEIVABLE', 'MANDATE_FAILURE');

-- CreateEnum
CREATE TYPE "RecoveryCaseStatus" AS ENUM ('OPEN', 'ANALYZING', 'ACTION_PENDING', 'IN_PROGRESS', 'RECOVERED', 'FAILED', 'EXPIRED', 'STOPPED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('RETRY_PAYMENT', 'SEND_PAYMENT_LINK', 'SEND_EMAIL', 'SEND_SMS', 'SEND_WHATSAPP', 'VOICE_CALL', 'HINGLISH_VOICE', 'OFFER_ALTERNATIVE_PAYMENT', 'ESCALATE', 'WAIT', 'STOP', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RecoveryOutcome" AS ENUM ('RECOVERED', 'PARTIALLY_RECOVERED', 'NOT_RECOVERED', 'CUSTOMER_RESPONDED', 'PROMISE_TO_PAY', 'NO_RESPONSE', 'STOPPED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('CREATED', 'RUNNING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'AGENT_ENABLED', 'AGENT_DISABLED', 'POLICY_CHANGED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'AI_DECISION', 'RECOVERY_STARTED', 'RECOVERY_ACTION', 'RECOVERY_COMPLETED', 'RECOVERY_FAILED', 'WEBHOOK_RECEIVED', 'BATCH_STARTED', 'BATCH_COMPLETED', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'VOICE', 'HINGLISH_VOICE', 'DASHBOARD');

-- CreateEnum
CREATE TYPE "PromiseStatus" AS ENUM ('PROMISED', 'PARTIALLY_PAID', 'PAID', 'BROKEN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('CREATED', 'ACTIVE', 'PENDING', 'HALTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "businessName" TEXT,
    "agentStatus" "AgentStatus" NOT NULL DEFAULT 'DISABLED',
    "defaultEnvironment" "Environment" NOT NULL DEFAULT 'TEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantUser" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RazorpayConnection" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "keyIdEncrypted" TEXT NOT NULL,
    "keySecretEncrypted" TEXT NOT NULL,
    "webhookSecretHash" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RazorpayConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "language" TEXT DEFAULT 'en',
    "preferredChannel" "Channel" DEFAULT 'EMAIL',
    "totalPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalFailed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalRecovered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "razorpayPaymentId" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayInvoiceId" TEXT,
    "environment" "Environment" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL,
    "failureCategory" "PaymentFailureCategory" NOT NULL DEFAULT 'NONE',
    "failureReason" TEXT,
    "method" TEXT,
    "cardNetwork" TEXT,
    "bank" TEXT,
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "razorpaySubscriptionId" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "planId" TEXT,
    "amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "externalInvoiceId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "paymentId" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "type" "RecoveryCaseType" NOT NULL,
    "status" "RecoveryCaseStatus" NOT NULL DEFAULT 'OPEN',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "amountAtRisk" DECIMAL(18,2) NOT NULL,
    "recoveredAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "recoveryProbability" DECIMAL(5,4),
    "reason" TEXT,
    "diagnosis" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActionAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),

    CONSTRAINT "RecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDecision" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "decisionType" "DecisionType" NOT NULL,
    "confidence" DECIMAL(5,4),
    "reasoning" TEXT,
    "diagnosis" JSONB,
    "features" JSONB,
    "constraints" JSONB,
    "modelName" TEXT,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "type" "DecisionType" NOT NULL,
    "channel" "Channel",
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "message" TEXT,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryPolicy" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxRecoveryDays" INTEGER NOT NULL DEFAULT 7,
    "minimumAmount" DECIMAL(18,2),
    "maximumAmount" DECIMAL(18,2),
    "allowVoice" BOOLEAN NOT NULL DEFAULT false,
    "allowHinglishVoice" BOOLEAN NOT NULL DEFAULT false,
    "stopAfterRecovery" BOOLEAN NOT NULL DEFAULT true,
    "stopAfterCustomerPaid" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryBatch" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'CREATED',
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "processedCases" INTEGER NOT NULL DEFAULT 0,
    "recoveredCases" INTEGER NOT NULL DEFAULT 0,
    "amountAtRisk" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountRecovered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "configuration" JSONB,

    CONSTRAINT "RecoveryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromiseToPay" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "recoveryCaseId" TEXT,
    "promisedAmount" DECIMAL(18,2) NOT NULL,
    "promisedDate" TIMESTAMP(3) NOT NULL,
    "status" "PromiseStatus" NOT NULL DEFAULT 'PROMISED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromiseToPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "razorpayEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "environment" "Environment" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceRecovery" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transcript" TEXT,
    "outcome" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantUser_merchantId_userId_key" ON "MerchantUser"("merchantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RazorpayConnection_merchantId_environment_key" ON "RazorpayConnection"("merchantId", "environment");

-- CreateIndex
CREATE INDEX "Customer_merchantId_idx" ON "Customer"("merchantId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Payment_merchantId_status_idx" ON "Payment"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_merchantId_razorpayPaymentId_key" ON "Payment"("merchantId", "razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Subscription_merchantId_status_idx" ON "Subscription"("merchantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_merchantId_razorpaySubscriptionId_key" ON "Subscription"("merchantId", "razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "Invoice_merchantId_status_idx" ON "Invoice"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "RecoveryCase_merchantId_status_idx" ON "RecoveryCase"("merchantId", "status");

-- CreateIndex
CREATE INDEX "RecoveryCase_riskLevel_idx" ON "RecoveryCase"("riskLevel");

-- CreateIndex
CREATE INDEX "RecoveryCase_openedAt_idx" ON "RecoveryCase"("openedAt");

-- CreateIndex
CREATE INDEX "AIDecision_merchantId_idx" ON "AIDecision"("merchantId");

-- CreateIndex
CREATE INDEX "AIDecision_recoveryCaseId_idx" ON "AIDecision"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "RecoveryAction_merchantId_status_idx" ON "RecoveryAction"("merchantId", "status");

-- CreateIndex
CREATE INDEX "RecoveryAction_recoveryCaseId_idx" ON "RecoveryAction"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "RecoveryPolicy_merchantId_enabled_idx" ON "RecoveryPolicy"("merchantId", "enabled");

-- CreateIndex
CREATE INDEX "RecoveryBatch_merchantId_status_idx" ON "RecoveryBatch"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PromiseToPay_merchantId_status_idx" ON "PromiseToPay"("merchantId", "status");

-- CreateIndex
CREATE INDEX "PromiseToPay_promisedDate_idx" ON "PromiseToPay"("promisedDate");

-- CreateIndex
CREATE INDEX "WebhookEvent_merchantId_eventType_idx" ON "WebhookEvent"("merchantId", "eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_razorpayEventId_idx" ON "WebhookEvent"("razorpayEventId");

-- CreateIndex
CREATE INDEX "AuditLog_merchantId_createdAt_idx" ON "AuditLog"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "VoiceRecovery_recoveryCaseId_idx" ON "VoiceRecovery"("recoveryCaseId");

-- AddForeignKey
ALTER TABLE "MerchantUser" ADD CONSTRAINT "MerchantUser_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantUser" ADD CONSTRAINT "MerchantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RazorpayConnection" ADD CONSTRAINT "RazorpayConnection_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDecision" ADD CONSTRAINT "AIDecision_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDecision" ADD CONSTRAINT "AIDecision_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryPolicy" ADD CONSTRAINT "RecoveryPolicy_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryBatch" ADD CONSTRAINT "RecoveryBatch_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceRecovery" ADD CONSTRAINT "VoiceRecovery_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
