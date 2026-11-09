-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedSeasonId" UUID;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedSeasonId_fkey" FOREIGN KEY ("selectedSeasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
