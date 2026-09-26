/**
 * Projects — §5.2.2, the listing at /projects and the detail at /projects/[slug].
 *
 * A project is a `Post` row with `type: 'PROJECT'`. The columns the schema
 * already carries (city, state, year, category, subCategory, viewCount) are
 * used for filtering and sorting; everything the design needs on top of that
 * — the firm's tags, the badge, likes and comments, the gallery, the key
 * features, the seller card, the testimonials — lives in `Post.meta`.
 *
 * ⚠️ `meta` is a Json column and therefore untyped. Every read of it goes
 *    through `projectMeta()` below, which fills a default for anything it does
 *    not understand rather than throwing. A project seeded years ago with a
 *    half-written meta block must never take the listing down.
 *
 * ⚠️ Two-stage filtering, on purpose. Anything that maps to a real column is
 *    filtered in SQL. Built-up area, budget and the three "Award / Verified /
 *    Featured" flags only exist inside `meta`, which Postgres cannot range-
 *    query through Prisma reliably or index, so those are applied in memory
 *    over the SQL result. `SCAN_CAP` bounds how many rows that second stage
 *    can ever see. If the projects table grows past that, promote area, budget
 *    and the flags to real columns and move them into `buildWhere()`.
 */

import { prisma } from './prisma'
import { compactCount } from './content'
import type { GlyphName } from '@/components/projects'

export { compactCount }

// ═══════════════════════════════════════════════════════════
//  meta — the shape, and the parser that guarantees it
// ═══════════════════════════════════════════════════════════

/** The corner badge on a card. `null` means no badge. */
export type ProjectBadge = 'featured' | 'award' | 'new'

export type ProjectSeller = {
  name: string
  tagline: string
  verified: boolean
  rating: number
  reviews: number
  photo: string
  /** The two letters drawn in the square logo mark. */
  initials: string
}

export type ProjectFeature = { icon: GlyphName; label: string }

export type ProjectTestimonial = {
  name: string
  city: string
  stars: number
  quote: string
}

export type ProjectMeta = {
  firmName: string
  tags: string[]
  badge: ProjectBadge | null
  likes: number
  comments: number
  categoryLabel: string
  subCategoryLabel: string
  /** "Residential", "Commercial"… — the orange pill on the detail page. */
  projectType: string
  coverImage: string
  gallery: string[]
  /** "5,200 Sq.ft." — the label. */
  area: string
  /** 5200 — the number the Built-up Area filter compares against. */
  areaSqft: number
  yearLabel: string
  style: string
  scopeOfWork: string
  client: string
  architect: string
  /** In rupees — what the Budget Range filter compares against. */
  budget: number
  budgetLabel: string
  awardWinning: boolean
  verified: boolean
  featured: boolean
  detailBody: string
  seller: ProjectSeller
  features: ProjectFeature[]
  testimonials: ProjectTestimonial[]
}

const FALLBACK_IMAGE = '/img/hero-professionals.svg'

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : []
}

function objList(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    : []
}

function badge(v: unknown): ProjectBadge | null {
  return v === 'featured' || v === 'award' || v === 'new' ? v : null
}

/** Never throws. Anything missing or malformed becomes a sensible default. */
export function projectMeta(meta: unknown): ProjectMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const cover = str(m.coverImage, FALLBACK_IMAGE)
  const s = (m.seller ?? {}) as Record<string, unknown>

  const gallery = strList(m.gallery)

  return {
    firmName: str(m.firmName),
    tags: strList(m.tags),
    badge: badge(m.badge),
    likes: num(m.likes),
    comments: num(m.comments),
    categoryLabel: str(m.categoryLabel, 'Project'),
    subCategoryLabel: str(m.subCategoryLabel),
    projectType: str(m.projectType, str(m.categoryLabel, 'Project')),
    coverImage: cover,
    gallery: gallery.length ? gallery : [cover],
    area: str(m.area, '—'),
    areaSqft: num(m.areaSqft),
    yearLabel: str(m.yearLabel, '—'),
    style: str(m.style, '—'),
    scopeOfWork: str(m.scopeOfWork, '—'),
    client: str(m.client, '—'),
    architect: str(m.architect, str(m.firmName)),
    budget: num(m.budget),
    budgetLabel: str(m.budgetLabel, 'On request'),
    awardWinning: m.awardWinning === true,
    verified: m.verified === true,
    featured: m.featured === true,
    detailBody: str(m.detailBody),
    seller: {
      name: str(s.name, str(m.firmName, 'ArchFacing')),
      tagline: str(s.tagline, 'Architects & Interior Designers'),
      verified: s.verified === true,
      rating: num(s.rating, 0),
      reviews: num(s.reviews, 0),
      photo: str(s.photo),
      initials: str(s.initials, str(s.name, 'AF').slice(0, 2).toUpperCase()),
    },
    features: objList(m.features)
      .map((f) => ({ icon: str(f.icon, 'star') as GlyphName, label: str(f.label) }))
      .filter((f) => f.label),
    testimonials: objList(m.testimonials)
      .map((t) => ({
        name: str(t.name),
        city: str(t.city),
        stars: Math.min(5, Math.max(0, num(t.stars, 5))),
        quote: str(t.quote),
      }))
      .filter((t) => t.name && t.quote),
  }
}

