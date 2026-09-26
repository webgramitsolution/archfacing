/**
 * Around Us postings — §5.2.4.
 *
 * Around Us shares the `Post` table with everything else (type `AROUND_US`), so
 * every field the design asks for that the schema has no column for lives in
 * `Post.meta`, which is a `Json` column and therefore untyped.
 *
 * ⚠️ Same rule as `src/lib/content.ts` and `src/lib/artistry.ts`: every read of
 *    `meta` goes through a parser in this file, and every parser drops a value
 *    it does not understand rather than throwing. A post written by an older
 *    version of the form must never be able to take the page down.
 *
 * ⚠️ Images are stored as finished URLs here, not as bare photo ids. Around Us
 *    uploads go through `uploadFile` and come back as `/uploads/...`, and the
 *    design needs three fixed sizes, so `photoSrc` passes a path straight
 *    through. Artistry stores ids because it renders the same photograph at
 *    five sizes.
 */

import { prisma } from './prisma'
import { AROUND_US_CATEGORIES } from '@/config/taxonomy'
import { withPactVerified } from '@/lib/verified'

// ═══════════════════════════════════════════════════════════
//  Primitives
// ═══════════════════════════════════════════════════════════

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function strList(v: unknown, max = 40): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, max) : []
}

function objList(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    : []
}

/** An ISO date string, or null. Never a broken `Date`. */
function date(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// ═══════════════════════════════════════════════════════════
//  The shape
// ═══════════════════════════════════════════════════════════

export type TimelineStep = { date: string; label: string }
export type Highlight = { icon: string; title: string; note: string }
export type Person = { name: string; role: string; photo: string }
export type Doc = { label: string; url: string }

export type AroundUsMeta = {
  /** the cover photograph, a finished URL */
  image: string
  gallery: string[]
  /** the "About" paragraphs */
  about: string[]

  categoryLabel: string
  subCategoryLabel: string

  /** the event itself */
  eventDate: Date | null
  registrationEnds: Date | null
  submissionEnds: Date | null
  resultsOn: Date | null
  venue: string
  entryFee: number
  prizeMoney: number
  attendeeCount: number
  eligibility: string
  entryType: string
  pactArea: string

  /** the organiser, as the hero and the rail print it */
  organiser: { name: string; location: string; logo: string; verified: boolean }

  theme: { title: string; note: string }
  highlights: Highlight[]
  timeline: TimelineStep[]
  participants: string[]
  jury: Person[]
  keyPoints: string[]
  documents: Doc[]

  reportedBy: string
  writtenBy: string
  referenceUrl: string
  registerUrl: string

  seoTitle: string
  seoDescription: string
}

const LABEL: Record<string, string> = Object.fromEntries(
  AROUND_US_CATEGORIES.flatMap((g) => [
    [g.slug, g.name] as const,
    ...(g.children ?? []).map((c) => [c.slug, c.name] as const),
  ])
)

export function aroundUsMeta(meta: unknown, post?: { category?: string; subCategory?: string | null }): AroundUsMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const org = (m.organiser ?? {}) as Record<string, unknown>
  const theme = (m.theme ?? {}) as Record<string, unknown>

  return {
    image: str(m.image),
    gallery: strList(m.gallery, 20),
    about: strList(m.about, 12),

    categoryLabel: str(m.categoryLabel, LABEL[post?.category ?? ''] ?? ''),
    subCategoryLabel: str(m.subCategoryLabel, LABEL[post?.subCategory ?? ''] ?? ''),

    eventDate: date(m.eventDate),
    registrationEnds: date(m.registrationEnds),
    submissionEnds: date(m.submissionEnds),
    resultsOn: date(m.resultsOn),
    venue: str(m.venue),
    entryFee: num(m.entryFee),
    prizeMoney: num(m.prizeMoney),
    attendeeCount: num(m.attendeeCount),
    eligibility: str(m.eligibility),
    entryType: str(m.entryType),
    pactArea: str(m.pactArea),

    organiser: {
      name: str(org.name),
      location: str(org.location),
      logo: str(org.logo),
      verified: org.verified === true,
    },

    theme: { title: str(theme.title), note: str(theme.note) },

    highlights: objList(m.highlights)
      .map((h) => ({ icon: str(h.icon, 'star'), title: str(h.title), note: str(h.note) }))
      .filter((h) => h.title),

    timeline: objList(m.timeline)
      .map((t) => ({ date: str(t.date), label: str(t.label) }))
      .filter((t) => t.date && t.label),

    participants: strList(m.participants, 12),

    jury: objList(m.jury)
      .map((p) => ({ name: str(p.name), role: str(p.role), photo: str(p.photo) }))
      .filter((p) => p.name),

    keyPoints: strList(m.keyPoints, 8),

    documents: objList(m.documents)
      .map((d) => ({ label: str(d.label), url: str(d.url) }))
      .filter((d) => d.label && d.url),

    reportedBy: str(m.reportedBy),
    writtenBy: str(m.writtenBy),
    referenceUrl: str(m.referenceUrl),
    registerUrl: str(m.registerUrl),

    seoTitle: str(m.seoTitle),
    seoDescription: str(m.seoDescription),
  }
}

