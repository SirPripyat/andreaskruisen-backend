-- CreateTable
CREATE TABLE "FavoritePlayer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoritePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoritePlayer_userId_seasonId_playerId_key" ON "FavoritePlayer"("userId", "seasonId", "playerId");

-- AddForeignKey
ALTER TABLE "FavoritePlayer" ADD CONSTRAINT "FavoritePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePlayer" ADD CONSTRAINT "FavoritePlayer_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePlayer" ADD CONSTRAINT "FavoritePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
