-- CreateEnum
CREATE TYPE "Formation" AS ENUM ('3-1-4-2', '3-4-1-2', '3-4-2-1', '3-4-3', '3-4-3 Em linha', '3-5-2', '4-1-2-1-2 Aberto', '4-1-2-1-2 Fechado', '4-1-3-2', '4-1-4-1', '4-2-1-3', '4-2-2-2', '4-2-3-1 Aberto', '4-2-3-1 Fechado', '4-3-1-2', '4-3-2-1', '4-3-3 Conservador', '4-3-3 Defensivo', '4-3-3 Em linha', '4-3-3 Ofensivo', '4-4-1-1 Meio-campo', '4-4-1-1 Ofensivo', '4-4-2 Conservador', '4-4-2 Em linha', '4-5-1 Em linha', '5-2-1-2', '5-2-2-1', '5-2-3', '5-3-2 Conservador', '5-4-1 Em linha', '5-4-1 Losango');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "formation" "Formation";
