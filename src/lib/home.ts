/**
 * The home page's data.
 *
 * Everything the landing page shows that can be answered by the database is
 * answered here — real projects, real verified professionals, real category
 * and view counts, the real competition prize pool. The figures that have no
 * source in the schema (marketing headline numbers) live in `MARKETING` in
 * `src/components/home.tsx`, never in this file.
 *
 * ⚠️ Every read below is wrapped by `safe()`. The Products and Design
 *    Competition seeds are still being written, so a table that is empty — or
 *    a query that fails outright — must degrade to a quiet zero rather than
 *    taking the whole home page down. `safe()` logs and returns the fallback;
 *    it never rethrows. That is the whole reason this file exists instead of
 *    the page calling Prisma directly.
 *
 * ⚠️ Reuse before you add. Projects come from `listProjects()` in
 *    `src/lib/projects.ts` so a home-page card and a listing card are fed the
 *    identical row shape. Only the reads that no existing module owns
 *    (verified professionals, the cross-type counters) are written here.
 */

import { prisma } from './prisma'
import { listProjects, placeLine, type ProjectRow } from './projects'
import { DESIGNA_CATEGORIES, DESIGNI_CATEGORIES } from '@/config/taxonomy'
import { badgeTones } from '@/lib/verified'

// ═══════════════════════════════════════════════════════════
//  Failure containment
// ═══════════════════════════════════════════════════════════

/**
 * Runs a read and swallows any failure.
 *
 * A missing table, a seed that has not run yet, a database that is down — all
 * of them produce the fallback and a server-side log line, never a 500 on the
 * front page.
 */
async function safe<T>(label: string, fallback: T, read: () => Promise<T>): Promise<T> {
  try {
    return await read()
  } catch (error) {
    console.error(`[home] ${label} could not be read:`, error)
    return fallback
  }
}

// ═══════════════════════════════════════════════════════════
//  Designers
// ═══════════════════════════════════════════════════════════

export type HomeDesigner = {
  id: string
  /** The person's name, as registered. */
  name: string
  /** The practice, when they have registered one. */
  firmName: string | null
  /** "Architecture Services", "Interior Designing"… — derived, never invented. */
  specialty: string
  /** A profile photograph or a firm logo; `null` means fall back to initials. */
  photo: string | null
  initials: string
  /** "Bengaluru, Karnataka" — empty when neither is set. */
  location: string
  verified: boolean
  badgeTone: 'gold' | 'blue' | null
  /** LIVE — published projects this professional has authored. */
  projectCount: number
  /**
   * The public profile address — `/<slug>`. Prefers the seller storefront
   * slug, falls back to the design-associate slug. `null` when the
   * professional has no public page yet, so the card links to the listing.
   */
  slug: string | null
}

/** "Ar. Ritu Sharma" → "RS". Honorifics are not initials. */
function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !/^(ar|er|dr|mr|ms|mrs|shri|smt)\.?$/i.test(w))

  const letters = (words.length ? words : name.trim().split(/\s+/))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return letters.toUpperCase() || 'AF'
}

/**
 * The line under a designer's name.
 *
 * Prefers the first registered category, resolved to its taxonomy name, and
 * falls back to the Designa / Designi discipline. Both are real values off the
 * profile — nothing here is made up.
 */
function specialtyOf(designaType: 'DESIGNA' | 'DESIGNI', categories: string[]): string {
  const pool = designaType === 'DESIGNI' ? DESIGNI_CATEGORIES : DESIGNA_CATEGORIES
  const first = categories.find((slug) => pool.some((c) => c.slug === slug))
  const named = first ? pool.find((c) => c.slug === first)?.name : undefined

  return named ?? (designaType === 'DESIGNI' ? 'Interior Design' : 'Architecture & Planning')
}

/**
 * The five professionals on the front page, most published projects first.
 *
 * "Top" is a real ordering: it counts published PROJECT posts per author. If
 * fewer than `take` professionals have published anything, the row is filled
 * out with other verified profiles so the section never renders half empty.
 *
 * ★ Ratings and review counts are NOT returned. `ProfessionalProfile` has no
 *   column for either and no reviews table exists, so there is nothing to
 *   read — the card renders an em dash rather than a number nobody can trace.
 */
async function readDesigners(take: number): Promise<HomeDesigner[]> {
  const ranked = await prisma.post.groupBy({
    by: ['authorId'],
    where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { authorId: 'desc' } },
    take: take * 3,
  })

  const counts = new Map(ranked.map((r) => [r.authorId, r._count._all]))

  const SELECT = {
    id: true,
    name: true,
    city: true,
    state: true,
    profilePhoto: true,
    logo: true,
    sellerSlug: true,
    designAssociate: { select: { slug: true } },
    professionalProfile: {
      select: { firmName: true, designaType: true, categories: true, isVerified: true },
    },
  } as const

  const VERIFIED = {
    deletedAt: null,
    role: 'PROFESSIONAL' as const,
    professionalProfile: { is: { isVerified: true } },
  }

  const authors = ranked.length
    ? await prisma.user.findMany({
        where: { ...VERIFIED, id: { in: ranked.map((r) => r.authorId) } },
        select: SELECT,
      })
    : []

  // Keep the groupBy's ordering — `findMany` does not preserve an `in` order.
  authors.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))

  const chosen = authors.slice(0, take)

  if (chosen.length < take) {
    const fill = await prisma.user.findMany({
      where: { ...VERIFIED, id: { notIn: chosen.map((c) => c.id) } },
      select: SELECT,
      orderBy: { createdAt: 'asc' },
      take: take - chosen.length,
    })
    chosen.push(...fill)
  }

  const tones = await badgeTones(chosen.map((u) => u.id))
  return chosen.map((u) => ({
    id: u.id,
    name: u.name,
    firmName: u.professionalProfile?.firmName ?? null,
    specialty: specialtyOf(
      u.professionalProfile?.designaType ?? 'DESIGNA',
      u.professionalProfile?.categories ?? []
    ),
    photo: u.profilePhoto ?? u.logo ?? null,
    initials: initialsOf(u.name),
    location: placeLine(u.city, u.state),
    verified: tones.has(u.id),
    badgeTone: tones.get(u.id) ?? null,
    projectCount: counts.get(u.id) ?? 0,
    slug: u.sellerSlug ?? u.designAssociate?.slug ?? null,
  }))
}