/**
 * The badge over the hero photograph.
 *
 * It tracks whether a reader can still act, not whether the event has
 * happened: registration closing is the deadline that matters, and only if
 * none is given does the event date stand in for it. A post with no dates at
 * all — a news item, a company milestone — gets no badge rather than a
 * guessed one.
 */
export function entryStatus(m: AroundUsMeta): 'open' | 'closed' | null {
  const ends = m.registrationEnds ?? m.submissionEnds ?? m.eventDate
  if (!ends) return null
  return ends.getTime() < Date.now() ? 'closed' : 'open'
}

// ═══════════════════════════════════════════════════════════
//  Queries
// ═══════════════════════════════════════════════════════════

const PUBLISHED = { type: 'AROUND_US' as const, status: 'PUBLISHED' as const, deletedAt: null }

const SELECT = {
  id: true, slug: true, title: true, description: true, category: true,
  subCategory: true, city: true, state: true, viewCount: true,
  publishedAt: true, meta: true,
  author: {
    select: {
      // `id` is what resolves the author's storefront address on the detail
      // page — see `sellerHrefFor`.
      id: true, name: true, profilePhoto: true,
      professionalProfile: { select: { isVerified: true } },
      corporateProfile: { select: { companyName: true, companyLogo: true, isVerified: true } },
    },
  },
  media: { take: 1, select: { url: true } },
} as const

export async function listAroundUs({
  category, sub, search, sort = 'latest', take = 9, excludeSlug,
}: {
  category?: string
  sub?: string
  search?: string
  sort?: 'latest' | 'popular'
  take?: number
  excludeSlug?: string
} = {}) {
  return withPactVerified(await prisma.post.findMany({
    where: {
      ...PUBLISHED,
      ...(category ? { category } : {}),
      ...(sub ? { subCategory: sub } : {}),
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    select: SELECT,
    orderBy: sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' },
    take,
  }))
}

export type AroundUsRow = Awaited<ReturnType<typeof listAroundUs>>[number]

export async function countAroundUs(where: { category?: string; sub?: string; search?: string } = {}) {
  return prisma.post.count({
    where: {
      ...PUBLISHED,
      ...(where.category ? { category: where.category } : {}),
      ...(where.sub ? { subCategory: where.sub } : {}),
      ...(where.search
        ? {
            OR: [
              { title: { contains: where.search, mode: 'insensitive' as const } },
              { description: { contains: where.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
  })
}

export async function getAroundUs(slug: string) {
  const row = await prisma.post.findFirst({ where: { ...PUBLISHED, slug }, select: SELECT })
  return row ? (await withPactVerified([row]))[0] : null
}

export type AroundUsDetail = NonNullable<Awaited<ReturnType<typeof getAroundUs>>>

/** The rail's "Trending Updates" — the most-read posts, whatever their category. */
export async function trendingAroundUs(take = 5, excludeSlug?: string) {
  return withPactVerified(await prisma.post.findMany({
    where: { ...PUBLISHED, ...(excludeSlug ? { slug: { not: excludeSlug } } : {}) },
    select: SELECT,
    orderBy: { viewCount: 'desc' },
    take,
  }))
}

/**
 * The rail's "Upcoming Events" — posts whose event date is still ahead.
 *
 * `meta.eventDate` is a JSON field, so it cannot be ordered in SQL. The set is
 * small (published Around Us posts), so the sort happens here.
 */
export async function upcomingEvents(take = 4) {
  const rows = await prisma.post.findMany({
    where: PUBLISHED,
    select: { slug: true, title: true, meta: true, city: true, state: true },
    take: 80,
  })

  return rows
    .map((r) => ({ ...r, when: date((r.meta as Record<string, unknown> | null)?.eventDate) }))
    .filter((r): r is typeof r & { when: Date } => r.when !== null && r.when.getTime() > Date.now())
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, take)
}

/** Article counts per category slug, for the chip strip. */
export async function aroundUsCounts(): Promise<Record<string, number>> {
  const [byCategory, bySub] = await Promise.all([
    prisma.post.groupBy({ by: ['category'], where: PUBLISHED, _count: { _all: true } }),
    prisma.post.groupBy({ by: ['subCategory'], where: PUBLISHED, _count: { _all: true } }),
  ])

  const out: Record<string, number> = {}
  for (const r of byCategory) out[r.category] = r._count._all
  for (const r of bySub) if (r.subCategory) out[r.subCategory] = r._count._all
  return out
}
