import Image from 'next/image'
import Link from 'next/link'
import { PRODUCT_CATEGORIES } from '@/config/taxonomy'
import { Glyph, photoSrc, Stars, type GlyphName } from '@/components/projects'
import {
  AVAILABILITY_OPTIONS, productMeta, productPhotos,
  type ProductColour, type ProductFacets, type ProductRow,
} from '@/lib/products'
import { cn, formatINR } from '@/lib/utils'

/**
 * Everything the two Products pages share.
 *
 * The listing and the detail page draw the same cards, the same glyph set and
 * the same filter vocabulary, so they live here once instead of drifting apart.
 *
 * Every component in this file is a Server Component. The Products pages carry
 * no client JavaScript at all: the filters are a plain GET <form>, the sort is
 * a <select> attached to that same form with the HTML `form=` attribute, the
 * grid/list toggle and the pagination are links, the colour swatches are
 * checkboxes styled through Tailwind's `peer-checked:`, and the overflow row
 * of swatches is a <details> disclosure.
 *
 * ★ The shared furniture — <Glyph>, <Stars>, <VerifiedTick>, <SellerMark>,
 *   <SectionTitle>, <BrandStrip> and <TrustStrip> — is imported from
 *   `components/projects.tsx` rather than redrawn, so the two listings stay
 *   visually identical. Only the handful of glyphs a product needs and the
 *   projects set does not carry are drawn below.
 */

// ═══════════════════════════════════════════════════════════
//  Marketing figures
//
//  ⚠️ NONE OF THESE ARE LIVE DATA. They are the headline numbers printed on
//     the design, kept in one place so they are obviously editable and can
//     never be mistaken for a database count. Every other number on the
//     Products pages — the results bar, the category strip, the sidebar's
//     option counts, the pagination — is computed from the database at render
//     time.
//
//     Edit them here; nothing else needs to change.
// ═══════════════════════════════════════════════════════════

// Marketing figures were removed — every number on the page is read from the database.

// ═══════════════════════════════════════════════════════════
//  Glyphs
//
//  The projects set covers most of what a product page needs. These are the
//  few it does not carry — a cart, a floor, a wall, a bath, a bulb, a plain
//  box, a plus and a swatch — drawn in the same single-stroke style at the
//  same weight so the two sets sit together without a seam.
// ═══════════════════════════════════════════════════════════

type ProductOnlyGlyph =
  | 'cart' | 'floor' | 'wall' | 'bath' | 'bulb' | 'box' | 'plus' | 'swatch' | 'layers'

