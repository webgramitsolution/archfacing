import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { DirectorySearch } from './directory-search'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import {
  listAssociates, associateFacets, disciplineOf, tierLabel,
} from '@/lib/design-associates'
import { AssociateCard, TrustStrip } from '@/components/design-associate-parts'
import { PactLocator } from './pact-locator'
import { daPhoneData, type DaRated } from './phone-data'
import { DesignersAssociatesPhone } from '@/components/mobile/pages/designers-associates-phone'

/**
 * Designers Associates — the public directory.
 *
 * Every associate on this page is a real registration. The eligibility rule is
 * `associateWhere()` in `lib/design-associates.ts` and it is the PDF's, not a
 * looser one invented for the sake of a fuller grid: a DESIGNA or DESIGNI
 * professional (§3.1.7.1 — "belongs to DESIGNA AND DESIGNI only"), holding an
 * ACTIVE PACT, whose DA registration has been approved.
 *
 * That is why this list is much shorter than the professional directory, and
 * why a BMF, a Corporate or a Consultant never appears on it however much
 * content they have published.
 */

export const metadata: Metadata = {
  title: 'Designers Associates — DESIGNA & DESIGNI Design Associates',
  description:
    'ArchFacing Design Associates: verified DESIGNA and DESIGNI professionals holding a PACT territory, with their projects, products and artistry.',
}

export const dynamic = 'force-dynamic'

const PER_PAGE = 12

/** The hero photograph — ArchFacing's own artwork. */
const HERO =
  'https://ik.imagekit.io/archfacing/banner%20DA.jpg?updatedAt=1784573830854'

