import type { Metadata } from 'next'
import { platformStats, statValue } from '@/lib/platform-stats'
import { projectCategoryHero } from '@/lib/category-hero'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { EmptyState } from '@/components/ui'
import {
  CATEGORY_STRIP, CATEGORY_ICON_IMAGES, FilterSidebar, Glyph, Pagination,
  ProjectCard, ProjectListRow, projectsHref,
  type FilterValues, type ProjectParams,
} from '@/components/projects'
import {
  listProjects, projectCounts, projectFacets, PROJECT_TYPES,
  type ProjectSort,
} from '@/lib/projects'
import { PROJECT_PHOTOS, unsplash } from '@/config/content-media'
import { PROJECT_CATEGORIES } from '@/config/taxonomy'
import { ProjectsPhone } from '@/components/mobile/pages/projects-phone'
import { auth } from '@/lib/auth'
import { savedIdsAmong } from '@/lib/visitor'

/**
 * §5.2.2 — Projects.
 *
 * Entirely a Server Component, with no client JavaScript at all:
 *
 *   · The filter sidebar is a real GET <form action="/projects">. Submitting
 *     it navigates to /projects?… and this component re-renders against the
 *     new search params. Every control is given a `defaultValue` /
 *     `defaultChecked` from the submitted params, so the form always comes
 *     back showing what was asked for.
 *   · The sort <select> sits in the results bar, outside the sidebar, and is
 *     joined to the same form through the HTML `form=` attribute — so one
 *     submission carries the filters and the sort together.
 *   · The category strip, the grid/list toggle and the pagination are ordinary
 *     links that rewrite the search params.
 */

export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Explore architecture and design projects from professionals across India — ' +
    'residential, interior, commercial, landscape, institutional and industrial work.',
}

/** Cards per page — 4 columns × 3 rows, as in the design. */
const PER_PAGE = 12

/** The id that ties the sort <select> in the results bar to the sidebar form. */
const FORM_ID = 'project-filters'

const SORTS: { value: ProjectSort; label: string }[] = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'views', label: 'Most Viewed' },
  { value: 'likes', label: 'Most Liked' },
]

type Search = {
  q?: string
  pactArea?: string
  pin?: string
  category?: string
  sub?: string
  city?: string
  state?: string
  ptype?: string
  areaMin?: string
  areaMax?: string
  budgetMin?: string
  budgetMax?: string
  year?: string
  award?: string
  verified?: string
  featured?: string
  sort?: string
  view?: string
  page?: string
}

const text = (v: string | undefined) => (v ?? '').trim()

/** A positive number, or undefined — so `?areaMin=abc` simply does nothing. */
function positive(v: string | undefined): number | undefined {
  const n = Number(text(v))
  return Number.isFinite(n) && n >= 0 && text(v) !== '' ? n : undefined
}

