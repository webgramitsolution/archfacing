import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { NewsletterForm } from '@/components/newsletter-form'
import { EmptyState, Icon, type IconName } from '@/components/ui'
import { AroundUsCard, ChipTile, TrendingRow, EventRow } from '@/components/around-us'
import {
  listAroundUs, countAroundUs, trendingAroundUs, upcomingEvents, aroundUsCounts,
} from '@/lib/around-us'
import { AROUND_US_CATEGORIES, AROUND_US_CHIPS } from '@/config/taxonomy'
import { AroundUsPhone } from '@/components/mobile/pages/around-us-phone'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'
import { mobileSession } from '@/lib/mobile-shell'
import { aroundUsCategoryHero } from '@/lib/category-hero'

/**
 * §5.2.4 — Around Us.
 *
 * Every control on this page is a plain GET link or form that rewrites the
 * search params, so the whole thing is a Server Component with no client
 * JavaScript: the chips, the sort and "Load More" are ordinary navigations.
 */

export const metadata: Metadata = {
  title: 'Around Us',
  description:
    'News, events, achievements and activities from the architecture, design ' +
    'and construction community across India.',
}

const PER_PAGE = 9

/** ArchFacing's own artwork, served from the ImageKit CDN. */
const HERO_BANNER =
  'https://ik.imagekit.io/archfacing/around%20us%20banner%201.png?updatedAt=1784753557073'
const TROPHY =
  'https://ik.imagekit.io/archfacing/Icon/winner%20trophy.png?updatedAt=1784864786424'

/** The four columns under the hero headline. */
const HERO_FEATURES: { icon: IconName; title: string; note: string }[] = [
  { icon: 'bell', title: 'Latest Updates', note: 'News & happenings from the industry' },
  { icon: 'calendar', title: 'Events & Exhibitions', note: 'Stay ahead with upcoming events' },
  { icon: 'trophy', title: 'Design Competitions', note: 'Open calls for DESIGNA & DESIGNI' },
  { icon: 'users', title: 'Social Welfare', note: 'Help asked and help offered' },
]

type Search = { chip?: string; category?: string; sub?: string; q?: string; sort?: string; take?: string }

