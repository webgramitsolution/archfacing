import Image from 'next/image'
import Link from 'next/link'
import { SnapRail } from '@/components/mobile/snap-rail'
import { VerifiedTick } from '@/components/verified-badge'
import { cn } from '@/lib/utils'
import type { DaPhoneData, DaRated } from '@/app/(public)/designers-associates/phone-data'
import { DaPinFinderPhone, DaFilterChipsPhone } from './designers-associates-phone-client'

/**
 * Designers Associates on a phone (below md) — the "designers associates
 * phone" reference. Every associate, count and rating is passed in from
 * page.tsx (lib/design-associates + Review rows); nothing is typed in.
 */

export type DaFilterGroup = { name: string; label: string; value: string; options: { value: string; label: string }[] }

const inK = (n: number) => n.toLocaleString('en-IN')

function initials(name: string) {
  return name.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Stars({ a, className }: { a: DaRated; className?: string }) {
  if (!a.rating) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11.5px] text-ink-2', className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 text-warn" fill="currentColor"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" /></svg>
      <span className="tabular font-semibold text-ink">{a.rating.avg.toFixed(1)}</span>
      <span className="tabular">({a.rating.count})</span>
    </span>
  )
}

/** Rating · experience, or the published-work count when neither exists. */
function MetaLine({ a }: { a: DaRated }) {
  const parts: React.ReactNode[] = []
  if (a.rating) parts.push(<Stars key="r" a={a} />)
  if (a.experience) parts.push(<span key="e">{a.experience}+ Years Exp.</span>)
  if (parts.length < 2) parts.push(<span key="p" className="tabular">{a.counts.projects} Projects</span>)
  return (
    <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>•</span>}
          {p}
        </span>
      ))}
    </span>
  )
}

function Cover({ src, name, className, sizes = '120px' }: { src: string | null; name: string; className?: string; sizes?: string }) {
  return (
    <span className={cn('relative block overflow-hidden bg-paper-3', className)}>
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} unoptimized className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paper-2 to-paper-3 text-[13px] font-bold text-ink-3">
          {initials(name)}
        </span>
      )}
    </span>
  )
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-[15.5px] font-bold text-ink">{title}</h2>
      {href && (
        <Link href={href} className="flex h-9 items-center text-[12px] font-semibold text-brand">View All →</Link>
      )}
    </div>
  )
}

