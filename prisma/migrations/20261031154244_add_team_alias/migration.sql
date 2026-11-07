-- CreateTable
CREATE TABLE "TeamAlias" (
    "id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "TeamAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamAlias_alias_key" ON "TeamAlias"("alias");

-- AddForeignKey
ALTER TABLE "TeamAlias" ADD CONSTRAINT "TeamAlias_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
