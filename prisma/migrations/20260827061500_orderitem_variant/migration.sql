-- variantId on OrderItem — so the right variant's stock goes back when an order is cancelled.
-- Previously it was matched by slug, which, across the several sizes of a single
-- product, would have incremented the stock of the wrong variant.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "variantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderItem_postId_idx" ON "OrderItem"("postId");

