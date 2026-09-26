-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "AdStatus" ADD VALUE 'PAUSED';
ALTER TYPE "AdStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "AdStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "AdBooking" ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "featuredPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "mobileImageUrl" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "AdPlacement" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'monitor',
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AdCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'box',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "perLabel" TEXT NOT NULL,
    "features" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdFeaturedSlot" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "bookingId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdFeaturedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdCategory_slug_key" ON "AdCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdPackage_slug_key" ON "AdPackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdFeaturedSlot_position_key" ON "AdFeaturedSlot"("position");

-- CreateIndex
CREATE UNIQUE INDEX "AdFeaturedSlot_bookingId_key" ON "AdFeaturedSlot"("bookingId");

-- CreateIndex
CREATE INDEX "AdBooking_status_isFeatured_featuredPriority_idx" ON "AdBooking"("status", "isFeatured", "featuredPriority");

-- CreateIndex
CREATE INDEX "AdBooking_categoryId_status_idx" ON "AdBooking"("categoryId", "status");

-- AddForeignKey
ALTER TABLE "AdFeaturedSlot" ADD CONSTRAINT "AdFeaturedSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AdBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdBooking" ADD CONSTRAINT "AdBooking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AdCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdBooking" ADD CONSTRAINT "AdBooking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AdPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
