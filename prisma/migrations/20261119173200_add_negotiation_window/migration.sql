/*
  Warnings:

  - Added the required column `feeEnabled` to the `Transfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "CoinTransactionType" ADD VALUE 'DIRECT_NEGOTIATION_FEE';

-- AlterTable
ALTER TABLE "DirectNegotiation" ADD COLUMN     "feeEnabled" BOOLEAN,
ADD COLUMN     "incomingPlayerOverall" INTEGER,
ADD COLUMN     "outgoingPlayerOverall" INTEGER;

-- AlterTable
-- feeEnabled começa como true pras transferências já existentes: antes da
-- NegotiationWindow existir, a faixa progressiva do transferPricing era
-- cobrada incondicionalmente (ver transfer-pricing.utils.ts), então esse é
-- o valor que reflete o que de fato aconteceu com elas.
ALTER TABLE "Transfer" ADD COLUMN     "feeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Transfer" ALTER COLUMN "feeEnabled" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NegotiationWindow" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "feeEnabled" BOOLEAN NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedByUserId" UUID NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" UUID,

    CONSTRAINT "NegotiationWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NegotiationWindow_seasonId_closedAt_idx" ON "NegotiationWindow"("seasonId", "closedAt");

-- AddForeignKey
ALTER TABLE "NegotiationWindow" ADD CONSTRAINT "NegotiationWindow_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationWindow" ADD CONSTRAINT "NegotiationWindow_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationWindow" ADD CONSTRAINT "NegotiationWindow_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
