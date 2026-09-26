-- DropForeignKey
ALTER TABLE "AdBooking" DROP CONSTRAINT "AdBooking_placementId_fkey";

-- AlterTable
ALTER TABLE "AdBooking" ADD COLUMN     "adTypeId" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "leads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "rejectionCode" TEXT,
ADD COLUMN     "resubmitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "placementId" DROP NOT NULL,
ALTER COLUMN "imageUrl" DROP NOT NULL,
ALTER COLUMN "targetUrl" DROP NOT NULL,
ALTER COLUMN "startsAt" DROP NOT NULL,
ALTER COLUMN "endsAt" DROP NOT NULL,
ALTER COLUMN "weeks" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AdType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'image',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaignPlacement" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "weight" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "AdCampaignPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdTargeting" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "states" TEXT[],
    "cities" TEXT[],
    "pincodes" TEXT[],
    "pactAreas" TEXT[],
    "productCategories" TEXT[],
    "projectCategories" TEXT[],
    "professionalCategories" TEXT[],
    "audienceRoles" TEXT[],

    CONSTRAINT "AdTargeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdType_slug_key" ON "AdType"("slug");

-- CreateIndex
CREATE INDEX "AdCampaignPlacement_placementId_idx" ON "AdCampaignPlacement"("placementId");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaignPlacement_bookingId_placementId_key" ON "AdCampaignPlacement"("bookingId", "placementId");

-- CreateIndex
CREATE UNIQUE INDEX "AdTargeting_bookingId_key" ON "AdTargeting"("bookingId");

-- CreateIndex
CREATE INDEX "AdBooking_advertiserId_status_updatedAt_idx" ON "AdBooking"("advertiserId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "AdBooking" ADD CONSTRAINT "AdBooking_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "AdPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdBooking" ADD CONSTRAINT "AdBooking_adTypeId_fkey" FOREIGN KEY ("adTypeId") REFERENCES "AdType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignPlacement" ADD CONSTRAINT "AdCampaignPlacement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AdBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignPlacement" ADD CONSTRAINT "AdCampaignPlacement_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "AdPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdTargeting" ADD CONSTRAINT "AdTargeting_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AdBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
