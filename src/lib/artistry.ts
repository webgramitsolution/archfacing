/**
 * Artistry postings — §5.2.5.
 *
 * Artistry shares the `Post` table with everything else (type `ARTISTRY`), so
 * every field the design asks for that the schema has no column for lives in
 * `Post.meta`, which is a `Json` column and therefore untyped.
 *
 * ⚠️ Same rule as `src/lib/content.ts`: every read of `meta` goes through a
 *    parser in this file, and every parser drops a value it does not
 *    understand rather than throwing. A posting written by an older version of
 *    the form must never be able to take the page down.
 *
 * ⚠️ Images are stored as bare Unsplash photo ids, not as finished URLs. The
 *    same photograph is rendered at five sizes on the detail page (thumb rail,
 *    hero, card, sidebar row, full size), so the size belongs to the call
 *    site — `photoSrc()` turns an id into a URL. Blog stores finished URLs
 *    because it only ever needed three fixed sizes.
 */

import { prisma } from './prisma'
import type { IconName } from '@/components/ui'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { badgeTones, type BadgeTone } from '@/lib/verified'

// ═══════════════════════════════════════════════════════════
//  Primitives
// ═══════════════════════════════════════════════════════════

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
}

function objList(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    : []
}

/**
 * The `Icon` union is a closed set. A meta row naming an icon that has since
 * been renamed falls back to a star rather than rendering `undefined` paths.
 */
const ICON_FALLBACK: IconName = 'star'

function icon(v: unknown): IconName {
  return (str(v, ICON_FALLBACK) as IconName) ?? ICON_FALLBACK
}

// ═══════════════════════════════════════════════════════════
//  Shapes
// ═══════════════════════════════════════════════════════════

/** One row of the two specification columns — label on the left, value right. */
export type SpecRow = { label: string; value: string }

/** An icon + label + value row, used by "Project Information". */
export type FactRow = { icon: IconName; label: string; value: string }

export type ArtworkArtist = {
  name: string
  /** "Ar. Rajeev S." — the abbreviated form the similar-artwork rows use. */
  shortName: string
  role: string
  /**
   * The discipline printed in the sidebar card's heading, "Artist / …".
   * The design shows a shorter, more formal word there than the role under
   * the artist's name, so it is stored separately rather than derived.
   */
  cardLabel: string
  bio: string
  /** bare Unsplash photo id */
  photo: string
  location: string
  rating: number
  reviews: number
  /** percent of reviewers who recommend, 0–100 */
  recommend: number
  projects: string
  followers: string
  successRate: string
  verified: boolean
  /** Tick colour — gold for a top-plan member, blue for a PACT holder. */
  badgeTone: BadgeTone | null
}

export type ArtworkStats = {
  views: number
  inquiries: number
  shortlisted: number
  favourites: number
  /** e.g. "18%" — stored as text because it is a display figure, not a rate to compute with */
  enquiriesRate: string
  /** e.g. "2-6 Hours" */
  responseTime: string
}

export type ArtworkMeta = {
  subtitle: string
  location: string
  artworkId: string
  medium: string
  projectStatus: string
  lastUpdated: string
  addedOn: string
  categoryLabel: string
  subCategoryLabel: string
  badges: string[]
  /** the cover photograph — bare Unsplash id */
  image: string
  /** every photograph in the gallery, bare Unsplash ids. Always at least one. */
  gallery: string[]
  /** the "About this Artwork" paragraphs */
  about: string[]
  specsLeft: SpecRow[]
  specsRight: SpecRow[]
  tags: string[]
  projectInfo: FactRow[]
  stats: ArtworkStats
  artist: ArtworkArtist
}

const FALLBACK_PHOTO = '1477587458883-47145ed94245' // Hawa Mahal — the Artistry default

// ═══════════════════════════════════════════════════════════
//  The parser
// ═══════════════════════════════════════════════════════════

function specRows(v: unknown): SpecRow[] {
  return objList(v)
    .map((r) => ({ label: str(r.label), value: str(r.value) }))
    .filter((r) => r.label && r.value)
}

function factRows(v: unknown): FactRow[] {
  return objList(v)
    .map((r) => ({ icon: icon(r.icon), label: str(r.label), value: str(r.value) }))
    .filter((r) => r.label && r.value)
}

function artist(v: unknown): ArtworkArtist {
  const a = (v ?? {}) as Record<string, unknown>
  const name = str(a.name, 'ArchFacing')
  const role = str(a.role)

  return {
    name,
    shortName: str(a.shortName, name),
    role,
    cardLabel: str(a.cardLabel, role || 'Professional'),
    bio: str(a.bio),
    photo: str(a.photo),
    location: str(a.location),
    rating: num(a.rating),
    reviews: num(a.reviews),
    recommend: num(a.recommend),
    projects: str(a.projects, '—'),
    followers: str(a.followers, '—'),
    successRate: str(a.successRate, '—'),
    verified: a.verified === true,
    badgeTone: a.badgeTone === 'gold' || a.badgeTone === 'blue' ? a.badgeTone : null,
  }
}

