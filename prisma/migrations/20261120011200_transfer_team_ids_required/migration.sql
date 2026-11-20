-- outgoing/incomingTeamId são sempre os dois squads envolvidos na
-- movimentação (mesmo quando o jogador daquele lado é nulo — ver
-- Transfer.outgoingPlayerId/incomingPlayerId) — nunca ficam nulos na
-- prática, então voltam a ser obrigatórios como no model original.

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_incomingTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_outgoingTeamId_fkey";

-- AlterTable
ALTER TABLE "Transfer" ALTER COLUMN "outgoingTeamId" SET NOT NULL,
ALTER COLUMN "incomingTeamId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_outgoingTeamId_fkey" FOREIGN KEY ("outgoingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_incomingTeamId_fkey" FOREIGN KEY ("incomingTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