export function DesignersAssociatesPhone({
  data,
  heroImage,
  found,
  total,
  filterGroups,
  keep,
}: {
  data: DaPhoneData
  heroImage: string
  found: DaRated[]
  total: number
  filterGroups: DaFilterGroup[]
  keep: Record<string, string>
}) {
  const s = data.stats
  const STATS = [
    { v: s.professionals, l: 'Verified Associates', d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
    { v: s.cities, l: 'Cities Covered', d: 'M21 16V8l-9-5-9 5v8l9 5zM3.3 7L12 12l8.7-5M12 22V12' },
    { v: s.projects, l: 'Projects Published', d: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h3' },
    { v: s.products, l: 'Products Listed', d: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0' },
    { v: s.pactAreas, l: 'PACT Areas', d: 'M12 21s-7-5.6-7-11a7 7 0 0114 0c0 5.4-7 11-7 11zM12 13a3 3 0 100-6 3 3 0 000 6z' },
    { v: s.states, l: 'States Covered', d: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z' },
  ]

  return (
    <div className="bg-white pb-6">
      {/* ═══ hero ═══ */}
      <section className="relative isolate mx-3 mt-2 overflow-hidden rounded-card bg-admin-bg px-4 pb-3 pt-6 text-white">
        <Image src={heroImage} alt="" fill priority sizes="100vw" unoptimized className="-z-20 object-cover object-right" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-admin-bg via-admin-bg/70 to-transparent" />
        <h1 className="max-w-[62%] font-display text-[22px] font-bold leading-[1.2]">
          Find India’s Best <span className="text-brand">Design Professionals</span>
        </h1>
        <p className="mt-3 max-w-[64%] text-[12px] leading-relaxed text-white/85">
          Discover verified architects and interior designers who hold an ArchFacing PACT
          territory across India.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-card border border-white/15 bg-admin-bg/80 px-3 py-2.5">
          <svg viewBox="0 0 24 24" aria-hidden className="h-8 w-8 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
          <span className="w-[92px] shrink-0 text-[11.5px] font-bold uppercase leading-tight tracking-wide">Verified Professionals</span>
          <span className="border-l border-white/15 pl-3 text-[11px] leading-snug text-white/80">
            Every associate holds an active PACT and an approved registration
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <Link href="#browse-profession" className="flex h-10 items-center justify-center gap-1.5 rounded-card bg-white text-[12px] font-semibold text-ink">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
            Professional / Skill
          </Link>
          <Link href="#filter-professionals" className="flex h-10 items-center justify-center gap-1.5 rounded-card bg-brand text-[12px] font-semibold text-white">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 21V5a2 2 0 012-2h12a2 2 0 012 2v16l-8-4z" /></svg>
            Find Professionals
          </Link>
        </div>

        {data.popular.length > 0 && (
          <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <span className="shrink-0 text-[11px] font-semibold">Popular Searches:</span>
            {data.popular.map((p) => (
              <Link key={p.href} href={p.href} className="flex h-8 shrink-0 items-center rounded-card bg-white/10 px-2.5 text-[11px] text-white/90">
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ═══ find in your PACT area ═══ */}
      <section className="mx-3 mt-3 rounded-card border border-brand-border/60 bg-brand-soft/60 p-4">
        <div className="flex gap-3">
          <svg viewBox="0 0 24 24" aria-hidden className="h-9 w-9 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2"><circle cx="12" cy="12" r="10" /><path strokeDasharray="0" d="M12 17s-4-3.3-4-6.4a4 4 0 018 0c0 3.1-4 6.4-4 6.4z" /><circle cx="12" cy="10.5" r="1.4" strokeDasharray="0" /></svg>
          <div className="min-w-0">
            <h2 className="font-display text-[14.5px] font-bold text-ink">Find Professionals in Your PACT Area</h2>
            <p className="mt-1 text-[12px] leading-snug text-ink-2">
              PACT Professionals Area Connect Territory helps you find the right professionals near your location.
            </p>
          </div>
        </div>
        <DaPinFinderPhone />
      </section>

      {/* ═══ stats ═══ */}
      <section className="mx-3 mt-3 grid grid-cols-2 rounded-card border border-line bg-white px-3 py-1">
        {STATS.map((x, i) => (
          <div key={x.l} className={cn('flex items-center gap-3 py-3', i % 2 === 0 ? 'border-r border-line pr-2' : 'pl-4')}>
            <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={x.d} /></svg>
            <span className="min-w-0">
              <span className="tabular block font-display text-[16px] font-bold leading-none text-ink">{inK(x.v)}</span>
              <span className="mt-1 block truncate text-[11px] text-ink-2">{x.l}</span>
            </span>
          </div>
        ))}
      </section>

      {/* ═══ browse by profession ═══ */}
      <section id="browse-profession" className="mx-3 mt-3 scroll-mt-20 rounded-card border border-line bg-white px-4 pb-2 pt-3">
        <SectionHead title="Browse by Profession" href="/designers-associates" />
        <SnapRail label="Professions" itemClassName="w-[31.5%]" className="mt-2">
          {data.professions.map((p) => (
            <Link key={p.href} href={p.href} className="block overflow-hidden rounded-card border border-line bg-white">
              <Cover src={p.cover} name={p.label} className="aspect-[4/3]" />
              <span className="block px-1 py-2 text-center">
                <span className="block truncate text-[11.5px] font-semibold text-ink">{p.label}</span>
                <span className="tabular mt-0.5 block text-[11px] text-ink-3">({inK(p.count)})</span>
              </span>
            </Link>
          ))}
        </SnapRail>
      </section>

      {/* ═══ filter professionals ═══ */}
      <section id="filter-professionals" className="mx-3 mt-3 scroll-mt-20 rounded-card border border-line bg-white px-4 pb-2 pt-3">
        <SectionHead title="Filter Professionals" />
        <p className="mt-1 text-[12.5px] text-ink-2">
          <span className="tabular font-bold text-ink">{inK(total)}</span> {total === 1 ? 'Associate' : 'Associates'} Found
          {Object.keys(keep).length + filterGroups.filter((g) => g.value).length > 0 && (
            <Link href="/designers-associates#filter-professionals" className="ml-2 font-semibold text-brand">Clear</Link>
          )}
        </p>
        <DaFilterChipsPhone groups={filterGroups} keep={keep} />

        {found.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-ink-3">No Design Associates match these filters yet.</p>
        ) : (
          <SnapRail label="Associates" itemClassName="w-[48.5%]" className="mt-3">
            {found.map((a) => <AssociateCardPhone key={a.id} a={a} />)}
          </SnapRail>
        )}
      </section>

      {/* ═══ compact stat strip ═══ */}
      <section className="mx-3 mt-3 grid grid-cols-4 rounded-card border border-line bg-white px-1 py-3">
        {STATS.slice(0, 4).map((x) => (
          <div key={x.l} className="flex min-w-0 items-center gap-1.5 px-1">
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={x.d} /></svg>
            <span className="min-w-0">
              <span className="tabular block text-[12.5px] font-bold leading-none text-ink">{inK(x.v)}</span>
              <span className="mt-0.5 block truncate text-[10px] text-ink-3">{x.l.split(' ')[0]}</span>
            </span>
          </div>
        ))}
      </section>

      <RankedList title="Top Architects" href="/designers-associates?type=DESIGNA" list={data.topArchitects} />
      <RankedList title="Top Interior Designers" href="/designers-associates?type=DESIGNI" list={data.topInterior} />

      {/* ═══ design competition ═══ */}
      {data.competition && (
        <section className="relative mx-3 mt-3 overflow-hidden rounded-card border border-line bg-white p-3.5">
          <SectionHead title="Design Competition" href="/competition" />
          <div className="mt-1 flex gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug text-ink">{data.competition.title}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-2">
                {data.competition.category === 'designi' ? 'Interior Design' : data.competition.category === 'designa' ? 'Architecture' : data.competition.category}
              </p>
              <p className="mt-3 text-[11px] text-ink-3">Prize Pool</p>
              <p className="tabular font-display text-[18px] font-bold text-ink">₹ {inK(data.competition.prize)}</p>
              <Link href={`/competition/${data.competition.slug}`} className="mt-2 inline-flex h-9 items-center rounded-card bg-brand px-4 text-[12px] font-semibold text-white">
                Participate Now
              </Link>
            </div>
            {data.competition.cover && (
              <Cover src={data.competition.cover} name={data.competition.title} className="w-[44%] shrink-0 rounded-card" sizes="200px" />
            )}
          </div>
        </section>
      )}

      {/* ═══ need expert guidance ═══ */}
      <section className="relative isolate mx-3 mt-3 flex overflow-hidden rounded-card border border-line bg-paper-2">
        <div className="relative z-10 w-[56%] p-3.5">
          <h2 className="font-display text-[15px] font-bold text-ink">Need Expert Guidance?</h2>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-2">Connect with top professionals for your project</p>
          <Link href="/consult-nearby" className="mt-3 inline-flex h-9 items-center rounded-card bg-brand px-4 text-[12px] font-semibold text-white">
            Book Consultation
          </Link>
        </div>
        {data.guidanceImage && (
          <span className="absolute inset-y-0 right-0 -z-10 w-[50%]">
            <Image src={data.guidanceImage} alt="" fill sizes="220px" unoptimized className="object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-paper-2 to-transparent" />
          </span>
        )}
      </section>

      {/* ═══ professional of the week ═══ */}
      {data.ofTheWeek && (
        <section className="mx-3 mt-3 rounded-card border border-line bg-white p-3.5">
          <SectionHead title="Professional of the Week" href="/designers-associates" />
          <div className="mt-2 flex gap-3">
            <Cover src={data.ofTheWeek.cover} name={data.ofTheWeek.name} className="aspect-[4/3] w-[46%] shrink-0 rounded-card" sizes="200px" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[13.5px] font-bold text-ink">
                <span className="truncate">{data.ofTheWeek.firmName || data.ofTheWeek.name}</span>
                {data.ofTheWeek.badgeTone && <VerifiedTick tone={data.ofTheWeek.badgeTone} className="h-3.5 w-3.5" />}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-2">{data.ofTheWeek.discipline ?? 'Design Associate'}</p>
              <MetaLine a={data.ofTheWeek} />
              <p className="mt-1 truncate text-[11.5px] text-ink-3">
                {data.ofTheWeek.location}
                {data.ofTheWeek.counts.projects > 0 && <> • {data.ofTheWeek.counts.projects} Projects</>}
              </p>
              <Link href={`/${data.ofTheWeek.slug}`} className="mt-2.5 inline-flex h-9 items-center rounded-card bg-brand px-4 text-[12px] font-semibold text-white">
                View Profile
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══ trending ═══ */}
      {data.trending.length > 0 && (
        <section className="mx-3 mt-3 rounded-card border border-line bg-white px-4 pb-2 pt-3">
          <SectionHead title="Trending Professionals" href="/designers-associates" />
          <SnapRail label="Trending professionals" itemClassName="w-[23.5%]" className="mt-2">
            {data.trending.map((a) => (
              <Link key={a.id} href={`/${a.slug}`} className="block text-center">
                <Cover src={a.cover} name={a.name} className="aspect-[4/3] rounded-card" />
                <span className="mt-1.5 block truncate text-[11px] font-semibold text-ink">{a.firmName || a.name}</span>
                {a.rating ? (
                  <Stars a={a} className="justify-center text-[10.5px]" />
                ) : (
                  <span className="tabular block text-[10.5px] text-ink-3">
                    {a.views > 0 ? `${inK(a.views)} views` : `${a.counts.projects} Projects`}
                  </span>
                )}
              </Link>
            ))}
          </SnapRail>
        </section>
      )}
    </div>
  )
}

function RankedList({ title, href, list }: { title: string; href: string; list: DaRated[] }) {
  if (list.length === 0) return null
  return (
    <section className="mx-3 mt-3 rounded-card border border-line bg-white px-3.5 pb-1 pt-3">
      <SectionHead title={title} href={href} />
      <ol className="mt-1">
        {list.map((a, i) => (
          <li key={a.id}>
            <Link href={`/${a.slug}`} className="flex items-center gap-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10.5px] font-bold text-white">{i + 1}</span>
              <Cover src={a.cover} name={a.name} className="h-[52px] w-[74px] shrink-0 rounded-card" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                  <span className="truncate">{a.firmName || a.name}</span>
                  {a.badgeTone && <VerifiedTick tone={a.badgeTone} className="h-3.5 w-3.5" />}
                </span>
                <MetaLine a={a} />
              </span>
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AssociateCardPhone({ a }: { a: DaRated }) {
  const tags = (a.categories.length ? a.categories : [a.discipline, a.tier && a.tier !== 'PROFESSIONAL' ? a.tier.charAt(0) + a.tier.slice(1).toLowerCase() : null])
    .filter(Boolean)
    .slice(0, 2) as string[]
  const pin = a.pacts[0]?.pincode
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white">
      <div className="relative">
        <Cover src={a.cover} name={a.firmName || a.name} className="aspect-[16/10]" sizes="220px" />
        <span className="absolute left-2 top-2 flex gap-1">
          {a.badgeTone && (
            <span className="flex h-5 items-center gap-1 rounded bg-white px-1.5 text-[9.5px] font-bold uppercase text-ok shadow-card">
              <VerifiedTick tone={a.badgeTone} className="h-3 w-3" /> Verified
            </span>
          )}
          {a.tier && a.tier !== 'PROFESSIONAL' && (
            <span className="flex h-5 items-center rounded bg-brand px-1.5 text-[9.5px] font-bold uppercase text-white">{a.tier}</span>
          )}
        </span>
        <span className="absolute -bottom-5 left-2.5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white text-[12px] font-bold text-ink-2 shadow-card">
          {a.logo || a.photo ? (
            <Image src={(a.logo || a.photo)!} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" />
          ) : (
            initials(a.firmName || a.name)
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-6">
        <p className="truncate text-[13px] font-bold text-ink">{a.firmName || a.name}</p>
        <p className="truncate text-[11px] text-ink-2">{a.discipline ?? 'Design Associate'}</p>
        <MetaLine a={a} />
        <p className="mt-1 truncate text-[11px] text-ink-3">{a.location}</p>
        <p className="tabular mt-1 truncate text-[11px] text-ink-3">
          {pin ? `PACT ${pin}` : a.discipline}{a.counts.products > 0 && <> • {a.counts.products} Products</>}
        </p>
        {tags.length > 0 && (
          <div className="mt-2 flex gap-1 overflow-hidden">
            {tags.map((t) => (
              <span key={t} className="min-w-0 truncate rounded border border-line px-1.5 py-0.5 text-[10px] capitalize text-ink-2">{t.replace(/-/g, ' ')}</span>
            ))}
          </div>
        )}
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2.5">
          <Link href={`/${a.slug}`} className="flex h-9 items-center justify-center rounded-card bg-brand text-[11px] font-semibold text-white">View Profile</Link>
          <Link href={pin ? `/consult-nearby?pincode=${pin}` : '/consult-nearby'} className="flex h-9 items-center justify-center rounded-card border border-line text-[11.5px] font-semibold text-ink">Enquiry</Link>
        </div>
      </div>
    </article>
  )
}
