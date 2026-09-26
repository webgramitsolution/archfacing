import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { savedIdsAmong } from '@/lib/visitor'

import { auth } from '@/lib/auth'
import { COMPETITION_CATEGORIES } from '@/config/taxonomy'
import {
  listCompetitions,
  countCompetitions,
  totalCompetitions,
  competitionCounts,
  myCompetitionStatus,
  competitionHighlights,
  isStatusKey,
  isFeeKey,
  isSortKey,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type CompetitionFilters,
} from '@/lib/competition'

import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { MobileFilterDrawer } from './filter-bar'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { EmptyState, Icon, type IconName } from '@/components/ui'
import {
  CategoriesCard,
  ChevronDownIcon,
  CompetitionHighlights,
  CompetitionRow,
  HowItWorks,
  MyCompetitionStatus,
  NeedHelp,
  SECTION_TITLE,
  ShowcaseBand,
  WhyParticipate,
} from '@/components/competition'
import { CompetitionPhone } from '@/components/mobile/pages/competition-phone'

/**
 * Every published design competition.
 *
 * The whole page is a server component. The filter bar is a real GET form and
 * the sort control is a second one, so every view of this list is a URL that
 * can be shared, bookmarked and linked to — and there is no client bundle.
 *
 * ★ Nothing on this page stores a competition's status. Open / Closing Soon /
 *   Closed is worked out from the real dates on every request, in SQL for the
 *   filter and in `competitionStatus` for the pill.
 */

export const metadata: Metadata = {
  title: 'Design Competition',
  description:
    'Architecture, interior and landscape design competitions on ArchFacing — ' +
    'cash prizes, expert juries and certificates, open to students and professionals.',
}

/**
 * ★ The design prints "24" in the hero's Total Competitions card.
 *
 * That is a marketing figure for a full platform, not a count of anything, so
 * the hero below renders the REAL number from the database instead. The 24 is
 * no longer kept anywhere — the hero counts the real rows, next to the
 * other marketing constants, so there is one file to edit when real totals
 * replace them.
 */

/**
 * How many wide cards the list shows before "Load More".
 *
 * Kept low on purpose: these are full-width rows, and four competitions are
 * seeded, so the control is actually reachable rather than dead markup.
 */
const PAGE_SIZE = 3

const HERO_BENEFITS: { icon: IconName; label: string }[] = [
  { icon: 'map', label: 'Global Exposure' },
  { icon: 'rupee', label: 'Cash Prizes' },
  { icon: 'file', label: 'Certificates' },
  { icon: 'shield', label: 'Expert Jury' },
  { icon: 'users', label: 'Networking' },
]

