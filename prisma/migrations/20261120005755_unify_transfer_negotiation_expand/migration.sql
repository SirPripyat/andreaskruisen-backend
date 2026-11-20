-- Fase 1/2 (expand): Transfer passa a ser a tabela de fato de qualquer
-- movimentação (mercado ou negociação direta aceita). Esta migration só
-- adiciona/relaxa estrutura e faz backfill de dados existentes — nada é
-- removido ainda (ver migration "unify_transfer_negotiation_contract" para
-- a parte destrutiva, que só deve rodar depois de validar esta).

-- CreateEnum
CREATE TYPE "TransferOriginType" AS ENUM ('MARKET', 'NEGOTIATION');

-- AlterEnum: adiciona TRANSFER_FEE mantendo os valores velhos (DIRECT_NEGOTIATION/
-- DIRECT_NEGOTIATION_FEE ainda em uso pelas linhas que vão ser remapeadas
-- abaixo, na mesma migration) — recria o tipo em vez de ADD VALUE porque
-- Postgres não deixa usar um valor de enum recém-adicionado dentro da
-- mesma transação em que foi criado; a migration "contract" faz uma nova
-- recriação pra remover os valores velhos, já sem nenhuma linha usando-os.
BEGIN;
CREATE TYPE "CoinTransactionType_new" AS ENUM ('INITIAL', 'TRANSFER', 'DIRECT_NEGOTIATION', 'DIRECT_NEGOTIATION_FEE', 'TRANSFER_FEE', 'PRIZE_PHASE', 'RANKING', 'WIN', 'DRAW', 'LOSS', 'CHAMPION', 'RUNNER_UP', 'ADJUSTMENT');
ALTER TABLE "CoinTransaction" ALTER COLUMN "type" TYPE "CoinTransactionType_new" USING ("type"::text::"CoinTransactionType_new");
ALTER TYPE "CoinTransactionType" RENAME TO "CoinTransactionType_old";
ALTER TYPE "CoinTransactionType_new" RENAME TO "CoinTransactionType";
DROP TYPE "public"."CoinTransactionType_old";
COMMIT;

-- AlterTable: relaxa Transfer para aceitar movimentação de um lado só
-- (compra/venda pura, vindas de negociação direta) e liga à negociação de
-- origem. originType entra nullable por ora, para poder fazer backfill
-- antes de travar NOT NULL.
ALTER TABLE "Transfer"
  ADD COLUMN     "originType" "TransferOriginType",
  ADD COLUMN     "negotiationId" UUID,
  ALTER COLUMN "outgoingPlayerId" DROP NOT NULL,
  ALTER COLUMN "outgoingTeamId" DROP NOT NULL,
  ALTER COLUMN "incomingPlayerId" DROP NOT NULL,
  ALTER COLUMN "incomingTeamId" DROP NOT NULL,
  ALTER COLUMN "outgoingPlayerOverall" DROP NOT NULL,
  ALTER COLUMN "incomingPlayerOverall" DROP NOT NULL;

-- Backfill: todo Transfer existente até aqui nasceu do mercado tradicional
-- (negociação direta ainda não gerava Transfer).
UPDATE "Transfer" SET "originType" = 'MARKET' WHERE "originType" IS NULL;

ALTER TABLE "Transfer" ALTER COLUMN "originType" SET NOT NULL;

-- Backfill: cada DirectNegotiation já ACCEPTED passa a ter o Transfer que
-- deveria ter gerado na época do aceite — overalls/feeEnabled snapshotados
-- vêm das colunas que a migration "contract" vai remover de DirectNegotiation;
-- outgoing/incomingTeamId são o time de cada jogador ANTES da movimentação
-- (proposingSquad é de onde saiu o outgoingPlayer, targetSquad é de onde
-- saiu o incomingPlayer — mesmo raciocínio do Transfer de mercado).
INSERT INTO "Transfer" (
  "id", "seasonId", "originType", "requestedByUserId",
  "outgoingPlayerId", "outgoingTeamId", "incomingPlayerId", "incomingTeamId",
  "outgoingPlayerOverall", "incomingPlayerOverall", "feeEnabled",
  "negotiationId", "createdAt"
)
SELECT
  gen_random_uuid(),
  dn."seasonId",
  'NEGOTIATION',
  proposing."userId",
  dn."outgoingPlayerId", proposing."teamId",
  dn."incomingPlayerId", target."teamId",
  dn."outgoingPlayerOverall", dn."incomingPlayerOverall", dn."feeEnabled",
  dn."id",
  COALESCE(dn."resolvedAt", dn."createdAt")
FROM "DirectNegotiation" dn
JOIN "Squad" proposing ON proposing."id" = dn."proposingSquadId"
JOIN "Squad" target ON target."id" = dn."targetSquadId"
WHERE dn."status" = 'ACCEPTED';

-- Dropa os índices únicos de transferId ANTES do remapeamento abaixo: uma
-- negociação pode gerar até 3 CoinTransaction / 2 CouponTransaction
-- apontando pro mesmo Transfer, o que violaria a unicidade antiga.
DROP INDEX "CoinTransaction_transferId_key";
DROP INDEX "CouponTransaction_transferId_key";

-- Remapeia os lançamentos de ledger que apontavam pra DirectNegotiation
-- (via directNegotiationId) para apontar pro Transfer recém-criado, e
-- traduz o type pros novos valores agnósticos de origem.
UPDATE "CoinTransaction" ct
SET
  "transferId" = t."id",
  "type" = (
    CASE ct."type"::text
      WHEN 'DIRECT_NEGOTIATION' THEN 'TRANSFER'
      WHEN 'DIRECT_NEGOTIATION_FEE' THEN 'TRANSFER_FEE'
      ELSE ct."type"::text
    END
  )::"CoinTransactionType"
FROM "Transfer" t
WHERE ct."directNegotiationId" IS NOT NULL
  AND t."negotiationId" = ct."directNegotiationId";

UPDATE "CouponTransaction" ct
SET "transferId" = t."id"
FROM "Transfer" t
WHERE ct."directNegotiationId" IS NOT NULL
  AND t."negotiationId" = ct."directNegotiationId";

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_negotiationId_key" ON "Transfer"("negotiationId");

-- Recria os FKs de Transfer com ON DELETE SET NULL (colunas agora opcionais)
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_outgoingPlayerId_fkey";
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_outgoingTeamId_fkey";
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_incomingPlayerId_fkey";
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_incomingTeamId_fkey";

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_outgoingPlayerId_fkey" FOREIGN KEY ("outgoingPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_outgoingTeamId_fkey" FOREIGN KEY ("outgoingTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_incomingPlayerId_fkey" FOREIGN KEY ("incomingPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_incomingTeamId_fkey" FOREIGN KEY ("incomingTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "DirectNegotiation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: transferId deixa de ser único nos dois ledgers (1:N a partir
-- daqui), mas a Migration "contract" ainda vai dropar o índice único velho
-- e remover directNegotiationId — por ora os dois convivem.
CREATE INDEX "CoinTransaction_transferId_idx" ON "CoinTransaction"("transferId");
CREATE INDEX "CouponTransaction_transferId_idx" ON "CouponTransaction"("transferId");
