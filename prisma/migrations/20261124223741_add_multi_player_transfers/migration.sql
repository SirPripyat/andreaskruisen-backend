-- CreateTable
CREATE TABLE "TransferOutgoingPlayer" (
    "id" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "overall" INTEGER NOT NULL,

    CONSTRAINT "TransferOutgoingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferIncomingPlayer" (
    "id" UUID NOT NULL,
    "transferId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "overall" INTEGER NOT NULL,

    CONSTRAINT "TransferIncomingPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferOutgoingPlayer_transferId_idx" ON "TransferOutgoingPlayer"("transferId");

-- CreateIndex
CREATE INDEX "TransferIncomingPlayer_transferId_idx" ON "TransferIncomingPlayer"("transferId");

-- AddForeignKey
ALTER TABLE "TransferOutgoingPlayer" ADD CONSTRAINT "TransferOutgoingPlayer_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOutgoingPlayer" ADD CONSTRAINT "TransferOutgoingPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferIncomingPlayer" ADD CONSTRAINT "TransferIncomingPlayer_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferIncomingPlayer" ADD CONSTRAINT "TransferIncomingPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: migra os Transfer existentes (coluna singular) pras novas
-- tabelas (array), antes de derrubar as colunas antigas. Gera um id
-- determinístico a partir do transferId (não importa qual, só precisa ser
-- único) via gen_random_uuid().
INSERT INTO "TransferOutgoingPlayer" ("id", "transferId", "playerId", "overall")
SELECT gen_random_uuid(), "id", "outgoingPlayerId", "outgoingPlayerOverall"
FROM "Transfer"
WHERE "outgoingPlayerId" IS NOT NULL;

INSERT INTO "TransferIncomingPlayer" ("id", "transferId", "playerId", "overall")
SELECT gen_random_uuid(), "id", "incomingPlayerId", "incomingPlayerOverall"
FROM "Transfer"
WHERE "incomingPlayerId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_incomingPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_outgoingPlayerId_fkey";

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "incomingPlayerId",
DROP COLUMN "incomingPlayerOverall",
DROP COLUMN "outgoingPlayerId",
DROP COLUMN "outgoingPlayerOverall";
