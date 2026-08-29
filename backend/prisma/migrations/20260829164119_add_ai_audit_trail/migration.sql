-- CreateTable
CREATE TABLE "AIAuditLog" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "recoveryCaseId" TEXT,
    "eventType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT,
    "strategy" TEXT,
    "confidence" DOUBLE PRECISION,
    "fallbackRequired" BOOLEAN,
    "fallbackAction" TEXT,
    "fallbackReason" TEXT,
    "modelVersions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIAuditLog_decisionId_createdAt_idx" ON "AIAuditLog"("decisionId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditLog_merchantId_createdAt_idx" ON "AIAuditLog"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditLog_customerId_createdAt_idx" ON "AIAuditLog"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditLog_recoveryCaseId_createdAt_idx" ON "AIAuditLog"("recoveryCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAuditLog_eventType_idx" ON "AIAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AIAuditLog_stage_idx" ON "AIAuditLog"("stage");

-- AddForeignKey
ALTER TABLE "AIAuditLog" ADD CONSTRAINT "AIAuditLog_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "AIDecision"("decisionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAuditLog" ADD CONSTRAINT "AIAuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
