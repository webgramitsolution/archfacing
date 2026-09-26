/**
 * Products — §4.1.7, the listing at /products and the detail at /products/[slug].
 *
 * A product is a `Post` row with `type: 'PRODUCT'`. The columns the schema
 * already carries (category, subCategory, city, state, year, viewCount) are
 * used for the SQL-side filtering and sorting; everything a product needs on
 * top of that — the brand, the price and its unit, the rating, the badge, the
 * material, the colour/finish, the application, the availability, the
 * Original / BMF-listed flags, the gallery and the specification rows — lives
 * in `Post.meta`.
 *
 * ⚠️ `meta` is a Json column and therefore untyped. Every read of it goes
 *    through `productMeta()` below, which fills a default for anything it does
 *    not understand rather than throwing. A product seeded months ago with a
 *    half-written meta block must never take the listing down.
 *
 * ⚠️ Two-stage filtering, on purpose — the same arrangement as
 *    `src/lib/projects.ts`. Anything that maps to a real column (category,
 *    sub-category, the free-text search) is filtered in SQL. Price, brand,
 *    material, colour, application, availability and the three product-type
 *    flags only exist inside `meta`, which Postgres cannot range-query through
 *    Prisma reliably or index, so those are applied in memory over the SQL
 *    result. `SCAN_CAP` bounds how many rows that second stage can ever see.
 *    If the products table grows past that, promote price and brand to real
 *    columns and move them into `buildWhere()`.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { compactCount } from './content'
import { PRODUCT_CATEGORIES } from '@/config/taxonomy'

export { compactCount }

// ═══════════════════════════════════════════════════════════
//  meta — the shape, and the parser that guarantees it
// ═══════════════════════════════════════════════════════════

/** The corner badge on a card. `null` means no badge. */
export type ProductBadge = 'best-seller' | 'premium' | 'new-arrival' | 'top-rated' | 'new'

const BADGE_VALUES: ProductBadge[] = ['best-seller', 'premium', 'new-arrival', 'top-rated', 'new']

/** `In Stock` / `Made to Order` — the two the design offers. */
export type Availability = 'In Stock' | 'Made to Order'

export const AVAILABILITY_OPTIONS: { value: string; label: Availability }[] = [
  { value: 'in-stock', label: 'In Stock' },
  { value: 'made-to-order', label: 'Made to Order' },
]

export type ProductSpec = { label: string; value: string }

/** The brand card on the detail page — the product equivalent of a seller. */
export type ProductBrandCard = {
  name: string
  tagline: string
  verified: boolean
  rating: number
  reviews: number
  photo: string
  /** The two letters drawn in the square logo mark. */
  initials: string
}

export type ProductMeta = {
  /** The line under the title on a card — exactly as the brand writes it. */
  brand: string
  /** The slug the Brand filter matches on. */
  brandSlug: string
  badge: ProductBadge | null
  /** In rupees. What the Price Range filter compares against. */
  price: number
  /** "/sq.ft", "/piece", "/bag"… — printed straight after the price. */
  unit: string
  rating: number
  reviews: number
  material: string
  materialSlug: string
  /** The colour/finish label — "Statuario White", "Matte Black"… */
  colour: string
  /** Which swatch in `PRODUCT_COLOURS` this product sits under. */
  colourSlug: string
  application: string
  applicationSlug: string
  availability: Availability
  /** §4.1.7 — sold by the manufacturer itself. */
  isOriginal: boolean
  /** Listed by a BMF (Building Material Facilitator) rather than the brand. */
  isBmfListed: boolean
  /** The brand account carries a verified profile. */
  verifiedBrand: boolean
  coverImage: string
  gallery: string[]
  categoryLabel: string
  subCategoryLabel: string
  highlights: string[]
  specs: ProductSpec[]
  /** Minimum order quantity, as the brand states it. */
  moq: string
  warranty: string
  detailBody: string
  brandCard: ProductBrandCard
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

function badge(v: unknown): ProductBadge | null {
  return typeof v === 'string' && (BADGE_VALUES as string[]).includes(v) ? (v as ProductBadge) : null
}

/** "Kitchen Equipment" → "kitchen-equipment". Kept local so meta can be parsed
 *  without pulling the whole utils module into every caller. */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Never throws. Anything missing or malformed becomes a sensible default. */
export function productMeta(meta: unknown): ProductMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const cover = str(m.coverImage, FALLBACK_IMAGE)
  const b = (m.brandCard ?? {}) as Record<string, unknown>
  const gallery = strList(m.gallery)

  const brand = str(m.brand, 'ArchFacing')
  const material = str(m.material, '—')
  const colour = str(m.colour, '—')
  const application = str(m.application, '—')

  return {
    brand,
    brandSlug: str(m.brandSlug, toSlug(brand)),
    badge: badge(m.badge),
    price: num(m.price),
    unit: str(m.unit, '/piece'),
    rating: Math.min(5, Math.max(0, num(m.rating))),
    reviews: num(m.reviews),
    material,
    materialSlug: str(m.materialSlug, toSlug(material)),
    colour,
    colourSlug: str(m.colourSlug, toSlug(colour)),
    application,
    applicationSlug: str(m.applicationSlug, toSlug(application)),
    availability: m.availability === 'Made to Order' ? 'Made to Order' : 'In Stock',
    isOriginal: m.isOriginal === true,
    isBmfListed: m.isBmfListed === true,
    verifiedBrand: m.verifiedBrand === true,
    coverImage: cover,
    gallery: gallery.length ? gallery : [cover],
    categoryLabel: str(m.categoryLabel, 'Product'),
    subCategoryLabel: str(m.subCategoryLabel),
    highlights: strList(m.highlights),
    specs: objList(m.specs)
      .map((s) => ({ label: str(s.label), value: str(s.value) }))
      .filter((s) => s.label && s.value),
    moq: str(m.moq, '—'),
    warranty: str(m.warranty, '—'),
    detailBody: str(m.detailBody),
    brandCard: {
      name: str(b.name, brand),
      tagline: str(b.tagline, 'Building materials & products'),
      verified: b.verified === true,
      rating: num(b.rating, num(m.rating)),
      reviews: num(b.reviews, num(m.reviews)),
      photo: str(b.photo),
      initials: str(b.initials, str(b.name, brand).slice(0, 2).toUpperCase()),
    },
  }
}

