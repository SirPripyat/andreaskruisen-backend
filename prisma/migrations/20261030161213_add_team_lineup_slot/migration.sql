-- CreateTable
CREATE TABLE "TeamLineupSlot" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "position" "PositionCode" NOT NULL,
    "playerId" UUID NOT NULL,

    CONSTRAINT "TeamLineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamLineupSlot_teamId_playerId_key" ON "TeamLineupSlot"("teamId", "playerId");

-- AddForeignKey
ALTER TABLE "TeamLineupSlot" ADD CONSTRAINT "TeamLineupSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamLineupSlot" ADD CONSTRAINT "TeamLineupSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