function stats(v: unknown): ArtworkStats {
  const s = (v ?? {}) as Record<string, unknown>
  return {
    views: num(s.views),
    inquiries: num(s.inquiries),
    shortlisted: num(s.shortlisted),
    favourites: num(s.favourites),
    // "—" rather than a made-up number: both are display strings with no
    // computed source, so an empty one has to read as absent.
    enquiriesRate: str(s.enquiriesRate, '—'),
    responseTime: str(s.responseTime, '—'),
  }
}

export function artworkMeta(meta: unknown): ArtworkMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const image = str(m.image, FALLBACK_PHOTO)
  const gallery = strList(m.gallery)

  return {
    subtitle: str(m.subtitle),
    location: str(m.location),
    artworkId: str(m.artworkId, '—'),
    medium: str(m.medium, '—'),
    projectStatus: str(m.projectStatus, '—'),
    lastUpdated: str(m.lastUpdated, '—'),
    addedOn: str(m.addedOn, '—'),
    categoryLabel: str(m.categoryLabel, 'Artistry'),
    subCategoryLabel: str(m.subCategoryLabel),
    badges: strList(m.badges),
    image,
    // The gallery always has at least the cover, so the rail and the counter
    // never have to handle a zero case.
    gallery: gallery.length > 0 ? gallery : [image],
    about: strList(m.about),
    specsLeft: specRows(m.specsLeft),
    specsRight: specRows(m.specsRight),
    tags: strList(m.tags),
    projectInfo: factRows(m.projectInfo),
    stats: stats(m.stats),
    artist: artist(m.artist),
  }
}

// ═══════════════════════════════════════════════════════════
//  Queries
// ═══════════════════════════════════════════════════════════

const ARTWORK_SELECT = {
  id: true, slug: true, title: true, description: true,
  category: true, subCategory: true, city: true, state: true,
  publishedAt: true, viewCount: true, meta: true,
  author: { select: { id: true, name: true, profilePhoto: true } },
} as const

const PUBLISHED = { type: 'ARTISTRY' as const, status: 'PUBLISHED' as const, deletedAt: null }

/**
 * Replace whatever `meta.stats` the row was seeded with by counted figures:
 * views = Post.viewCount, inquiries = enquiries raised from this artwork,
 * shortlisted / favourites = members who saved it. Nothing here is typed in.
 */
async function withRealStats<T extends { id: string; viewCount: number; meta: unknown; author: { id: string } }>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows
  const ids = rows.map((r) => r.id)
  // The blue tick belongs to active-PACT holders only — never a seeded flag.
  const tones = await badgeTones(rows.map((r) => r.author.id))
  const [enq, chats, saves] = await Promise.all([
    prisma.enquiry.groupBy({ by: ['sourceId'], where: { sourceId: { in: ids } }, _count: { _all: true } }),
    // "Send Enquiry" / "Chat Now" open a Messages thread — each one is an inquiry.
    prisma.conversation.groupBy({ by: ['postId'], where: { postId: { in: ids } }, _count: { _all: true } }),
    prisma.savedItem.groupBy({ by: ['postId'], where: { postId: { in: ids } }, _count: { _all: true } }),
  ])
  const enqBy = new Map<string | null, number>(enq.map((e) => [e.sourceId, e._count._all]))
  for (const c of chats) enqBy.set(c.postId, (enqBy.get(c.postId) ?? 0) + c._count._all)
  const saveBy = new Map(saves.map((e) => [e.postId, e._count._all]))
  return rows.map((r) => {
    const saved = saveBy.get(r.id) ?? 0
    const base = r.meta && typeof r.meta === 'object' && !Array.isArray(r.meta) ? (r.meta as Record<string, unknown>) : {}
    const artist = base.artist && typeof base.artist === 'object' ? (base.artist as Record<string, unknown>) : {}
    return {
      ...r,
      meta: {
        ...base,
        artist: { ...artist, verified: tones.has(r.author.id), badgeTone: tones.get(r.author.id) ?? null },
        stats: {
          views: r.viewCount,
          inquiries: enqBy.get(r.id) ?? 0,
          shortlisted: saved,
          favourites: saved,
        },
      },
    }
  })
}

export async function listArtworks({
  category,
  sub,
  search,
  sort = 'latest',
  take = 12,
  skip = 0,
  excludeSlug,
}: {
  category?: string
  sub?: string
  search?: string
  sort?: 'latest' | 'popular'
  take?: number
  skip?: number
  excludeSlug?: string
} = {}) {
  const rows = await prisma.post.findMany({
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
    select: ARTWORK_SELECT,
    orderBy: sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' },
    take,
    skip,
  })
  return withRealStats(rows)
}

export type ArtworkRow = Awaited<ReturnType<typeof listArtworks>>[number]

