-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "penaltyAwayScore" INTEGER,
ADD COLUMN     "penaltyHomeScore" INTEGER,
ADD COLUMN     "penaltyWinnerTeamId" UUID;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_penaltyWinnerTeamId_fkey" FOREIGN KEY ("penaltyWinnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
