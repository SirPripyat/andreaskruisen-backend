-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "PositionCode" AS ENUM ('GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MD', 'ME', 'MEI', 'PD', 'PE', 'ATA');

-- CreateTable
CREATE TABLE "Nationality" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "flagUrl" TEXT NOT NULL,

    CONSTRAINT "Nationality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "crestUrl" TEXT NOT NULL,
    "leagueId" INTEGER NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "eaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "preferredFoot" "PreferredFoot" NOT NULL,
    "nationalityId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPosition" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "position" "PositionCode" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlayerPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRating" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "skillMoves" INTEGER NOT NULL,
    "weakFootAbility" INTEGER NOT NULL,
    "pac" INTEGER NOT NULL,
    "sho" INTEGER NOT NULL,
    "pas" INTEGER NOT NULL,
    "dri" INTEGER NOT NULL,
    "def" INTEGER NOT NULL,
    "phy" INTEGER NOT NULL,
    "acceleration" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "jumping" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "aggression" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "ballControl" INTEGER NOT NULL,
    "composure" INTEGER NOT NULL,
    "crossing" INTEGER NOT NULL,
    "curve" INTEGER NOT NULL,
    "defensiveAwareness" INTEGER NOT NULL,
    "dribbling" INTEGER NOT NULL,
    "finishing" INTEGER NOT NULL,
    "freeKickAccuracy" INTEGER NOT NULL,
    "headingAccuracy" INTEGER NOT NULL,
    "interceptions" INTEGER NOT NULL,
    "longPassing" INTEGER NOT NULL,
    "longShots" INTEGER NOT NULL,
    "penalties" INTEGER NOT NULL,
    "positioning" INTEGER NOT NULL,
    "reactions" INTEGER NOT NULL,
    "shortPassing" INTEGER NOT NULL,
    "shotPower" INTEGER NOT NULL,
    "slidingTackle" INTEGER NOT NULL,
    "sprintSpeed" INTEGER NOT NULL,
    "standingTackle" INTEGER NOT NULL,
    "vision" INTEGER NOT NULL,
    "volleys" INTEGER NOT NULL,
    "gkDiving" INTEGER NOT NULL,
    "gkHandling" INTEGER NOT NULL,
    "gkKicking" INTEGER NOT NULL,
    "gkPositioning" INTEGER NOT NULL,
    "gkReflexes" INTEGER NOT NULL,

    CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nationality_name_key" ON "Nationality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "League_name_key" ON "League"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_crestUrl_key" ON "Team"("crestUrl");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_eaId_key" ON "Player"("eaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPosition_playerId_position_key" ON "PlayerPosition"("playerId", "position");

-- CreateIndex
CREATE INDEX "PlayerRating_playerId_capturedAt_idx" ON "PlayerRating"("playerId", "capturedAt");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_nationalityId_fkey" FOREIGN KEY ("nationalityId") REFERENCES "Nationality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPosition" ADD CONSTRAINT "PlayerPosition_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
