'use server'

/**
 * Design Competition — submitting a design, judging the entries, and naming
 * a winner.
 *
 * Every write here re-reads the competition from the database and re-checks
 * the gate. The form knows whether the deadline has passed when it renders,
 * but a page left open past midnight would otherwise post a late entry.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { uploadFile, deleteUploads } from '@/lib/upload'
import { entryGate } from '@/lib/competition-entries'
import type { CompetitionEntryStatus } from '@prisma/client'

export type EntryState = {
  ok: boolean
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
} | null

const MAX_CONCEPT_WORDS = 200
const MAX_IMAGES = 4

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

type Uploaded = {
  key: string
  url: string
  sizeBytes: number
  mimeType: string
  fileName: string
  width?: number
  height?: number
}

/** Puts back everything already uploaded when a later step fails. */
async function rollback(userId: string, uploaded: Uploaded[]) {
  if (!uploaded.length) return
  await deleteUploads(
    userId,
    uploaded.map((u) => u.key),
    uploaded.reduce((s, u) => s + u.sizeBytes, 0)
  )
}

const entrySchema = z.object({
  competitionId: z.string().min(1),
  title: z.string().trim().min(3, 'Give your design a title').max(160),
  concept: z.string().trim().min(20, 'Describe your concept in a little more detail'),
})

// ═══════════════════════════════════════════════════════════
//  1. A designer submits (or revises) an entry
// ═══════════════════════════════════════════════════════════

export async function submitEntryAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const user = await requireAuth()

  const raw = {
    competitionId: String(formData.get('competitionId') ?? ''),
    title: String(formData.get('title') ?? ''),
    concept: String(formData.get('concept') ?? ''),
  }

  const parsed = entrySchema.safeParse(raw)
  const fieldErrors: Record<string, string> = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
  }

  if (raw.concept && countWords(raw.concept) > MAX_CONCEPT_WORDS) {
    fieldErrors.concept =
      `Please keep this within ${MAX_CONCEPT_WORDS} words — it currently has ${countWords(raw.concept)}.`
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors, values: raw }
  }

  const data = parsed.data!

  // ─── the gate, re-checked against live data ───
  const competition = await prisma.post.findFirst({
    where: { id: data.competitionId, type: 'DESIGN_COMPETITION', deletedAt: null },
    select: {
      id: true, slug: true, status: true, authorId: true,
      submissionDeadline: true, winnerAnnouncedAt: true,
    },
  })
  if (!competition) return { ok: false, error: 'That competition no longer exists.', values: raw }

  if (user.status !== 'ACTIVE') {
    return {
      ok: false,
      error: 'Your account is still under verification. Submitting opens once the review is complete.',
      values: raw,
    }
  }

  const gate = entryGate(competition, user.id, user.role)
  if (!gate.open) return { ok: false, error: gate.reason, values: raw }

  // ─── an existing entry is revised, not duplicated ───
  const existing = await prisma.competitionEntry.findUnique({
    where: { competitionId_designerId: { competitionId: competition.id, designerId: user.id } },
    select: { id: true, status: true },
  })

  // Once an entry has been judged, its content is frozen — otherwise a
  // shortlisted design could be swapped for a different one after the fact.
  if (existing && existing.status !== 'SUBMITTED') {
    return {
      ok: false,
      error: 'This entry has already been judged and can no longer be changed.',
      values: raw,
    }
  }

  // ─── uploads ───
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0)
  if (!existing && files.length === 0) {
    return {
      ok: false,
      error: 'Attach at least one image of your design.',
      fieldErrors: { images: 'At least one image is required' },
      values: raw,
    }
  }
  if (files.length > MAX_IMAGES) {
    return {
      ok: false,
      error: `Please attach no more than ${MAX_IMAGES} images.`,
      fieldErrors: { images: `Maximum ${MAX_IMAGES} images` },
      values: raw,
    }
  }

  const uploaded: Uploaded[] = []

  for (const [i, f] of files.entries()) {
    const res = await uploadFile({
      userId: user.id,
      file: f,
      kind: 'IMAGE',
      aspect: 'wide',
      folder: 'competition-entries',
    })
    if (!res.ok) {
      await rollback(user.id, uploaded)
      return {
        ok: false,
        error: `Image ${i + 1}: ${res.error}`,
        fieldErrors: { images: res.error },
        values: raw,
      }
    }
    uploaded.push({ ...res, fileName: f.name })
  }

  const pdf = formData.get('pdf')
  if (pdf instanceof File && pdf.size > 0) {
    const res = await uploadFile({
      userId: user.id,
      file: pdf,
      kind: 'PDF',
      folder: 'competition-entries',
    })
    if (!res.ok) {
      await rollback(user.id, uploaded)
      return { ok: false, error: res.error, fieldErrors: { pdf: res.error }, values: raw }
    }
    uploaded.push({ ...res, fileName: pdf.name })
  }

  const mediaRows = uploaded.map((u, i) => ({
    type: (u.mimeType === 'application/pdf' ? 'PDF' : 'IMAGE') as 'PDF' | 'IMAGE',
    url: u.url,
    storageKey: u.key,
    fileName: u.fileName,
    mimeType: u.mimeType,
    sizeBytes: u.sizeBytes,
    width: u.width ?? null,
    height: u.height ?? null,
    sortOrder: i,
  }))

  try {
    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.competitionEntry.update({
          where: { id: existing.id },
          data: { title: data.title, concept: data.concept },
        })
        // New files replace the old set, so a revision does not accumulate
        // every image the designer has ever attached.
        if (mediaRows.length) {
          const old = await tx.media.findMany({
            where: { entryId: existing.id },
            select: { storageKey: true, sizeBytes: true },
          })
          await tx.media.deleteMany({ where: { entryId: existing.id } })
          await tx.media.createMany({
            data: mediaRows.map((m) => ({ ...m, entryId: existing.id })),
          })
          const keys = old.map((o) => o.storageKey).filter((k): k is string => Boolean(k))
          if (keys.length) {
            await deleteUploads(
              user.id,
              keys,
              old.reduce((s, o) => s + o.sizeBytes, 0)
            )
          }
        }
      })
    } else {
      await prisma.competitionEntry.create({
        data: {
          competitionId: competition.id,
          designerId: user.id,
          title: data.title,
          concept: data.concept,
          media: { create: mediaRows },
        },
      })
    }
  } catch (e) {
    await rollback(user.id, uploaded)
    console.error('Competition entry save failed:', e)
    return { ok: false, error: 'Your entry could not be saved. Please try again.', values: raw }
  }

  revalidatePath(`/competition/${competition.slug}`)
  revalidatePath('/dashboard/competition-entries')

  return {
    ok: true,
    message: existing
      ? 'Your entry has been updated.'
      : 'Your design has been submitted. You can revise it until the deadline.',
  }
}

