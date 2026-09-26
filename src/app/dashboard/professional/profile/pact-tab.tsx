'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { MyPactData, PactRow } from '@/lib/my-pact'

/**
 * My PACT — the holder's territories.
 *
 * Every figure is read from the database by `myPactData()`: the rows are the
 * holder's own `Pact` records and the lead counts are real `Enquiry` rows
 * routed to them. Nothing on this screen is placeholder.
 *
 * Rows are grouped BY LOCATION, as the reference draws them: one line per
 * city, carrying that city's PIN-code range, every category held there, and
 * the summed leads.
 */

const STATUS: Record<string, { label: string; pill: string }> = {
  ACTIVE: { label: 'Active', pill: 'bg-ok-soft text-ok' },
  RESERVED: { label: 'Reserved', pill: 'bg-warn-soft text-warn' },
  SUSPENDED: { label: 'Suspended', pill: 'bg-danger-soft text-danger' },
  EXPIRED: { label: 'Expired', pill: 'bg-paper-3 text-ink-3' },
}

const RING = ['#2563EB', '#16A34A', '#7C3AED', '#F97316', '#D4AF37', '#10B981']

const LABEL: Record<string, string> = {
  DESIGNA: 'Architecture',
  DESIGNI: 'Interior Design',
  CONSULTANT: 'Consultant',
  BMF: 'Building Material',
}
const labelFor = (t: string) => LABEL[t] ?? t

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** One line of the table — a city and everything held in it. */
type Group = {
  key: string
  location: string
  pincodeRange: string
  pincodes: string[]
  categories: string[]
  leadsTotal: number
  leadsThisMonth: number
  expiresAt: string | null
  daysLeft: number | null
  status: string
  serviceTypes: string[]
}

function groupByLocation(rows: PactRow[]): Group[] {
  const map = new Map<string, PactRow[]>()
  for (const r of rows) {
    const key = r.city || r.state
    map.set(key, [...(map.get(key) ?? []), r])
  }

  return [...map].map(([location, list]) => {
    const pins = [...new Set(list.map((r) => r.pincode))].sort()
    const cats = [...new Set(list.flatMap((r) => [labelFor(r.serviceType), ...(r.subCategory ? [r.subCategory] : [])]))]
    // The soonest expiry drives the row's warning, so the reader sees the
    // territory that needs attention first.
    const dated = list.filter((r) => r.daysLeft != null).sort((a, b) => a.daysLeft! - b.daysLeft!)
    const first = dated[0] ?? list[0]
    return {
      key: location,
      location,
      pincodeRange: pins.length > 1 ? `${pins[0]} - ${pins[pins.length - 1]}` : pins[0],
      pincodes: pins,
      categories: cats,
      leadsTotal: list.reduce((n, r) => n + r.leadsTotal, 0),
      leadsThisMonth: list.reduce((n, r) => n + r.leadsThisMonth, 0),
      expiresAt: first.expiresAt,
      daysLeft: first.daysLeft,
      status: list.some((r) => r.status === 'SUSPENDED')
        ? 'SUSPENDED'
        : list.some((r) => r.status === 'RESERVED')
          ? 'RESERVED'
          : 'ACTIVE',
      serviceTypes: [...new Set(list.map((r) => r.serviceType))],
    }
  })
}

