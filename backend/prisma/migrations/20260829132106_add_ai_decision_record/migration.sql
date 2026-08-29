/*
  Warnings:

  - You are about to drop the column `confidence` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `constraints` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `decisionType` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `modelVersion` on the `AIDecision` table. All the data in the column will be lost.
  - You are about to drop the column `reasoning` on the `AIDecision` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[decisionId]` on the table `AIDecision` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `alternatives` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channel` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decisionConfidence` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decisionId` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decisionReason` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputFeatures` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelVersions` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `negativeSignals` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `opportunityScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positiveSignals` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priorityBand` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priorityScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `probability` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `probabilityBand` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `probabilityConfidence` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `probabilityPercent` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riskScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strategy` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strategyScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timing` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AIDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgencyScore` to the `AIDecision` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AIDecision" DROP CONSTRAINT "AIDecision_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "AIDecision" DROP CONSTRAINT "AIDecision_recoveryCaseId_fkey";

-- AlterTable
ALTER TABLE "AIDecision" DROP COLUMN "confidence",
DROP COLUMN "constraints",
DROP COLUMN "decisionType",
DROP COLUMN "diagnosis",
DROP COLUMN "features",
DROP COLUMN "modelName",
DROP COLUMN "modelVersion",
DROP COLUMN "reasoning",
ADD COLUMN     "alternatives" JSONB NOT NULL,
ADD COLUMN     "amountScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "decisionConfidence" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "decisionId" TEXT NOT NULL,
ADD COLUMN     "decisionReason" TEXT NOT NULL,
ADD COLUMN     "decisionStatus" TEXT NOT NULL DEFAULT 'CREATED',
ADD COLUMN     "inputFeatures" JSONB NOT NULL,
ADD COLUMN     "modelVersions" JSONB NOT NULL,
ADD COLUMN     "negativeSignals" JSONB NOT NULL,
ADD COLUMN     "opportunityScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "outcomeAmount" DOUBLE PRECISION,
ADD COLUMN     "outcomeRecordedAt" TIMESTAMP(3),
ADD COLUMN     "positiveSignals" JSONB NOT NULL,
ADD COLUMN     "priorityBand" TEXT NOT NULL,
ADD COLUMN     "priorityScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "probability" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "probabilityBand" TEXT NOT NULL,
ADD COLUMN     "probabilityConfidence" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "probabilityPercent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "riskScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "strategy" TEXT NOT NULL,
ADD COLUMN     "strategyScore" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "timing" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "urgencyScore" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "recoveryCaseId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AIDecision_decisionId_key" ON "AIDecision"("decisionId");

-- CreateIndex
CREATE INDEX "AIDecision_customerId_idx" ON "AIDecision"("customerId");

-- CreateIndex
CREATE INDEX "AIDecision_decisionStatus_idx" ON "AIDecision"("decisionStatus");

-- CreateIndex
CREATE INDEX "AIDecision_createdAt_idx" ON "AIDecision"("createdAt");

-- CreateIndex
CREATE INDEX "AIDecision_merchantId_createdAt_idx" ON "AIDecision"("merchantId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIDecision" ADD CONSTRAINT "AIDecision_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDecision" ADD CONSTRAINT "AIDecision_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
