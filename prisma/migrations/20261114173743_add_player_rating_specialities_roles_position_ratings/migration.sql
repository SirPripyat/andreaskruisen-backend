-- CreateEnum
CREATE TYPE "SofifaPositionCode" AS ENUM ('ATE', 'ATA', 'ATD', 'PE', 'MAE', 'SA', 'MAD', 'PD', 'MEE', 'MEI', 'MED', 'ME', 'MCE', 'MC', 'MCD', 'MD', 'ADE', 'VE', 'VOL', 'VD', 'ADD', 'LE', 'ZGE', 'ZAG', 'ZGD', 'LD', 'GOL');

-- CreateTable
CREATE TABLE "Speciality" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Speciality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRatingSpeciality" (
    "id" UUID NOT NULL,
    "playerRatingId" UUID NOT NULL,
    "specialityId" UUID NOT NULL,

    CONSTRAINT "PlayerRatingSpeciality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRatingRole" (
    "id" UUID NOT NULL,
    "playerRatingId" UUID NOT NULL,
    "position" "PositionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "PlayerRatingRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPositionRating" (
    "id" UUID NOT NULL,
    "playerRatingId" UUID NOT NULL,
    "position" "SofifaPositionCode" NOT NULL,
    "overall" INTEGER NOT NULL,
    "base" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "natural" BOOLEAN NOT NULL,

    CONSTRAINT "PlayerPositionRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Speciality_name_key" ON "Speciality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRatingSpeciality_playerRatingId_specialityId_key" ON "PlayerRatingSpeciality"("playerRatingId", "specialityId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRatingRole_playerRatingId_position_name_key" ON "PlayerRatingRole"("playerRatingId", "position", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPositionRating_playerRatingId_position_key" ON "PlayerPositionRating"("playerRatingId", "position");

-- AddForeignKey
ALTER TABLE "PlayerRatingSpeciality" ADD CONSTRAINT "PlayerRatingSpeciality_playerRatingId_fkey" FOREIGN KEY ("playerRatingId") REFERENCES "PlayerRating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRatingSpeciality" ADD CONSTRAINT "PlayerRatingSpeciality_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRatingRole" ADD CONSTRAINT "PlayerRatingRole_playerRatingId_fkey" FOREIGN KEY ("playerRatingId") REFERENCES "PlayerRating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPositionRating" ADD CONSTRAINT "PlayerPositionRating_playerRatingId_fkey" FOREIGN KEY ("playerRatingId") REFERENCES "PlayerRating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
