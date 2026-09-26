/**
 * Design Competition entries — the pure half.
 *
 * Deliberately free of Prisma so a client component can import the labels and
 * the gate without dragging the database client into the browser bundle. The
 * queries live next door in `competition-entries.ts`.
 */

import type { CompetitionEntryStatus, Role } from '@prisma/client'

// ═══════════════════════════════════════════════════════════
//  Who may enter
// ═══════════════════════════════════════════════════════════

/**
 * Roles that answer a brief rather than post one.
 *
 * A CLIENT may announce a competition — they are the one with a house to
 * design — but may not submit a design to one. Everyone else is a designer or
 * a firm and may.
 */
const DESIGNER_ROLES: Role[] = ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE', 'BMF']

export function roleMayEnter(role: Role | null | undefined): boolean {
  return Boolean(role && DESIGNER_ROLES.includes(role))
}

// ═══════════════════════════════════════════════════════════
//  Whether a given competition is open
// ═══════════════════════════════════════════════════════════

export type EntryGate = { open: true } | { open: false; reason: string }

type CompetitionShape = {
  status: string
  submissionDeadline: Date | null
  winnerAnnouncedAt: Date | null
  authorId: string
}

/**
 * Whether `userId` may submit to this competition right now.
 *
 * Returns a reason rather than a bare false, because every one of these is
 * something the reader needs told on screen.
 */
export function entryGate(
  competition: CompetitionShape,
  userId: string | null | undefined,
  role: Role | null | undefined,
  now: Date = new Date()
): EntryGate {
  if (competition.status !== 'PUBLISHED') {
    return { open: false, reason: 'This competition is not open yet.' }
  }
  if (competition.winnerAnnouncedAt) {
    return { open: false, reason: 'The result is out — this competition has closed.' }
  }
  if (competition.submissionDeadline && competition.submissionDeadline <= now) {
    return { open: false, reason: 'The submission deadline has passed.' }
  }
  if (!userId) {
    return { open: false, reason: 'Sign in to submit your design.' }
  }
  if (competition.authorId === userId) {
    return { open: false, reason: 'You announced this competition, so you cannot enter it.' }
  }
  if (!roleMayEnter(role)) {
    return {
      open: false,
      reason:
        'Only registered professionals, consultants, corporates and BMFs may submit a design.',
    }
  }
  return { open: true }
}

/** Days left before the deadline; negative once it has passed. */
export function daysToDeadline(deadline: Date | null, now: Date = new Date()): number | null {
  if (!deadline) return null
  return Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)
}

// ═══════════════════════════════════════════════════════════
//  Labels
// ═══════════════════════════════════════════════════════════

/**
 * ⚠️ REJECTED reads as "Not selected". A designer reads this word about their
 *    own work, and "Rejected" is a harsher thing to say than the decision
 *    actually was.
 */
export const ENTRY_STATUS_LABEL: Record<CompetitionEntryStatus, string> = {
  SUBMITTED: 'Submitted',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Not selected',
  WINNER: 'Winner',
}

export const ENTRY_STATUS_TONE: Record<CompetitionEntryStatus, string> = {
  SUBMITTED: 'pill-muted',
  SHORTLISTED: 'pill-info',
  REJECTED: 'pill-warn',
  WINNER: 'pill-ok',
}
