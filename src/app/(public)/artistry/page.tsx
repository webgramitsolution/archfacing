import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { NewsletterForm } from '@/components/newsletter-form'
import { EmptyState, Icon, type IconName } from '@/components/ui'
import { photoSrc } from '@/components/blog'
import { ArtGlyph, ArtworkCard, FilterChip } from '@/components/artistry'
import { artistryReach, artworkCounts, artworkMeta, countArtworks, listArtworks } from '@/lib/artistry'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'
import { ArtistryPhone } from '@/components/mobile/pages/artistry-phone'
import { artistryCategoryHero } from '@/lib/category-hero'

/**
 * §5.2.5 — Artistry.
 *
 * Every control on this page is a plain GET link or form that rewrites the
 * search params, so the whole thing is a Server Component with no client
 * JavaScript at all: the group chips, the sub-category chips, the search and
 * "Load More" are all ordinary navigations.
 */

export const metadata: Metadata = {
  title: 'Artistry',
  description:
    'Environments, design integration, arts, Indian culture and heritage — ' +
    'artistry from across India’s architecture community.',
}

/** How many cards a page shows before "Load More" is needed. */
const PER_PAGE = 12

/** The sidebar's "What You'll Find Here" rows — the taxonomy, said plainly. */
const FIND_HERE: { icon: IconName; title: string; body: string }[] = [
  { icon: 'home', title: 'Heritage Buildings', body: 'Discover iconic architectural marvels' },
  { icon: 'users', title: 'Indian Culture', body: 'Explore traditions, art & festivals' },
  { icon: 'grid', title: 'Art Gallery', body: 'Paintings, photography & more' },
  { icon: 'award', title: 'Sculptures & Artworks', body: 'Creative expressions in 3D form' },
  { icon: 'leaf', title: 'Environments', body: 'Land, rivers, air and the climate' },
  { icon: 'file', title: 'Stories & Inspirations', body: 'Stories behind the art & culture' },
]

/**
 * The promo figures on the navy card.
 *
 * They are counted, then rounded down to the nearest step so the card keeps
 * the blueprint's "1000+ / 500+" shape without ever overstating. A count of
 * 48 reads "40+", not "50+".
 */
function roundedPlus(n: number): string {
  if (n <= 0) return '0'
  const step = n >= 1000 ? 500 : n >= 100 ? 100 : n >= 20 ? 10 : 5
  const floored = Math.floor(n / step) * step
  return floored === 0 ? String(n) : `${floored}+`
}

type Search = {
  q?: string
  category?: string
  sub?: string
  sort?: string
  take?: string
  /** phone only — "list" switches the listing to rows */
  view?: string
}

