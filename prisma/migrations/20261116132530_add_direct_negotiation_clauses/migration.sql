-- CreateEnum
CREATE TYPE "DirectNegotiationClauseType" AS ENUM ('LEI_DO_EX', 'DIREITO_DE_RECOMPRA', 'PREFERENCIA_DE_COMPRA', 'BONUS_POR_TITULO');

-- CreateTable
CREATE TABLE "DirectNegotiationClause" (
    "id" UUID NOT NULL,
    "negotiationId" UUID NOT NULL,
    "type" "DirectNegotiationClauseType" NOT NULL,
    "playerId" UUID NOT NULL,
    "amount" INTEGER,
    "matchesCount" INTEGER,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectNegotiationClause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectNegotiationClause_negotiationId_idx" ON "DirectNegotiationClause"("negotiationId");

-- AddForeignKey
ALTER TABLE "DirectNegotiationClause" ADD CONSTRAINT "DirectNegotiationClause_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiationClause" ADD CONSTRAINT "DirectNegotiationClause_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
