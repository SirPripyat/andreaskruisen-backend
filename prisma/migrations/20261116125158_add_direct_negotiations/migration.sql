-- CreateEnum
CREATE TYPE "DirectNegotiationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "CoinTransactionType" ADD VALUE 'DIRECT_NEGOTIATION';

-- AlterTable
ALTER TABLE "CoinTransaction" ADD COLUMN     "directNegotiationId" UUID;

-- AlterTable
ALTER TABLE "CouponTransaction" ADD COLUMN     "directNegotiationId" UUID;

-- CreateTable
CREATE TABLE "DirectNegotiation" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "proposingSquadId" UUID NOT NULL,
    "targetSquadId" UUID NOT NULL,
    "outgoingPlayerId" UUID,
    "incomingPlayerId" UUID,
    "coinAmount" INTEGER,
    "status" "DirectNegotiationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DirectNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectNegotiation_seasonId_idx" ON "DirectNegotiation"("seasonId");

-- CreateIndex
CREATE INDEX "DirectNegotiation_targetSquadId_status_idx" ON "DirectNegotiation"("targetSquadId", "status");

-- CreateIndex
CREATE INDEX "CoinTransaction_directNegotiationId_idx" ON "CoinTransaction"("directNegotiationId");

-- CreateIndex
CREATE INDEX "CouponTransaction_directNegotiationId_idx" ON "CouponTransaction"("directNegotiationId");

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_directNegotiationId_fkey" FOREIGN KEY ("directNegotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTransaction" ADD CONSTRAINT "CouponTransaction_directNegotiationId_fkey" FOREIGN KEY ("directNegotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiation" ADD CONSTRAINT "DirectNegotiation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiation" ADD CONSTRAINT "DirectNegotiation_proposingSquadId_fkey" FOREIGN KEY ("proposingSquadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiation" ADD CONSTRAINT "DirectNegotiation_targetSquadId_fkey" FOREIGN KEY ("targetSquadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiation" ADD CONSTRAINT "DirectNegotiation_outgoingPlayerId_fkey" FOREIGN KEY ("outgoingPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiation" ADD CONSTRAINT "DirectNegotiation_incomingPlayerId_fkey" FOREIGN KEY ("incomingPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