// ═══════════════════════════════════════════════════════════
//  Colour / finish swatches
//
//  ⚠️ These hexes are PRODUCT DATA, not theme tokens. They are the real-world
//     colour of a finish — a walnut board, a matte black tap — and have to be
//     drawn as themselves, so they cannot come out of the Tailwind palette in
//     `tailwind.config.ts`. Nothing else on the Products pages may hard-code a
//     colour: every border, fill and text colour there is a palette token.
// ═══════════════════════════════════════════════════════════

export type ProductColour = { slug: string; label: string; hex: string }

export const PRODUCT_COLOURS: ProductColour[] = [
  { slug: 'white', label: 'White', hex: '#FFFFFF' },
  { slug: 'ivory', label: 'Ivory / Cream', hex: '#F3E9D8' },
  { slug: 'beige', label: 'Beige', hex: '#D9C3A5' },
  { slug: 'grey', label: 'Grey', hex: '#9AA1A9' },
  { slug: 'charcoal', label: 'Charcoal', hex: '#4A4F55' },
  { slug: 'black', label: 'Matte Black', hex: '#1B1B1B' },
  { slug: 'walnut', label: 'Walnut', hex: '#6B4A2F' },
  { slug: 'teak', label: 'Teak / Oak', hex: '#B07C4A' },
  { slug: 'chrome', label: 'Chrome', hex: '#C7CDD3' },
  { slug: 'brass', label: 'Antique Brass', hex: '#B08D3F' },
  { slug: 'terracotta', label: 'Terracotta', hex: '#B4532A' },
  { slug: 'green', label: 'Sage Green', hex: '#7C8F6B' },
  { slug: 'blue', label: 'Indigo Blue', hex: '#3B5A78' },
  { slug: 'red', label: 'Brick Red', hex: '#8C3A2B' },
]

export function colourFor(slug: string): ProductColour | undefined {
  return PRODUCT_COLOURS.find((c) => c.slug === slug)
}

// ═══════════════════════════════════════════════════════════
//  Product groups — the category strip, mapped onto the taxonomy
// ═══════════════════════════════════════════════════════════

/**
 * The design's strip ("Building Materials", "Flooring", "Wall & Cladding"…) is
 * a coarser grouping than the six-parent / twenty-eight-child taxonomy in
 * `src/config/taxonomy.ts`. Each entry lists the taxonomy slugs it covers, so
 * the strip stays a real SQL `category IN (…)` / `subCategory IN (…)` rather
 * than a string match inside `meta`, and its live count is the exact sum of
 * those nodes.
 *
 * `More Categories` deliberately has neither list — like "Others" on the
 * Projects strip, it clears the grouping and shows everything.
 */
export type ProductGroup = {
  value: string
  label: string
  categories?: string[]
  subs?: string[]
}