export default async function DesignersAssociatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const filters = {
    q: sp.q?.trim() || undefined,
    designaType: sp.type === 'DESIGNA' || sp.type === 'DESIGNI' ? sp.type : undefined,
    tier: sp.tier || undefined,
    state: sp.state || undefined,
    pincode: /^\d{6}$/.test(sp.pin ?? '') ? sp.pin : undefined,
    take: PER_PAGE,
    skip: (page - 1) * PER_PAGE,
  }

  const [{ rows, total }, facets] = await Promise.all([
    listAssociates(filters),
    associateFacets(),
  ])

  /*
   * One cover per associate — the most recent thing they published.
   *
   * Read here rather than inside the card so the grid costs one query instead
   * of one per card, and so the card component stays a pure renderer.
   */
  const covers = new Map<string, string>()
  if (rows.length) {
    const shots = await prisma.post.findMany({
      where: {
        authorId: { in: rows.map((r) => r.id) },
        status: 'PUBLISHED',
        deletedAt: null,
        media: { some: {} },
      },
      orderBy: { publishedAt: 'desc' },
      select: { authorId: true, media: { select: { url: true }, take: 1 } },
    })
    for (const s of shots) {
      if (!covers.has(s.authorId) && s.media[0]) covers.set(s.authorId, s.media[0].url)
    }
  }

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))

  /* ── phone layout (below md) ── */
  const phoneData = await daPhoneData(facets)
  const rated = new Map(phoneData.all.map((a) => [a.id, a]))
  const phoneFound: DaRated[] = rows.map(
    (r) => rated.get(r.id) ?? { ...r, cover: covers.get(r.id) ?? null, rating: null, views: 0 }
  )
  const phoneKeep: Record<string, string> = {}
  if (filters.q) phoneKeep.q = filters.q
  if (filters.pincode) phoneKeep.pin = filters.pincode
  const phoneFilters = [
    {
      name: 'type',
      label: 'Discipline',
      value: filters.designaType ?? '',
      options: facets.designaTypes.map(([t, n]) => ({ value: t, label: `${disciplineOf(t as 'DESIGNA')} (${n})` })),
    },
    {
      name: 'tier',
      label: 'Category',
      value: filters.tier ?? '',
      options: facets.tiers.map(([t, n]) => ({ value: t, label: `${tierLabel(t)} (${n})` })),
    },
    {
      name: 'state',
      label: 'Location',
      value: filters.state ?? '',
      options: facets.states.map(([st, n]) => ({ value: st, label: `${st} (${n})` })),
    },
  ]
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v)
    return `/designers-associates${p.size ? `?${p}` : ''}`
  }

  /** The strip under the hero — the two disciplines and the four tiers (§4.2.1). */
  const strip: { label: string; sub: string; icon: IconName; href: string; on: boolean }[] = [
    {
      label: 'All Associates',
      sub: String(facets.total),
      icon: 'grid',
      href: qs({ type: undefined, tier: undefined, page: undefined }),
      on: !filters.designaType && !filters.tier,
    },
    ...facets.designaTypes.map(([t, n]) => ({
      label: t,
      sub: `${disciplineOf(t as 'DESIGNA')} · ${n}`,
      icon: (t === 'DESIGNA' ? 'building' : 'home') as IconName,
      href: qs({ type: t, tier: undefined, page: undefined }),
      on: filters.designaType === t,
    })),
    ...facets.tiers.map(([t, n]) => ({
      label: tierLabel(t),
      sub: String(n),
      icon: 'award' as IconName,
      href: qs({ tier: t, type: undefined, page: undefined }),
      on: filters.tier === t,
    })),
  ]

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search by name, skill or company', action: '/designers-associates', param: 'q', variant: 'camera' },
          location: true,
          tone: 'light',
        }}
      />

      <div className="md:hidden">
        <DesignersAssociatesPhone
          data={phoneData}
          heroImage={HERO}
          found={phoneFound}
          total={total}
          filterGroups={phoneFilters}
          keep={phoneKeep}
        />
      </div>

      <main className="hidden bg-paper md:block">
        <Breadcrumb items={[homeCrumb(), { label: 'Designers Associates' }]} />

        {/* ═══════════ HERO ═══════════ */}
        <section className="relative isolate overflow-hidden bg-navy">
          <Image src={HERO} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />

          {/*
            The width cap goes on the INNER block, not on the container.

            `container-af` is `mx-auto`, so narrowing it to 62% centred that
            62% and pushed the heading 173px in from the left edge — the copy
            floated in the middle of the band instead of starting where every
            other page's heading starts. The container keeps its full width
            and its own 15px padding; the cap sits inside it, so the text
            begins flush left and only its right edge is held back.
          */}
          <div className="container-af py-11">
            <div className="min-w-0 md:max-w-[62%]">
            <h1 className="font-display text-[26px] font-bold leading-[1.1] tracking-tight text-white md:text-[32px]">
              Designers Associates
            </h1>
            <p className="mt-3 max-w-lg text-balance text-[14px] leading-relaxed text-white/75">
              DESIGNA and DESIGNI professionals who hold an ArchFacing PACT territory
              and work with us on client projects.
            </p>

            {/* The search shows on a computer only; on a tablet and phone the
                PACT-area filter below the hero does the same job without
                crowding the band. */}
            <div className="mt-6 hidden max-w-xl lg:block">
              <DirectorySearch />
            </div>

            {/* Counted from the directory itself — never a decorative figure. */}
            {/* A thin divider between each figure — divide-x on a flex row.
                Two per row on a phone, all four across from the tablet up. */}
            <ul className="mt-6 grid max-w-md grid-cols-2 gap-x-4 gap-y-3.5 sm:flex sm:gap-0 sm:divide-x sm:divide-white/25">
              {[
                { n: facets.total, label: 'Design Associates' },
                { n: facets.designaTypes.find(([t]) => t === 'DESIGNA')?.[1] ?? 0, label: 'DESIGNA' },
                { n: facets.designaTypes.find(([t]) => t === 'DESIGNI')?.[1] ?? 0, label: 'DESIGNI' },
                { n: facets.states.length, label: 'States Covered' },
              ].map((s) => (
                <li key={s.label} className="min-w-0 sm:flex-1 sm:px-4 sm:first:pl-0">
                  <span className="tabular block font-display text-[22px] font-bold leading-none text-white">
                    {s.n}
                  </span>
                  <span className="mt-1 block text-[11px] leading-tight text-white/65">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </section>

        {/* ═══════════ DISCIPLINE / TIER STRIP ═══════════ */}
        <section className="border-b border-line bg-paper">
          <div className="container-af scroll-slim-light flex gap-2 overflow-x-auto py-4">
            {strip.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className={cn(
                  'flex min-w-[124px] shrink-0 flex-col items-center gap-1.5 rounded-card border px-4 py-3 text-center transition-colors',
                  s.on
                    ? 'border-brand bg-brand-soft'
                    : 'border-line bg-paper hover:border-brand-border'
                )}
              >
                <Icon name={s.icon} className={cn('h-5 w-5', s.on ? 'text-brand' : 'text-ink-3')} />
                <span
                  className={cn(
                    'text-[12.5px] font-bold',
                    s.on ? 'text-brand' : 'text-ink'
                  )}
                >
                  {s.label}
                </span>
                <span className="tabular text-[10.5px] text-ink-3">{s.sub}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════ FILTERS + GRID ═══════════ */}
        <div className="container-af grid gap-5 py-6 md:grid-cols-[236px_1fr]">
          {/* ─── the rail ─── */}
          <aside className="min-w-0">
            <div className="card p-4 lg:sticky lg:top-24">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <h2 className="font-display text-[14px] font-bold text-ink">Filters</h2>
                <Link
                  href="/designers-associates"
                  className="text-[11.5px] font-semibold text-brand hover:underline"
                >
                  Clear All
                </Link>
              </div>

              {/*
                §3.1.7.2 — an associate is registered for a particular PACT, so
                "who covers my PIN code" is the directory's primary question.
              */}
              <p className="mb-2 text-[12px] font-semibold text-ink">PACT Area</p>
              <PactLocator />

              <FilterGroup
                title="Discipline"
                options={facets.designaTypes.map(([t, n]) => ({
                  label: `${t} — ${disciplineOf(t as 'DESIGNA')}`,
                  count: n,
                  href: qs({ type: filters.designaType === t ? undefined : t, page: undefined }),
                  on: filters.designaType === t,
                }))}
              />

              <FilterGroup
                title="Category"
                options={facets.tiers.map(([t, n]) => ({
                  label: tierLabel(t),
                  count: n,
                  href: qs({ tier: filters.tier === t ? undefined : t, page: undefined }),
                  on: filters.tier === t,
                }))}
              />

              <FilterGroup
                title="Location"
                options={facets.states.slice(0, 8).map(([s, n]) => ({
                  label: s,
                  count: n,
                  href: qs({ state: filters.state === s ? undefined : s, page: undefined }),
                  on: filters.state === s,
                }))}
              />
            </div>
          </aside>

          {/* ─── the results ─── */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="tabular text-[13px] text-ink-2">
                {total === 0
                  ? 'No Design Associates match'
                  : `Showing ${filters.skip! + 1} – ${Math.min(filters.skip! + rows.length, total)} of ${total} Design Associates`}
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="card px-6 py-14 text-center">
                <Icon name="users" className="mx-auto h-9 w-9 text-ink-4" />
                <p className="mt-3 font-display text-[16px] font-bold text-ink">
                  No Design Associates here yet
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-balance text-[13px] leading-relaxed text-ink-3">
                  A Design Associate is a DESIGNA or DESIGNI professional who holds a
                  PACT territory and has registered with ArchFacing. Try a different
                  PIN code or discipline.
                </p>
                <Link href="/designers-associates" className="btn-primary mt-5 px-5">
                  Show all associates
                </Link>
              </div>
            ) : (
              <ul className="grid gap-3.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {rows.map((a) => (
                  <AssociateCard key={a.id} a={a} cover={covers.get(a.id) ?? null} />
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={qs({ page: n === 1 ? undefined : String(n) })}
                    aria-current={n === page ? 'page' : undefined}
                    className={cn(
                      'tabular flex h-8 min-w-8 items-center justify-center rounded-card border px-2.5 text-[12.5px] font-semibold transition-colors',
                      n === page
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-paper text-ink-2 hover:border-brand hover:text-brand'
                    )}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* ═══════════ PACT CALL-OUT ═══════════ */}
        <section className="container-af pb-8">
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-brand-border bg-brand-soft/50 px-5 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-brand shadow-card">
              <Icon name="map" className="h-5 w-5" />
            </span>
            <span className="min-w-[16rem] flex-1">
              <span className="block font-display text-[15px] font-bold text-ink">
                No associate in your PIN code yet?
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">
                A PACT territory is held by one associate at a time. Buy the PACT for
                your area and register as a Design Associate.
              </span>
            </span>
            <Link href="/pact" className="btn-primary shrink-0 px-5">
              Explore PACT
            </Link>
          </div>
        </section>

        <TrustStrip />
      </main>

      <SiteFooter />
    </>
  )
}

/** One collapsible-looking group in the filter rail. */
function FilterGroup({
  title,
  options,
}: {
  title: string
  options: { label: string; count: number; href: string; on: boolean }[]
}) {
  if (options.length === 0) return null

  return (
    <div className="mt-4 border-t border-line-soft pt-3.5">
      <p className="mb-2 text-[12px] font-semibold text-ink">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {options.map((o) => (
          <li key={o.label}>
            <Link
              href={o.href}
              className={cn(
                'flex items-center justify-between gap-2 rounded-[5px] px-2 py-1.5 text-[12px] transition-colors',
                o.on ? 'bg-brand-soft font-semibold text-brand' : 'text-ink-2 hover:bg-paper-2'
              )}
            >
              <span className="min-w-0 truncate">{o.label}</span>
              <span className="tabular shrink-0 text-[11px] text-ink-4">{o.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