export async function countArtworks({
  category,
  sub,
  search,
}: { category?: string; sub?: string; search?: string } = {}) {
  return prisma.post.count({
    where: {
      ...PUBLISHED,
      ...(category ? { category } : {}),
      ...(sub ? { subCategory: sub } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
  })
}

export async function getArtwork(slug: string) {
  const row = await prisma.post.findFirst({
    where: { ...PUBLISHED, slug },
    select: {
      ...ARTWORK_SELECT,
      author: {
        select: {
          id: true, name: true, profilePhoto: true, city: true, state: true,
          professionalProfile: { select: { firmName: true, bio: true, isVerified: true } },
        },
      },
    },
  })
  return row ? (await withRealStats([row]))[0] : null
}

export type ArtworkDetail = NonNullable<Awaited<ReturnType<typeof getArtwork>>>

/**
 * The three rows under "Similar Artworks".
 *
 * Prefers the same sub-category, widens to the category, and finally falls
 * back to the newest postings — the card is always in the design, so it must
 * never come back empty just because a sub-category holds a single artwork.
 */
export async function similarArtworks(
  slug: string,
  { category, sub, take = 3 }: { category?: string; sub?: string | null; take?: number } = {}
): Promise<ArtworkRow[]> {
  const tries: Parameters<typeof listArtworks>[0][] = [
    ...(sub ? [{ category, sub, take, excludeSlug: slug }] : []),
    ...(category ? [{ category, take, excludeSlug: slug }] : []),
    { take, excludeSlug: slug },
  ]

  for (const where of tries) {
    const rows = await listArtworks(where)
    if (rows.length > 0) return rows
  }

  return []
}

/**
 * Published artwork counts, keyed by slug.
 *
 * Both maps come back in one call because the listing shows a count on the
 * group chips and on the sub-category chips at the same time.
 */
export async function artworkCounts(): Promise<{
  byCategory: Record<string, number>
  bySub: Record<string, number>
  total: number
}> {
  const [categories, subs, total] = await Promise.all([
    prisma.post.groupBy({ by: ['category'], where: PUBLISHED, _count: { _all: true } }),
    prisma.post.groupBy({ by: ['subCategory'], where: PUBLISHED, _count: { _all: true } }),
    prisma.post.count({ where: PUBLISHED }),
  ])

  const byCategory: Record<string, number> = {}
  for (const r of categories) byCategory[r.category] = r._count._all

  const bySub: Record<string, number> = {}
  for (const r of subs) if (r.subCategory) bySub[r.subCategory] = r._count._all

  return { byCategory, bySub, total }
}

/**
 * The four figures on the listing sidebar's navy card.
 *
 * Counted rather than written down: an empty database should say so instead
 * of claiming a thousand works. `categories` counts the taxonomy's leaves,
 * which is a fixed property of the catalogue rather than of the content.
 */
export async function artistryReach(): Promise<{
  works: number
  creators: number
  categories: number
  states: number
}> {
  const [works, creators, states] = await Promise.all([
    prisma.post.count({ where: PUBLISHED }),
    prisma.post.findMany({ where: PUBLISHED, distinct: ['authorId'], select: { authorId: true } }),
    prisma.post.findMany({
      where: { ...PUBLISHED, state: { not: null } },
      distinct: ['state'],
      select: { state: true },
    }),
  ])

  const categories = ARTISTRY_CATEGORIES.reduce(
    (n, g) => n + (g.children?.length ?? 0),
    0
  )

  return { works, creators: creators.length, categories, states: states.length }
}

/**
 * The two rates on the "Artwork Stats" card, both counted:
 * enquiry rate = inquiries ÷ views, and response time = the artist's average
 * first reply in the Messages threads opened from this artwork.
 */
export async function artworkRates(postId: string, authorId: string, inquiries: number, views: number) {
  const threads = await prisma.conversation.findMany({
    where: { postId },
    select: { messages: { orderBy: { createdAt: 'asc' }, select: { senderId: true, createdAt: true }, take: 50 } },
  })
  const gaps: number[] = []
  for (const t of threads) {
    const asked = t.messages.find((m) => m.senderId !== authorId)
    if (!asked) continue
    const answered = t.messages.find((m) => m.senderId === authorId && m.createdAt >= asked.createdAt)
    if (answered) gaps.push(answered.createdAt.getTime() - asked.createdAt.getTime())
  }
  const avgH = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length / 3_600_000 : null
  const responseTime =
    avgH === null ? '—'
    : avgH < 1 ? 'Under 1 Hour'
    : avgH < 24 ? `${Math.round(avgH)} Hour${Math.round(avgH) === 1 ? '' : 's'}`
    : `${Math.round(avgH / 24)} Day${Math.round(avgH / 24) === 1 ? '' : 's'}`
  const enquiryRate = views > 0 ? `${Math.round((inquiries / views) * 100)}%` : '—'
  return { responseTime, enquiryRate }
}