export const PRODUCT_GROUPS: ProductGroup[] = [
  { value: 'building-materials', label: 'Building Materials', categories: ['structural-products'] },
  { value: 'flooring', label: 'Flooring', subs: ['floor-materials', 'paving-materials'] },
  { value: 'wall-cladding', label: 'Wall & Cladding', subs: ['wall-materials', 'cladding-materials', 'facade-materials'] },
  { value: 'kitchen', label: 'Kitchen', subs: ['kitchen-equipment', 'modular-furniture'] },
  { value: 'bathroom', label: 'Bathroom', subs: ['toilet-equipment', 'plumbing-sanitary'] },
  { value: 'doors-windows', label: 'Doors & Windows', categories: ['doors-windows'] },
  { value: 'lighting', label: 'Lighting', subs: ['lighting-fixtures', 'electrical-fittings'] },
  { value: 'more', label: 'More Categories' },
]

/** The taxonomy label for a category slug, or the slug back if it is unknown. */
export function categoryLabel(slug: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug
}

/** The taxonomy label for a sub-category slug. */
export function subCategoryLabel(slug: string): string {
  for (const c of PRODUCT_CATEGORIES) {
    const hit = (c.children ?? []).find((s) => s.slug === slug)
    if (hit) return hit.name
  }
  return slug
}

// ═══════════════════════════════════════════════════════════
//  Queries
// ═══════════════════════════════════════════════════════════

