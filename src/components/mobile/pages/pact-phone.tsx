import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { PactFinderPhone, ExploreTabsPhone, type ExploreRow } from './pact-phone-client'

/**
 * The PACT page on a phone (below md) — the "PACT PAGE" phone reference.
 * Every figure is passed in from page.tsx, where it is counted from the
 * Pincode / Pact / Enquiry / LeadRecipient / User tables.
 */

export type PactPhoneArea = { code: string; place: string; professionals: number; leads: number }
export type PactMapPin = { code: string; place: string; lat: number; lng: number }

export type PactPhoneProps = {
  q: string | null
  qResults: { code: string; district: string; state: string }[]
  stats: { icon: IconName; value: string; label: string }[]
  mapFocus: PactMapPin | null
  mapPins: PactMapPin[]
  exploreTabs: { label: string; rows: ExploreRow[]; more?: { title: string; sub: string; href: string } }[]
  topAreas: PactPhoneArea[]
  seatsLine: string
}

const WHAT_IS_PACT = [
  'Pin code based territory mapping',
  'Lead distribution in your PACT area',
  'Connect with nearby professionals',
  'Increase visibility in your area',
  'Get more projects & inquiries',
]

const VISIBILITY = [
  { text: 'Get more leads in your area', d: 'M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5' },
  { text: 'Showcase your profile', d: 'M4 4h16v16H4zM9 10a3 3 0 106 0 3 3 0 00-6 0M7 18c1-2.5 3-3.5 5-3.5s4 1 5 3.5' },
  { text: 'Connect with nearby clients', d: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM8 12l3 3 5-6' },
  { text: 'Grow your business', d: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
]

const STEPS = [
  { n: '01', title: 'Pin Code Mapping', body: 'Every pin code is mapped as a PACT area', d: 'M12 21s-7-5.6-7-11a7 7 0 0114 0c0 5.4-7 11-7 11zM12 7v6M9 10h6' },
  { n: '02', title: 'Lead Distribution', body: 'Leads are distributed in relevant PACT areas', d: 'M21 16V8l-9-5-9 5v8l9 5zM3.3 7L12 12l8.7-5M12 22V12' },
  { n: '03', title: 'Professional Connect', body: 'Professionals connect with leads in their area', d: 'M7 7h10v10H7zM4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3' },
  { n: '04', title: 'Business Growth', body: 'More connections lead to more business', d: 'M6 6h12v12H6zM3 3l3 3M21 3l-3 3M3 21l3-3M21 21l-3-3' },
]

const inK = (n: number) => n.toLocaleString('en-IN')

export function PactPhone(p: PactPhoneProps) {
  return (
    <div className="bg-white pb-6">
      {/* ─── header-search results ─── */}
      {p.q && (
        <section className="mx-4 mt-3 rounded-card border border-line bg-paper-2 p-3.5" aria-label="Search results">
          <p className="text-[12.5px] text-ink-2">
            {p.qResults.length === 0 ? 'No PACT area matches ' : 'PACT areas matching '}
            <span className="font-semibold text-ink">“{p.q}”</span>
          </p>
          {p.qResults.length > 0 && (
            <ul className="mt-2 divide-y divide-line">
              {p.qResults.map((r) => (
                <li key={r.code} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{r.code}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{r.district}, {r.state}</span>
                  </span>
                  <Link href={`/pact?q=${r.code}#find-pact-phone`} className="flex h-9 items-center rounded-card bg-brand px-3 text-[12px] font-semibold text-white">
                    Seats
                  </Link>
                  <Link href={`/designers-associates?pin=${r.code}`} className="flex h-9 items-center rounded-card border border-line bg-white px-3 text-[12px] font-semibold text-ink">
                    Associates
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ─── title block ─── */}
      <section className="px-4 pt-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
          <Link href="/">Home</Link>
          <span aria-hidden>›</span>
          <span>Pin Code PACT</span>
        </nav>
        <h1 className="mt-3 font-display text-[27px] font-bold leading-tight tracking-tight text-ink">Pin Code PACT</h1>
        <p className="mt-0.5 font-display text-[18px] font-bold leading-tight text-brand">Professional Area Connect Territory</p>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
          PACT (Professional Area Connect Territory) is ArchFacing’s unique system that connects
          professionals, leads, projects and opportunities with pin code based territory.
        </p>

        <dl className="mt-4 grid grid-cols-4 gap-2">
          {p.stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-card border border-line bg-white px-1 py-2.5 text-center shadow-card">
              <Icon name={s.icon} className="h-6 w-6 text-brand" />
              <dd className="tabular mt-1.5 font-display text-[14px] font-bold leading-none text-ink">{s.value}</dd>
              <dt className="mt-1 text-[10.5px] leading-tight text-ink-2">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ─── map ─── */}
      <PactMapPhone focus={p.mapFocus} pins={p.mapPins} />

      {/* ─── what is PACT ─── */}
      <section className="mx-4 mt-3 rounded-card border border-line bg-white p-4 shadow-card">
        <h2 className="font-display text-[16px] font-bold text-ink">What is PACT?</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
          PACT helps businesses and professionals connect with the right opportunities, projects and
          clients in their specific geographical area.
        </p>
        <ul className="mt-3.5 flex flex-col gap-3">
          {WHAT_IS_PACT.map((t) => (
            <li key={t} className="flex items-center gap-3 text-[12.5px] text-ink-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Icon name="check" className="h-2.5 w-2.5" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <Link href="#how-pact-phone" className="mt-4 flex h-11 items-center gap-3 rounded-card border border-line px-4 text-[14px] font-semibold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand text-brand">
            <svg viewBox="0 0 24 24" aria-hidden className="ml-px h-2.5 w-2.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="flex-1">How PACT Works?</span>
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
      </section>

      {/* ─── find your PACT area ─── */}
      <section id="find-pact-phone" className="mx-4 mt-3 scroll-mt-20 rounded-card bg-admin-bg px-4 py-5">
        <h2 className="mb-3.5 font-display text-[17px] font-bold text-white">Find Your PACT Area</h2>
        <PactFinderPhone initialPin={p.q && /^[1-9]\d{5}$/.test(p.q) ? p.q : null} />
      </section>

      {/* ─── explore PACT areas ─── */}
      <section className="mx-4 mt-4 rounded-card border border-line bg-white px-4 pb-1 pt-4 shadow-card">
        <h2 className="mb-3 font-display text-[16px] font-bold text-ink">Explore PACT Areas</h2>
        <ExploreTabsPhone tabs={p.exploreTabs} />
      </section>

      {/* ─── top PACT areas ─── */}
      <section className="mx-4 mt-3 rounded-card border border-line bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-ink">Top PACT Areas</h2>
          <Link href="/designers-associates" className="flex h-9 items-center text-[12px] font-semibold text-brand">View All →</Link>
        </div>
        {p.topAreas.length === 0 ? (
          <p className="py-4 text-[12.5px] text-ink-3">No leads have been routed yet.</p>
        ) : (
          <ol className="mt-1 flex flex-col">
            {p.topAreas.map((a, i) => (
              <li key={a.code}>
                <Link href={`/pact?q=${a.code}#find-pact-phone`} className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-bold text-brand">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink">{a.code}{a.place ? ` - ${a.place}` : ''}</span>
                    <span className="tabular mt-0.5 block text-[11.5px] text-ink-3">
                      {inK(a.professionals)} Professionals<span className="mx-1.5">•</span>{inK(a.leads)} Leads
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ─── increase your visibility ─── */}
      <section className="mx-4 mt-3 rounded-card border border-brand-border bg-brand-soft p-4">
        <h2 className="font-display text-[18px] font-bold text-brand">Increase Your Visibility</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          Get discovered in your PACT area and connect with more clients &amp; projects.
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {VISIBILITY.map((v) => (
            <li key={v.text} className="flex items-center gap-3 text-[12.5px] text-ink">
              <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={v.d} /></svg>
              {v.text}
            </li>
          ))}
        </ul>
        <Link href="/register?type=professional" className="mt-4 flex h-11 items-center justify-center rounded-card bg-brand text-[14px] font-semibold text-white">
          Activate In Your PACT Area
        </Link>
      </section>

      {/* ─── how PACT system works ─── */}
      <section id="how-pact-phone" className="mx-4 mt-3 scroll-mt-20 rounded-card border border-line bg-white px-3 py-4 shadow-card">
        <h2 className="px-1 font-display text-[16px] font-bold text-ink">How PACT System Works?</h2>
        <ol className="mt-4 grid grid-cols-4 gap-1">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-white text-brand">
                <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={s.d} /></svg>
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className={`absolute left-[calc(50%+28px)] top-[18px] text-[13px] ${i === 2 ? 'text-ink-4' : 'text-brand'}`}>→</span>
              )}
              <span className="mt-2.5 text-[11px] text-ink-2">{s.n}</span>
              <span className="mt-0.5 text-[12px] font-bold leading-tight text-ink">{s.title}</span>
              <span className="mt-1 text-[10.5px] leading-snug text-ink-3">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── don't see your area ─── */}
      <section className="relative isolate mx-4 mt-3 overflow-hidden rounded-card bg-admin-bg px-4 py-5">
        <svg aria-hidden viewBox="0 0 160 140" className="absolute left-0 top-0 -z-10 h-full w-[45%] opacity-90">
          <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" fill="none">
            <path d="M10 30 L60 20 L110 45 L90 100 L40 120 L15 85 Z" />
            <path d="M60 20 L40 120 M10 30 L90 100 M110 45 L15 85" />
          </g>
          {[[58, 34], [30, 72], [92, 76]].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path d="M0 -14c-5 0-9 4-9 9 0 7 9 15 9 15s9-8 9-15c0-5-4-9-9-9z" fill="#F97316" />
              <circle cy="-5" r="3.2" fill="#071A36" />
            </g>
          ))}
        </svg>
        <div className="ml-[38%]">
          <h2 className="font-display text-[16px] font-bold text-white">Don’t see your area?</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">
            Request to add a new PACT area in your location.
          </p>
          <Link href="/legal/contact" className="mt-3.5 flex h-11 items-center justify-center rounded-card bg-white px-3 text-[13px] font-semibold text-ink">
            Request New PACT Area
          </Link>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-center text-[11px] text-white/55">{p.seatsLine}</p>
      </section>
    </div>
  )
}

/* ═══ Stylised territory map — no map library; pins are real PIN rows
   placed by their own lat/lng around the focused area. ═══ */
function PactMapPhone({ focus, pins }: { focus: PactMapPin | null; pins: PactMapPin[] }) {
  // Focus sits at a fixed spot; the others keep their true bearing and
  // relative distance, scaled so the farthest one still fits the card.
  const FX = 64
  const FY = 40
  const others = focus ? pins.filter((x) => x.code !== focus.code) : pins
  // Schematic, not to scale: each nearby area takes the free slot around the
  // focus that is closest to its true compass bearing, so pins never stack
  // even when PIN centroids sit a few hundred metres apart.
  const SLOTS = [
    { x: 76, y: 12, a: 70 },
    { x: 86, y: 56, a: -5 },
    { x: 78, y: 84, a: -60 },
    { x: 46, y: 84, a: -110 },
    { x: 12, y: 72, a: -160 },
    { x: 12, y: 92, a: -135 },
  ]
  const free = [...SLOTS]
  const spots = new Map<string, { x: number; y: number }>()
  others.slice(0, SLOTS.length).forEach((o, i) => {
    const dx = focus ? o.lng - focus.lng : 0
    const dy = focus ? o.lat - focus.lat : 0
    const ang = dx === 0 && dy === 0 ? SLOTS[i].a : (Math.atan2(dy, dx) * 180) / Math.PI
    const diff = (a: number) => Math.abs(((a - ang + 540) % 360) - 180)
    free.sort((p, q) => diff(p.a) - diff(q.a))
    const slot = free.shift()!
    spots.set(o.code, { x: slot.x, y: slot.y })
  })
  const place = (o: PactMapPin) => spots.get(o.code) ?? { x: 50, y: 50 }

  return (
    <section aria-label="PACT areas map" className="relative mt-4 h-[320px] overflow-hidden bg-[#EEF1F4]">
      <svg aria-hidden viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <rect width="400" height="320" fill="#EEF1F4" />
        <path d="M0 0 H130 V60 Q70 80 0 70 Z" fill="#E3ECDD" />
        <path d="M310 230 H400 V320 H270 Q290 270 310 230 Z" fill="#DCE8F1" />
        <circle cx="370" cy="40" r="50" fill="#E3ECDD" opacity="0.7" />
        <g stroke="#FFFFFF" strokeWidth="5" fill="none">
          <path d="M-10 100 L170 124 L270 70 L420 110" />
          <path d="M44 -10 L96 160 L64 330" />
          <path d="M320 -10 L262 160 L330 330" />
          <path d="M-10 236 L160 214 L300 262 L420 232" />
          <path d="M140 -10 L214 140 L190 330" />
        </g>
        <g stroke="#D6DDE4" strokeWidth="1" fill="none">
          <path d="M-10 100 L170 124 L270 70 L420 110" />
          <path d="M44 -10 L96 160 L64 330" />
          <path d="M320 -10 L262 160 L330 330" />
          <path d="M-10 236 L160 214 L300 262 L420 232" />
          <path d="M140 -10 L214 140 L190 330" />
        </g>
      </svg>

      {focus && (
        <svg
          aria-hidden
          viewBox="0 0 120 160"
          className="absolute h-[190px] w-[120px] -translate-x-1/2 -translate-y-[42%]"
          style={{ left: `${FX}%`, top: `${FY}%` }}
        >
          <path
            d="M62 4 L84 18 L96 44 L112 60 L100 88 L90 120 L70 132 L58 156 L34 140 L22 112 L8 96 L18 70 L30 50 L40 24 Z"
            fill="#FDE3CF"
            fillOpacity="0.85"
            stroke="#F4A06A"
            strokeWidth="1.5"
          />
        </svg>
      )}

      {others.filter((o) => spots.has(o.code)).map((o) => {
        const { x, y } = place(o)
        return (
          <Link
            key={o.code}
            href={`/pact?q=${o.code}#find-pact-phone`}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-start gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-ink"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z" fill="currentColor" /><circle cx="12" cy="9" r="2.6" fill="#fff" /></svg>
            <span className="leading-tight">
              <span className="block text-[11px] font-bold text-ink">{o.code}</span>
              <span className="block max-w-[84px] truncate text-[10.5px] text-ink-2">{o.place}</span>
            </span>
          </Link>
        )
      })}

      {focus && (
        <>
          <span
            className="absolute z-20 -translate-x-1/2 -translate-y-full"
            style={{ left: `${FX}%`, top: `${FY}%` }}
          >
            <svg viewBox="0 0 24 32" aria-hidden className="h-9 w-7 drop-shadow"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#F97316" /><circle cx="12" cy="12" r="4.5" fill="#fff" /></svg>
          </span>
          <div
            className="absolute z-30 w-[152px] -translate-y-1/2 rounded-card bg-admin-bg px-3.5 py-3 text-white shadow-lift"
            style={{ right: `calc(${100 - FX}% + 22px)`, top: `${FY - 12}%` }}
          >
            <p className="font-display text-[16px] font-bold leading-tight">{focus.code}</p>
            <p className="mt-1 truncate text-[11.5px] text-white/85">{focus.place}</p>
            <Link href={`/pact?q=${focus.code}#find-pact-phone`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand">
              View PACT Details →
            </Link>
            <span aria-hidden className="absolute -right-2 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-l-[9px] border-y-transparent border-l-admin-bg" />
          </div>
        </>
      )}
    </section>
  )
}
