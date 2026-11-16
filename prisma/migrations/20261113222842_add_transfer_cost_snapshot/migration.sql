-- AlterTable
ALTER TABLE "CoinTransaction" ADD COLUMN     "transferId" UUID;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "incomingPlayerOverall" INTEGER NOT NULL,
ADD COLUMN     "outgoingPlayerOverall" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CoinTransaction_transferId_key" ON "CoinTransaction"("transferId");

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