/** Builds an /artistry link, dropping any param that is empty. */
function artHref(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/artistry?${s}` : '/artistry'
}

export default async function ArtistryPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams

  const q = (sp.q ?? '').trim() || undefined

  // Only slugs that exist in the taxonomy reach the query — an unknown
  // `?category=` is dropped rather than returning a confusing empty page.
  const group = ARTISTRY_CATEGORIES.find((g) => g.slug === sp.category)
  const category = group?.slug
  const child = group?.children?.find((c) => c.slug === sp.sub)
  const sub = child?.slug
  // The same hero, headed and described for the category a menu link opened.
  const catHero = artistryCategoryHero(category, sub)

  const sort: 'latest' | 'popular' = sp.sort === 'popular' ? 'popular' : 'latest'
  const sortParam = sort === 'popular' ? 'popular' : undefined

  const requested = Number(sp.take)
  const take = Number.isFinite(requested)
    ? Math.min(Math.max(requested, PER_PAGE), 60)
    : PER_PAGE

  const view: 'grid' | 'list' = sp.view === 'list' ? 'list' : 'grid'

  const [counts, artworks, total, featuredPool, reach, session, heritagePool] = await Promise.all([
    artworkCounts(),
    listArtworks({ category, sub, search: q, sort, take }),
    countArtworks({ category, sub, search: q }),
    // The banner photograph ignores the filters below it.
    listArtworks({ sort: 'latest', take: 12 }),
    artistryReach(),
    auth(),
    // "From Heritage to Innovation" on phones fades through real heritage works.
    listArtworks({ category: 'heritage', sort: 'popular', take: 3 }),
  ])
  const heroImages = heritagePool.map((a) => photoSrc(artworkMeta(a.meta).image, { w: 900, h: 700 }))
  const uploadHref = session?.user?.id
    ? '/dashboard/artistry/new'
    : '/login?next=/dashboard/artistry/new'
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, artworks.map((a) => a.id))
    : new Set<string>()

  const featured =
    featuredPool.find((a) => artworkMeta(a.meta).badges.includes('Featured')) ?? featuredPool[0]
  const featuredMeta = featured ? artworkMeta(featured.meta) : null

  const hasMore = artworks.length < total

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search for artistry, artworks, artists…', action: '/artistry', param: 'q', variant: 'filter' },
          location: false,
          tone: 'light',
        }}
      />

      {/* Invisible by design — sr-only markup plus BreadcrumbList JSON-LD. */}
      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Artistry', ...(category ? { href: '/artistry' } : {}) },
          ...(group ? [{ label: group.name, ...(sub ? { href: artHref({ category }) } : {}) }] : []),
          ...(child ? [{ label: child.name }] : []),
        ]}
      />

      {/* ─── phones ─── */}
      <div className="md:hidden">
        <ArtistryPhone
          artworks={artworks}
          total={total}
          take={take}
          perPage={PER_PAGE}
          state={{ q, category, sub, sort, view }}
          savedIds={savedIds}
          heroImages={heroImages}
          reach={reach}
          uploadHref={uploadHref}
          heading={child?.name ?? group?.name ?? 'Artistry Listing'}
          hero={catHero}
        />
      </div>

      <main className="hidden bg-paper md:block">
        <div className="container-af pb-0 pt-5">
          {/* ═══════════════════ the banner ═══════════════════ */}
          {/*
            One navy panel carrying its own breadcrumb, because the page opens
            on it — the site breadcrumb above would sit on white and read as a
            second, competing trail.
          */}
          <section className="relative overflow-hidden rounded-card bg-navy">
            <span aria-hidden className="absolute inset-0">
              <Image
                src="https://ik.imagekit.io/archfacing/Untitled%20design%20(3).png?updatedAt=1784821350459"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              {/* left-to-right wash, so the headline never sits on detail */}
              {/* Dark only behind the copy: solid through the text column,
                  gone by ~62% so the building on the right stays untouched. */}
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.85) 30%, ' +
                    'rgba(17,24,39,0.5) 46%, rgba(17,24,39,0) 62%)',
                }}
              />
            </span>

            <div className="relative px-6 py-8 md:max-w-[52%] md:px-9 md:py-8 lg:py-14">
              {/* No trail drawn in the banner. The <Breadcrumb> above <main>
                  still emits the sr-only markup and the BreadcrumbList
                  JSON-LD, so the page keeps the structured data without
                  spending a line of the hero on it. */}
              <h1 className="font-display text-[38px] font-bold leading-[1.05] tracking-tight text-white md:text-[52px]">
                {catHero?.title ?? 'Artistry'}
              </h1>
              <p className="mt-1.5 font-display text-[17px] font-bold text-gold md:text-[19px]">
                {catHero ? (catHero.parent ? `Artistry · ${catHero.parent}` : 'Artistry') : <>Celebrating Art, Architecture &amp; Culture</>}
              </p>
              <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-white/70">
                {catHero?.description ??
                  'A platform to showcase the timeless beauty of heritage, the richness of Indian culture and the creativity of design through inspiring works and visual stories.'}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="#artistry-listing" className="btn-primary">
                  Explore Artistry
                  <ArtGlyph name="right" className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/artistry/new"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-navy transition-colors hover:bg-white/90"
                >
                  Share Your Work
                  <Icon name="plus" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ═══════════════════ filters ═══════════════════ */}
          <nav aria-label="Artistry categories" className="mt-8">
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-2">
              <FilterChip
                href={artHref({ q, sort: sortParam })}
                label="All"
                count={counts.total}
                active={!category}
              />
              {ARTISTRY_CATEGORIES.map((g) => (
                <FilterChip
                  key={g.slug}
                  href={artHref({ q, category: g.slug, sort: sortParam })}
                  label={g.name}
                  count={counts.byCategory[g.slug] ?? 0}
                  active={g.slug === category}
                />
              ))}
            </div>

            {/* ─── the children of the open group ─── */}
            {group?.children && group.children.length > 0 && (
              <div className="mt-2.5 flex min-w-0 gap-2 overflow-x-auto border-t border-line pt-3">
                <FilterChip
                  href={artHref({ q, category, sort: sortParam })}
                  label={`All ${group.name}`}
                  count={counts.byCategory[group.slug] ?? 0}
                  active={!sub}
                />
                {group.children.map((c) => (
                  <FilterChip
                    key={c.slug}
                    href={artHref({ q, category, sub: c.slug, sort: sortParam })}
                    label={c.name}
                    count={counts.bySub[c.slug] ?? 0}
                    active={c.slug === sub}
                  />
                ))}
              </div>
            )}
          </nav>

          {/* ═══════════════════ listing + rail ═══════════════════ */}
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <section id="artistry-listing" className="min-w-0 scroll-mt-28">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-3 font-display text-[22px] font-bold tracking-tight text-ink">
                    {child?.name ?? group?.name ?? 'Artistry Listing'}
                    <span aria-hidden className="h-0.5 w-9 rounded-pill bg-gold" />
                  </h2>
                  <p className="mt-1.5 text-[12.5px] text-ink-3">
                    Showcasing {total} Inspiring Work{total === 1 ? '' : 's'}
                    {q && <span> · “{q}”</span>}
                  </p>
                </div>

                {/* A GET form, so sorting is a navigation and the back button
                    works — the rest of this page has no client JS either. */}
                <form method="get" action="/artistry" className="flex items-center gap-2.5">
                  {q && <input type="hidden" name="q" value={q} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  {sub && <input type="hidden" name="sub" value={sub} />}
                  <label htmlFor="artistry-sort" className="text-[12.5px] text-ink-3">
                    Sort By:
                  </label>
                  <select
                    id="artistry-sort"
                    name="sort"
                    defaultValue={sort}
                    className="input h-9 w-[118px] py-0 text-[12.5px]"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Most Viewed</option>
                  </select>
                  <button type="submit" className="btn-outline h-9 px-3 py-0 text-[12.5px]">
                    Apply
                  </button>
                </form>
              </div>

              {artworks.length > 0 ? (
                <>
                  <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {artworks.map((a) => (
                      <li key={a.slug} className="min-w-0">
                        <ArtworkCard post={a} saved={savedIds.has(a.id)} />
                      </li>
                    ))}
                  </ul>

                  {hasMore && (
                    <div className="mt-7 flex justify-center">
                      <Link
                        href={artHref({
                          q, category, sub, sort: sortParam, take: take + PER_PAGE,
                        })}
                        className="btn-outline rounded-pill"
                      >
                        Load More Works
                        <ArtGlyph name="right" className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon="inbox"
                  title="Nothing here yet"
                  action={
                    <Link href="/artistry" className="btn-primary">
                      Clear filters
                    </Link>
                  }
                >
                  No artistry matches this filter. Try another category, or clear the search.
                </EmptyState>
              )}
            </section>

            {/* ─────────────────── the rail ─────────────────── */}
            <aside className="min-w-0">
              <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[116px]">
                {/* ─── heritage promo ─── */}
                <section className="relative isolate overflow-hidden rounded-card bg-navy p-5">
                  {/* The client's temple-and-pillar artwork, standing on the
                      card's right edge as the blueprint draws it. */}
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[44%]">
                    <Image
                      src="https://ik.imagekit.io/archfacing/Icon/icon%20right%20side.png?updatedAt=1784820226288"
                      alt=""
                      fill
                      sizes="320px"
                      className="object-contain object-right-bottom"
                    />
                  </span>
                  <h2 className="font-display text-[19px] font-bold leading-snug text-white">
                    From Heritage to
                    <br />
                    Innovation
                  </h2>
                  <span aria-hidden className="mt-2 block h-0.5 w-10 rounded-pill bg-gold" />
                  <p className="mt-3 max-w-[60%] text-[12.5px] leading-relaxed text-white/60">
                    Explore the beauty of timeless architecture and the richness of Indian culture.
                  </p>
                  <Link
                    href={artHref({ category: 'heritage' })}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[12.5px] font-semibold text-navy transition-colors hover:bg-white/90"
                  >
                    Explore Now
                    <ArtGlyph name="right" className="h-3.5 w-3.5" />
                  </Link>
                </section>

                {/* ─── what you'll find ─── */}
                <section className="card bg-paper p-5">
                  <h2 className="font-display text-[13px] font-bold text-ink">
                    What You&apos;ll Find Here
                  </h2>
                  <ul className="mt-3.5 flex flex-col gap-3.5">
                    {FIND_HERE.map((f) => (
                      <li key={f.title} className="flex min-w-0 items-start gap-2.5">
                        <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold text-ink">
                            {f.title}
                          </span>
                          <span className="block text-[11.5px] leading-snug text-ink-3">
                            {f.body}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ─── reach ─── */}
                <section className="rounded-card bg-navy p-5">
                  <ul className="grid grid-cols-2 gap-y-5">
                    {[
                      { icon: 'grid' as IconName, value: roundedPlus(reach.works), label: 'Artistry Works' },
                      { icon: 'users' as IconName, value: roundedPlus(reach.creators), label: 'Creative Minds' },
                      { icon: 'tag' as IconName, value: roundedPlus(reach.categories), label: 'Categories' },
                      { icon: 'map' as IconName, value: roundedPlus(reach.states), label: 'States Covered' },
                    ].map((s) => (
                      <li key={s.label} className="flex min-w-0 items-center gap-2.5">
                        <Icon name={s.icon} className="h-4 w-4 shrink-0 text-white/40" />
                        <span className="min-w-0">
                          <span className="tabular block font-display text-[17px] font-bold text-gold">
                            {s.value}
                          </span>
                          <span className="block truncate text-[11px] text-white/60">
                            {s.label}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ─── upload ─── */}
                <section className="card bg-paper p-5">
                  <h2 className="flex items-center gap-3 font-display text-[14px] font-bold text-ink">
                    Showcase Your Creativity
                    <span aria-hidden className="h-0.5 w-7 shrink-0 rounded-pill bg-gold" />
                  </h2>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-3">
                    Share your creative work and get featured on ArchFacing.
                  </p>
                  <Link
                    href="/dashboard/artistry/new"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-2"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Upload Your Work
                  </Link>
                </section>

                {/* ─── newsletter ─── */}
                <section className="card bg-paper p-5">
                  <h2 className="font-display text-[13px] font-bold text-ink">Stay Inspired</h2>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
                    Subscribe to get the latest updates and featured artistry straight to your
                    inbox.
                  </p>
                  <div className="mt-3.5">
                    <NewsletterForm source="artistry" />
                  </div>
                  <p className="mt-2.5 text-[11px] text-ink-4">We respect your privacy.</p>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