// ═══════════════════════════════════════════════════════════
//  Project Type — a filter that maps onto taxonomy categories
// ═══════════════════════════════════════════════════════════

/**
 * The design's "Project Type" is a coarser grouping than the 14-category
 * taxonomy in `src/config/taxonomy.ts`. Each entry lists the taxonomy slugs it
 * covers, so the filter stays a real SQL `category IN (…)` rather than a
 * string match inside `meta`.
 */
export const PROJECT_TYPES: { value: string; label: string; categories: string[] }[] = [
  { value: 'residential', label: 'Residential', categories: ['residential'] },
  { value: 'interior', label: 'Interior', categories: ['interior'] },
  { value: 'commercial', label: 'Commercial', categories: ['commercial-offices'] },
  { value: 'landscape', label: 'Landscape', categories: ['landscaped'] },
  { value: 'institutional', label: 'Institutional', categories: ['education-sports', 'public-buildings'] },
  { value: 'industrial', label: 'Industrial', categories: ['industrials-factories'] },
  { value: 'hospitality', label: 'Hospitality', categories: ['hospitality'] },
]

// ═══════════════════════════════════════════════════════════
//  Queries
// ═══════════════════════════════════════════════════════════

const PROJECT_SELECT = {
  id: true, slug: true, title: true, description: true,
  category: true, subCategory: true,
  city: true, state: true, pincode: true, year: true,
  publishedAt: true, viewCount: true, meta: true,
  // Real engagement: "likes" are saves, "comments" are reviews — never meta.
  _count: { select: { savedBy: true, reviews: true } },
  /*
   * The uploaded photographs.
   *
   * This was missing, and the consequence was not cosmetic: the cover and
   * gallery were read only from `meta.coverImage` / `meta.gallery`, which
   * the seeds write — while a professional uploading photographs through
   * their dashboard writes `Media` rows. So a real project could have a full
   * gallery in the database and still draw the placeholder on every public
   * card. `projectPhotos` below prefers these and keeps `meta` as the
   * fallback, so older seeded rows are unaffected.
   */
  media: {
    where: { type: 'IMAGE' as const },
    select: { url: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  author: {
    select: {
      id: true, name: true, profilePhoto: true, city: true, state: true,
      professionalProfile: { select: { firmName: true, bio: true, isVerified: true } },
    },
  },
} as const

const PUBLISHED = { type: 'PROJECT' as const, status: 'PUBLISHED' as const, deletedAt: null }

export type ProjectSort = 'latest' | 'oldest' | 'views' | 'likes'

export type ProjectQuery = {
  q?: string
  category?: string
  sub?: string
  city?: string
  state?: string
  pincode?: string
  projectType?: string
  year?: number
  areaMin?: number
  areaMax?: number
  budgetMin?: number
  budgetMax?: number
  award?: boolean
  verified?: boolean
  featured?: boolean
  sort?: ProjectSort
  page?: number
  perPage?: number
}

/** The upper bound on rows the in-memory stage may ever walk. See the file header. */
const SCAN_CAP = 500

function buildWhere(f: ProjectQuery) {
  const type = PROJECT_TYPES.find((t) => t.value === f.projectType)

  // A project type and an explicit category can both be set; the category is
  // the narrower of the two, so it wins.
  const categoryFilter = f.category
    ? { category: f.category }
    : type
      ? { category: { in: type.categories } }
      : {}

  return {
    ...PUBLISHED,
    ...categoryFilter,
    ...(f.sub ? { subCategory: f.sub } : {}),
    ...(f.city ? { city: f.city } : {}),
    ...(f.state ? { state: f.state } : {}),
    ...(f.pincode ? { pincode: f.pincode } : {}),
    ...(f.year ? { year: f.year } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: 'insensitive' as const } },
            { description: { contains: f.q, mode: 'insensitive' as const } },
            { city: { contains: f.q, mode: 'insensitive' as const } },
            { state: { contains: f.q, mode: 'insensitive' as const } },
            // The architect. The firm name is mirrored into `meta.firmName` for
            // display, but the searchable copy is the author's own name — a
            // real column, so this stays a real index-able query.
            { author: { name: { contains: f.q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }
}

function orderFor(sort: ProjectSort) {
  switch (sort) {
    case 'oldest':
      return { publishedAt: 'asc' as const }
    case 'views':
      return { viewCount: 'desc' as const }
    // 'likes' lives in meta, so it is sorted in memory below; the SQL order
    // still needs to be deterministic.
    default:
      return { publishedAt: 'desc' as const }
  }
}

/**
 * One row as every query in this file returns it. `getProject` uses the same
 * `PROJECT_SELECT`, so a card and a detail page are fed the identical shape —
 * which is what lets `<ProjectCard />` render a related project unchanged.
 */
export type ProjectRow = NonNullable<Awaited<ReturnType<typeof getProject>>>

/**
 * One page of projects, plus the true total for the results bar.
 *
 * `total` is the count AFTER every filter — including the meta-only ones — so
 * "Showing 1 – 12 of N" and the pagination always agree with what is on screen.
 */
export async function listProjects(f: ProjectQuery = {}): Promise<{
  rows: ProjectRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = Math.min(Math.max(f.perPage ?? 12, 1), 48)
  const sort: ProjectSort = f.sort ?? 'latest'

  const scanned = await prisma.post.findMany({
    where: buildWhere(f),
    select: PROJECT_SELECT,
    orderBy: orderFor(sort),
    take: SCAN_CAP,
  })

  // ─── stage two: the filters that only exist inside meta ───
  const needsMeta =
    f.areaMin !== undefined || f.areaMax !== undefined ||
    f.budgetMin !== undefined || f.budgetMax !== undefined ||
    f.award || f.verified || f.featured || sort === 'likes'

  let rows = scanned

  if (needsMeta) {
    const withMeta = scanned.map((r) => ({ row: r, m: projectMeta(r.meta) }))

    const kept = withMeta.filter(({ m }) => {
      if (f.areaMin !== undefined && m.areaSqft < f.areaMin) return false
      if (f.areaMax !== undefined && m.areaSqft > f.areaMax) return false
      if (f.budgetMin !== undefined && m.budget < f.budgetMin) return false
      if (f.budgetMax !== undefined && m.budget > f.budgetMax) return false
      if (f.award && !m.awardWinning) return false
      if (f.verified && !m.verified) return false
      if (f.featured && !m.featured) return false
      return true
    })

    if (sort === 'likes') kept.sort((a, b) => b.row._count.savedBy - a.row._count.savedBy)

    rows = kept.map((k) => k.row)
  }

  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(f.page ?? 1, 1), pages)
  const start = (page - 1) * perPage

  return { rows: rows.slice(start, start + perPage), total, page, perPage, pages }
}

export async function getProject(slug: string) {
  return prisma.post.findFirst({
    where: { ...PUBLISHED, slug },
    select: PROJECT_SELECT,
  })
}

export type ProjectDetail = ProjectRow

/** Other projects in the same category, falling back to the newest overall. */
export async function relatedProjects(slug: string, category: string, take = 5) {
  const same = await prisma.post.findMany({
    where: { ...PUBLISHED, category, slug: { not: slug } },
    select: PROJECT_SELECT,
    orderBy: { publishedAt: 'desc' },
    take,
  })

  if (same.length >= take) return same

  const fill = await prisma.post.findMany({
    where: { ...PUBLISHED, slug: { notIn: [slug, ...same.map((p) => p.slug)] } },
    select: PROJECT_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: take - same.length,
  })

  return [...same, ...fill]
}

/** Live project counts per taxonomy category slug, plus `all`. */
export async function projectCounts(): Promise<Record<string, number> & { all: number }> {
  const rows = await prisma.post.groupBy({
    by: ['category'],
    where: PUBLISHED,
    _count: { _all: true },
  })

  const out: Record<string, number> & { all: number } = { all: 0 }
  for (const r of rows) {
    out[r.category] = r._count._all
    out.all += r._count._all
  }
  return out
}

/**
 * The values that actually exist in the data, for the sidebar's selects.
 *
 * Offering a city with no projects behind it is a dead end, so the City, State
 * and Year selects are all built from this rather than from a hard-coded list.
 */
export async function projectFacets(): Promise<{
  cities: string[]
  states: string[]
  years: number[]
}> {
  const rows = await prisma.post.findMany({
    where: PUBLISHED,
    select: { city: true, state: true, year: true },
    take: SCAN_CAP,
  })

  const cities = new Set<string>()
  const states = new Set<string>()
  const years = new Set<number>()

  for (const r of rows) {
    if (r.city) cities.add(r.city)
    if (r.state) states.add(r.state)
    if (r.year) years.add(r.year)
  }

  return {
    cities: [...cities].sort((a, b) => a.localeCompare(b)),
    states: [...states].sort((a, b) => a.localeCompare(b)),
    years: [...years].sort((a, b) => b - a),
  }
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

/** "Gurugram, Haryana" — drops whichever half is missing. */
/**
 * A project's cover and gallery, from whichever source actually holds them.
 *
 * Uploads win over seed metadata: a `Media` row is something a person put
 * there through the dashboard, and `meta.coverImage` is what a seed script
 * wrote. When neither exists the caller gets the placeholder, exactly as
 * before.
 */
export function projectPhotos(
  row: { media?: { url: string }[] | null; meta: unknown }
): { cover: string; gallery: string[] } {
  const uploaded = (row.media ?? []).map((m) => m.url).filter(Boolean)
  if (uploaded.length) return { cover: uploaded[0], gallery: uploaded }

  const m = projectMeta(row.meta)
  return { cover: m.coverImage, gallery: m.gallery }
}

export function placeLine(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(', ')
}
