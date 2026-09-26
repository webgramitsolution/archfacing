-- AlterTable
ALTER TABLE "PortalSpace" ADD COLUMN     "reclaimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PortalSpace_expiresAt_reclaimedAt_idx" ON "PortalSpace"("expiresAt", "reclaimedAt");
