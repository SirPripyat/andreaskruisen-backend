-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTeamAssignment" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "PlayerTeamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_seasonId_userId_key" ON "Squad"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_seasonId_teamId_key" ON "Squad"("seasonId", "teamId");

-- CreateIndex
CREATE INDEX "PlayerTeamAssignment_seasonId_teamId_idx" ON "PlayerTeamAssignment"("seasonId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerTeamAssignment_seasonId_playerId_key" ON "PlayerTeamAssignment"("seasonId", "playerId");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTeamAssignment" ADD CONSTRAINT "PlayerTeamAssignment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTeamAssignment" ADD CONSTRAINT "PlayerTeamAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTeamAssignment" ADD CONSTRAINT "PlayerTeamAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
