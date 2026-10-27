-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('GROUP', 'KNOCKOUT');

-- CreateTable
CREATE TABLE "Phase" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "type" "PhaseType" NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "phaseId" UUID NOT NULL,
    "homeTeamId" UUID NOT NULL,
    "awayTeamId" UUID NOT NULL,
    "groupLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Phase_tournamentId_order_key" ON "Phase"("tournamentId", "order");

-- CreateIndex
CREATE INDEX "Match_phaseId_idx" ON "Match"("phaseId");

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
