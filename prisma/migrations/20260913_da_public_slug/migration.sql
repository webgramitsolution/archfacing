-- AlterTable
ALTER TABLE "DesignAssociate" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DesignAssociate_slug_key" ON "DesignAssociate"("slug");
