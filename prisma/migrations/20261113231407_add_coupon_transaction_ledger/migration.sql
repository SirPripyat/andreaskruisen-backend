-- CreateEnum
CREATE TYPE "CouponTransactionType" AS ENUM ('GRANTED', 'USED', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "CouponTransaction" (
    "id" UUID NOT NULL,
    "squadId" UUID NOT NULL,
    "type" "CouponTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "transferId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponTransaction_transferId_key" ON "CouponTransaction"("transferId");

-- CreateIndex
CREATE INDEX "CouponTransaction_squadId_idx" ON "CouponTransaction"("squadId");

-- AddForeignKey
ALTER TABLE "CouponTransaction" ADD CONSTRAINT "CouponTransaction_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponTransaction" ADD CONSTRAINT "CouponTransaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