const PRODUCT_GLYPHS: Record<ProductOnlyGlyph, React.ReactNode> = {
  cart: (<><circle cx="9" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" /><path d="M2 3h2.2l2.4 12.1a1.8 1.8 0 001.8 1.4h8.9a1.8 1.8 0 001.8-1.4L21 7H5.2" /></>),
  floor: (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20" /></>),
  wall: (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9.3h18M3 14.7h18M10.5 4v5.3M13.5 14.7V20M7 9.3v5.4M17 9.3v5.4" /></>),
  bath: (<><path d="M3 12h18v3a4 4 0 01-4 4H7a4 4 0 01-4-4z" /><path d="M6 12V6a2 2 0 014 0M5 19l-1 2M19 19l1 2" /></>),
  bulb: (<><path d="M9.2 16a6 6 0 115.6 0v2.2H9.2z" /><path d="M10 21h4" /></>),
  box: (<><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  swatch: (<><circle cx="9" cy="9" r="5.5" /><path d="M13.5 6.2A5.5 5.5 0 1113.5 17.8" /><circle cx="15" cy="15" r="5.5" /></>),
  layers: (<><path d="M12 2.7L2.5 7.5 12 12.3l9.5-4.8z" /><path d="M2.5 12.4L12 17.2l9.5-4.8M2.5 16.7L12 21.5l9.5-4.8" /></>),
}

const PRODUCT_GLYPH_NAMES = Object.keys(PRODUCT_GLYPHS) as ProductOnlyGlyph[]

/** Every glyph either page may ask for — the products set plus the projects set. */
export type PGlyphName = ProductOnlyGlyph | GlyphName

/**
 * Draws a glyph from the products set, or hands the name straight to the
 * projects set when it lives there. One component, one call site, one look.
 */
export function PGlyph({ name, className }: { name: PGlyphName; className?: string }) {
  if (!(PRODUCT_GLYPH_NAMES as string[]).includes(name)) {
    return <Glyph name={name as GlyphName} className={className} />
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('h-[18px] w-[18px]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PRODUCT_GLYPHS[name as ProductOnlyGlyph]}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════
//  Links — one place that builds a /products URL
// ═══════════════════════════════════════════════════════════

export type ProductParams = Record<string, string | number | string[] | undefined | null>

/**
 * Builds `/products?…`, dropping every empty value so the URL stays readable.
 * Array values (the colour swatches, the availability boxes) are repeated as
 * `colour=a&colour=b`, which is what the GET form itself submits.
 */
export function productsHref(params: ProductParams): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) {
      for (const item of v) if (String(item) !== '') p.append(k, String(item))
    } else if (String(v) !== '') {
      p.set(k, String(v))
    }
  }
  const s = p.toString()
  return s ? `/products?${s}` : '/products'
}

// ═══════════════════════════════════════════════════════════
//  The category strip
// ═══════════════════════════════════════════════════════════

/**
 * The eight chips above the results, in the design's order.
 *
 * The taxonomy slugs behind each one live in `PRODUCT_GROUPS`
 * (`src/lib/products.ts`); this only adds the glyph, so the mapping and the
 * artwork stay in one place each.
 */
export const GROUP_ICONS: Record<string, PGlyphName> = {
  'building-materials': 'building',
  flooring: 'floor',
  'wall-cladding': 'wall',
  kitchen: 'kitchen',
  bathroom: 'bath',
  'doors-windows': 'window',
  lighting: 'bulb',
  more: 'dots',
}

/**
 * The client's own artwork for the category strip, one PNG per group.
 *
 * ⚠️ These live on the `housekase` ImageKit account, which is NOT in
 *    `next.config.ts`'s `remotePatterns`. Render them with `unoptimized`, which
 *    skips both the optimizer and the domain check; without it Next refuses the
 *    URL outright. A group with no entry here falls back to `GROUP_ICONS`.
 */
const ICON_BASE = 'https://ik.imagekit.io/housekase/Products%20Icon'

export const GROUP_ICON_IMAGES: Record<string, string> = {
  'building-materials': `${ICON_BASE}/Building%20Materials.png`,
  flooring: `${ICON_BASE}/Flooring.png`,
  'wall-cladding': `${ICON_BASE}/Wall%20&%20Cladding.png`,
  kitchen: `${ICON_BASE}/Kitchen.png`,
  bathroom: `${ICON_BASE}/Bathroom.png`,
  'doors-windows': `${ICON_BASE}/Doors%20&%20Windows.png`,
  lighting: `${ICON_BASE}/Lighting.png`,
  more: `${ICON_BASE}/More%20Categories.png`,
}

// ═══════════════════════════════════════════════════════════
//  Cards
// ═══════════════════════════════════════════════════════════

/**
 * ₹320 /sq.ft — the price and its unit, everywhere they appear together.
 *
 * `size` is the card / detail-page pair rather than a free className, so the
 * two never drift apart and no caller has to reach inside with a selector.
 */
export function Price({
  price,
  unit,
  size = 'card',
  className,
}: {
  price: number
  unit: string
  size?: 'card' | 'hero'
  className?: string
}) {
  return (
    <span className={cn('flex min-w-0 flex-wrap items-baseline gap-1', className)}>
      <span
        className={cn(
          'tabular font-display font-bold text-ink',
          size === 'hero' ? 'text-[28px] leading-none' : 'text-[15px]'
        )}
      >
        {formatINR(price)}
      </span>
      <span
        className={cn(
          'truncate font-medium text-ink-3',
          size === 'hero' ? 'text-[13px]' : 'text-[10px]'
        )}
      >
        {unit}
      </span>
    </span>
  )
}

/** 1290 -> "1.3k", so a review count never has to be clipped mid-number. */
function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/.0$/, '')}k` : String(n)
}

/** ★ 4.6 (129) — the rating and its review count. */
function RatingLine({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-ink-3">
      <Glyph name="star" className="h-3 w-3 shrink-0 fill-current text-brand" />
      <span className="tabular font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="tabular">({compact(reviews)})</span>
    </span>
  )
}

/**
 * The orange cart button in a card footer.
 *
 * ⚠️ There is no product basket — the /cart route belongs to Merchandise, and
 *    building materials are quoted, not checked out. So the design's cart glyph
 *    is a real link to the product, where "Get Best Price" and "Send Enquiry"
 *    live. It is labelled for what it does rather than for what it looks like.
 */
function CartLink({ slug, title }: { slug: string; title: string }) {
  return (
    <Link
      href={`/products/${slug}`}
      aria-label={`Enquire about ${title}`}
      title="Get best price"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover"
    >
      <PGlyph name="cart" className="h-4 w-4" />
    </Link>
  )
}

/**
 * The 4-up grid card.
 *
 * Drawn to the supplied reference: a photograph on a pale well, then the
 * title, the seller's brand, where the product ships from, and a price line
 * with the rating opposite it — closing on a full-width "Get Best Price"
 * button, which is the one action a building-materials listing actually
 * offers (there is no basket; see `CartLink` above for why).
 *
 * ★ 5px corners, asked for explicitly. `card-hover` carries the 8px
 *   `rounded-card` token, so the radius is overridden here rather than in the
 *   token — every other card on the site keeps its own shape.
 */
export function ProductCard({ post, sizes }: { post: ProductRow; sizes?: string }) {
  const m = productMeta(post.meta)
  const cover = productPhotos(post).cover
  const place = [post.city, post.state].filter(Boolean).join(', ')

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden rounded-[5px]">
      <Link href={`/products/${post.slug}`} className="flex min-w-0 flex-1 flex-col">
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-paper-3">
          <Image
            src={photoSrc(cover, { w: 600, h: 450 })}
            alt=""
            fill
            sizes={sizes ?? '(min-width:1280px) 280px, (min-width:768px) 45vw, 100vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-0.5 p-3 pb-2">
          <span className="line-clamp-2 font-display text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>

          <span className="truncate text-[11px] text-ink-3">{m.brand}</span>

          {/* Where it ships from — the reference's pin line. Omitted rather
              than faked when the listing carries no place. */}
          {place && (
            <span className="flex min-w-0 items-center gap-1 text-[10.5px] text-ink-4">
              <Glyph name="pin" className="h-3 w-3 shrink-0" />
              <span className="truncate">{place}</span>
            </span>
          )}

          <span className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
            {/* A seller who has not published a rate gets "Price on request",
                not "₹0" — the enquiry button below is exactly how they are
                meant to be asked. */}
            {m.price > 0 ? (
              <Price price={m.price} unit={m.unit} className="flex-nowrap" />
            ) : (
              <span className="truncate text-[12px] font-semibold text-ink-2">Price on request</span>
            )}
            {m.reviews > 0 && <RatingLine rating={m.rating} reviews={m.reviews} />}
          </span>
        </span>
      </Link>

      <div className="px-3 pb-3">
        <Link
          href={`/products/${post.slug}`}
          aria-label={`Get best price for ${post.title}`}
          className="flex w-full items-center justify-center rounded-[5px] bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Get Best Price
        </Link>
      </div>
    </article>
  )
}

/** The wide row used by `?view=list` — image on the left. */
export function ProductListRow({ post }: { post: ProductRow }) {
  const m = productMeta(post.meta)

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden sm:flex-row">
      <Link
        href={`/products/${post.slug}`}
        className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-paper-3 sm:aspect-auto sm:h-[190px] sm:w-[250px]"
      >
        <Image
          src={photoSrc(m.coverImage, { w: 600, h: 450 })}
          alt=""
          fill
          sizes="(min-width:640px) 250px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <Link href={`/products/${post.slug}`} className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[16px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </h3>
        </Link>

        <p className="mt-1 truncate text-[12.5px] text-ink-3">{m.brand}</p>

        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
          {post.description}
        </p>

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {[m.material, m.colour, m.availability]
            .filter((v) => v && v !== '—')
            .map((v) => (
              <li key={v} className="rounded-pill bg-paper-3 px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                {v}
              </li>
            ))}
        </ul>

        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-3 pt-3.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Price price={m.price} unit={m.unit} />
            {m.reviews > 0 && <RatingLine rating={m.rating} reviews={m.reviews} />}
          </span>
          <CartLink slug={post.slug} title={post.title} />
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  Pagination — plain links, driven by ?page=
// ═══════════════════════════════════════════════════════════

/**
 * Produces the design's `1 2 3 4 5 … 2600` shape: a window around the current
 * page, the first and last page always reachable, and `null` where an ellipsis
 * belongs.
 *
 * The design's 2600 is a mock-up figure. `pages` here is always
 * `ceil(total / perPage)` against the real, fully-filtered count, so the last
 * number in the row is a page that exists.
 */
function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)

  const out: (number | null)[] = []
  const from = Math.max(2, Math.min(page - 1, pages - 4))
  const to = Math.min(pages - 1, Math.max(page + 1, 5))

  out.push(1)
  if (from > 2) out.push(null)
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push(null)
  out.push(pages)

  return out
}

export function Pagination({
  page,
  pages,
  params,
}: {
  page: number
  pages: number
  /** Every other search param, so paging never drops the active filters. */
  params: ProductParams
}) {
  if (pages <= 1) return null

  const cell =
    'flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-[13px] font-semibold transition-colors'

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="px-1 text-[13px] text-ink-4">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={productsHref({ ...params, page: n === 1 ? undefined : n })}
                aria-current={n === page ? 'page' : undefined}
                className={cn(
                  cell,
                  n === page
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand'
                )}
              >
                {n}
              </Link>
            </li>
          )
        )}

        {page < pages && (
          <li>
            <Link
              href={productsHref({ ...params, page: page + 1 })}
              aria-label="Next page"
              className={cn(cell, 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand')}
            >
              <PGlyph name="chevronRight" className="h-4 w-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════
//  The filter sidebar
// ═══════════════════════════════════════════════════════════

/** The submitted values, so every control comes back showing what was asked for. */
export type FilterValues = {
  q: string
  category: string
  sub: string
  brand: string
  priceMin: string
  priceMax: string
  material: string
  colours: string[]
  application: string
  availability: string[]
  verified: boolean
  original: boolean
  bmf: boolean
  group: string
  view: string
  sort: string
}

function FieldLabel({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink">
      {children}
      {info && (
        <span title={info} className="text-ink-4">
          <PGlyph name="info" className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  )
}

const SELECT_CLASS = 'input appearance-none py-2 text-[12.5px]'

/**
 * One round colour swatch — a checkbox whose box is hidden and whose ring is
 * driven by `peer-checked:`. No script: the browser paints the selected state
 * itself, and the value rides along in the GET submission like any other field.
 */
function Swatch({ colour, checked }: { colour: ProductColour; checked: boolean }) {
  return (
    <label className="relative block cursor-pointer" title={colour.label}>
      <input
        type="checkbox"
        name="colour"
        value={colour.slug}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span
        aria-hidden
        style={{ backgroundColor: colour.hex }}
        className="block h-7 w-7 rounded-full border border-line ring-brand ring-offset-2 ring-offset-paper-2 transition-shadow peer-checked:ring-2 peer-focus-visible:ring-2"
      />
      <span className="sr-only">{colour.label}</span>
    </label>
  )
}

/**
 * The left-hand filter card.
 *
 * ★ It is a real GET <form>. Submitting it navigates to /products with the
 *   chosen values as search params, and the page re-renders filtered — no
 *   client JavaScript is involved anywhere. The `id` is also used by the sort
 *   <select> further down the page through the HTML `form=` attribute, so the
 *   sort rides along with the filters in a single submission.
 */
export function FilterSidebar({
  id,
  values,
  facets,
  counts,
}: {
  id: string
  values: FilterValues
  facets: ProductFacets
  counts: { all: number; byCategory: Record<string, number>; bySub: Record<string, number> }
}) {
  const activeCategory = PRODUCT_CATEGORIES.find((c) => c.slug === values.category)

  // The design shows a row of swatches and a "+" for the rest. Anything the
  // reader has already chosen stays in the visible row, so a selected colour is
  // never hidden inside the collapsed disclosure.
  const VISIBLE_SWATCHES = 7
  const chosen = new Set(values.colours)
  const visible = facets.colours.filter((c, i) => i < VISIBLE_SWATCHES || chosen.has(c.slug))
  const overflow = facets.colours.filter((c) => !visible.includes(c))

  return (
    <form method="get" action="/products" id={id} className="card min-w-0 p-4">
      {/* The view mode and the category-strip grouping are link-driven, not
          fields — carry them through the submission so applying a filter does
          not knock the reader back into grid view or out of their chip. */}
      {values.view && <input type="hidden" name="view" value={values.view} />}
      {values.group && <input type="hidden" name="group" value={values.group} />}

      <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-3">
        <h2 className="font-display text-[15px] font-bold text-ink">Filters</h2>
        <Link href="/products" className="text-[12px] font-semibold text-brand hover:underline">
          Clear All
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {/* ─── search ─── */}
        <label className="block min-w-0">
          <span className="sr-only">Search products</span>
          <span className="relative block">
            <PGlyph name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              name="q"
              defaultValue={values.q}
              placeholder="Search by product, brand, material..."
              className="input py-2 pl-9 text-[12.5px]"
            />
          </span>
        </label>

        {/* ─── category ─── */}
        <label className="block min-w-0">
          <FieldLabel>Category</FieldLabel>
          <select name="category" defaultValue={values.category} className={SELECT_CLASS}>
            <option value="">All Categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
                {counts.byCategory[c.slug] ? ` (${counts.byCategory[c.slug]})` : ''}
              </option>
            ))}
          </select>
        </label>

        {/* ─── sub-category ─── */}
        <label className="block min-w-0">
          <FieldLabel>Sub Category</FieldLabel>
          <select name="sub" defaultValue={values.sub} className={SELECT_CLASS}>
            <option value="">All Sub Categories</option>
            {/* Narrowed to the chosen category when there is one; otherwise
                every sub-category is offered, grouped by its parent. */}
            {(activeCategory ? [activeCategory] : PRODUCT_CATEGORIES).map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {(c.children ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                    {counts.bySub[s.slug] ? ` (${counts.bySub[s.slug]})` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {/* ─── brand ─── */}
        <label className="block min-w-0">
          <FieldLabel>Brand</FieldLabel>
          <select name="brand" defaultValue={values.brand} className={SELECT_CLASS}>
            <option value="">All Brands</option>
            {facets.brands.map((b) => (
              <option key={b.slug} value={b.slug}>{b.label}</option>
            ))}
          </select>
        </label>

        {/* ─── price ─── */}
        <div className="min-w-0">
          <FieldLabel>Price Range (₹)</FieldLabel>
          <div className="flex min-w-0 gap-2">
            <input
              type="number"
              name="priceMin"
              min={0}
              step={10}
              defaultValue={values.priceMin}
              placeholder="Min"
              aria-label="Minimum price in rupees"
              className="input min-w-0 flex-1 py-2 text-[12.5px]"
            />
            <input
              type="number"
              name="priceMax"
              min={0}
              step={10}
              defaultValue={values.priceMax}
              placeholder="Max"
              aria-label="Maximum price in rupees"
              className="input min-w-0 flex-1 py-2 text-[12.5px]"
            />
          </div>
          {facets.priceMax > 0 && (
            <p className="tabular mt-1.5 text-[11px] text-ink-3">
              Listed from {formatINR(facets.priceMin)} to {formatINR(facets.priceMax)}
            </p>
          )}
        </div>

        {/* ─── material ─── */}
        <label className="block min-w-0">
          <FieldLabel>Material</FieldLabel>
          <select name="material" defaultValue={values.material} className={SELECT_CLASS}>
            <option value="">All Materials</option>
            {facets.materials.map((mt) => (
              <option key={mt.slug} value={mt.slug}>{mt.label}</option>
            ))}
          </select>
        </label>

        {/* ─── colour / finish ─── */}
        <fieldset className="min-w-0">
          <legend className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
            Colour / Finish
          </legend>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            {visible.map((c) => (
              <Swatch key={c.slug} colour={c} checked={chosen.has(c.slug)} />
            ))}

            {overflow.length > 0 && (
              <details className="min-w-0">
                <summary
                  title={`${overflow.length} more finishes`}
                  className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-paper-3 text-ink-3 transition-colors hover:border-brand hover:text-brand"
                >
                  <PGlyph name="plus" className="h-3.5 w-3.5" />
                  <span className="sr-only">Show {overflow.length} more finishes</span>
                </summary>
                <span className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  {overflow.map((c) => (
                    <Swatch key={c.slug} colour={c} checked={chosen.has(c.slug)} />
                  ))}
                </span>
              </details>
            )}
          </div>
        </fieldset>

        {/* ─── application ─── */}
        <label className="block min-w-0">
          <FieldLabel>Application</FieldLabel>
          <select name="application" defaultValue={values.application} className={SELECT_CLASS}>
            <option value="">All Applications</option>
            {facets.applications.map((a) => (
              <option key={a.slug} value={a.slug}>{a.label}</option>
            ))}
          </select>
        </label>

        {/* ─── availability ─── */}
        <fieldset className="min-w-0">
          <legend className="mb-2 text-[12px] font-bold text-ink">Availability</legend>
          <div className="flex flex-col gap-2.5">
            {AVAILABILITY_OPTIONS.map((a) => (
              <label key={a.value} className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
                <input
                  type="checkbox"
                  name="availability"
                  value={a.value}
                  defaultChecked={values.availability.includes(a.value)}
                  className="h-4 w-4 shrink-0 accent-brand"
                />
                {a.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* ─── verified brands ─── */}
        <fieldset className="min-w-0 border-t border-line-soft pt-3.5">
          <legend className="sr-only">Brand verification</legend>
          <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={values.verified}
              className="h-4 w-4 shrink-0 accent-brand"
            />
            Verified Brands
            <span
              title="Verified brands have had their company registration and GST checked by ArchFacing."
              className="text-ink-4"
            >
              <PGlyph name="info" className="h-3.5 w-3.5" />
            </span>
          </label>
        </fieldset>

        {/* ─── product type ─── */}
        <fieldset className="min-w-0">
          <legend className="mb-2 text-[12px] font-bold text-ink">Product Type</legend>
          <div className="flex flex-col gap-2.5">
            <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
              <input
                type="checkbox"
                name="original"
                value="1"
                defaultChecked={values.original}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              Original Products
              <span
                title="Listed by the manufacturer itself, not by a reseller."
                className="text-ink-4"
              >
                <PGlyph name="info" className="h-3.5 w-3.5" />
              </span>
            </label>
            <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
              <input
                type="checkbox"
                name="bmf"
                value="1"
                defaultChecked={values.bmf}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              BMF Listed Products
              <span
                title="Listed by a Building Material Facilitator — an ArchFacing member who supplies and installs the product locally."
                className="text-ink-4"
              >
                <PGlyph name="info" className="h-3.5 w-3.5" />
              </span>
            </label>
          </div>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <button type="submit" className="btn-primary w-full py-2.5 text-[13px]">
            Apply Filters
          </button>
          {/* A link, not a reset button — a form reset would only restore the
              submitted values, which is not what "Reset" means here. */}
          <Link href="/products" className="btn-outline w-full py-2.5 text-[13px]">
            Reset Filters
          </Link>
        </div>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  Detail-page furniture
// ═══════════════════════════════════════════════════════════

/** A specification row, drawn as the striped table the detail page uses. */
export function SpecTable({ rows }: { rows: { label: string; value: string }[] }) {
  if (!rows.length) return null

  return (
    <dl className="overflow-hidden rounded-card border border-line">
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={cn(
            'flex min-w-0 flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-[13px]',
            i % 2 === 1 ? 'bg-paper-3' : 'bg-paper-2'
          )}
        >
          <dt className="w-[140px] shrink-0 font-semibold text-ink-3">{r.label}</dt>
          <dd className="min-w-0 flex-1 font-semibold text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The In Stock / Made to Order pill. */
export function AvailabilityPill({ value }: { value: string }) {
  const inStock = value === 'In Stock'
  return (
    <span className={cn('pill', inStock ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')}>
      {value}
    </span>
  )
}

/** The brand rating line on a detail page. */
export function BrandRating({ rating, reviews }: { rating: number; reviews: number }) {
  // No reviews means no rating to draw. Printing "0.0 (0 Reviews)" beside a
  // row of empty stars reads as a bad score rather than as an absence.
  if (reviews < 1) {
    return <span className="text-[12px] text-ink-3">New seller · No reviews yet</span>
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Stars value={rating} />
      <span className="tabular text-[12px] font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="tabular text-[12px] text-ink-3">({reviews} Reviews)</span>
    </span>
  )
}