export function PactTab({ d, leadsHref, buyHref }: { d: MyPactData; leadsHref: string; buyHref: string }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<'expiry' | 'leads' | 'location'>('expiry')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const categories = useMemo(() => [...new Set(d.rows.map((r) => r.serviceType))], [d.rows])
  const groups = useMemo(() => groupByLocation(d.rows), [d.rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = groups.filter((g) => {
      if (category !== 'all' && !g.serviceTypes.includes(category)) return false
      if (status !== 'all' && g.status !== status) return false
      if (!q) return true
      return `${g.location} ${g.pincodes.join(' ')} ${g.categories.join(' ')}`.toLowerCase().includes(q)
    })
    return out.sort((a, b) => {
      if (sort === 'leads') return b.leadsTotal - a.leadsTotal
      if (sort === 'location') return a.location.localeCompare(b.location)
      if (a.daysLeft == null) return 1
      if (b.daysLeft == null) return -1
      return a.daysLeft - b.daysLeft
    })
  }, [groups, query, category, status, sort])

  const allPicked = visible.length > 0 && visible.every((g) => picked.has(g.key))
  const pickedPins = visible.filter((g) => picked.has(g.key)).flatMap((g) => g.pincodes)

  function toggleAll() {
    setPicked(allPicked ? new Set() : new Set(visible.map((g) => g.key)))
  }
  function toggle(key: string) {
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  return (
    /*
     * Same arrangement at every width — four tiles, the two actions beside
     * them, one filter row, three panels. Only the wide TABLE scrolls, inside
     * its own card; the block itself never forces the page sideways.
     */
    <div className="space-y-4">
      {/* ═══════════ KPI row + side actions ═══════════ */}
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_132px] lg:gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          <Kpi
            icon="map" tint="bg-info-soft text-info" value={String(d.activeCount)} label="Active Locations"
            delta={d.rows.length > d.activeCount ? `${d.rows.length} held` : undefined}
          />
          <Kpi
            icon="clock" tint="bg-warn-soft text-warn" value={String(d.expiringSoon)} label="Expiring Soon"
            note="(in 7 days)"
          />
          <Kpi
            icon="users" tint="bg-pact-soft text-pact" value={String(d.totalLeads)} label="Total Leads"
            delta={d.leadsThisMonth > 0 ? `+${d.leadsThisMonth} this month` : undefined}
          />
          <Kpi
            icon="target" tint="bg-brand-soft text-brand"
            value={d.responseRate == null ? '—' : `${d.responseRate}%`} label="Response Rate"
            note={d.responseRate == null ? 'no leads yet' : undefined}
          />
        </div>

        <div className="flex gap-2.5 sm:flex-col">
          <Link
            href={buyHref}
            aria-disabled={!d.canBuy}
            className={cn("btn-primary flex-1 justify-center gap-1 px-2 py-2 text-[11px] lg:gap-2 lg:py-2.5 lg:text-[13px]", !d.canBuy && 'pointer-events-none opacity-55')}
          >
            <Icon name="plus" className="h-4 w-4" />
            Buy New PACT
          </Link>
          <Link href={buyHref} className="btn-outline flex-1 justify-center gap-1 px-2 py-2 text-[11px] lg:gap-2 lg:py-2.5 lg:text-[13px]">
            <Icon name="chart" className="h-4 w-4" />
            View PACT Plans
          </Link>
        </div>
      </div>

      {/* ═══════════ filters ═══════════ */}
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-paper-2 px-3 ">
          <Icon name="search" className="h-4 w-4 shrink-0 text-ink-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by location, pincode or category…"
            aria-label="Search your PACT locations"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] placeholder:text-ink-4 focus:outline-none"
          />
        </label>

        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="input py-2.5 text-[13px] lg:w-[168px]">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{labelFor(c)}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="input py-2.5 text-[13px] lg:w-[148px]">
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="RESERVED">Reserved</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 text-[12.5px] text-ink-3 lg:block">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort by"
            className="input min-w-0 flex-1 py-2.5 text-[13px] lg:w-[178px] lg:flex-none"
          >
            <option value="expiry">Expiry Date (Soonest)</option>
            <option value="leads">Most Leads</option>
            <option value="location">Location</option>
          </select>
        </div>
      </div>

      {/* ═══════════ locations ═══════════ */}
      <div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[15px] font-bold text-ink">
            My PACT Locations <span className="tabular text-ink-3">({visible.length})</span>
          </h3>
          {pickedPins.length > 0 && (
            <Link
              href={`${leadsHref}?pincode=${pickedPins[0]}`}
              className="btn-outline px-3 py-1.5 text-[12px]"
            >
              View leads for {picked.size} selected
            </Link>
          )}
        </div>

        <section className="card overflow-hidden">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-ink-3">
                <Icon name="map" className="h-6 w-6" />
              </span>
              <p className="mt-3 font-display text-[14.5px] font-bold text-ink">
                {d.rows.length === 0 ? 'No PACT territory yet' : 'No location matches these filters'}
              </p>
              <p className="mt-1 max-w-sm text-[12.5px] text-ink-3">
                {d.rows.length === 0
                  ? 'A PACT gives you exclusive rights over a PIN code — every enquiry from that area comes straight to you.'
                  : 'Clear the search or filters to see your other locations.'}
              </p>
              {d.rows.length === 0 && (
                <Link href={buyHref} className="btn-primary mt-4 px-4 py-2 text-[13px]">
                  <Icon name="plus" className="h-4 w-4" />
                  Buy your first PACT
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead>
                  <tr className="border-b border-line-soft bg-paper-2 text-left text-[11.5px] font-semibold text-ink-3">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allPicked}
                        onChange={toggleAll}
                        aria-label="Select all locations"
                        className="h-4 w-4 cursor-pointer accent-brand"
                      />
                    </th>
                    <th className="px-3 py-3">Location / Pincode</th>
                    <th className="px-3 py-3">Categories</th>
                    <th className="px-3 py-3">Leads Received</th>
                    <th className="px-3 py-3">Valid Till</th>
                    <th className="px-3 py-3">Days Left</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((g) => (
                    <Row
                      key={g.key}
                      g={g}
                      leadsHref={leadsHref}
                      buyHref={buyHref}
                      checked={picked.has(g.key)}
                      onToggle={() => toggle(g.key)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ═══════════ coverage · breakdown · CTA ═══════════ */}
      {/* Three across on a computer. On a tablet the CTA takes the full width
          under the other two rather than being squeezed into a third of 540px. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {/* coverage */}
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-[14.5px] font-bold text-ink">
            <Icon name="map" className="h-4 w-4 text-brand" />
            My PACT Coverage
          </h3>
          {groups.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-ink-3">No territory held yet.</p>
          ) : (
            <>
              <ul className="mt-3.5 flex flex-col gap-2">
                {groups.map((g) => (
                  <li key={g.key} className="flex items-start gap-2.5 rounded-lg border border-line-soft bg-paper-2 px-3 py-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon name="map" className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-ink">{g.location}</span>
                      <span className="tabular block truncate text-[11px] text-ink-3">{g.pincodeRange}</span>
                    </span>
                    <span className="tabular shrink-0 text-[11.5px] font-semibold text-ink-2">
                      {g.pincodes.length} PIN{g.pincodes.length > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-4">
                {d.rows.length} territor{d.rows.length === 1 ? 'y' : 'ies'} across {groups.length} location
                {groups.length > 1 ? 's' : ''}.
              </p>
            </>
          )}
        </section>

        {/* breakdown */}
        <section className="card p-5">
          <h3 className="font-display text-[14.5px] font-bold text-ink">Category-wise PACT</h3>
          {d.byCategory.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-ink-3">Nothing to break down yet.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <Ring slices={d.byCategory} total={d.rows.length} />
              <ul className="flex min-w-0 flex-1 flex-col gap-2">
                {d.byCategory.map((c, i) => (
                  <li key={c.label} className="flex items-center gap-2.5 text-[12.5px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: RING[i % RING.length] }} />
                    <span className="min-w-0 flex-1 truncate text-ink-2">{c.label}</span>
                    <span className="tabular font-bold text-ink">{c.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="card flex flex-col p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
              <Icon name="map" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[14.5px] font-bold text-ink">Need More Coverage?</h3>
              <p className="mt-1 text-[12px] leading-snug text-ink-3">
                Purchase PACT for new locations and categories to get targeted leads from those areas.
              </p>
            </div>
          </div>
          <ul className="mt-3.5 flex flex-1 flex-col gap-2">
            {[
              'Choose specific locations / pincodes',
              'Select multiple categories',
              'Get high quality, verified leads',
              'Manage and renew anytime',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <span className="mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          {!d.canBuy && (
            <p className="mt-3 rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-[11.5px] font-medium text-warn">
              Your account is still being verified — buying opens once it is active.
            </p>
          )}
          <Link
            href={buyHref}
            aria-disabled={!d.canBuy}
            className={cn('btn-primary mt-4 w-full justify-center py-2.5', !d.canBuy && 'pointer-events-none opacity-55')}
          >
            Buy New PACT
          </Link>
          <Link href={buyHref} className="mt-2 inline-flex items-center justify-center gap-1 text-[12.5px] font-semibold text-brand hover:underline">
            View Plans &amp; Pricing <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Parts
// ──────────────────────────────────────────────────────────────

function Kpi({
  icon, tint, value, label, delta, note,
}: { icon: IconName; tint: string; value: string; label: string; delta?: string; note?: string }) {
  return (
    <div className="card flex items-start gap-1.5 p-2.5 lg:gap-3 lg:p-4">
      <span className={cn('chip-icon h-7 w-7 shrink-0 lg:h-10 lg:w-10', tint)}>
        <Icon name={icon} className="h-[15px] w-[15px] lg:h-5 lg:w-5" />
      </span>
      <div className="min-w-0">
        <p className="tabular font-display text-[16px] font-bold leading-none text-navy lg:text-[22px]">{value}</p>
        <p className="mt-1 text-[10px] font-semibold leading-tight text-ink lg:text-[12px]">{label}</p>
        {delta && <p className="mt-0.5 truncate text-[9.5px] font-semibold text-ok lg:text-[11px]">{delta}</p>}
        {note && !delta && <p className="mt-0.5 truncate text-[9.5px] text-ink-3 lg:text-[11px]">{note}</p>}
      </div>
    </div>
  )
}

function Row({
  g, leadsHref, buyHref, checked, onToggle,
}: {
  g: Group
  leadsHref: string
  buyHref: string
  checked: boolean
  onToggle: () => void
}) {
  const [menu, setMenu] = useState(false)
  const s = STATUS[g.status] ?? STATUS.EXPIRED
  const expiring = g.daysLeft != null && g.daysLeft <= 7 && g.daysLeft >= 0
  const lapsed = g.daysLeft != null && g.daysLeft < 0
  const shown = g.categories.slice(0, 2)
  const extra = g.categories.length - shown.length

  return (
    <tr className="border-b border-line-soft last:border-0">
      <td className="px-4 py-3 align-top">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select ${g.location}`}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-brand"
        />
      </td>
      <td className="px-3 py-3">
        <p className="text-[13px] font-bold text-ink">{g.location}</p>
        <p className="tabular text-[11.5px] text-ink-3">{g.pincodeRange}</p>
      </td>
      <td className="px-3 py-3">
        <span className="flex flex-wrap items-center gap-1">
          {shown.map((c) => (
            <span key={c} className="pill bg-info-soft text-[10.5px] text-info">{c}</span>
          ))}
          {extra > 0 && <span className="pill bg-paper-3 text-[10.5px] text-ink-3">+{extra}</span>}
        </span>
      </td>
      <td className="px-3 py-3">
        <p className="tabular text-[14px] font-bold text-ink">{g.leadsTotal}</p>
        <p className="text-[11px] text-ink-3">{g.leadsThisMonth} This Month</p>
      </td>
      <td className="tabular px-3 py-3 text-ink-2">{fmtDate(g.expiresAt)}</td>
      <td className="px-3 py-3">
        {g.daysLeft == null ? (
          <span className="text-[12px] text-ink-4">—</span>
        ) : (
          <span
            className={cn(
              'pill tabular text-[10.5px]',
              lapsed ? 'bg-danger-soft text-danger' : expiring ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'
            )}
          >
            {lapsed ? 'expired' : `${g.daysLeft} days left`}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className={cn('pill text-[10.5px]', expiring && g.status === 'ACTIVE' ? 'bg-warn-soft text-warn' : s.pill)}>
          {expiring && g.status === 'ACTIVE' ? 'Expiring Soon' : s.label}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <Link href={`${leadsHref}?pincode=${g.pincodes[0]}`} className="btn-outline whitespace-nowrap px-3 py-1.5 text-[12px]">
            View Leads
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-label={`More actions for ${g.location}`}
              aria-expanded={menu}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
            >
              <Icon name="dots" className="h-4 w-4" />
            </button>
            {menu && (
              <>
                <button type="button" aria-label="Close" onClick={() => setMenu(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-card border border-line bg-paper shadow-lift">
                  <MenuLink href={`${leadsHref}?pincode=${g.pincodes[0]}`} icon="users">View leads from here</MenuLink>
                  <MenuLink href={buyHref} icon="plus">Buy more in this area</MenuLink>
                  <MenuLink href="/dashboard/pact/renew" icon="clock">Renew this territory</MenuLink>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

function MenuLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-ink-2 transition-colors hover:bg-paper-3 hover:text-brand">
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  )
}

/** The category ring — one SVG arc per slice, no charting library. */
function Ring({ slices, total }: { slices: { label: string; count: number }[]; total: number }) {
  const size = 124
  const stroke = 15
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
        {slices.map((s, i) => {
          const len = total > 0 ? (s.count / total) * circumference : 0
          const el = (
            <circle
              key={s.label}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={RING[i % RING.length]} strokeWidth={stroke}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-[22px] font-bold leading-none text-navy">{total}</span>
        <span className="mt-0.5 text-[10px] text-ink-3">Total Locations</span>
      </span>
    </span>
  )
}
