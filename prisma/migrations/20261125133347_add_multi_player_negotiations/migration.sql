-- CreateTable
CREATE TABLE "DirectNegotiationOutgoingPlayer" (
    "id" UUID NOT NULL,
    "negotiationId" UUID NOT NULL,
    "playerId" UUID NOT NULL,

    CONSTRAINT "DirectNegotiationOutgoingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectNegotiationIncomingPlayer" (
    "id" UUID NOT NULL,
    "negotiationId" UUID NOT NULL,
    "playerId" UUID NOT NULL,

    CONSTRAINT "DirectNegotiationIncomingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectNegotiationOutgoingPlayer_negotiationId_idx" ON "DirectNegotiationOutgoingPlayer"("negotiationId");

-- CreateIndex
CREATE INDEX "DirectNegotiationIncomingPlayer_negotiationId_idx" ON "DirectNegotiationIncomingPlayer"("negotiationId");

-- AddForeignKey
ALTER TABLE "DirectNegotiationOutgoingPlayer" ADD CONSTRAINT "DirectNegotiationOutgoingPlayer_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiationOutgoingPlayer" ADD CONSTRAINT "DirectNegotiationOutgoingPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiationIncomingPlayer" ADD CONSTRAINT "DirectNegotiationIncomingPlayer_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectNegotiationIncomingPlayer" ADD CONSTRAINT "DirectNegotiationIncomingPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: migra as DirectNegotiation existentes (coluna singular) pras
-- novas tabelas (array), antes de derrubar as colunas antigas. Mesma
-- lógica da migration add_multi_player_transfers.
INSERT INTO "DirectNegotiationOutgoingPlayer" ("id", "negotiationId", "playerId")
SELECT gen_random_uuid(), "id", "outgoingPlayerId"
FROM "DirectNegotiation"
WHERE "outgoingPlayerId" IS NOT NULL;

INSERT INTO "DirectNegotiationIncomingPlayer" ("id", "negotiationId", "playerId")
SELECT gen_random_uuid(), "id", "incomingPlayerId"
FROM "DirectNegotiation"
WHERE "incomingPlayerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "DirectNegotiation" DROP CONSTRAINT "DirectNegotiation_incomingPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "DirectNegotiation" DROP CONSTRAINT "DirectNegotiation_outgoingPlayerId_fkey";

-- AlterTable
ALTER TABLE "DirectNegotiation" DROP COLUMN "incomingPlayerId",
DROP COLUMN "outgoingPlayerId";
