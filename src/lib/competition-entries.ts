/**
 * Design Competition — the half the PDF never wrote down.
 *
 * §5.2.7 specifies how a competition is *announced*: prize money, a deadline,
 * a jury count, who it is visible to. It stops there. Everything below is the
 * rest of the cycle the owner described:
 *
 *     requirement posted → designers submit → judged → winner → prize
 *
 * The rules that matter, in one place:
 *
 *   · A designer holds ONE entry per competition. Submitting again revises
 *     the existing entry rather than stacking a second one up.
 *   · Nothing may be submitted after the deadline, and nothing may be
 *     submitted to a competition that is not published.
 *   · An owner never judges their own competition's entries as a designer,
 *     because they cannot enter it at all.
 *   · Exactly one winner. The database enforces it with a partial unique
 *     index; the code below keeps it true in the ordinary path too.
 */

import { prisma } from '@/lib/prisma'
import type { CompetitionEntryStatus } from '@prisma/client'

// The gate and the labels are pure, and a client component needs them, so
// they live in `competition-entry-status.ts` where importing them cannot pull
// Prisma into the browser bundle. Re-exported here so server code has one
// place to import from.
export {
  roleMayEnter,
  entryGate,
  daysToDeadline,
  ENTRY_STATUS_LABEL,
  ENTRY_STATUS_TONE,
  type EntryGate,
} from './competition-entry-status'

// ═══════════════════════════════════════════════════════════
//  Reads
// ═══════════════════════════════════════════════════════════

const ENTRY_SELECT = {
  id: true,
  title: true,
  concept: true,
  status: true,
  score: true,
  remarks: true,
  reviewedAt: true,
  submittedAt: true,
  updatedAt: true,
  designer: {
    select: { id: true, name: true, role: true, city: true, state: true },
  },
  media: {
    select: { id: true, type: true, url: true, fileName: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const

/** Every live entry on a competition, for the owner's judging panel. */
export async function listEntries(competitionId: string) {
  return prisma.competitionEntry.findMany({
    where: { competitionId, withdrawnAt: null },
    select: ENTRY_SELECT,
    // Winner first, then shortlisted, then the rest — the order the owner
    // wants to read them in once judging has started.
    orderBy: [{ status: 'asc' }, { score: 'desc' }, { submittedAt: 'asc' }],
  })
}

/** One designer's entry on one competition, or null. */
export async function myEntry(competitionId: string, designerId: string) {
  return prisma.competitionEntry.findUnique({
    where: { competitionId_designerId: { competitionId, designerId } },
    select: ENTRY_SELECT,
  })
}

/** Everything a designer has entered, newest first. */
export async function myEntries(designerId: string) {
  return prisma.competitionEntry.findMany({
    where: { designerId, withdrawnAt: null },
    orderBy: { submittedAt: 'desc' },
    select: {
      ...ENTRY_SELECT,
      competition: {
        select: {
          id: true, slug: true, title: true, prizeMoney: true,
          submissionDeadline: true, winnerAnnouncedAt: true, status: true,
        },
      },
    },
  })
}

/** How many designs a competition has drawn — shown on the public page. */
export async function entryCount(competitionId: string): Promise<number> {
  return prisma.competitionEntry.count({
    where: { competitionId, withdrawnAt: null },
  })
}

/** The winning entry, or null while judging is still open. */
export async function winnerOf(competitionId: string) {
  return prisma.competitionEntry.findFirst({
    where: { competitionId, status: 'WINNER', withdrawnAt: null },
    select: ENTRY_SELECT,
  })
}

/**
 * Everything the public competition page needs to decide what to show:
 * how many have entered, who won if anyone has, and the fields the gate
 * reads. One round trip rather than three scattered through the page.
 */
export async function publicEntryInfo(competitionId: string) {
  const [count, winner, row] = await Promise.all([
    entryCount(competitionId),
    winnerOf(competitionId),
    prisma.post.findUnique({
      where: { id: competitionId },
      select: {
        authorId: true,
        status: true,
        submissionDeadline: true,
        winnerAnnouncedAt: true,
      },
    }),
  ])
  return { count, winner, competition: row }
}

// ═══════════════════════════════════════════════════════════
//  Counts by status, for the owner's header
// ═══════════════════════════════════════════════════════════

export type EntryTally = Record<CompetitionEntryStatus, number> & { total: number }

export async function tally(competitionId: string): Promise<EntryTally> {
  const rows = await prisma.competitionEntry.groupBy({
    by: ['status'],
    where: { competitionId, withdrawnAt: null },
    _count: { _all: true },
  })

  const out: EntryTally = {
    SUBMITTED: 0, SHORTLISTED: 0, REJECTED: 0, WINNER: 0, total: 0,
  }
  for (const r of rows) {
    out[r.status] = r._count._all
    out.total += r._count._all
  }
  return out
}
