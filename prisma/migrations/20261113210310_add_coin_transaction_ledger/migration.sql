-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('INITIAL', 'TRANSFER', 'PRIZE_PHASE', 'WIN', 'DRAW', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "economyStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" UUID NOT NULL,
    "squadId" UUID NOT NULL,
    "type" "CoinTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoinTransaction_squadId_idx" ON "CoinTransaction"("squadId");

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
