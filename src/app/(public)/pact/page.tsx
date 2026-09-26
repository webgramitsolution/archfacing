import type { Metadata } from 'next'
import { platformStats, statValue } from '@/lib/platform-stats'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Icon, type IconName } from '@/components/ui'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { BUSINESS_RULES, termYears } from '@/config/permissions'
import { PactSearch } from './pact-search'
import { PactPhone } from '@/components/mobile/pages/pact-phone'
import { pactPhoneData } from './phone-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pin Code PACT — Professional Area Connect Territory',
  description:
    'PACT (Professional Area Connect Territory) is ArchFacing’s unique system that connects ' +
    'professionals, leads, projects and opportunities with pin code based territory.',
}

const PROFESSIONAL_ROLES = ['PROFESSIONAL', 'CONSULTANT', 'BMF'] as const

/*
 * The hero band, counted rather than claimed.
 *
 * It used to read 18,726+ PACT Areas / 29,450+ Professionals / 12,843+ Cities
 * & Towns / 5,80,000+ Leads Distributed / 98% Success Rate — all invented,
 * and printed beside genuinely queried figures further down the page, which
 * lent them the same credibility. "Success Rate" is gone outright: it is a
 * performance claim with nothing behind it and no way to substantiate it.
 */

const WHAT_IS_PACT = [
  'Pin code based territory mapping',
  'Lead distribution in your PACT area',
  'Connect with nearby professionals',
  'Increase visibility in your area',
  'Get more projects & inquiries',
]

const HOW_IT_WORKS: { icon: IconName; step: string; title: string; body: string }[] = [
  { icon: 'map', step: '01', title: 'Pin Code Mapping', body: 'Every pin code is mapped as a PACT area.' },
  { icon: 'inbox', step: '02', title: 'Lead Distribution', body: 'Leads are distributed in relevant PACT areas.' },
  { icon: 'users', step: '03', title: 'Professional Connect', body: 'Professionals connect with leads in their area.' },
  { icon: 'trending', step: '04', title: 'Business Growth', body: 'More connections lead to more business.' },
]

const VISIBILITY: { icon: IconName; text: string }[] = [
  { icon: 'target', text: 'Get more leads in your area' },
  { icon: 'user', text: 'Showcase your profile' },
  { icon: 'users', text: 'Connect with nearby clients' },
  { icon: 'trending', text: 'Grow your business' },
]

const EXPLORE_TABS = ['By State', 'By Region', 'Top PACT Areas', 'Recently Added']

/** The focused NCR area (the reference holds Faridabad). */
const FOCUS_PIN = { code: '121001', place: 'Faridabad, Haryana', x: 60, y: 48 }
const NCR_PINS = [
  { code: '110001', place: 'North Delhi', x: 71, y: 18 },
  { code: '201301', place: 'Noida', x: 85, y: 38 },
  { code: '122001', place: 'Gurugram', x: 33, y: 40 },
  { code: '122102', place: 'Manesar', x: 52, y: 72 },
  { code: '121002', place: 'Ballabhgarh', x: 71, y: 66 },
]

function inK(n: number) {
  return n.toLocaleString('en-IN')
}

