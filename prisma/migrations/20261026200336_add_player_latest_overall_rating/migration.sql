-- AlterTable: adiciona a coluna como opcional primeiro, pra poder preencher
-- as linhas existentes antes de travar como NOT NULL.
ALTER TABLE "Player" ADD COLUMN     "latestOverallRating" INTEGER;

-- Backfill: usa o PlayerRating mais recente de cada jogador já importado.
UPDATE "Player" p
SET "latestOverallRating" = latest."overallRating"
FROM (
  SELECT DISTINCT ON ("playerId") "playerId", "overallRating"
  FROM "PlayerRating"
  ORDER BY "playerId", "capturedAt" DESC
) latest
WHERE latest."playerId" = p.id;

ALTER TABLE "Player" ALTER COLUMN "latestOverallRating" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE INDEX "Player_latestOverallRating_idx" ON "Player"("latestOverallRating");
