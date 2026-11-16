-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CoinTransactionType" ADD VALUE 'RANKING';
ALTER TYPE "CoinTransactionType" ADD VALUE 'LOSS';
ALTER TYPE "CoinTransactionType" ADD VALUE 'CHAMPION';
ALTER TYPE "CoinTransactionType" ADD VALUE 'RUNNER_UP';

-- AlterTable
ALTER TABLE "CoinTransaction" ADD COLUMN     "matchId" UUID,
ADD COLUMN     "phaseId" UUID;

-- CreateIndex
CREATE INDEX "CoinTransaction_matchId_idx" ON "CoinTransaction"("matchId");

-- CreateIndex
CREATE INDEX "CoinTransaction_phaseId_idx" ON "CoinTransaction"("phaseId");

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