const flag = (v: string | undefined) => v === '1' || v === 'on' || v === 'true'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams

  // ─── read the search params, dropping anything that is not real ───
  const q = text(sp.q) || undefined
  const category = PROJECT_CATEGORIES.some((c) => c.slug === sp.category) ? sp.category : undefined
  const sub = text(sp.sub) || undefined
  const pactArea = text(sp.pactArea) || undefined
  const pin = /^\d{6}$/.test(text(sp.pin)) ? text(sp.pin) : undefined
  // The PACT-area select and the City select both narrow by city; an explicit
  // city wins, because it is the more specific of the two.
  const city = text(sp.city) || pactArea || undefined
  const state = text(sp.state) || undefined
  const projectType = PROJECT_TYPES.some((t) => t.value === sp.ptype) ? sp.ptype : undefined
  const year = positive(sp.year)
  const areaMin = positive(sp.areaMin)
  const areaMax = positive(sp.areaMax)
  const budgetMin = positive(sp.budgetMin)
  const budgetMax = positive(sp.budgetMax)
  const award = flag(sp.award)
  const verified = flag(sp.verified)
  const featured = flag(sp.featured)
  const sort: ProjectSort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as ProjectSort) : 'latest'
  const view: 'grid' | 'list' = sp.view === 'list' ? 'list' : 'grid'
  const page = Math.max(1, positive(sp.page) ?? 1)

  const [result, counts, facets, session] = await Promise.all([
    listProjects({
      q, category, sub, city, state, pincode: pin, projectType, year,
      areaMin, areaMax, budgetMin, budgetMax,
      award, verified, featured,
      sort, page, perPage: PER_PAGE,
    }),
    projectCounts(),
    projectFacets(),
    auth(),
  ])
  const [stats, catHero] = await Promise.all([
    platformStats(),
    // A mega-menu category page: same hero, the category's own copy and counts.
    projectCategoryHero(category, sub),
  ])

  const { rows, total, pages } = result
  const savedIds = session?.user?.id
    ? await savedIdsAmong(session.user.id, rows.map((r) => r.id))
    : new Set<string>()

  /*
   * The hero stat band, counted rather than claimed. "Countries" is gone —
   * ArchFacing indexes Indian PIN codes and has no country column to count,
   * so it is replaced by the states the published work actually spans.
   */
  const heroStats = catHero
    ? [
        { icon: 'building' as const, value: statValue(catHero.stats[0].value), label: catHero.stats[0].label },
        { icon: 'users' as const, value: statValue(catHero.stats[1].value), label: catHero.stats[1].label },
        { icon: 'pin' as const, value: statValue(catHero.stats[2].value), label: catHero.stats[2].label },
        { icon: 'globe' as const, value: statValue(catHero.stats[3].value), label: catHero.stats[3].label },
      ]
    : [
        { icon: 'building' as const, value: statValue(counts.all), label: 'Projects' },
        { icon: 'users' as const, value: statValue(stats.members), label: 'Professionals' },
        { icon: 'pin' as const, value: statValue(facets.cities.length), label: 'Cities Covered' },
        { icon: 'globe' as const, value: statValue(facets.states.length), label: 'States' },
      ]

  // Everything a link needs to preserve. `page` is added by whoever needs it.
  const carried: ProjectParams = {
    q, pactArea, pin, category, sub, city: text(sp.city) || undefined, state,
    ptype: projectType, year, areaMin, areaMax, budgetMin, budgetMax,
    award: award ? 1 : undefined,
    verified: verified ? 1 : undefined,
    featured: featured ? 1 : undefined,
    sort: sort === 'latest' ? undefined : sort,
    view: view === 'grid' ? undefined : view,
  }

  const values: FilterValues = {
    q: q ?? '', pactArea: pactArea ?? '', pin: pin ?? '',
    category: category ?? '', sub: sub ?? '',
    city: text(sp.city), state: state ?? '',
    projectType: projectType ?? '',
    areaMin: areaMin?.toString() ?? '', areaMax: areaMax?.toString() ?? '',
    budgetMin: budgetMin?.toString() ?? '', budgetMax: budgetMax?.toString() ?? '',
    year: year?.toString() ?? '',
    award, verified, featured,
    view: view === 'grid' ? '' : view,
    sort,
  }

  const first = total === 0 ? 0 : (result.page - 1) * PER_PAGE + 1
  const last = Math.min(result.page * PER_PAGE, total)

  const toggle = 'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors'

  const stripItem =
    'group flex w-[116px] flex-col items-center gap-1.5 px-2 py-1 text-center transition-colors'

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search projects, products, professionals…', action: '/projects', param: 'q', variant: 'filter' },
          tone: 'dark',
        }}
      />

      <div className="hidden md:block">
        <Breadcrumb items={[homeCrumb(), { label: 'Projects' }]} />
      </div>

      {/* ═══ phones only ═══ */}
      <div className="md:hidden">
        <ProjectsPhone
          hero={catHero}
          rows={rows}
          total={total}
          page={result.page}
          pages={pages}
          first={first}
          last={last}
          counts={counts}
          cities={facets.cities}
          states={facets.states}
          professionals={stats.members}
          carried={carried}
          savedIds={[...savedIds]}
          sorts={SORTS}
          values={{
            q: q ?? '', pactArea: pactArea ?? '', category: category ?? '', state: state ?? '',
            sort, view,
            hidden: Object.fromEntries(
              Object.entries({
                sub, pin, city: text(sp.city) || undefined, ptype: projectType, year, areaMin, areaMax,
                budgetMin, budgetMax, award: award ? 1 : undefined, verified: verified ? 1 : undefined,
                featured: featured ? 1 : undefined,
              })
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)])
            ),
          }}
        />
      </div>

      <main className="hidden bg-paper md:block">
        {/* ═══════════════════ hero ═══════════════════ */}
        <section className="relative overflow-hidden bg-navy">
          <span aria-hidden className="absolute inset-0">
            <Image
              src="https://ik.imagekit.io/archfacing/project%20banner%201.png?updatedAt=1784790445475"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/*
              A LIGHT wash — just enough to lift the muted subtitle and the stat
              labels off the photograph, never a dark block. The stops are in
              PIXELS so it tracks the copy (a fixed width) rather than the
              viewport, and it is fully clear by the time the copy ends. On a
              phone the copy runs across the whole picture, so there it takes a
              flat wash instead.
            */}
            <span className="absolute inset-0 bg-navy/[0.86] md:hidden" />
            <span
              className="absolute inset-0 hidden md:block lg:hidden"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(17,24,39,0.68) 0%, rgba(17,24,39,0.5) 330px, rgba(17,24,39,0.2) 480px, transparent 600px)',
              }}
            />
            <span
              className="absolute inset-0 hidden lg:block"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(17,24,39,0.68) 0%, rgba(17,24,39,0.5) 420px, rgba(17,24,39,0.22) 580px, transparent 720px)',
              }}
            />
          </span>

          <div className="container-af relative py-11 lg:py-14">
            {/* No visible trail — the page opens straight on the headline. The
                machine-readable <Breadcrumb> (and its BreadcrumbList JSON-LD)
                still sits above the hero for search engines. */}
            {catHero?.parent && (
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-brand">
                Projects · {catHero.parent}
              </p>
            )}
            <h1 className="font-display text-[34px] font-bold leading-[1.04] tracking-tight text-white sm:text-[42px] lg:text-[48px]">
              {catHero?.title ?? 'Projects'}
            </h1>

            {/* Two lines of roughly equal length, as the design sets it. */}
            <p className="mt-3 max-w-[42ch] text-[14.5px] font-medium leading-relaxed text-white/80 [text-wrap:balance]">
              {catHero?.description ?? 'Explore architecture and design projects from professionals across India.'}
            </p>

            {/*
              Live database counts — see
                 `heroStats` above — counted from the same queries as the
                 results bar, so the band can never contradict the list.

              One row divided by hairlines, as the design draws it; the icons sit
              bare in brand orange rather than in a chip.
            */}
            <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 sm:flex sm:items-center sm:gap-0">
              {heroStats.map((s) => (
                <li
                  key={s.label}
                  /* Tighter on a tablet so the row still ends inside the wash
                     and the banner on the right stays clear. */
                  className="flex min-w-0 items-center gap-2.5 sm:border-l sm:border-white/15 sm:px-3 sm:first:border-l-0 sm:first:pl-0 lg:px-5"
                >
                  <Glyph name={s.icon} className="h-[22px] w-[22px] shrink-0 text-brand lg:h-[26px] lg:w-[26px]" />
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

        <div className="container-af pb-10 pt-5">
          {/* ═══════════════════ category strip ═══════════════════ */}
          <nav aria-label="Project categories" className="card px-2 py-3">
            {/* One row divided by hairlines, as the design draws it — the icons
                sit bare rather than in a tinted box, the active item carries an
                orange underline, and the row scrolls inside itself on a phone
                instead of pushing the page sideways. */}
            <ul className="no-scrollbar flex overflow-x-auto">
              <li className="shrink-0">
                <Link
                  href={projectsHref({ view: carried.view })}
                  aria-current={!category ? 'true' : undefined}
                  className={stripItem}
                >
                  <span className="flex h-8 items-center justify-center text-brand">
                    <Glyph name="grid" className="h-7 w-7" />
                  </span>
                  <span
                    className={[
                      'text-[11.5px] font-semibold leading-tight',
                      !category ? 'text-brand' : 'text-ink-2 group-hover:text-brand',
                    ].join(' ')}
                  >
                    All Projects
                  </span>
                  <span
                    className={[
                      'tabular text-[11px]',
                      !category ? 'font-semibold text-brand' : 'text-ink-3',
                    ].join(' ')}
                  >
                    {counts.all}
                  </span>
                  <span
                    aria-hidden
                    className={[
                      'mt-1 h-[2px] w-9 rounded-pill',
                      !category ? 'bg-brand' : 'bg-transparent',
                    ].join(' ')}
                  />
                </Link>
              </li>

              {CATEGORY_STRIP.map((c) => {
                const on = Boolean(c.slug) && c.slug === category
                const art = CATEGORY_ICON_IMAGES[c.label]

                return (
                  <li key={c.label} className="shrink-0 border-l border-line-soft">
                    <Link
                      href={projectsHref({ category: c.slug, view: carried.view })}
                      aria-current={on ? 'true' : undefined}
                      className={stripItem}
                    >
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
                          <Glyph name={c.icon} className="h-7 w-7 text-ink-2" />
                        )}
                      </span>
                      <span
                        className={[
                          'text-[11.5px] font-semibold leading-tight',
                          on ? 'text-brand' : 'text-ink-2 group-hover:text-brand',
                        ].join(' ')}
                      >
                        {c.label}
                      </span>
                      {/* Live counts, straight from the database. The design's
                          showcase figures are kept in MARKETING.categoryShowcase. */}
                      <span
                        className={[
                          'tabular text-[11px]',
                          on ? 'font-semibold text-brand' : 'text-ink-3',
                        ].join(' ')}
                      >
                        {c.slug ? (counts[c.slug] ?? 0) : counts.all}
                      </span>
                      <span
                        aria-hidden
                        className={['mt-1 h-[2px] w-9 rounded-pill', on ? 'bg-brand' : 'bg-transparent'].join(' ')}
                      />
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
                  project{total === 1 ? '' : 's'}
                </p>

                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  {/* Attached to the sidebar form by id, so changing the sort
                      and pressing Go re-submits the filters with it. */}
                  <label htmlFor="project-sort" className="text-[12.5px] text-ink-3">
                    Sort by:
                  </label>
                  <select
                    id="project-sort"
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
                      href={projectsHref({ ...carried, view: undefined, page: undefined })}
                      aria-label="Grid view"
                      aria-current={view === 'grid' ? 'true' : undefined}
                      className={[toggle, view === 'grid' ? 'border-brand bg-brand text-white' : 'border-line bg-paper-2 text-ink-3 hover:border-brand hover:text-brand'].join(' ')}
                    >
                      <Glyph name="grid" className="h-4 w-4" />
                    </Link>
                    <Link
                      href={projectsHref({ ...carried, view: 'list', page: undefined })}
                      aria-label="List view"
                      aria-current={view === 'list' ? 'true' : undefined}
                      className={[toggle, view === 'list' ? 'border-brand bg-brand text-white' : 'border-line bg-paper-2 text-ink-3 hover:border-brand hover:text-brand'].join(' ')}
                    >
                      <Glyph name="list" className="h-4 w-4" />
                    </Link>
                  </span>
                </div>
              </div>

              {/* ─── the results ─── */}
              {rows.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="No projects found"
                  action={
                    <Link href="/projects" className="btn-outline">
                      Reset Filters
                    </Link>
                  }
                >
                  Nothing matches those filters yet. Try widening the area or budget
                  range, or clear the filters and browse everything.
                </EmptyState>
              ) : view === 'list' ? (
                <div className="flex min-w-0 flex-col gap-4">
                  {rows.map((p) => (
                    <ProjectListRow key={p.slug} post={p} />
                  ))}
                </div>
              ) : (
                <div className="grid min-w-0 gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {rows.map((p) => (
                    <ProjectCard
                      key={p.slug}
                      post={p}
                      sizes="(min-width:1024px) 300px, (min-width:640px) 45vw, 100vw"
                    />
                  ))}
                </div>
              )}

              <Pagination page={result.page} pages={pages} params={carried} />
            </section>
          </div>

          {/* ═══════════════════ PACT call to action ═══════════════════ */}
          <section className="mt-10 rounded-card border border-brand-border bg-brand-soft px-6 py-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-5">
              <div className="min-w-0 max-w-2xl">
                <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">
                  Not finding projects in your area?
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                  Request to add a new PACT area and connect with more opportunities.
                </p>
              </div>
              <Link href="/pact" className="btn-primary shrink-0">
                Request New PACT Area
                <Glyph name="right" className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
