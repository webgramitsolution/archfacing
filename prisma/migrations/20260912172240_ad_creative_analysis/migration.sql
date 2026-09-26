-- AlterTable
ALTER TABLE "AdBooking" ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imagePalette" JSONB,
ADD COLUMN     "imageWidth" INTEGER,
ADD COLUMN     "mobileImageHeight" INTEGER,
ADD COLUMN     "mobileImagePalette" JSONB,
ADD COLUMN     "mobileImageWidth" INTEGER;
