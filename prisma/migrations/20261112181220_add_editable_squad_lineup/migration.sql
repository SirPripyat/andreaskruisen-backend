-- AlterTable
ALTER TABLE "PlayerTeamAssignment" ADD COLUMN     "lineupPosition" "PositionCode";

-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "formation" "Formation";

-- Backfill "lineupPosition" pros titulares já existentes, reproduzindo o
-- fallback que até agora era calculado em runtime (ver
-- SquadsRepository.findLineupOverview antes desta migration): a posição do
-- TeamLineupSlot real do jogador quando existir, senão a posição principal
-- dele.
UPDATE "PlayerTeamAssignment" pta
SET "lineupPosition" = COALESCE(
  (SELECT tls.position FROM "TeamLineupSlot" tls WHERE tls."playerId" = pta."playerId" LIMIT 1),
  (
    SELECT pp.position FROM "PlayerPosition" pp
    WHERE pp."playerId" = pta."playerId"
    ORDER BY pp."isPrimary" DESC
    LIMIT 1
  )
)
WHERE pta."isStarter" = true;
