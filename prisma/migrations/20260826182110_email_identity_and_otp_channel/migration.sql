/*
  Warnings:

  - You are about to drop the column `mobile` on the `OtpRequest` table. All the data in the column will be lost.
  - Added the required column `identifier` to the `OtpRequest` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- DropIndex
DROP INDEX "OtpRequest_mobile_createdAt_idx";

-- AlterTable
ALTER TABLE "OtpRequest" DROP COLUMN "mobile",
ADD COLUMN     "channel" "OtpChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "identifier" TEXT NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "verifiedToken" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "mobile" DROP NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "OtpRequest_identifier_purpose_createdAt_idx" ON "OtpRequest"("identifier", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_verifiedToken_idx" ON "OtpRequest"("verifiedToken");