type SearchParams = {
  q?: string
  category?: string
  status?: string
  fee?: string
  free?: string
  sort?: string
  take?: string
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const session = await auth()

  const q = (sp.q ?? '').trim()
  const category = COMPETITION_CATEGORIES.some((c) => c.slug === sp.category)
    ? sp.category
    : undefined
  const status = isStatusKey(sp.status) ? sp.status : undefined
  // The "Free Only" checkbox wins over the entry-fee select — a reader who
  // ticks it has said something more specific than the dropdown did.
  const fee = sp.free ? ('free' as const) : isFeeKey(sp.fee) ? sp.fee : undefined
  const sort = isSortKey(sp.sort) ? sp.sort : 'ending-soon'

  const takeRaw = Number(sp.take)
  const take = Number.isFinite(takeRaw)
    ? Math.min(60, Math.max(PAGE_SIZE, Math.floor(takeRaw)))
    : PAGE_SIZE

  const filters: CompetitionFilters = { q: q || undefined, category, status, fee, sort }

  const [competitions, matched, counts, myStatus, highlights, total] = await Promise.all([
    listCompetitions(filters, { take }),
    countCompetitions(filters),
    competitionCounts(),
    // ★ Real numbers or a sign-in prompt — never three invented figures.
    session?.user?.id ? myCompetitionStatus(session.user.id) : Promise.resolve(null),
    competitionHighlights(),
    // The phone hero's real total, whatever the filters say.
    totalCompetitions(),
  ])

  const signedIn = Boolean(session?.user)
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, competitions.map((c) => c.id))
    : new Set<string>()
  const hasMore = matched > competitions.length
  const params = { q, category, status, fee: sp.free ? undefined : fee, free: sp.free, sort }

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search competitions by title, keyword…', action: '/competition', param: 'q', variant: 'filter' },
          tone: 'light',
        }}
      />

      {/* ─── phones: the PWA layout (below md only) ─── */}
      <div className="md:hidden">
        <CompetitionPhone
          competitions={competitions}
          total={total}
          matched={matched}
          highlights={highlights}
          categories={COMPETITION_CATEGORIES}
          counts={counts}
          activeCategory={category}
          myStatus={myStatus}
          signedIn={signedIn}
          savedIds={savedIds}
          sort={sort}
          keep={{ q: q || undefined, category, status, fee: sp.free ? undefined : fee, free: sp.free }}
          loadMoreHref={hasMore ? queryString('/competition', { ...params, take: String(take + PAGE_SIZE) }) : null}
        />
      </div>

      <main className="hidden md:block">
        {/* ══════════════ hero ══════════════ */}
        {/* The building photo is the whole hero's background — no colour tint,
            no gradient over it. */}
        <section className="relative isolate overflow-hidden border-b border-line">
          <Image
            src="https://ik.imagekit.io/archfacing/building.png?updatedAt=1784733487852"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-right"
          />

          <div className="container-af py-10">
            {/* Rendered for search engines and screen readers; the visible
                trail the comp shows is deliberately not drawn — see
                components/breadcrumb.tsx. */}
            <Breadcrumb items={[homeCrumb(), { label: 'Design Competition' }]} />

            <div>
              <div className="min-w-0 max-w-2xl [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                <h1 className="font-display text-[30px] font-bold uppercase leading-[1.1] tracking-tight text-white md:text-[40px]">
                  Design Competition
                </h1>

                <p className="mt-2 font-display text-[15px] font-bold uppercase tracking-[0.14em] text-brand-hover md:text-[17px]">
                  Show. Compete. Get Recognized.
                </p>

                <p className="mt-3.5 max-w-md text-[13.5px] leading-relaxed text-white/85">
                  Participate in architecture &amp; design competitions, showcase your
                  creativity, win exciting prizes and get recognized globally.
                </p>

                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3 [text-shadow:none]">
                  {HERO_BENEFITS.map((b) => (
                    <li
                      key={b.label}
                      className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-white"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/25 text-brand-hover">
                        <Icon name={b.icon} className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">{b.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        <div className="container-af pt-10">
          {/* ══════════════ search and filters ══════════════ */}
          {/* Full-width card on desktop; on tablet/phone it collapses into the
              "Filters" drawer opened from the sort row below. */}
          <div className="mb-8 hidden md:block">
            <FilterForm q={q} category={category} status={status} fee={fee} sort={sort} />
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ══════════════ left column ══════════════ */}
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-[20px] font-bold uppercase tracking-tight text-ink">
                    Active Competitions
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-3">
                    Join the most exciting architecture &amp; design competitions
                  </p>
                </div>

                {/* On tablet/phone the "Filters" button rides in this row, next
                    to the sort control. */}
                <div className="flex shrink-0 items-center gap-2">
                  <MobileFilterDrawer>
                    <FilterForm q={q} category={category} status={status} fee={fee} sort={sort} />
                  </MobileFilterDrawer>

                  {/* A second GET form. A bare <select> cannot navigate without
                      client JS, so it is paired with a real submit button. */}
                  <form method="get" action="/competition" className="flex shrink-0 items-center gap-2">
                    <input type="hidden" name="q" value={q} />
                    {category && <input type="hidden" name="category" value={category} />}
                    {status && <input type="hidden" name="status" value={status} />}
                    {fee && <input type="hidden" name="fee" value={fee} />}

                    <label htmlFor="comp-sort" className="sr-only">
                      Sort competitions
                    </label>
                    <select
                      id="comp-sort"
                      name="sort"
                      defaultValue={sort}
                      className="input w-auto py-2 text-[13px]"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-outline px-3.5 py-2 text-[13px]">
                      Sort
                    </button>
                  </form>
                </div>
              </div>

              {competitions.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No competitions match that search"
                  action={
                    <Link href="/competition" className="btn-primary">
                      Clear filters
                    </Link>
                  }
                >
                  Try a different keyword, or widen the category, status and entry-fee
                  filters.
                </EmptyState>
              ) : (
                <>
                  <div className="flex min-w-0 flex-col gap-5">
                    {competitions.map((c) => (
                      <CompetitionRow key={c.id} competition={c} signedIn={signedIn} saved={savedIds.has(c.id)} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-6 flex justify-center">
                      <Link
                        href={queryString('/competition', {
                          ...params,
                          take: String(take + PAGE_SIZE),
                        })}
                        className="btn-outline"
                      >
                        Load More Competitions
                        <ChevronDownIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  <p className="mt-4 text-center text-[12.5px] text-ink-4">
                    Showing {competitions.length} of {matched}
                    {matched === 1 ? ' competition' : ' competitions'}
                  </p>
                </>
              )}
            </div>

            {/* ══════════════ right column ══════════════ */}
            {/* The sidebar rides alongside the list from `md` up, exactly like
                desktop; on a phone it stacks below. */}
            <aside className="flex min-w-0 flex-col gap-5">
              <WhyParticipate />
              <MyCompetitionStatus status={myStatus} />
              <CategoriesCard
                categories={COMPETITION_CATEGORIES}
                counts={counts}
                activeSlug={category}
              />
              <NeedHelp />
            </aside>
          </div>

          {/* ══════════════ how it works + highlights ══════════════ */}
          {/* Side by side on desktop; on a tablet each takes the full width so
              neither is squeezed. */}
          <div className="mt-12 grid items-start gap-6 md:grid-cols-[1.3fr_1fr]">
            <HowItWorks />
            <CompetitionHighlights figures={highlights} />
          </div>

          {/* ══════════════ closing band ══════════════ */}
          {/* -20px against the footer's global 40px top margin → a 20px gap. */}
          <div className="mt-10 -mb-5">
            <ShowcaseBand />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/** The search + filter form. Rendered inline on desktop and inside the mobile
 *  drawer, so it carries no element ids — the labels ride on `aria-label`. */
function FilterForm({
  q,
  category,
  status,
  fee,
  sort,
}: {
  q: string
  category?: string
  status?: string
  fee?: string
  sort: string
}) {
  return (
    <form
      method="get"
      action="/competition"
      className="card p-4 sm:p-5"
      role="search"
      aria-label="Search competitions"
    >
      {/* One row: search + the three filters + the Search button. */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="relative min-w-0">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Search competitions"
            placeholder="Search competitions by title, keyword..."
            className="input pl-9"
          />
        </div>

        <Select name="category" label="Category" defaultValue={category ?? ''} placeholder="All Categories">
          {COMPETITION_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select name="status" label="Status" defaultValue={status ?? ''} placeholder="All Status">
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select name="fee" label="Entry fee" defaultValue={fee ?? ''} placeholder="Any Entry Fee">
          <option value="free">Free Entry</option>
          <option value="paid">Paid Entry</option>
        </Select>

        {/* The sort choice is carried across a new search so changing the
            keyword does not silently throw the reader's ordering away. */}
        <input type="hidden" name="sort" value={sort} />

        <button type="submit" className="btn-primary shrink-0 md:h-full">
          <Icon name="search" className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  )
}

function Select({
  name,
  label,
  placeholder,
  defaultValue,
  children,
}: {
  name: string
  label: string
  placeholder: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <select name={name} aria-label={label} defaultValue={defaultValue} className="input">
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  )
}

/** `/competition?category=…&take=6` — empty values are left out entirely. */
function queryString(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}
