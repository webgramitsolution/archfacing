/*
  Warnings:

  - You are about to drop the `AdCreditTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdCreditTransaction" DROP CONSTRAINT "AdCreditTransaction_userId_fkey";

-- DropTable
DROP TABLE "AdCreditTransaction";
