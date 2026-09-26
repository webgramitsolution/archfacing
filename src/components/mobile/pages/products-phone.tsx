import Image from 'next/image'
import Link from 'next/link'
import { SaveToggle } from '@/components/save-button'
import { photoSrc } from '@/components/projects'
import {
  GROUP_ICONS, GROUP_ICON_IMAGES, PGlyph, productsHref, type ProductParams,
} from '@/components/products'
import {
  AVAILABILITY_OPTIONS, groupCount, PRODUCT_GROUPS, productMeta, productPhotos,
  type ProductBadge, type ProductFacets, type ProductRow,
} from '@/lib/products'
import { statValue } from '@/lib/platform-stats'
import type { CategoryHero } from '@/lib/category-hero'
import { PRODUCT_CATEGORIES } from '@/config/taxonomy'
import { cn, formatINR } from '@/lib/utils'
import { PhoneSelect } from './listing-phone-client'

/**
 * /products — the phone layout (below md).
 *
 * Every figure is live: the hero band and the category grid are the same
 * productCounts()/productFacets() the desktop reads, the cards carry the
 * Review-table rating listProducts() already attached, and the hearts are
 * real SavedItem rows.
 */

const FORM_ID = 'product-filters-phone'

const HERO = 'https://ik.imagekit.io/archfacing/product%20banner.png?updatedAt=1784798103623'

const BADGES: Record<ProductBadge, { label: string; className: string }> = {
  'best-seller': { label: 'Best Seller', className: 'bg-brand text-white' },
  premium: { label: 'Premium', className: 'bg-[#7C3AED] text-white' },
  'new-arrival': { label: 'New Arrival', className: 'bg-ok text-white' },
  'top-rated': { label: 'Top Rated', className: 'bg-brand text-white' },
  new: { label: 'New', className: 'bg-ok text-white' },
}

/** Price ceilings offered in the Price select — only those inside the real range. */
const PRICE_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

export type ProductsPhoneValues = {
  q: string
  category: string
  sub: string
  group: string
  brand: string
  priceMin: string
  priceMax: string
  material: string
  availability: string
  colours: string[]
  application: string
  verified: boolean
  original: boolean
  bmf: boolean
  sort: string
  view: 'grid' | 'list'
}

/** 1 … 4 5 6 … 20 — a window around the current page with both ends reachable. */
function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 6) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | null)[] = [1]
  const from = Math.max(2, Math.min(page - 1, pages - 3))
  const to = Math.min(pages - 1, Math.max(page + 1, 4))
  if (from > 2) out.push(null)
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push(null)
  out.push(pages)
  return out
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-brand">{icon}</span>
      <span className="min-w-0">
        <span className="tabular block font-display text-[14px] font-bold leading-none text-white">{value}</span>
        <span className="mt-1 block truncate text-[10.5px] text-white/75">{label}</span>
      </span>
    </li>
  )
}

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21.4l8.8-8.7a5 5 0 000-7.1z" />
  </svg>
)

