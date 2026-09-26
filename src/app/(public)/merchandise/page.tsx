import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { ShopProductCard } from './product-card'
import { FilterDrawer } from './filter-drawer'
import { type ProductCard as PC } from '@/config/directory-data'
import { MERCHANDISE_CATEGORIES } from '@/config/taxonomy'

/** The shop's real shelves — the MERCHANDISE categories admins manage — each with a mark. */
const MERCH_ICON: Record<string, IconName> = { apparel: 'bag', stationery: 'edit', books: 'file', accessories: 'star', gifts: 'award' }
const SHOP_CATEGORIES = MERCHANDISE_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, icon: MERCH_ICON[c.slug] ?? ('tag' as IconName) }))

export const metadata: Metadata = {
  title: 'Merchandise',
  description:
    'Official ArchFacing merchandise — apparel, stationery, books, ' +
    'accessories and gifts for the design community.',
}

/** ArchFacing's own artwork, served from the ImageKit CDN. */
const HERO_BANNER =
  'https://ik.imagekit.io/archfacing/merchandise%20banner.png?updatedAt=1784827055286'

const HERO_FEATURES: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'shield', title: 'Official Store', sub: 'Sold by ArchFacing' },
  { icon: 'tag', title: 'Coupons', sub: 'Apply at checkout' },
  { icon: 'box', title: 'Easy Cancellation', sub: 'Before dispatch' },
  { icon: 'map', title: 'Pan India Delivery', sub: 'To any PIN code' },
]

const TRUST: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'users', title: 'Official Merchandise', sub: 'Designed for ArchFacing' },
  { icon: 'star', title: 'Buyer Reviews', sub: 'On every product page' },
  { icon: 'rupee', title: 'Clear Pricing', sub: 'GST and shipping shown upfront' },
  { icon: 'clock', title: 'Order Tracking', sub: 'Status in your dashboard' },
  { icon: 'shield', title: 'Secure Payments', sub: 'Through the payment gateway' },
]

