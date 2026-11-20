-- Fase 1/2 (contract): limpeza destrutiva, só deve rodar depois de validar
-- que a migration "unify_transfer_negotiation_expand" backfillou tudo
-- corretamente (todo CoinTransaction/CouponTransaction com
-- directNegotiationId não nulo já tem transferId correspondente, e todo
-- DirectNegotiation ACCEPTED já tem um Transfer ligado via negotiationId).

-- AlterEnum: remove DIRECT_NEGOTIATION/DIRECT_NEGOTIATION_FEE — nenhuma
-- linha usa mais esses valores depois do remapeamento feito na migration
-- anterior.
BEGIN;
CREATE TYPE "CoinTransactionType_new" AS ENUM ('INITIAL', 'TRANSFER', 'TRANSFER_FEE', 'PRIZE_PHASE', 'RANKING', 'WIN', 'DRAW', 'LOSS', 'CHAMPION', 'RUNNER_UP', 'ADJUSTMENT');
ALTER TABLE "CoinTransaction" ALTER COLUMN "type" TYPE "CoinTransactionType_new" USING ("type"::text::"CoinTransactionType_new");
ALTER TYPE "CoinTransactionType" RENAME TO "CoinTransactionType_old";
ALTER TYPE "CoinTransactionType_new" RENAME TO "CoinTransactionType";
DROP TYPE "public"."CoinTransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CoinTransaction" DROP CONSTRAINT "CoinTransaction_directNegotiationId_fkey";

-- DropForeignKey
ALTER TABLE "CouponTransaction" DROP CONSTRAINT "CouponTransaction_directNegotiationId_fkey";

-- DropIndex
DROP INDEX "CoinTransaction_directNegotiationId_idx";

-- DropIndex
DROP INDEX "CouponTransaction_directNegotiationId_idx";

-- AlterTable: ledger passa a apontar só pra Transfer (ver Transfer.negotiationId
-- pra achar a negociação de origem, quando houver).
ALTER TABLE "CoinTransaction" DROP COLUMN "directNegotiationId";
ALTER TABLE "CouponTransaction" DROP COLUMN "directNegotiationId";

-- AlterTable: DirectNegotiation não snapshota mais overall/feeEnabled — quem
-- snapshota isso agora é o Transfer gerado no aceite (ver DirectNegotiation.transfer).
ALTER TABLE "DirectNegotiation"
  DROP COLUMN "feeEnabled",
  DROP COLUMN "incomingPlayerOverall",
  DROP COLUMN "outgoingPlayerOverall";

-- Invariante de negócio: todo Transfer precisa mover pelo menos um jogador
-- (uma negociação 100% em moeda sem nenhum jogador não é permitida pelas
-- regras de proposta — ver ProposeNegotiationSchema — mas o constraint
-- documenta e garante isso também no banco).
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_at_least_one_player_check"
  CHECK ("outgoingPlayerId" IS NOT NULL OR "incomingPlayerId" IS NOT NULL);
