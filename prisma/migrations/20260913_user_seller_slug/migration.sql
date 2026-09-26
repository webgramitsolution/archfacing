-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sellerSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_sellerSlug_key" ON "User"("sellerSlug");