export default async function MerchandisePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; min?: string; max?: string; sort?: string }>
}) {
  const { category, min, max, sort } = await searchParams

  // real catalogue first; if it is empty, show the mockup demo
  const live = await prisma.post.findMany({
    where: {
      type: 'MERCHANDISE',
      status: 'PUBLISHED',
      deletedAt: null,
      ...(category ? { category } : {}),
    },
    include: {
      media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  })

  const products: PC[] = live.length
    ? live.map((p) => {
        const v = p.variants[0]
        const price = v ? Number(v.price) : 0
        const mrp = v?.mrp ? Number(v.mrp) : price
        return {
          slug: p.slug,
          name: p.title,
          brand: p.category.replace(/-/g, ' '),
          image: p.media[0]?.url ?? '/img/product/box.svg',
          price,
          mrp,
          // No invented stars: merchandise carries no Review rows yet, so the
          // card prints nothing rather than a rating nobody gave.
          rating: 0,
          reviews: 0,
          city: p.city ?? 'India',
          discount: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
        }
      })
    /*
     * No sample fallback. The old one showed twelve invented products under
     * real brand names (Philips, Bosch, Godrej…) with made-up prices and
     * ratings on a public page — a trademark and misrepresentation risk. An
     * empty catalogue now says so.
     */
    : []

  // Price filter — applied after mapping because the price lives on the
  // cheapest active variant, not on the post row.
  const lo = Number(min) > 0 ? Number(min) : null
  const hi = Number(max) > 0 ? Number(max) : null
  const shown = products.filter(
    (p) => (lo == null || p.price >= lo) && (hi == null || p.price <= hi)
  )

  /*
   * Sort. The control used to be a bare <select> with no name and no form —
   * it looked operable and did nothing. It now writes `?sort=` and this
   * applies it. "Rating" is deliberately absent: merchandise ratings come
   * from the Review table and most items have none, so ordering by it would
   * be ordering by nothing.
   */
  if (sort === 'price-asc') shown.sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') shown.sort((a, b) => b.price - a.price)

  const isDemo = false

  return (
    <>
      <SiteHeader />

      <main className="bg-paper">
        <div className="container-af">
          {/* No trail, no top gap — the hero tucks straight under the header. */}

          {/* ═══════════ hero ═══════════ */}
          {/*
            The photograph alone, across the whole panel — no overlay of any
            kind, so the artwork is seen as it was made.
            The type is therefore dark rather than white: the banner's left
            half, where the copy sits, averages 219 of 255 in luminance, and
            white on it would be unreadable.
          */}
          <section className="relative isolate mb-5 overflow-hidden rounded-card bg-[#E9DFD1]">
            <Image
              src={HERO_BANNER}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover"
            />

            <div className="px-6 py-11 md:min-h-[240px] md:px-10 md:py-8 lg:min-h-[300px] lg:py-10">
              <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink md:text-[30px] lg:text-[38px]">
                Merchandise for
                <br />
                Every Space
              </h1>
              <p className="mt-3.5 max-w-md text-[13.5px] leading-[1.7] text-ink-2 md:mt-2.5 md:text-[12px] lg:text-[13.5px]">
                Official ArchFacing merchandise — apparel, stationery, books,
                accessories and gifts for the design community.
              </p>

              <ul className="mt-7 flex max-w-2xl flex-wrap gap-x-7 gap-y-4 md:mt-5 md:gap-y-3">
                {HERO_FEATURES.map((f) => (
                  <li key={f.title} className="flex items-center gap-2">
                    <Icon name={f.icon} className="h-4 w-4 shrink-0 text-ink md:h-3.5 md:w-3.5" />
                    <span>
                      <span className="block text-[12.5px] font-bold text-ink md:text-[11px] lg:text-[12.5px]">
                        {f.title}
                      </span>
                      <span className="block text-[11.5px] text-ink-2 md:text-[10px] lg:text-[11.5px]">{f.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ═══════════ category icons ═══════════ */}
          {/*
            Bare marks, no tinted chip behind them. The row is nine items wide
            and nine filled circles read as a row of buttons rather than as a
            list of shelves; the drawing alone is what a reader scans. The
            white plate with its shadow arrives on hover, so the whole tile is
            the target rather than the little circle.
          */}
          <section className="card mb-5 grid grid-cols-3 gap-1 px-3 py-4 md:grid-cols-6">
            {SHOP_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/merchandise?category=${c.slug}`}
                aria-current={category === c.slug ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center gap-2 rounded-card px-2 py-3 transition-all md:border-l md:border-line md:first:border-l-0 ${
                  category === c.slug
                    ? 'bg-paper text-brand shadow-card'
                    : 'text-ink hover:bg-paper hover:shadow-card'
                }`}
              >
                <Icon name={c.icon} className="h-7 w-7 shrink-0" />
                <span className="block w-full truncate text-center text-[11.5px] font-medium leading-tight">
                  {c.name}
                </span>
              </Link>
            ))}
            <Link
              href="/merchandise"
              className="group flex min-w-0 flex-col items-center gap-2 rounded-card px-2 py-3 text-ink transition-all hover:bg-paper hover:shadow-card md:border-l md:border-line"
            >
              <Icon name="grid" className="h-7 w-7 shrink-0" />
              <span className="block w-full truncate text-center text-[11.5px] font-medium leading-tight">
                View All
              </span>
            </Link>
          </section>

          {/* ═══════════ 3-column ═══════════ */}
          <div className="grid gap-5 pb-8 md:grid-cols-[196px_1fr]">
            {/* ─── filters (desktop sidebar) ─── */}
            <aside className="hidden h-fit md:block">
              <FilterPanel category={category} min={min} max={max} />
            </aside>

            {/* ─── grid ─── */}
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FilterDrawer><FilterPanel category={category} min={min} max={max} /></FilterDrawer>
                  <p className="text-[13px] text-ink-2">
                    Showing 1 – {shown.length} of{' '}
                    <span className="tabular font-semibold text-ink">
                      {shown.length}
                    </span>{' '}
                    Products
                  </p>
                </div>
                {/*
                  A real GET form. It carries the active filters forward as
                  hidden fields so sorting does not silently clear them, and
                  submits without JavaScript.
                */}
                <form action="/merchandise" method="get" className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                  {category && <input type="hidden" name="category" value={category} />}
                  {min && <input type="hidden" name="min" value={min} />}
                  {max && <input type="hidden" name="max" value={max} />}
                  <label htmlFor="merch-sort">Sort By:</label>
                  <select
                    id="merch-sort"
                    name="sort"
                    defaultValue={sort ?? 'latest'}
                    className="rounded-md border border-line bg-paper-2 px-2 py-1 text-[12.5px] text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="latest">Latest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <button type="submit" className="rounded-md border border-line px-2 py-1 text-[12px] text-ink hover:border-brand hover:text-brand">
                    Apply
                  </button>
                </form>
              </div>



              {shown.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-card border border-line bg-paper-2 px-6 py-16 text-center">
                  <p className="font-display text-[15px] font-bold text-ink">No merchandise listed yet</p>
                  <p className="mt-1 max-w-sm text-[12.5px] text-ink-3">
                    Items added from the Admin-Seller panel appear here.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-[5px] sm:gap-2.5 md:grid-cols-4">
                  {shown.map((p) => (
                    <ShopProductCard key={p.slug} product={p} isDemo={isDemo} />
                  ))}
                </ul>
              )}

              {/*
                No pagination. The list is not paginated — every matching item
                is on this page, and the bar above already says "Showing 1 – N
                of N". The comp's 1 2 3 4 … 213 was a row of dead buttons
                advertising 213 pages of stock that does not exist.
              */}
            </section>
          </div>

          {/* ═══════════ trust ═══════════ */}
          {/* From `md` up all five sit in one grid row — no scroll. On a phone
              they become a swipeable strip (2 in view), and the horizontal
              scrollbar is hidden in both engines so nothing shows beneath. */}
          {/* The footer carries a 40px top margin globally; -20px here nets the
              20px gap the design wants without touching the shared footer. */}
          <section className="card -mb-5 px-5 py-5">
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0">
              {TRUST.map((t) => (
                <div
                  key={t.title}
                  className="flex shrink-0 basis-[calc((100%-12px)/2)] snap-start flex-col items-center gap-1.5 rounded-card bg-paper-2 px-3 py-3.5 text-center"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon name={t.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-[13px] font-bold text-ink">{t.title}</span>
                  <span className="text-[11.5px] text-ink-3">{t.sub}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-px text-warn" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-3 w-3" fill={i < n ? 'currentColor' : '#D9DEE4'}>
          <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />
        </svg>
      ))}
    </span>
  )
}


/** The filter sidebar content — shared by the desktop sidebar and the mobile
 *  left drawer. */
function FilterPanel({ category, min, max }: { category?: string; min?: string; max?: string }) {
  return (
    <>
      <div className="card mb-4 p-4">
        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink">Categories</h2>
        <ul className="flex flex-col gap-1.5">
          {SHOP_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/merchandise?category=${c.slug}`} className={`block text-[12.5px] transition-colors hover:text-brand ${category === c.slug ? 'font-semibold text-brand' : 'text-ink-2'}`}>{c.name}</Link>
            </li>
          ))}
          <li><Link href="/merchandise" className="text-[12.5px] font-medium text-brand hover:underline">View All Categories</Link></li>
        </ul>
      </div>

      {/*
        A real filter, submitted as a GET form so the page can read it from
        searchParams. The old panel listed brands and rating counts that had
        no rows behind them and an Apply button with no handler — none of it
        filtered anything.
      */}
      <form action="/merchandise" method="get" className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink">Filters</h2>
          <Link href="/merchandise" className="text-[12px] text-brand hover:underline">Clear All</Link>
        </div>

        {category && <input type="hidden" name="category" value={category} />}

        <div className="mb-5">
          <h3 className="mb-2 text-[12.5px] font-bold text-ink">Price Range</h3>
          <div className="flex items-center gap-2">
            <input name="min" type="number" min={0} defaultValue={min ?? ''} placeholder="Min" aria-label="Minimum price" className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-[12px] focus:border-brand focus:outline-none" />
            <span className="text-[12px] text-ink-3">to</span>
            <input name="max" type="number" min={0} defaultValue={max ?? ''} placeholder="Max" aria-label="Maximum price" className="w-full rounded-md border border-line bg-paper-2 px-2 py-1.5 text-[12px] focus:border-brand focus:outline-none" />
          </div>
        </div>

        <button type="submit" className="btn-outline mt-1 w-full border-brand py-2 text-[13px] text-brand">Apply Filters</button>
      </form>
    </>
  )
}
