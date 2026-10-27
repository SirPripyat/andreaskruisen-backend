-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "playedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Goal" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "scorerId" UUID NOT NULL,
    "assistId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_matchId_idx" ON "Goal"("matchId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assistId_fkey" FOREIGN KEY ("assistId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