function ProductTile({ post, saved, list }: { post: ProductRow; saved: boolean; list: boolean }) {
  const m = productMeta(post.meta)
  const cover = productPhotos(post).cover
  const badge = m.badge ? BADGES[m.badge] : null

  return (
    <article
      className={cn(
        'flex min-w-0 overflow-hidden rounded-[10px] border border-line bg-white shadow-card',
        list ? 'flex-row' : 'flex-col'
      )}
    >
      <div className={cn('relative shrink-0 overflow-hidden bg-paper-3', list ? 'min-h-[128px] w-[42%]' : 'aspect-[4/3] w-full')}>
        <Link href={`/products/${post.slug}`} className="absolute inset-0 block">
          <Image
            src={photoSrc(cover, { w: 480, h: 360 })}
            alt=""
            fill
            sizes="(max-width:767px) 50vw, 1px"
            className="object-cover"
          />
          {badge && (
            <span className={cn('absolute left-2 top-2 rounded-[4px] px-1.5 py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.02em]', badge.className)}>
              {badge.label}
            </span>
          )}
        </Link>
        <SaveToggle
          postId={post.id}
          initialSaved={saved}
          path="/products"
          noun="product"
          className="absolute right-0.5 top-0.5 flex h-9 w-9 items-center justify-center text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,.5))]"
          savedClassName="!text-brand [&_svg]:fill-current"
          icon={<HeartIcon />}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2.5 pt-2">
        <Link href={`/products/${post.slug}`} className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">
          {post.title}
        </Link>
        <span className="mt-1 truncate text-[11px] text-ink-3">{m.brand}</span>

        <span className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
          <span className="min-w-0">
            {m.price > 0 ? (
              <span className="flex min-w-0 items-baseline gap-1">
                <span className="tabular text-[14px] font-bold text-ink">{formatINR(m.price)}</span>
                <span className="truncate text-[10px] text-ink-3">{m.unit}</span>
              </span>
            ) : (
              <span className="block truncate text-[11.5px] font-semibold text-ink-2">Price on request</span>
            )}
            {m.reviews > 0 && (
              <span className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-3">
                <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 shrink-0 fill-current text-brand"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" /></svg>
                <span className="tabular text-brand">{m.rating.toFixed(1)}</span>
                <span className="tabular">({m.reviews})</span>
              </span>
            )}
          </span>
          {/* No basket for building materials — the cart goes to the product,
              where "Get Best Price" and the enquiry live. */}
          <Link
            href={`/products/${post.slug}`}
            aria-label={`Get best price for ${post.title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-brand-border bg-brand-soft text-brand"
          >
            <PGlyph name="cart" className="h-[18px] w-[18px]" />
          </Link>
        </span>
      </div>
    </article>
  )
}

export function ProductsPhone({
  hero,
  rows,
  total,
  page,
  pages,
  first,
  last,
  counts,
  facets,
  carried,
  values,
  savedIds,
  sorts,
}: {
  /** Set on a mega-menu category page — that category's heading, copy and counts. */
  hero?: CategoryHero | null
  rows: ProductRow[]
  total: number
  page: number
  pages: number
  first: number
  last: number
  counts: { all: number; byCategory: Record<string, number>; bySub: Record<string, number> }
  facets: ProductFacets
  carried: ProductParams
  values: ProductsPhoneValues
  savedIds: string[]
  sorts: { value: string; label: string }[]
}) {
  const saved = new Set(savedIds)
  // Taxonomy categories that actually hold a published product.
  const activeCategories = PRODUCT_CATEGORIES.filter((c) => (counts.byCategory[c.slug] ?? 0) > 0).length
  const list = values.view === 'list'

  const priceSteps = PRICE_STEPS.filter((p) => p > facets.priceMin && p < facets.priceMax)
  if (values.priceMax && !priceSteps.includes(Number(values.priceMax))) priceSteps.push(Number(values.priceMax))
  priceSteps.sort((a, b) => a - b)

  const tile = 'flex min-w-0 flex-col items-center px-1 py-3 text-center'

  return (
    <div className="bg-paper-2">
      {/* ═══ hero ═══ */}
      <section className="relative overflow-hidden bg-navy">
        <span aria-hidden className="absolute inset-0">
          <Image src={HERO} alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <span className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/75 to-navy/30" />
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy/90 to-transparent" />
        </span>
        <div className="relative px-4 pb-10 pt-5">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.04em] text-brand">
            {hero?.parent ? `Products · ${hero.parent}` : 'Products'}
          </p>
          {hero ? (
            <>
              <h1 className="mt-1.5 max-w-[18ch] font-display text-[24px] font-semibold leading-[1.25] text-white">{hero.title}</h1>
              <p className="mt-2.5 max-w-[30ch] text-[13.5px] leading-relaxed text-white/85">{hero.description}</p>
            </>
          ) : (
            <>
              <h1 className="mt-1.5 max-w-[18ch] font-display text-[22px] font-semibold leading-[1.3] text-white">
                Discover premium building materials, products &amp; solutions
              </h1>
              <p className="mt-2.5 max-w-[22ch] text-[13.5px] leading-relaxed text-white/85">
                from trusted brands across India.
              </p>
            </>
          )}

          <ul className="mt-6 grid grid-cols-3 gap-2">
            <Stat
              icon={<PGlyph name="box" className="h-[22px] w-[22px]" />}
              value={statValue(hero ? hero.stats[0].value : counts.all)}
              label={hero ? hero.stats[0].label : 'Products'}
            />
            <Stat
              icon={<PGlyph name="users" className="h-[22px] w-[22px]" />}
              value={statValue(hero ? hero.stats[1].value : facets.brands.length)}
              label={hero ? hero.stats[1].label : 'Brands'}
            />
            <Stat
              icon={<PGlyph name="grid" className="h-[22px] w-[22px]" />}
              value={statValue(hero ? hero.stats[2].value : activeCategories)}
              label={hero ? hero.stats[2].label : 'Categories'}
            />
          </ul>
        </div>
      </section>

      {/* ═══ category grid ═══ */}
      <nav aria-label="Product categories" className="relative -mt-4 rounded-t-[20px] bg-paper-2 px-3 pt-3">
        <ul className="grid grid-cols-4 overflow-hidden rounded-[10px] border border-line bg-white">
          <li className="border-b border-r border-line-soft">
            <Link href={productsHref({ view: carried.view })} aria-current={!values.group && !values.category ? 'true' : undefined} className={tile}>
              <PGlyph name="grid" className="h-8 w-8 text-brand" />
              <span className="mt-2 text-[12px] font-semibold leading-tight text-brand">All Products</span>
              <span className="tabular mt-1 text-[10.5px] text-brand">{counts.all.toLocaleString('en-IN')}</span>
            </Link>
          </li>
          {PRODUCT_GROUPS.map((g, i) => {
            const on = g.value === values.group
            const art = GROUP_ICON_IMAGES[g.value]
            return (
              <li key={g.value} className={cn('border-line-soft', (i + 2) % 4 !== 0 && 'border-r', i < 7 && 'border-b')}>
                <Link
                  href={productsHref({ group: g.categories || g.subs ? g.value : undefined, view: carried.view })}
                  aria-current={on ? 'true' : undefined}
                  className={tile}
                >
                  {art ? (
                    <Image src={art} alt="" width={64} height={64} unoptimized className="h-8 w-8 object-contain" />
                  ) : (
                    <PGlyph name={GROUP_ICONS[g.value] ?? 'box'} className="h-8 w-8 text-ink-2" />
                  )}
                  <span className={cn('mt-2 text-[12px] font-semibold leading-tight', on ? 'text-brand' : 'text-ink')}>{g.label}</span>
                  <span className={cn('tabular mt-1 text-[10.5px]', on ? 'text-brand' : 'text-ink-3')}>
                    {groupCount(g, counts).toLocaleString('en-IN')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 pb-6">
        {/* ═══ filters ═══ */}
        <form id={FORM_ID} method="get" action="/products" className="mt-5">
          {values.q && <input type="hidden" name="q" value={values.q} />}
          {values.group && <input type="hidden" name="group" value={values.group} />}
          {values.sub && <input type="hidden" name="sub" value={values.sub} />}
          {values.priceMin && <input type="hidden" name="priceMin" value={values.priceMin} />}
          {values.application && <input type="hidden" name="application" value={values.application} />}
          {values.colours.map((c) => <input key={c} type="hidden" name="colour" value={c} />)}
          {values.verified && <input type="hidden" name="verified" value="1" />}
          {values.original && <input type="hidden" name="original" value="1" />}
          {values.bmf && <input type="hidden" name="bmf" value="1" />}
          {list && <input type="hidden" name="view" value="list" />}

          <div className="flex items-center justify-between">
            <h2 className="font-display text-[17px] font-semibold text-ink">Filters</h2>
            <Link href={list ? '/products?view=list' : '/products'} className="text-[13px] font-semibold text-brand">
              Clear All
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <PhoneSelect
              name="category"
              label="Category"
              value={values.category}
              options={PRODUCT_CATEGORIES.map((c) => ({
                value: c.slug,
                label: `${c.name} (${counts.byCategory[c.slug] ?? 0})`,
              }))}
            />
            <PhoneSelect
              name="brand"
              label="Brand"
              value={values.brand}
              options={facets.brands.map((b) => ({ value: b.slug, label: b.label }))}
            />
            <PhoneSelect
              name="priceMax"
              label="Price"
              value={values.priceMax}
              options={priceSteps.map((p) => ({ value: String(p), label: `Under ${formatINR(p)}` }))}
            />
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <PhoneSelect
              name="material"
              label="Material"
              value={values.material}
              options={facets.materials.map((m) => ({ value: m.slug, label: m.label }))}
            />
            <PhoneSelect
              name="availability"
              label="Availability"
              value={values.availability}
              options={AVAILABILITY_OPTIONS.map((a) => ({ value: a.value, label: a.label }))}
            />
            <button
              type="submit"
              aria-label="Apply filters"
              className="flex h-10 w-12 items-center justify-center rounded-[10px] border border-line bg-white text-ink-2"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
            </button>
          </div>
        </form>

        {/* grid / list */}
        <div className="mt-3 flex gap-2">
          {(['grid', 'list'] as const).map((v) => {
            const on = values.view === v
            return (
              <Link
                key={v}
                href={productsHref({ ...carried, view: v === 'grid' ? undefined : 'list', page: undefined })}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold',
                  on ? 'border-brand-border bg-brand-soft text-brand' : 'border-line bg-white text-ink-2'
                )}
              >
                <PGlyph name={v} className="h-4 w-4" />
                {v === 'grid' ? 'Grid' : 'List'}
              </Link>
            )
          })}
        </div>

        {/* results bar */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="min-w-0 text-[12px] text-ink-2">
            Showing <span className="tabular">{first} - {last}</span> of{' '}
            <span className="tabular">{total.toLocaleString('en-IN')}</span> product{total === 1 ? '' : 's'}
          </p>
          <PhoneSelect
            name="sort"
            form={FORM_ID}
            label={sorts[0].label}
            srLabel="Sort by"
            value={values.sort === 'latest' ? '' : values.sort}
            options={sorts.slice(1)}
            className="w-[128px] shrink-0"
          />
        </div>

        {/* cards */}
        {rows.length === 0 ? (
          <div className="mt-4 rounded-[10px] border border-line bg-white px-4 py-8 text-center">
            <p className="font-display text-[15px] font-semibold text-ink">No products found</p>
            <p className="mt-1 text-[12.5px] text-ink-3">Nothing matches those filters yet.</p>
            <Link href="/products" className="mt-3 inline-flex h-9 items-center rounded-[10px] border border-line px-4 text-[12.5px] font-semibold text-ink-2">
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className={cn('mt-3 grid gap-2.5', list ? 'grid-cols-1' : 'grid-cols-2')}>
            {rows.map((p) => (
              <ProductTile key={p.id} post={p} saved={saved.has(p.id)} list={list} />
            ))}
          </div>
        )}

        {/* pagination */}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-5">
            <ul className="flex items-center justify-center gap-1.5">
              <li>
                {page > 1 ? (
                  <Link href={productsHref({ ...carried, page: page - 1 === 1 ? undefined : page - 1 })} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-2">
                    <PGlyph name="left" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-4">
                    <PGlyph name="left" className="h-4 w-4" />
                  </span>
                )}
              </li>
              {pageWindow(page, pages).map((n, i) =>
                n === null ? (
                  <li key={`gap-${i}`} className="flex h-9 w-7 items-center justify-center text-[12px] text-ink-3">…</li>
                ) : (
                  <li key={n}>
                    <Link
                      href={productsHref({ ...carried, page: n === 1 ? undefined : n })}
                      aria-current={n === page ? 'page' : undefined}
                      className={cn(
                        'tabular flex h-9 min-w-[36px] items-center justify-center rounded-[8px] border px-2 text-[12.5px] font-semibold',
                        n === page ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
                      )}
                    >
                      {n}
                    </Link>
                  </li>
                )
              )}
              <li>
                {page < pages ? (
                  <Link href={productsHref({ ...carried, page: page + 1 })} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-2">
                    <PGlyph name="right" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-line bg-white text-ink-4">
                    <PGlyph name="right" className="h-4 w-4" />
                  </span>
                )}
              </li>
            </ul>
          </nav>
        )}

        {/* requirement CTA */}
        <section className="mt-5 flex gap-3 rounded-[10px] border border-brand-border bg-brand-soft px-4 py-4">
          <PGlyph name="pin" className="mt-0.5 h-9 w-9 shrink-0 text-brand" />
          <div className="min-w-0">
            <h2 className="font-display text-[14.5px] font-semibold leading-snug text-ink">
              Can&apos;t find the product you&apos;re looking for?
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
              Tell us what you need and we&apos;ll help you find the right product.
            </p>
            <Link
              href="/consult-nearby"
              className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-brand px-3.5 text-[12px] font-semibold text-white"
            >
              Post Your Requirement
              <PGlyph name="right" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
