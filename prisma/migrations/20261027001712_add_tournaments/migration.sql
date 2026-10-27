-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('GROUP_STAGE', 'KNOCKOUT', 'LEAGUE_PHASE_KNOCKOUT');

-- CreateTable
CREATE TABLE "Tournament" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_seasonId_idx" ON "Tournament"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_teamId_key" ON "TournamentTeam"("tournamentId", "teamId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