// ═══════════════════════════════════════════════════════════
//  Counters
// ═══════════════════════════════════════════════════════════

/**
 * Every live figure the page prints.
 *
 * All of these come from the database. Anything the page shows that is NOT in
 * this object is a marketing figure and lives in `MARKETING`.
 */
export type HomeCounts = {
  /** Published PROJECT posts. */
  projects: number
  /** Published PRODUCT posts — 0 until the Products seed lands. */
  products: number
  /** Verified `ProfessionalProfile` rows. */
  designers: number
  /** Published DESIGN_COMPETITION posts whose deadline has not passed. */
  competitions: number
  /** Distinct categories that currently hold at least one published post. */
  categories: number
  /** Total views across every published post. */
  views: number
  /** Published Around Us posts under New Development → Government Policies / E-Tender. */
  govt: number
}

/** Only competitions still open for entry count as "live". */
function liveCompetitionWhere() {
  return {
    type: 'DESIGN_COMPETITION' as const,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    OR: [{ submissionDeadline: null }, { submissionDeadline: { gte: new Date() } }],
  }
}

// ═══════════════════════════════════════════════════════════
//  The one call the page makes
// ═══════════════════════════════════════════════════════════

export type HomeData = {
  /** Real projects for the Featured Projects rail. Empty is a valid answer. */
  projects: ProjectRow[]
  designers: HomeDesigner[]
  counts: HomeCounts
  /**
   * Rupees, summed across live competitions. `null` when no competition
   * carries a prize — the banner then says "To be announced".
   */
  prizePool: number | null
}

export async function getHomeData(): Promise<HomeData> {
  const PUBLISHED = { status: 'PUBLISHED' as const, deletedAt: null }

  const [
    projects,
    designers,
    projectCount,
    productCount,
    designerCount,
    competitionCount,
    categoryCount,
    views,
    prizePool,
    govtCount,
  ] = await Promise.all([
    // Featured Projects — the same reader the /projects listing uses.
    safe('featured projects', [] as ProjectRow[], async () => {
      const { rows } = await listProjects({ perPage: 8, sort: 'views' })
      return rows
    }),

    safe('top designers', [] as HomeDesigner[], () => readDesigners(5)),

    safe('project count', 0, () =>
      prisma.post.count({ where: { ...PUBLISHED, type: 'PROJECT' } })
    ),

    safe('product count', 0, () =>
      prisma.post.count({ where: { ...PUBLISHED, type: 'PRODUCT' } })
    ),

    safe('designer count', 0, () =>
      prisma.professionalProfile.count({ where: { isVerified: true } })
    ),

    safe('competition count', 0, () => prisma.post.count({ where: liveCompetitionWhere() })),

    safe('category count', 0, async () => {
      const rows = await prisma.post.groupBy({
        by: ['category'],
        where: PUBLISHED,
        _count: { _all: true },
      })
      return rows.length
    }),

    safe('view total', 0, async () => {
      const agg = await prisma.post.aggregate({ where: PUBLISHED, _sum: { viewCount: true } })
      return agg._sum.viewCount ?? 0
    }),

    safe('prize pool', null as number | null, async () => {
      const agg = await prisma.post.aggregate({
        where: liveCompetitionWhere(),
        _sum: { prizeMoney: true },
      })
      // Prisma hands back a Decimal, never a number.
      const total = agg._sum.prizeMoney
      if (total === null || total === undefined) return null
      const rupees = Number(total)
      return Number.isFinite(rupees) && rupees > 0 ? rupees : null
    }),

    safe('govt count', 0, () =>
      prisma.post.count({
        where: {
          ...PUBLISHED,
          type: 'AROUND_US',
          category: 'new-development',
          subCategory: { in: ['government-policies', 'e-tender'] },
        },
      })
    ),
  ])

  return {
    projects,
    designers,
    counts: {
      projects: projectCount,
      products: productCount,
      designers: designerCount,
      competitions: competitionCount,
      categories: categoryCount,
      views,
      govt: govtCount,
    },
    prizePool,
  }
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

/** "12,458" — Indian digit grouping, so 1,24,580 reads correctly. */
export function inCount(n: number): string {
  return n.toLocaleString('en-IN')
}

/** "₹5,00,000" — whole rupees, Indian grouping, no decimals. */
export function inRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
