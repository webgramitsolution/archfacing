import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { EmptyState } from '@/components/ui'
import {
  FilterSidebar, GROUP_ICONS, GROUP_ICON_IMAGES, Pagination, PGlyph,
  ProductCard, ProductListRow, productsHref,
  type FilterValues, type ProductParams,
} from '@/components/products'
import { statValue } from '@/lib/platform-stats'
import { productCategoryHero } from '@/lib/category-hero'
import {
  groupCount, listProducts, productCounts, productFacets, PRODUCT_GROUPS,
  type ProductSort,
} from '@/lib/products'
import { PRODUCT_PHOTOS, unsplash } from '@/config/content-media'
import { PRODUCT_CATEGORIES } from '@/config/taxonomy'
import { ProductsPhone } from '@/components/mobile/pages/products-phone'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'

/**
 * §4.1.7 — Products.
 *
 * Entirely a Server Component, with no client JavaScript at all:
 *
 *   · The filter sidebar is a real GET <form action="/products">. Submitting
 *     it navigates to /products?… and this component re-renders against the
 *     new search params. Every control is given a `defaultValue` /
 *     `defaultChecked` from the submitted params, so the form always comes
 *     back showing what was asked for.
 *   · The sort <select> sits in the results bar, outside the sidebar, and is
 *     joined to the same form through the HTML `form=` attribute — so one
 *     submission carries the filters and the sort together.
 *   · The category strip, the grid/list toggle and the pagination are ordinary
 *     links that rewrite the search params.
 *   · The colour swatches are checkboxes whose selected ring is drawn by
 *     Tailwind's `peer-checked:`, and the "+" that reveals the rest is a
 *     <details> disclosure.
 */

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Discover premium building materials, products and solutions from trusted ' +
    'brands across India — flooring, cladding, kitchen, bathroom, doors, ' +
    'windows, lighting and structural materials.',
}

/** Cards per page — 4 columns × 5 rows, and the "Showing 1 – 20" the design prints. */
const PER_PAGE = 20

/** The id that ties the sort <select> in the results bar to the sidebar form. */
const FORM_ID = 'product-filters'

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'latest', label: 'Latest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
]

type Search = {
  q?: string
  category?: string
  sub?: string
  group?: string
  brand?: string
  priceMin?: string
  priceMax?: string
  material?: string
  colour?: string | string[]
  application?: string
  availability?: string | string[]
  verified?: string
  original?: string
  bmf?: string
  sort?: string
  view?: string
  page?: string
}

const text = (v: string | undefined) => (v ?? '').trim()

/** A positive number, or undefined — so `?priceMin=abc` simply does nothing. */
function positive(v: string | undefined): number | undefined {
  const n = Number(text(v))
  return Number.isFinite(n) && n >= 0 && text(v) !== '' ? n : undefined
}

const flag = (v: string | undefined) => v === '1' || v === 'on' || v === 'true'

/**
 * The colour swatches and the availability boxes are multi-select, so the
 * browser submits the name more than once. Next hands that back as a string
 * when one box was ticked and an array when several were — this flattens both.
 */
