-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_assistId_fkey";

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assistId_fkey" FOREIGN KEY ("assistId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