export default async function PactPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q: rawQ } = await searchParams
  const [activePacts, states, pincodeCount, distinctDistricts, leadCount, stats] = await Promise.all([
    prisma.pact.count({ where: { status: 'ACTIVE' } }),
    prisma.pincode.groupBy({
      by: ['state'],
      _count: true,
      orderBy: { _count: { state: 'desc' } },
      take: 7,
    }),
    prisma.pincode.count(),
    prisma.pincode.findMany({ select: { district: true }, distinct: ['district'] }).then((r) => r.length),
    prisma.leadRecipient.count().catch(() => 0),
    platformStats(),
  ])

  const HERO_STATS: { icon: IconName; value: string; label: string }[] = [
    { icon: 'box', value: statValue(pincodeCount), label: 'PACT Areas' },
    { icon: 'users', value: statValue(stats.members), label: 'Professionals' },
    { icon: 'building', value: statValue(distinctDistricts), label: 'Cities & Towns' },
    { icon: 'inbox', value: statValue(leadCount), label: 'Leads Distributed' },
  ]

  // Cities (districts) per top state — for each state card's second line.
  const districtRows = await prisma.pincode.findMany({
    where: { state: { in: states.map((s) => s.state) } },
    distinct: ['state', 'district'],
    select: { state: true },
  })
  const cityByState = districtRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.state] = (acc[r.state] ?? 0) + 1
    return acc
  }, {})

  /* ── Top PACT areas — the areas NEAR the visitor ──
     Anchored on the signed-in user's own PIN (`User.pincode` — the basis of
     PACT); a signed-out visitor sees the Faridabad NCR anchor. Nearby is
     real: distance over the PIN master's lat/lng, falling back to the same
     postal region (first 3 digits) when coordinates are missing. */
  const session = await auth()
  let anchor = FOCUS_PIN.code
  if (session?.user?.id) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pincode: true },
    })
    if (me?.pincode && /^[1-9]\d{5}$/.test(me.pincode)) anchor = me.pincode
  }

  const anchorRow = await prisma.pincode.findUnique({
    where: { code: anchor },
    select: { code: true, district: true, state: true, lat: true, lng: true },
  })

  let nearbyCodes: string[] = []
  if (anchorRow?.lat != null && anchorRow?.lng != null) {
    const { lat, lng } = anchorRow
    const box = await prisma.pincode.findMany({
      where: {
        lat: { gte: lat - 0.6, lte: lat + 0.6 },
        lng: { gte: lng - 0.6, lte: lng + 0.6 },
      },
      select: { code: true, lat: true, lng: true },
      take: 2000,
    })
    nearbyCodes = box
      .filter((r) => r.lat != null && r.lng != null)
      .sort(
        (a, b) =>
          (a.lat! - lat) ** 2 + (a.lng! - lng) ** 2 -
          ((b.lat! - lat) ** 2 + (b.lng! - lng) ** 2)
      )
      .slice(0, 5)
      .map((r) => r.code)
  }
  if (nearbyCodes.length < 5) {
    // Same postal region — the first 3 digits share a sorting district.
    const fill = await prisma.pincode.findMany({
      where: { code: { startsWith: anchor.slice(0, 3), notIn: nearbyCodes } },
      select: { code: true },
      orderBy: { code: 'asc' },
      take: 5 - nearbyCodes.length,
    })
    nearbyCodes = [...nearbyCodes, ...fill.map((f) => f.code)]
  }
  if (!nearbyCodes.includes(anchor) && anchorRow) nearbyCodes = [anchor, ...nearbyCodes].slice(0, 5)

  const [topMeta, leadsByPin, prosByPin] = await Promise.all([
    prisma.pincode.findMany({
      where: { code: { in: nearbyCodes } },
      select: { code: true, district: true, state: true },
    }),
    prisma.enquiry.groupBy({
      by: ['pincode'],
      where: { pincode: { in: nearbyCodes } },
      _count: { pincode: true },
    }),
    prisma.user.groupBy({
      by: ['pincode'],
      where: {
        role: { in: [...PROFESSIONAL_ROLES] },
        deletedAt: null,
        pincode: { in: nearbyCodes },
      },
      _count: { pincode: true },
    }),
  ])
  const metaByCode = new Map(topMeta.map((m) => [m.code, m]))
  const prosByCode = new Map(prosByPin.map((t) => [t.pincode!, t._count.pincode]))
  const leadsByCode = new Map(leadsByPin.map((l) => [l.pincode, l._count.pincode]))
  const topAreas = nearbyCodes.map((code) => {
    const m = metaByCode.get(code)
    return {
      code,
      place: m ? `${m.district}, ${m.state}` : '',
      professionals: prosByCode.get(code) ?? 0,
      leads: leadsByCode.get(code) ?? 0,
    }
  })
  const anchorPlace = anchorRow ? `${anchorRow.district}` : null

  const phone = await pactPhoneData({
    q: rawQ,
    states,
    cityByState,
    nearbyCodes,
    anchor: anchorRow?.code ?? null,
    stats: [
      ...HERO_STATS,
      { icon: 'shield', value: statValue(activePacts), label: 'Active PACT Seats' },
    ],
    seatsLine: `${inK(activePacts)} active PACT seats · exclusive for ${termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}`,
  })

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Search by pin code, city or PACT area', action: '/pact', param: 'q', variant: 'orange' },
          location: true,
          tone: 'light',
        }}
      />

      <div className="md:hidden">
        <PactPhone {...phone} />
      </div>

      <main className="hidden bg-paper md:block">
        {/* ══════════════════ hero ══════════════════ */}
        <section className="border-b border-line">
          <div className="container-af pt-5">
            <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
              <Link href="/" className="hover:text-brand">Home</Link>
              <span aria-hidden>›</span>
              <span className="font-medium text-ink-2">Pin Code PACT</span>
            </p>
          </div>

          <div className="container-af grid items-start gap-6 py-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)_270px]">
            {/* left — copy + stats */}
            <div className="min-w-0">
              <h1 className="font-display text-[38px] font-bold leading-[1.0] tracking-tight text-ink md:text-[46px]">
                Pin Code PACT
              </h1>
              <p className="mt-1 font-display text-[19px] font-bold tracking-tight text-brand md:text-[22px]">
                Professional Area Connect Territory
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">
                PACT (Professional Area Connect Territory) is ArchFacing’s unique system that
                connects professionals, leads, projects and opportunities with pin code based
                territory.
              </p>

              <dl className="mt-6 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-card border border-line bg-white shadow-card sm:grid-cols-5">
                {HERO_STATS.map((s) => (
                  <div key={s.label} className="flex flex-col items-start gap-1.5 px-3 py-3.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon name={s.icon} className="h-4 w-4" />
                    </span>
                    <span className="tabular font-display text-[15px] font-bold leading-none text-ink">
                      {s.value}
                    </span>
                    <span className="text-[10.5px] leading-tight text-ink-3">{s.label}</span>
                  </div>
                ))}
              </dl>
            </div>

            {/* middle — the territory map */}
            <PactMap />

            {/* right — what is PACT */}
            <aside className="rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[16px] font-bold text-ink">What is PACT?</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                PACT helps businesses and professionals connect with the right opportunities,
                projects and clients in their specific geographical area.
              </p>

              <ul className="mt-4 flex flex-col gap-2.5">
                {WHAT_IS_PACT.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[12px] text-ink-2">
                    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href="#how-it-works"
                className="mt-5 flex items-center justify-center gap-2 rounded-card bg-paper-3 px-4 py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
                How PACT Works?
              </Link>
            </aside>
          </div>
        </section>

        {/* ══════════════════ find your PACT area ══════════════════ */}
        <section className="container-af scroll-mt-24 py-6" id="find-pact">
          <div className="rounded-card bg-navy-deep px-5 py-6 md:px-7">
            <h2 className="mb-5 font-display text-[17px] font-bold text-white">Find Your PACT Area</h2>
            <PactSearch />
          </div>
        </section>

        {/* ══════════════════ explore PACT areas ══════════════════ */}
        <section className="container-af pb-10" id="explore">
          {/* On a tablet the two aside cards sit SIDE BY SIDE under the states
              (md:grid-cols-2, states spanning both); the computer keeps the
              three-column row. */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_264px_252px]">
            {/* left — states */}
            <div className="min-w-0 md:col-span-2 lg:col-span-1">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-[20px] font-bold tracking-tight text-ink">
                    Explore PACT Areas
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    Browse PACT areas by state or view all pin code based territories
                  </p>
                </div>
                <Link href="/designers-associates" className="text-[12px] font-semibold text-brand hover:underline">
                  View All PACT Areas →
                </Link>
              </div>

              {/* tabs */}
              <div className="mt-4 flex flex-wrap gap-2 border-b border-line pb-3">
                {EXPLORE_TABS.map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-card px-3.5 py-1.5 text-[12.5px] font-semibold ${
                      i === 0
                        ? 'bg-brand-soft text-brand ring-1 ring-brand-border'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {states.map((s) => (
                  <li key={s.state}>
                    <Link
                      href={`/designers-associates?state=${encodeURIComponent(s.state)}`}
                      className="group flex items-center gap-3 rounded-card border border-line bg-white p-3.5 shadow-card transition-all hover:border-brand-border hover:shadow-lift"
                    >
                      <StateGlyph name={s.state} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[13.5px] font-bold text-ink transition-colors group-hover:text-brand">
                          {s.state}
                        </span>
                        <span className="tabular mt-0.5 block text-[11px] text-ink-3">
                          {inK(s._count)} PACT Areas
                        </span>
                        <span className="tabular block text-[11px] text-ink-4">
                          {inK(cityByState[s.state] ?? 0)} Cities
                        </span>
                      </span>
                      <Icon name="arrow" className="h-4 w-4 shrink-0 text-brand" />
                    </Link>
                  </li>
                ))}

                <li>
                  <Link
                    href="/designers-associates"
                    className="group flex h-full items-center gap-3 rounded-card border border-dashed border-line bg-paper-2 p-3.5 transition-colors hover:border-brand"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-paper-3 text-ink-3">
                      <Icon name="grid" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[13.5px] font-bold text-ink">More States</span>
                      <span className="block text-[11px] text-ink-3">View all states</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* middle — top PACT areas */}
            <aside className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-display text-[14.5px] font-bold text-ink">Top PACT Areas</h3>
                  {anchorPlace && (
                    <p className="truncate text-[10.5px] text-ink-4">near {anchorPlace}</p>
                  )}
                </div>
                <Link href="/designers-associates" className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
                  View All →
                </Link>
              </div>

              <ol className="flex flex-col gap-3">
                {topAreas.map((a, i) => (
                  <li key={a.code} className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">
                        {a.code}{a.place ? ` - ${a.place}` : ''}
                      </p>
                      <p className="tabular mt-0.5 text-[11px] text-ink-3">
                        {inK(a.professionals)} Professionals · {inK(a.leads)} Leads
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>

            {/* right — increase visibility */}
            <aside className="rounded-card border border-line bg-white p-4 shadow-card">
              <h3 className="font-display text-[14.5px] font-bold text-brand">Increase Your Visibility</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                Get discovered in your PACT area and connect with more clients &amp; projects.
              </p>

              <ul className="mt-3.5 flex flex-col gap-2.5">
                {VISIBILITY.map((v) => (
                  <li key={v.text} className="flex items-center gap-2.5 text-[12px] text-ink-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <Icon name={v.icon} className="h-3.5 w-3.5" />
                    </span>
                    {v.text}
                  </li>
                ))}
              </ul>

              <Link href="/register?type=professional" className="btn-primary mt-4 w-full">
                Activate in Your PACT Area
              </Link>
            </aside>
          </div>
        </section>

        {/* ══════════════════ how it works ══════════════════ */}
        {/* -mb-5 offsets the footer's own mt-10 so only a 20px gap remains. */}
        <section className="container-af -mb-5 pb-0" id="how-it-works">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="rounded-card border border-line bg-white p-6 shadow-card">
              <h2 className="font-display text-[18px] font-bold tracking-tight text-ink">
                How PACT System Works?
              </h2>

              {/* All four steps in ONE row from the tablet up. */}
              <ol className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5 xl:gap-6">
                {HOW_IT_WORKS.map((s, i) => (
                  <li key={s.title} className="relative">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper-2 text-brand xl:h-14 xl:w-14">
                      <Icon name={s.icon} className="h-5 w-5 xl:h-6 xl:w-6" />
                    </span>
                    <span className="eyebrow mt-3 block text-ink-4">{s.step}</span>
                    <h3 className="mt-1 font-display text-[12.5px] font-bold text-ink xl:text-[13.5px]">{s.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-3 xl:text-[11.5px]">{s.body}</p>
                    {i < HOW_IT_WORKS.length - 1 && (
                      <Icon
                        name="arrow"
                        aria-hidden
                        className="absolute -right-3.5 top-3.5 hidden h-4 w-4 text-ink-4 md:block"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* don't see your area */}
            <div className="relative isolate flex flex-col justify-center overflow-hidden rounded-card bg-navy-deep p-6">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16]">
                <MapDots />
              </div>
              <div className="relative">
                <h2 className="font-display text-[18px] font-bold text-white">Don’t see your area?</h2>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/70">
                  Request to add a new PACT area in your location.
                </p>
                <Link
                  href="/legal/contact"
                  className="mt-5 inline-flex items-center gap-2 rounded-card bg-white px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
                >
                  Request New PACT Area
                </Link>
                <p className="mt-5 border-t border-white/10 pt-4 text-[11px] text-white/45">
                  {inK(activePacts)} active PACT seats · exclusive for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

/* A small tinted glyph standing in for each state's crest. The reference uses
   per-state monument artwork; without those assets this is the closest
   consistent placeholder. */
function StateGlyph({ name }: { name: string }) {
  const tints = ['bg-[#FFF1E7] text-[#E67514]', 'bg-[#EAF2FF] text-[#2563EB]', 'bg-[#EAF7EF] text-[#16A34A]', 'bg-[#F3ECFB] text-[#7C3AED]', 'bg-[#FDECEC] text-[#DC2626]']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const tint = tints[h % tints.length]
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tint}`}>
      <Icon name="building" className="h-5 w-5" />
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   Territory map — self-contained, NO map library and NO third-party
   API. The pins are the real Delhi-NCR PIN codes from the reference,
   with 121001 Faridabad held as the focused area.
   ═══════════════════════════════════════════════════════════ */
function PactMap() {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-card border border-line bg-[#EAF0F4] shadow-card">
      <svg aria-hidden viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="300" fill="#EAF0F4" />
        {/* green / water patches for a map feel */}
        <path d="M0 0 H150 V70 Q90 90 0 80 Z" fill="#E4EEDF" opacity="0.7" />
        <path d="M300 210 H400 V300 H260 Q280 250 300 210 Z" fill="#DDEAF2" opacity="0.8" />
        <circle cx="360" cy="40" r="46" fill="#E4EEDF" opacity="0.6" />
        {/* road network */}
        <g stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.9">
          <path d="M-10 96 L170 118 L260 66 L420 104" />
          <path d="M44 -10 L92 150 L64 320" />
          <path d="M300 -10 L250 152 L320 320" />
          <path d="M-10 224 L160 204 L300 252 L420 222" />
          <path d="M120 -10 L206 130 L182 320" />
        </g>
        <g stroke="#D3DCE5" strokeWidth="1.5" fill="none">
          <path d="M-10 96 L170 118 L260 66 L420 104" />
          <path d="M44 -10 L92 150 L64 320" />
          <path d="M300 -10 L250 152 L320 320" />
          <path d="M-10 224 L160 204 L300 252 L420 222" />
          <path d="M120 -10 L206 130 L182 320" />
        </g>
        {/* the focused Faridabad territory under the main pin */}
        <path
          d="M214 118 q34 -30 74 0 q34 30 12 78 q-24 52 -84 42 q-52 -10 -36 -74 q10 -36 34 -46 Z"
          fill="#FCE3CC"
          stroke="#F7972F"
          strokeWidth="2.5"
          opacity="0.85"
        />
      </svg>

      {/* surrounding NCR pins */}
      {NCR_PINS.map((p) => (
        <span
          key={p.code}
          className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <span className="whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[9px] font-bold leading-tight text-ink shadow-sm">
            {p.code}
            <span className="block text-[8px] font-medium text-ink-3">{p.place}</span>
          </span>
          <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-brand shadow ring-1 ring-brand-border">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
        </span>
      ))}

      {/* focused Faridabad pin */}
      <span
        className="absolute z-20 -translate-x-1/2 -translate-y-full"
        style={{ left: `${FOCUS_PIN.x}%`, top: `${FOCUS_PIN.y}%` }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-lift ring-2 ring-white">
          <Icon name="map" className="h-[18px] w-[18px]" />
        </span>
      </span>

      {/* tooltip card to the upper-left of the focused pin */}
      <div
        className="absolute z-30 w-[148px] -translate-x-full -translate-y-full rounded-lg bg-navy-deep px-3 py-2.5 text-white shadow-lift"
        style={{ left: `${FOCUS_PIN.x}%`, top: `${FOCUS_PIN.y - 4}%` }}
      >
        <p className="font-display text-[14px] font-bold leading-tight">{FOCUS_PIN.code}</p>
        <p className="text-[10.5px] text-white/60">{FOCUS_PIN.place}</p>
        <Link href="#find-pact" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-hover hover:underline">
          View PACT Details →
        </Link>
      </div>
    </div>
  )
}

/** Faint dotted network for the dark "Don't see your area?" card. */
function MapDots() {
  return (
    <svg viewBox="0 0 300 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <g stroke="#F97316" strokeWidth="1" opacity="0.5" fill="none">
        <path d="M60 60 L150 40 L230 90 L200 140 L110 120 Z" />
      </g>
      <g fill="#F97316">
        <circle cx="60" cy="60" r="4" />
        <circle cx="150" cy="40" r="4" />
        <circle cx="230" cy="90" r="4" />
        <circle cx="110" cy="120" r="4" />
        <circle cx="200" cy="140" r="4" />
      </g>
    </svg>
  )
}
