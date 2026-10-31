-- DropIndex
DROP INDEX "Team_crestUrl_key";

-- DropIndex
DROP INDEX "Team_name_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_leagueId_key" ON "Team"("name", "leagueId");

