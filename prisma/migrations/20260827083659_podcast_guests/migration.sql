-- CreateTable
CREATE TABLE "PodcastGuest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "bio" TEXT,
    "linkedin" TEXT,
    "episodes" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PodcastGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodcastGuest_slug_key" ON "PodcastGuest"("slug");

-- CreateIndex
CREATE INDEX "PodcastGuest_isActive_sortOrder_idx" ON "PodcastGuest"("isActive", "sortOrder");