function many(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean)
  const one = text(v)
  return one ? [one] : []
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams

  // ─── read the search params, dropping anything that is not real ───
  const q = text(sp.q) || undefined
  const category = PRODUCT_CATEGORIES.some((c) => c.slug === sp.category) ? sp.category : undefined
  const sub = text(sp.sub) || undefined
  const group = PRODUCT_GROUPS.some((g) => g.value === sp.group) ? sp.group : undefined
  const brand = text(sp.brand) || undefined
  const priceMin = positive(sp.priceMin)
  const priceMax = positive(sp.priceMax)
  const material = text(sp.material) || undefined
  const colours = many(sp.colour)
  const application = text(sp.application) || undefined
  const availability = many(sp.availability)
  const verified = flag(sp.verified)
  const original = flag(sp.original)
  const bmf = flag(sp.bmf)
  const sort: ProductSort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as ProductSort) : 'latest'
  const view: 'grid' | 'list' = sp.view === 'list' ? 'list' : 'grid'
  const page = Math.max(1, positive(sp.page) ?? 1)

  const [result, counts, facets, session, catHero] = await Promise.all([
    listProducts({
      q, category, sub, group, brand, priceMin, priceMax, material,
      colours, application, availability, verified, original, bmf,
      sort, page, perPage: PER_PAGE,
    }),
    productCounts(),
    productFacets(),
    auth(),
    // A mega-menu category page: same hero, the category's own copy and counts.
    productCategoryHero(category, sub),
  ])

  const { rows, total, pages } = result
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, rows.map((r) => r.id))
    : new Set<string>()

  /*
   * The hero stat band. Every figure is counted from the same data the
   * results bar and the category strip read, so "Products" here and the
   * "276" below it are the same number. "All India Delivery" stays — it is
   * a policy statement, not a count.
   */
  const heroStats = catHero
    ? [
        { icon: 'box' as const, value: statValue(catHero.stats[0].value), label: catHero.stats[0].label },
        { icon: 'building' as const, value: statValue(catHero.stats[1].value), label: catHero.stats[1].label },
        { icon: 'grid' as const, value: statValue(catHero.stats[2].value), label: catHero.stats[2].label },
        { icon: 'truck' as const, value: 'All', label: 'India Delivery' },
      ]
    : [
        { icon: 'box' as const, value: statValue(counts.all), label: 'Products' },
        { icon: 'building' as const, value: statValue(facets.brands.length), label: 'Brands' },
        {
          icon: 'grid' as const,
          value: statValue(PRODUCT_GROUPS.filter((g) => groupCount(g, counts) > 0).length),
          label: 'Categories',
        },
        { icon: 'truck' as const, value: 'All', label: 'India Delivery' },
      ]

  // Everything a link needs to preserve. `page` is added by whoever needs it.
  const carried: ProductParams = {
    q, category, sub, group, brand,
    priceMin, priceMax, material,
    colour: colours.length ? colours : undefined,
    application,
    availability: availability.length ? availability : undefined,
    verified: verified ? 1 : undefined,
    original: original ? 1 : undefined,
    bmf: bmf ? 1 : undefined,
    sort: sort === 'latest' ? undefined : sort,
    view: view === 'grid' ? undefined : view,
  }

  const values: FilterValues = {
    q: q ?? '',
    category: category ?? '',
    sub: sub ?? '',
    brand: brand ?? '',
    priceMin: priceMin?.toString() ?? '',
    priceMax: priceMax?.toString() ?? '',
    material: material ?? '',
    colours,
    application: application ?? '',
    availability,
    verified, original, bmf,
    group: group ?? '',
    view: view === 'grid' ? '' : view,
    sort,
  }

  const first = total === 0 ? 0 : (result.page - 1) * PER_PAGE + 1
  const last = Math.min(result.page * PER_PAGE, total)

  const toggle = 'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'
  const chip =
    'group flex w-[116px] flex-col items-center gap-1.5 px-2 py-1 text-center transition-colors'

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search for products, brands, materials…', action: '/products', param: 'q', variant: 'camera' },
          tone: 'dark',
        }}
      />

      <div className="hidden md:block">
        <Breadcrumb items={[homeCrumb(), { label: 'Products' }]} />
      </div>

      {/* ═══ phones only ═══ */}
      <div className="md:hidden">
        <ProductsPhone
          hero={catHero}
          rows={rows}
          total={total}
          page={result.page}
          pages={pages}
          first={first}
          last={last}
          counts={counts}
          facets={facets}
          carried={carried}
          savedIds={[...savedIds]}
          sorts={SORTS}
          values={{
            q: q ?? '', category: category ?? '', sub: sub ?? '', group: group ?? '',
            brand: brand ?? '', priceMin: priceMin?.toString() ?? '', priceMax: priceMax?.toString() ?? '',
            material: material ?? '', availability: availability[0] ?? '', colours,
            application: application ?? '', verified, original, bmf, sort, view,
          }}
        />
      </div>

      <main className="hidden bg-paper md:block">
        {/* ═══════════════════ hero ═══════════════════ */}
        <section className="relative overflow-hidden bg-navy">
          <span aria-hidden className="absolute inset-0">
            <Image
              src="https://ik.imagekit.io/archfacing/product%20banner.png?updatedAt=1784798103623"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/*
              The stops are in PIXELS, not percentages: the copy block is a fixed
              width, so a percentage stop over-covers the banner as the viewport
              grows. These clear just past where the copy actually ends at any
              width. On a phone the copy sits over the picture itself, so there
              the whole banner takes a flat wash instead.
            */}
            <span className="absolute inset-0 bg-navy/[0.86] md:hidden" />
            {/* The tablet runs the same row of stats in less width, so its wash
                reaches a little further — but it still clears just past where
                the stats end (~62%), leaving the banner's right edge clean. */}
            <span
              className="absolute inset-0 hidden md:block lg:hidden"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #111827 0%, #111827 500px, rgba(17,24,39,0.45) 560px, transparent 620px)',
              }}
            />
            <span
              className="absolute inset-0 hidden lg:block"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #111827 0%, #111827 620px, rgba(17,24,39,0.45) 680px, transparent 745px)',
              }}
            />
          </span>

          <div className="container-af relative py-11 lg:py-14">
            {catHero?.parent && (
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-brand">
                Products · {catHero.parent}
              </p>
            )}
            <h1 className="font-display text-[34px] font-bold uppercase leading-[1.04] tracking-tight text-white sm:text-[42px] lg:text-[50px]">
              {catHero?.title ?? 'Products'}
            </h1>
            {/* Two lines of roughly equal length, as the design sets it. */}
            <p className="mt-3.5 max-w-[48ch] text-[14.5px] leading-relaxed text-white/75 [text-wrap:balance]">
              {catHero?.description ??
                'Discover premium building materials, products and solutions from trusted brands across India.'}
            </p>

            {/*
              Live database counts — see `heroStats` above. They are derived
              from the same queries as the results bar, so the band can never
              contradict the list under it.

              One row divided by hairlines, as the design draws it; the icons sit
              bare in brand orange rather than in a chip.
            */}
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 sm:flex sm:items-center sm:gap-0">
              {heroStats.map((s) => (
                <li
                  key={s.label}
                  /* Tighter on a tablet so the row still ends inside the wash
                     and the banner on the right stays clear. */
                  className="flex min-w-0 items-center gap-2.5 sm:border-l sm:border-white/15 sm:px-3 sm:first:border-l-0 sm:first:pl-0 lg:gap-2.5 lg:px-5"
                >
                  <PGlyph name={s.icon} className="h-[22px] w-[22px] shrink-0 text-brand lg:h-[26px] lg:w-[26px]" />
                  <span className="min-w-0">
                    <span className="tabular block font-display text-[17px] font-bold leading-none text-white lg:text-[21px]">
                      {s.value}
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] text-white/60 lg:text-[11.5px]">
                      {s.label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="container-af py-10">
          {/* ═══════════════════ category strip ═══════════════════ */}
          <nav aria-label="Product categories" className="card px-2 py-3">
            {/* One row divided by hairlines, as the design draws it — the icons
                sit bare rather than in a tinted box, and the row scrolls inside
                itself on a phone instead of pushing the page sideways. */}
            <ul className="no-scrollbar flex overflow-x-auto">
              <li className="shrink-0">
                <Link
                  href={productsHref({ view: carried.view })}
                  aria-current={!group && !category ? 'true' : undefined}
                  className={chip}
                >
                  <span className="flex h-8 items-center justify-center text-brand">
                    <PGlyph name="grid" className="h-7 w-7" />
                  </span>
                  <span
                    className={[
                      'text-[11.5px] font-semibold leading-tight',
                      !group && !category ? 'text-brand' : 'text-ink-2 group-hover:text-brand',
                    ].join(' ')}
                  >
                    All Products
                  </span>
                  <span
                    className={[
                      'tabular text-[11px]',
                      !group && !category ? 'font-semibold text-brand' : 'text-ink-3',
                    ].join(' ')}
                  >
                    {counts.all}
                  </span>
                </Link>
              </li>

              {PRODUCT_GROUPS.map((g) => {
                const on = g.value === group
                // `More Categories` covers everything, so it clears the
                // grouping rather than adding one — the same call the Projects
                // strip makes for "Others".
                const href = productsHref({
                  group: g.categories || g.subs ? g.value : undefined,
                  view: carried.view,
                })
                const art = GROUP_ICON_IMAGES[g.value]

                return (
                  <li key={g.value} className="shrink-0 border-l border-line-soft">
                    <Link href={href} aria-current={on ? 'true' : undefined} className={chip}>
                      <span className="flex h-8 items-center justify-center">
                        {art ? (
                          <Image
                            src={art}
                            alt=""
                            width={64}
                            height={64}
                            unoptimized
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <PGlyph
                            name={GROUP_ICONS[g.value] ?? 'box'}
                            className="h-7 w-7 text-ink-2"
                          />
                        )}
                      </span>
                      <span
                        className={[
                          'text-[11.5px] font-semibold leading-tight',
                          on ? 'text-brand' : 'text-ink-2 group-hover:text-brand',
                        ].join(' ')}
                      >
                        {g.label}
                      </span>
                      {/* Live counts, straight from the database. The design's
                          showcase figures (12,450+, 5,230+ …) are kept in
                          MARKETING.categoryShowcase so the chips can never
                          contradict the results bar. */}
                      <span
                        className={[
                          'tabular text-[11px]',
                          on ? 'font-semibold text-brand' : 'text-ink-3',
                        ].join(' ')}
                      >
                        {groupCount(g, counts)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* ═══════════════════ sidebar + results ═══════════════════ */}
          <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
            {/* On a phone the sidebar stacks above the results, which is the
                order the markup is already in. */}
            <aside className="min-w-0">
              <FilterSidebar id={FORM_ID} values={values} facets={facets} counts={counts} />
            </aside>

            <section className="min-w-0">
              {/* ─── results bar ─── */}
              <div className="card mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 text-[13px] text-ink-2">
                  Showing <span className="tabular font-semibold text-ink">{first} – {last}</span> of{' '}
                  <span className="tabular font-semibold text-ink">{total.toLocaleString('en-IN')}</span>{' '}
                  product{total === 1 ? '' : 's'}
                </p>

                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  {/* Attached to the sidebar form by id, so changing the sort
                      and pressing Go re-submits the filters with it. */}
                  <label htmlFor="product-sort" className="text-[12.5px] text-ink-3">
                    Sort by:
                  </label>
                  <select
                    id="product-sort"
                    name="sort"
                    form={FORM_ID}
                    defaultValue={sort}
                    className="input w-auto py-2 text-[12.5px]"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button type="submit" form={FORM_ID} className="btn-outline px-3 py-2 text-[12.5px]">
                    Go
                  </button>

                  <span className="flex items-center gap-1.5">
                    <Link
                      href={productsHref({ ...carried, view: undefined, page: undefined })}
                      aria-label="Grid view"
                      aria-current={view === 'grid' ? 'true' : undefined}
                      className={[
                        toggle,
                        view === 'grid'
                          ? 'border-brand bg-brand text-white'
                          : 'border-line bg-paper-2 text-ink-3 hover:border-brand hover:text-brand',
                      ].join(' ')}
                    >
                      <PGlyph name="grid" className="h-4 w-4" />
                    </Link>
                    <Link
                      href={productsHref({ ...carried, view: 'list', page: undefined })}
                      aria-label="List view"
                      aria-current={view === 'list' ? 'true' : undefined}
                      className={[
                        toggle,
                        view === 'list'
                          ? 'border-brand bg-brand text-white'
                          : 'border-line bg-paper-2 text-ink-3 hover:border-brand hover:text-brand',
                      ].join(' ')}
                    >
                      <PGlyph name="list" className="h-4 w-4" />
                    </Link>
                  </span>
                </div>
              </div>

              {/* ─── the results ─── */}
              {rows.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No products found"
                  action={
                    <Link href="/products" className="btn-outline">
                      Reset Filters
                    </Link>
                  }
                >
                  Nothing matches those filters yet. Try widening the price range,
                  clearing a finish, or reset the filters and browse everything.
                </EmptyState>
              ) : view === 'list' ? (
                <div className="flex min-w-0 flex-col gap-4">
                  {rows.map((p) => (
                    <ProductListRow key={p.slug} post={p} />
                  ))}
                </div>
              ) : (
                <div className="grid min-w-0 gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {rows.map((p) => (
                    <ProductCard
                      key={p.slug}
                      post={p}
                      sizes="(min-width:1280px) 280px, (min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"
                    />
                  ))}
                </div>
              )}

              <Pagination page={result.page} pages={pages} params={carried} />
            </section>
          </div>

          {/* ═══════════════════ requirement call to action ═══════════════════ */}
          <section className="mt-10 rounded-card border border-brand-border bg-brand-soft px-6 py-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-5">
              <div className="min-w-0 max-w-2xl">
                <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">
                  Can&apos;t find the product you&apos;re looking for?
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                  Tell us what you need and we&apos;ll help you find the right product.
                </p>
              </div>
              <Link href="/consult-nearby" className="btn-primary shrink-0">
                Post Your Requirement
                <PGlyph name="right" className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