function href(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/around-us?${s}` : '/around-us'
}

export default async function AroundUsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams

  const chip = AROUND_US_CHIPS.find((c) => c.key === sp.chip) ?? AROUND_US_CHIPS[0]
  const q = (sp.q ?? '').trim() || undefined
  const sort: 'latest' | 'popular' = sp.sort === 'popular' ? 'popular' : 'latest'
  const sortParam = sort === 'popular' ? 'popular' : undefined

  const requested = Number(sp.take)
  const take = Number.isFinite(requested)
    ? Math.min(Math.max(requested, PER_PAGE), 60)
    : PER_PAGE

  // A top-level group (the phone's four section tiles) — only when no chip
  // narrows the list, and only a slug the taxonomy knows.
  const group = chip.key === 'all' ? AROUND_US_CATEGORIES.find((g) => g.slug === sp.category) : undefined

  // A mega-menu sub-category link (`&sub=`) — only a child of that group.
  const child = group?.children?.find((c) => c.slug === sp.sub)
  const subSlug = child?.slug
  // The same hero, headed and described for the category a menu link opened.
  const catHero = group ? aroundUsCategoryHero(group.slug, subSlug) : null

  const filter = group
    ? { category: group.slug, sub: subSlug, search: q }
    : { category: chip.category, sub: chip.sub, search: q }

  const [posts, total, counts, trending, events, session, phoneSession] = await Promise.all([
    listAroundUs({ ...filter, sort, take }),
    countAroundUs(filter),
    aroundUsCounts(),
    trendingAroundUs(5),
    upcomingEvents(4),
    auth(),
    mobileSession(),
  ])
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, posts.map((p) => p.id))
    : new Set<string>()

  // Members post Around Us from their own panel; these roles have one.
  const dash = phoneSession.dashboardHref
  const shareHref = !phoneSession.signedIn
    ? '/login?next=/dashboard'
    : ['/dashboard/professional', '/dashboard/consultant', '/dashboard/corporate', '/dashboard/bmf'].includes(dash)
      ? `${dash}/around-us`
      : dash

  const hasMore = posts.length < total

  /** A chip's count — its sub-category when it names one, else its parent. */
  const chipCount = (c: (typeof AROUND_US_CHIPS)[number]) =>
    c.key === 'all' ? undefined : counts[c.sub ?? c.category ?? ''] ?? 0

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search for news, events, updates…', action: '/around-us', param: 'q', variant: 'filter' },
          location: false,
          tone: 'light',
        }}
      />

      {/* sr-only plus the BreadcrumbList JSON-LD — the banner draws its own. */}
      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Around Us', ...(group ? { href: '/around-us' } : {}) },
          ...(group ? [{ label: group.name, ...(child ? { href: href({ category: group.slug }) } : {}) }] : []),
          ...(child ? [{ label: child.name }] : []),
        ]}
      />

      {/* ─── phones ─── */}
      <div className="md:hidden">
        <AroundUsPhone
          posts={posts}
          total={total}
          take={take}
          perPage={PER_PAGE}
          state={{ chip: chip.key, category: group?.slug, sub: subSlug, q, sort: sortParam }}
          hero={catHero}
          savedIds={savedIds}
          trending={trending}
          events={events}
          shareHref={shareHref}
        />
      </div>

      <main className="hidden bg-paper md:block">
        <div className="container-af pb-0 pt-5">
          {/* ═══════════════════ the banner ═══════════════════ */}
          {/*
            One photograph across the whole panel, with the copy on top of it.
            There is no white fade and no half-width picture: both produced a
            vertical seam down the middle, because wherever the fade began was
            an edge where the paint started and that edge showed.
            Legibility comes from an even dark scrim instead, and the type is
            white over it.
          */}
          <section className="relative isolate overflow-hidden rounded-card">
            <Image
              src={HERO_BANNER}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover"
            />
            {/*
              The darkening covers the type and clears the building.
              It is one element at `inset-0`, not a half-width box: an element
              that starts partway across has a left edge, and that edge is the
              vertical seam this banner had before. A ramp that begins at 0 and
              reaches zero opacity by 68% has no edge anywhere — only the
              colour changes, and it changes gradually.
            */}
            <span
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(17,24,39,0.88) 0%, rgba(17,24,39,0.80) 28%, ' +
                  'rgba(17,24,39,0.42) 46%, rgba(17,24,39,0) 60%)',
              }}
            />

            {/*
              The desktop sizes step DOWN from the tablet ones rather than up.
              A tablet is the tight case, so `md:` is the comfortable reading;
              on a wide screen the same type ran the four columns past the
              halfway mark and onto the building. Holding the block to about
              45% of the panel is what keeps the picture clear.
            */}
            <div className="px-6 py-12 md:min-h-[360px] md:px-10 md:py-14 lg:min-h-[304px] lg:py-11">
              {catHero && (
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand">
                  {catHero.parent ? `Around Us · ${catHero.parent}` : 'Around Us'}
                </p>
              )}
              <h1 className="font-display text-[38px] font-bold leading-[1.02] tracking-tight text-white md:text-[48px] lg:text-[40px]">
                {catHero ? <BrandTail text={catHero.title} /> : <>Around <span className="text-brand">Us</span></>}
              </h1>
              <p className="mt-3.5 max-w-lg text-[13.5px] leading-[1.7] text-white/80 lg:max-w-[33rem] lg:text-[12.5px]">
                {catHero?.description ??
                  'Stay updated with the latest news, events, achievements and activities from the Architecture, Design and Construction community across India.'}
              </p>

              {/* Four across from `sm` up with a hairline between them, as the
                  reference draws it. `divide-x` puts the rule on the left edge
                  of every column but the first, so it lands between. */}
              <ul className="mt-8 grid max-w-3xl grid-cols-2 gap-y-6 divide-white/25 sm:grid-cols-4 sm:divide-x lg:mt-7 lg:max-w-[36rem]">
                {HERO_FEATURES.map((f) => (
                  <li key={f.title} className="min-w-0 px-1 sm:px-4 sm:first:pl-0 lg:px-3">
                    <Icon name={f.icon} className="h-[19px] w-[19px] text-white lg:h-4 lg:w-4" />
                    <p className="mt-2.5 text-[12px] font-bold leading-tight text-white lg:mt-2 lg:text-[11px]">
                      {f.title}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-[1.45] text-white/65 lg:text-[9.5px]">
                      {f.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ═══════════════════ chips + body ═══════════════════ */}
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <div className="min-w-0">
              {/* the strip stays inside the left column so it ends level with
                  the grid under it rather than running past the rail */}
              <nav aria-label="Around Us categories" className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
                {AROUND_US_CHIPS.map((c) => (
                  <ChipTile
                    key={c.key}
                    href={href({ chip: c.key === 'all' ? undefined : c.key, q, sort: sortParam })}
                    icon={c.icon as IconName}
                    label={c.name}
                    active={c.key === chip.key}
                  />
                ))}
              </nav>

              <section id="around-us-listing" className="mt-7 scroll-mt-28">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-[22px] font-bold tracking-tight text-ink">
                      Latest Around Us
                    </h2>
                    <p className="mt-1.5 text-[12.5px] text-ink-3">
                      Discover what&rsquo;s happening around the design, architecture and
                      construction world.
                    </p>
                  </div>

                  <form method="get" action="/around-us" className="flex items-center gap-2">
                    {chip.key !== 'all' && <input type="hidden" name="chip" value={chip.key} />}
                    {group && <input type="hidden" name="category" value={group.slug} />}
                    {subSlug && <input type="hidden" name="sub" value={subSlug} />}
                    {q && <input type="hidden" name="q" value={q} />}
                    <label htmlFor="au-sort" className="sr-only">Sort</label>
                    <select
                      id="au-sort"
                      name="sort"
                      defaultValue={sort}
                      className="input h-9 w-[128px] py-0 text-[12.5px]"
                    >
                      <option value="latest">Latest First</option>
                      <option value="popular">Most Viewed</option>
                    </select>
                    <button type="submit" className="btn-outline h-9 px-3 py-0 text-[12.5px]">
                      Apply
                    </button>
                  </form>
                </div>

                {posts.length > 0 ? (
                  <>
                    <ul className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                      {posts.map((p) => (
                        <li key={p.slug} className="min-w-0">
                          <AroundUsCard post={p} />
                        </li>
                      ))}
                    </ul>

                    {hasMore && (
                      <div className="mt-7 flex justify-center">
                        <Link
                          href={href({
                            chip: chip.key === 'all' ? undefined : chip.key,
                            category: group?.slug,
                            sub: subSlug,
                            q, sort: sortParam, take: take + PER_PAGE,
                          })}
                          className="btn-outline rounded-pill"
                        >
                          Load More
                          <Icon name="arrow" className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon="inbox"
                    title="Nothing here yet"
                    action={
                      <Link href="/around-us" className="btn-primary">
                        Show everything
                      </Link>
                    }
                  >
                    No updates in this category yet.
                    {chipCount(chip) === 0 ? ' Be the first to post one.' : ''}
                  </EmptyState>
                )}
              </section>
            </div>

            {/* ─────────────────── the rail ─────────────────── */}
            <aside className="min-w-0">
              <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[116px]">
                {/* share your updates */}
                <section className="rounded-card bg-navy px-5 py-6 text-center">
                  {/* ArchFacing's own trophy artwork, not a line glyph — the
                      reference uses the illustrated mark here. */}
                  <Image
                    src={TROPHY}
                    alt=""
                    width={56}
                    height={56}
                    className="mx-auto h-14 w-14 object-contain"
                  />
                  <h2 className="mt-3.5 font-display text-[17px] font-bold text-white">
                    Share Your Updates
                  </h2>
                  <p className="mx-auto mt-2 max-w-[15rem] text-[12px] leading-[1.6] text-white/60">
                    Keep the community informed about your events, achievements and activities.
                  </p>
                  {/* The dashboard entry point — /dashboard resolves to the
                      reader's own role, which is where their Around Us posts
                      live. There is no role-less /dashboard/around-us/new. */}
                  <Link href="/dashboard" className="btn-primary mt-4 w-full">
                    Post Around Us
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </section>

                {/* trending */}
                {trending.length > 0 && (
                  <section className="card bg-paper p-5">
                    <h2 className="flex items-center gap-2 font-display text-[13px] font-bold text-ink">
                      <Icon name="bolt" className="h-4 w-4 text-brand" />
                      Trending Updates
                    </h2>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {trending.map((t) => (
                        <li key={t.slug}>
                          <TrendingRow post={t} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* upcoming */}
                {events.length > 0 && (
                  <section className="card bg-paper p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-[13px] font-bold text-ink">Upcoming Events</h2>
                      <Link
                        href={href({ chip: 'events' })}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:gap-1.5"
                      >
                        View All
                        <Icon name="arrow" className="h-3 w-3 transition-all" />
                      </Link>
                    </div>
                    <ul className="mt-3.5 flex flex-col gap-3.5">
                      {events.map((e) => (
                        <li key={e.slug}>
                          <EventRow
                            slug={e.slug}
                            title={e.title}
                            when={e.when}
                            place={[e.city, e.state].filter(Boolean).join(', ')}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* join */}
                <section className="rounded-card border border-brand-border bg-brand-soft px-5 py-6 text-center">
                  {/* A drawn group mark rather than the interface `users`
                      glyph: three heads at two sizes, which is what reads as
                      "community" at this size instead of "contacts list". */}
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-paper shadow-card">
                    <svg
                      viewBox="0 0 48 48"
                      aria-hidden
                      className="h-7 w-7 text-brand"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="24" cy="15" r="6.5" />
                      <path d="M12.5 38v-2.5A11.5 11.5 0 0124 24a11.5 11.5 0 0111.5 11.5V38" />
                      <circle cx="8.5" cy="20" r="4.5" />
                      <path d="M2 34v-1.8A8.2 8.2 0 018.5 24" />
                      <circle cx="39.5" cy="20" r="4.5" />
                      <path d="M46 34v-1.8A8.2 8.2 0 0039.5 24" />
                    </svg>
                  </span>
                  <h2 className="mt-3.5 font-display text-[16px] font-bold text-ink">
                    Join the Community
                  </h2>
                  <p className="mx-auto mt-2 max-w-[15rem] text-[12px] leading-[1.6] text-ink-2">
                    Be a part of India&rsquo;s most trusted architecture and design community.
                  </p>
                  <Link href="/register" className="btn-primary mt-4 w-full">
                    Create Account
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </section>
              </div>
            </aside>
          </div>

          {/* ═══════════════════ newsletter ═══════════════════ */}
          <section className="mt-8 rounded-card border border-line bg-paper p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="chip-icon h-11 w-11 shrink-0 bg-brand text-white">
                  <Icon name="mail" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[18px] font-bold text-ink">Stay in the Loop</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    Subscribe to get latest updates, events and insights from the architecture &amp;
                    design world.
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1 md:max-w-sm">
                <NewsletterForm source="around-us" />
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

/** A heading drawn like "Around **Us**": the last word in the brand colour. */
function BrandTail({ text }: { text: string }) {
  const i = text.lastIndexOf(' ')
  if (i < 0) return <span className="text-brand">{text}</span>
  return (
    <>
      {text.slice(0, i)} <span className="text-brand">{text.slice(i + 1)}</span>
    </>
  )
}
