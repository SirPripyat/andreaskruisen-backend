-- AlterTable
ALTER TABLE "League" ADD COLUMN     "countryId" UUID,
ADD COLUMN     "logoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Nationality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