const PRODUCT_SELECT = {
  id: true, slug: true, title: true, description: true,
  category: true, subCategory: true,
  city: true, state: true, pincode: true, year: true,
  publishedAt: true, viewCount: true, meta: true,
  /*
   * The uploaded photographs.
   *
   * Same omission the projects list had: the gallery was read only from
   * `meta.gallery`, which the seeds write, while a seller uploading through
   * their dashboard writes `Media` rows — so a real product could have
   * photographs in the database and still draw the placeholder.
   */
  media: {
    where: { type: 'IMAGE' as const },
    select: { url: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  author: {
    select: {
      id: true, name: true, profilePhoto: true, city: true, state: true,
      addressLine: true, pincode: true, sellerSlug: true, createdAt: true,
      corporateProfile: {
        select: {
          companyName: true, website: true, isVerified: true,
          gstNumber: true, incorporationDate: true,
        },
      },
      bmfProfile: { select: { businessName: true, isVerified: true, gstNumber: true } },
      // The firm a professional trades under — used as the "Company Name" in
      // the About-the-Company section only, not on the top seller card.
      professionalProfile: { select: { firmName: true } },
    },
  },
} as const

const PUBLISHED = { type: 'PRODUCT' as const, status: 'PUBLISHED' as const, deletedAt: null }

export type ProductSort = 'latest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'

export type ProductQuery = {
  q?: string
  category?: string
  sub?: string
  group?: string
  brand?: string
  priceMin?: number
  priceMax?: number
  material?: string
  /** Colour slugs — the swatch row is multi-select. */
  colours?: string[]
  application?: string
  /** Availability slugs — `in-stock`, `made-to-order`. */
  availability?: string[]
  verified?: boolean
  original?: boolean
  bmf?: boolean
  sort?: ProductSort
  page?: number
  perPage?: number
}

/** The upper bound on rows the in-memory stage may ever walk. See the file header. */
const SCAN_CAP = 500

function buildWhere(f: ProductQuery) {
  const group = PRODUCT_GROUPS.find((g) => g.value === f.group)

  // A group and an explicit category/sub can both be set; the explicit one is
  // the narrower of the two, so it wins.
  const explicit = {
    ...(f.category ? { category: f.category } : {}),
    ...(f.sub ? { subCategory: f.sub } : {}),
  }

  const grouped =
    !f.category && !f.sub && group
      ? {
          ...(group.categories ? { category: { in: group.categories } } : {}),
          ...(group.subs ? { subCategory: { in: group.subs } } : {}),
        }
      : {}

  return {
    ...PUBLISHED,
    ...explicit,
    ...grouped,
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: 'insensitive' as const } },
            { description: { contains: f.q, mode: 'insensitive' as const } },
            // The brand. `meta.brand` is what a card prints, but the searchable
            // copy is the author's own name — a real column, so this stays an
            // index-able query rather than a scan through Json.
            { author: { name: { contains: f.q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }
}

function orderFor(sort: ProductSort) {
  // Price, rating and popularity all live in meta, so they are sorted in
  // memory below; the SQL order still needs to be deterministic.
  return sort === 'popular' ? { viewCount: 'desc' as const } : { publishedAt: 'desc' as const }
}

/**
 * One row as every query in this file returns it. `getProduct` uses the same
 * `PRODUCT_SELECT`, so a card and a detail page are fed the identical shape —
 * which is what lets `<ProductCard />` render a related product unchanged.
 */
export type ProductRow = NonNullable<Awaited<ReturnType<typeof getProduct>>>

/**
 * One page of products, plus the true total for the results bar.
 *
 * `total` is the count AFTER every filter — including the meta-only ones — so
 * "Showing 1 – 20 of N" and the pagination always agree with what is on screen.
 */
/**
 * Stars on a card are the real Review rows for that product — never the
 * seeded meta.rating / meta.reviews, which are overwritten here.
 */
async function withRealRatings<T extends { id: string; meta: Prisma.JsonValue }>(rows: T[]): Promise<T[]> {
  if (!rows.length) return rows
  const agg = await prisma.review.groupBy({ by: ['postId'], where: { postId: { in: rows.map((r) => r.id) } }, _avg: { rating: true }, _count: { _all: true } })
  const by = new Map(agg.map((a) => [a.postId, a]))
  return rows.map((r) => {
    const a = by.get(r.id)
    const m = (r.meta && typeof r.meta === 'object' && !Array.isArray(r.meta) ? r.meta : {}) as Record<string, unknown>
    return { ...r, meta: { ...m, rating: a?._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0, reviews: a?._count._all ?? 0 } }
  })
}

export async function listProducts(f: ProductQuery = {}): Promise<{
  rows: ProductRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = Math.min(Math.max(f.perPage ?? 20, 1), 60)
  const sort: ProductSort = f.sort ?? 'latest'

  const scanned = await withRealRatings(await prisma.post.findMany({
    where: buildWhere(f),
    select: PRODUCT_SELECT,
    orderBy: orderFor(sort),
    take: SCAN_CAP,
  }))

  // ─── stage two: the filters that only exist inside meta ───
  const colours = f.colours?.filter(Boolean) ?? []
  const availability = f.availability?.filter(Boolean) ?? []

  const needsMeta =
    f.priceMin !== undefined || f.priceMax !== undefined ||
    Boolean(f.brand) || Boolean(f.material) || Boolean(f.application) ||
    colours.length > 0 || availability.length > 0 ||
    f.verified || f.original || f.bmf ||
    sort === 'price-asc' || sort === 'price-desc' || sort === 'rating'

  let rows = scanned

  if (needsMeta) {
    const withMeta = scanned.map((r) => ({ row: r, m: productMeta(r.meta) }))

    const kept = withMeta.filter(({ m }) => {
      if (f.priceMin !== undefined && m.price < f.priceMin) return false
      if (f.priceMax !== undefined && m.price > f.priceMax) return false
      if (f.brand && m.brandSlug !== f.brand) return false
      if (f.material && m.materialSlug !== f.material) return false
      if (f.application && m.applicationSlug !== f.application) return false
      if (colours.length && !colours.includes(m.colourSlug)) return false
      if (availability.length) {
        const slug = m.availability === 'Made to Order' ? 'made-to-order' : 'in-stock'
        if (!availability.includes(slug)) return false
      }
      if (f.verified && !m.verifiedBrand) return false
      if (f.original && !m.isOriginal) return false
      if (f.bmf && !m.isBmfListed) return false
      return true
    })

    if (sort === 'price-asc') kept.sort((a, b) => a.m.price - b.m.price)
    if (sort === 'price-desc') kept.sort((a, b) => b.m.price - a.m.price)
    if (sort === 'rating') kept.sort((a, b) => b.m.rating - a.m.rating || b.m.reviews - a.m.reviews)

    rows = kept.map((k) => k.row)
  }

  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(f.page ?? 1, 1), pages)
  const start = (page - 1) * perPage

  return { rows: rows.slice(start, start + perPage), total, page, perPage, pages }
}

/**
 * A product's pictures, from whichever source holds them.
 *
 * Uploads win over seed metadata — a `Media` row is something a person put
 * there, `meta.gallery` is what a seed wrote.
 */
export function productPhotos(
  row: { media?: { url: string }[] | null; meta: unknown }
): { cover: string; gallery: string[] } {
  const uploaded = (row.media ?? []).map((m) => m.url).filter(Boolean)
  if (uploaded.length) return { cover: uploaded[0], gallery: uploaded }

  const m = productMeta(row.meta)
  return { cover: m.coverImage, gallery: m.gallery }
}

export async function getProduct(slug: string) {
  return prisma.post.findFirst({
    where: { ...PUBLISHED, slug },
    select: PRODUCT_SELECT,
  })
}

export type ProductDetail = ProductRow

/**
 * Other products the reader is likely to want next: same sub-category first,
 * then the same category, then the newest overall — so the row is never short.
 */
export async function relatedProducts(
  slug: string,
  category: string,
  subCategory: string | null,
  take = 5
): Promise<ProductRow[]> {
  const out: ProductRow[] = []
  const seen = new Set<string>([slug])

  const push = (rows: ProductRow[]) => {
    for (const r of rows) {
      if (out.length >= take) return
      if (seen.has(r.slug)) continue
      seen.add(r.slug)
      out.push(r)
    }
  }

  if (subCategory) {
    push(
      await prisma.post.findMany({
        where: { ...PUBLISHED, subCategory, slug: { not: slug } },
        select: PRODUCT_SELECT,
        orderBy: { publishedAt: 'desc' },
        take,
      })
    )
  }

  if (out.length < take) {
    push(
      await prisma.post.findMany({
        where: { ...PUBLISHED, category, slug: { notIn: [...seen] } },
        select: PRODUCT_SELECT,
        orderBy: { publishedAt: 'desc' },
        take: take - out.length,
      })
    )
  }

  if (out.length < take) {
    push(
      await prisma.post.findMany({
        where: { ...PUBLISHED, slug: { notIn: [...seen] } },
        select: PRODUCT_SELECT,
        orderBy: { publishedAt: 'desc' },
        take: take - out.length,
      })
    )
  }

  return withRealRatings(out)
}

/**
 * Live product counts, straight from the database.
 *
 * `byCategory` is keyed on the taxonomy parent slug, `bySub` on the child —
 * the category strip sums whichever list its group names, and the sidebar's
 * Category select prints `byCategory` beside each option.
 */
export async function productCounts(): Promise<{
  all: number
  byCategory: Record<string, number>
  bySub: Record<string, number>
}> {
  const rows = await prisma.post.groupBy({
    by: ['category', 'subCategory'],
    where: PUBLISHED,
    _count: { _all: true },
  })

  const byCategory: Record<string, number> = {}
  const bySub: Record<string, number> = {}
  let all = 0

  for (const r of rows) {
    const n = r._count._all
    all += n
    byCategory[r.category] = (byCategory[r.category] ?? 0) + n
    if (r.subCategory) bySub[r.subCategory] = (bySub[r.subCategory] ?? 0) + n
  }

  return { all, byCategory, bySub }
}

/** The live count behind one strip chip. `More Categories` covers everything. */
export function groupCount(
  group: ProductGroup,
  counts: { all: number; byCategory: Record<string, number>; bySub: Record<string, number> }
): number {
  if (!group.categories && !group.subs) return counts.all
  let n = 0
  for (const c of group.categories ?? []) n += counts.byCategory[c] ?? 0
  for (const s of group.subs ?? []) n += counts.bySub[s] ?? 0
  return n
}

export type ProductFacets = {
  brands: { slug: string; label: string }[]
  materials: { slug: string; label: string }[]
  applications: { slug: string; label: string }[]
  colours: ProductColour[]
  priceMin: number
  priceMax: number
}

/**
 * The values that actually exist in the data, for the sidebar's selects.
 *
 * Offering a brand or a material with no products behind it is a dead end, so
 * every list here is built from the seeded rows rather than a hard-coded one.
 * The colour swatches keep `PRODUCT_COLOURS` order so the row does not
 * re-shuffle itself as stock changes.
 */
export async function productFacets(): Promise<ProductFacets> {
  const rows = await prisma.post.findMany({
    where: PUBLISHED,
    select: { meta: true },
    take: SCAN_CAP,
  })

  const brands = new Map<string, string>()
  const materials = new Map<string, string>()
  const applications = new Map<string, string>()
  const colours = new Set<string>()
  let priceMin = Number.POSITIVE_INFINITY
  let priceMax = 0

  for (const r of rows) {
    const m = productMeta(r.meta)
    if (m.brandSlug) brands.set(m.brandSlug, m.brand)
    if (m.materialSlug && m.material !== '—') materials.set(m.materialSlug, m.material)
    if (m.applicationSlug && m.application !== '—') applications.set(m.applicationSlug, m.application)
    if (m.colourSlug) colours.add(m.colourSlug)
    if (m.price > 0) {
      priceMin = Math.min(priceMin, m.price)
      priceMax = Math.max(priceMax, m.price)
    }
  }

  const sorted = (map: Map<string, string>) =>
    [...map.entries()]
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label))

  return {
    brands: sorted(brands),
    materials: sorted(materials),
    applications: sorted(applications),
    colours: PRODUCT_COLOURS.filter((c) => colours.has(c.slug)),
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
  }
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

/** "Gurugram, Haryana" — drops whichever half is missing. */
export function placeLine(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(', ')
}
