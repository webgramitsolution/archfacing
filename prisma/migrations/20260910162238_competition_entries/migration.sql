-- CreateEnum
CREATE TYPE "CompetitionEntryStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'REJECTED', 'WINNER');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "entryId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "winnerAnnouncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "status" "CompetitionEntryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "remarks" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionEntry_competitionId_status_idx" ON "CompetitionEntry"("competitionId", "status");

-- CreateIndex
CREATE INDEX "CompetitionEntry_designerId_submittedAt_idx" ON "CompetitionEntry"("designerId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_designerId_key" ON "CompetitionEntry"("competitionId", "designerId");

-- CreateIndex
CREATE INDEX "Media_entryId_sortOrder_idx" ON "Media"("entryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════
--  One winner per competition, enforced by the database.
--
--  Written by hand because Prisma cannot express a partial
--  unique index: a plain @@unique([competitionId, status])
--  would also allow only one SUBMITTED entry per competition,
--  which is the opposite of what a competition needs. The same
--  reasoning as the PACT seat index.
--
--  Because it is not in the Prisma schema, `prisma migrate
--  dev` will not drop it, but `prisma db push` may — use
--  migrations on this table.
-- ═══════════════════════════════════════════════════════════
CREATE UNIQUE INDEX "CompetitionEntry_one_winner_per_competition"
  ON "CompetitionEntry"("competitionId")
  WHERE "status" = 'WINNER';
