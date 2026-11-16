-- CreateTable
CREATE TABLE "Ruleset" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ruleset_seasonId_validFrom_idx" ON "Ruleset"("seasonId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_seasonId_version_key" ON "Ruleset"("seasonId", "version");

-- AddForeignKey
ALTER TABLE "Ruleset" ADD CONSTRAINT "Ruleset_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
