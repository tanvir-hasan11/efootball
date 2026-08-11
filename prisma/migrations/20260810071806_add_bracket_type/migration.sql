-- CreateEnum
CREATE TYPE "BracketType" AS ENUM ('WINNERS', 'LOSERS', 'GRAND');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketType" "BracketType";