// ═══════════════════════════════════════════════════════════
//  2. The owner judges an entry
// ═══════════════════════════════════════════════════════════

/** Loads a competition and refuses unless `userId` announced it. */
async function requireOwnedCompetition(competitionId: string, userId: string) {
  const competition = await prisma.post.findFirst({
    where: { id: competitionId, type: 'DESIGN_COMPETITION', deletedAt: null },
    select: { id: true, slug: true, authorId: true, winnerAnnouncedAt: true },
  })
  if (!competition) throw new Error('That competition no longer exists.')
  if (competition.authorId !== userId) {
    throw new Error('Only the person who announced this competition can judge it.')
  }
  return competition
}

export async function judgeEntryAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const user = await requireAuth()

  const entryId = String(formData.get('entryId') ?? '')
  const status = String(formData.get('status') ?? '') as CompetitionEntryStatus
  const rawScore = String(formData.get('score') ?? '').trim()
  const remarks = String(formData.get('remarks') ?? '').trim()

  if (!['SUBMITTED', 'SHORTLISTED', 'REJECTED'].includes(status)) {
    // WINNER is deliberately not settable here — it goes through
    // declareWinnerAction, which also closes the competition.
    return { ok: false, error: 'That is not a valid decision.' }
  }

  const score = rawScore === '' ? null : Number(rawScore)
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    return { ok: false, error: 'A score must be between 0 and 100.', fieldErrors: { score: '0 to 100' } }
  }

  const entry = await prisma.competitionEntry.findUnique({
    where: { id: entryId },
    select: { id: true, competitionId: true, status: true },
  })
  if (!entry) return { ok: false, error: 'That entry no longer exists.' }

  try {
    const competition = await requireOwnedCompetition(entry.competitionId, user.id)

    if (entry.status === 'WINNER') {
      return { ok: false, error: 'The winner cannot be re-judged. Reopen the result first.' }
    }
    if (competition.winnerAnnouncedAt) {
      return { ok: false, error: 'The result is already out. Reopen it before judging again.' }
    }

    await prisma.competitionEntry.update({
      where: { id: entry.id },
      data: {
        status,
        score,
        remarks: remarks || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    })

    revalidatePath(`/dashboard/competition/${competition.id}/entries`)
    revalidatePath(`/competition/${competition.slug}`)
    return { ok: true, message: 'Decision saved.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That could not be saved.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  3. The owner names the winner
// ═══════════════════════════════════════════════════════════

export async function declareWinnerAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const user = await requireAuth()
  const entryId = String(formData.get('entryId') ?? '')

  const entry = await prisma.competitionEntry.findUnique({
    where: { id: entryId },
    select: { id: true, competitionId: true, withdrawnAt: true },
  })
  if (!entry) return { ok: false, error: 'That entry no longer exists.' }
  if (entry.withdrawnAt) return { ok: false, error: 'That entry has been withdrawn.' }

  try {
    const competition = await requireOwnedCompetition(entry.competitionId, user.id)
    if (competition.winnerAnnouncedAt) {
      return { ok: false, error: 'A winner has already been declared for this competition.' }
    }

    // One transaction, so the site is never in the state of having a winner
    // without the competition being closed, or the reverse.
    await prisma.$transaction([
      // Everything still undecided becomes "not selected" — a designer should
      // never be left waiting on an entry that can no longer win.
      prisma.competitionEntry.updateMany({
        where: {
          competitionId: competition.id,
          id: { not: entry.id },
          status: { in: ['SUBMITTED', 'SHORTLISTED'] },
        },
        data: { status: 'REJECTED', reviewedById: user.id, reviewedAt: new Date() },
      }),
      prisma.competitionEntry.update({
        where: { id: entry.id },
        data: { status: 'WINNER', reviewedById: user.id, reviewedAt: new Date() },
      }),
      prisma.post.update({
        where: { id: competition.id },
        data: { winnerAnnouncedAt: new Date() },
      }),
    ])

    revalidatePath(`/dashboard/competition/${competition.id}/entries`)
    revalidatePath(`/competition/${competition.slug}`)
    revalidatePath('/competition')
    return { ok: true, message: 'Winner declared. Every other entry has been marked not selected.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The winner could not be declared.' }
  }
}

/** Undoes a declaration — for a mistake, before the prize is paid. */
export async function reopenJudgingAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const user = await requireAuth()
  const competitionId = String(formData.get('competitionId') ?? '')

  try {
    const competition = await requireOwnedCompetition(competitionId, user.id)
    if (!competition.winnerAnnouncedAt) {
      return { ok: false, error: 'This competition is still open — there is nothing to reopen.' }
    }

    await prisma.$transaction([
      prisma.competitionEntry.updateMany({
        where: { competitionId: competition.id, status: { in: ['WINNER', 'REJECTED'] } },
        data: { status: 'SUBMITTED' },
      }),
      prisma.post.update({
        where: { id: competition.id },
        data: { winnerAnnouncedAt: null },
      }),
    ])

    revalidatePath(`/dashboard/competition/${competition.id}/entries`)
    revalidatePath(`/competition/${competition.slug}`)
    return { ok: true, message: 'Judging reopened. Every entry is back to submitted.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'That could not be reopened.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  4. A designer withdraws
// ═══════════════════════════════════════════════════════════

export async function withdrawEntryAction(
  _prev: EntryState,
  formData: FormData
): Promise<EntryState> {
  const user = await requireAuth()
  const entryId = String(formData.get('entryId') ?? '')

  const entry = await prisma.competitionEntry.findUnique({
    where: { id: entryId },
    select: { id: true, designerId: true, status: true, competition: { select: { slug: true } } },
  })
  if (!entry) return { ok: false, error: 'That entry no longer exists.' }
  if (entry.designerId !== user.id) {
    return { ok: false, error: 'That is not your entry.' }
  }
  if (entry.status === 'WINNER') {
    return { ok: false, error: 'A winning entry cannot be withdrawn.' }
  }

  await prisma.competitionEntry.update({
    where: { id: entry.id },
    data: { withdrawnAt: new Date() },
  })

  revalidatePath('/dashboard/competition-entries')
  revalidatePath(`/competition/${entry.competition.slug}`)
  return { ok: true, message: 'Your entry has been withdrawn.' }
}
