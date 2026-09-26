import type { Metadata } from 'next'
import Link from 'next/link'

import { requirePermission } from '@/lib/guard'
import { Icon, type IconName } from '@/components/ui'
import { MultiLineChart, DonutChart } from '@/components/admin/charts'
import { Panel, ViewAll } from '@/components/admin/parts'
import { platformOverview, roleDistribution, topCategories, geoDistribution } from '@/lib/admin-metrics'
import { reportOverview, type TrendSeries } from '@/lib/admin-reports'
import { IndiaChoropleth, geoLegend } from '@/components/admin/india-map'

export const metadata: Metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN')

export default async function ReportsPage() {
  await requirePermission('admin:reports')
  const [report, growth, dist, cats, geo] = await Promise.all([
    reportOverview(),
    platformOverview('daily'),
    roleDistribution(),
    topCategories('PRODUCT', 5),
    geoDistribution(28),
  ])
  const maxCat = Math.max(1, ...cats.rows.map((r) => r.value))
  const geoTop = geo.rows.filter((r) => r.label !== 'Others').slice(0, 7)
  const geoOthers = geo.rows.filter((r) => r.label !== 'Others').slice(7).reduce((a, r) => a + r.value, 0)
  const geoTotal = geo.rows.reduce((a, r) => a + r.value, 0)

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">Reports</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">Reports</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Get detailed insights and analytics about your platform performance, users, sales, enquiries and more.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/*
            A real CSV of every figure on this page, built by
            /admin/reports/export under the same permission. The old header
            had a range dropdown that filtered nothing and "Export" /
            "Generate" drawn as <span>s.
          */}
          <a
            href="/admin/reports/export"
            download
            className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-navy/90"
          >
            <Icon name="download" className="h-3.5 w-3.5" /> Export Report (CSV)
          </a>
        </div>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-6 gap-3">
        {report.stats.map((m) => (
          <div key={m.key} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: m.tint.bg, color: m.tint.fg }}><Icon name={m.icon} className="h-[18px] w-[18px]" /></span>
              <span className="text-[11.5px] leading-tight text-ink-3">{m.label}</span>
            </div>
            <p className="tabular mt-2.5 font-display text-[22px] font-bold leading-none text-ink">{m.value}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-3"><Trend pct={m.pct} /> {m.pct == null ? 'no data last month' : 'vs last month'}</p>
          </div>
        ))}
      </section>


      {/* trend charts */}
      <section className="rise rise-2 grid grid-cols-3 gap-5">
        <Panel title="User Registration Trend" action={<PeriodTag />}>
          <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
            {growth.series.map((s) => (<li key={s.label} className="flex items-center gap-1.5 text-[10.5px] text-ink-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</li>))}
          </ul>
          <MultiLineChart labels={growth.labels} series={growth.series} height={180} hideLegend />
        </Panel>
        <Panel title="Orders & Revenue Trend" action={<PeriodTag />}>
          <ComboChart data={report.ordersRevenue} barColor="#93C5FD" lineColor="#1E293B" />
          <Legend items={[{ label: 'Orders', color: '#93C5FD' }, { label: 'Revenue (₹)', color: '#1E293B' }]} />
        </Panel>
        <Panel title="Enquiries & RFQs" action={<PeriodTag />}>
          <ComboChart data={report.enquiriesRfqs} barColor="#86EFAC" lineColor="#1E293B" />
          <Legend items={[{ label: 'Enquiries', color: '#86EFAC' }, { label: 'RFQs', color: '#1E293B' }]} />
        </Panel>
      </section>

      {/* distribution row */}
      <section className="rise rise-3 grid grid-cols-3 gap-5">
        <Panel title="Users by Type">
          <div className="pt-2"><DonutChart total={dist.total} slices={dist.slices} centerLabel="Total Users" showCounts /></div>
        </Panel>

        <Panel title="Top Performing Categories" action={<ViewAll />}>
          {cats.rows.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-3">No published products yet.</p>
          ) : (
            <ul className="space-y-3 pt-1">
              {cats.rows.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <span className="w-[92px] shrink-0 truncate text-[12px] text-ink-2">{c.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${(c.value / maxCat) * 100}%` }} /></span>
                  <span className="tabular w-9 shrink-0 text-right text-[12px] font-semibold text-ink">{c.value}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Registrations by Location" >
          <div className="flex items-start gap-3 pt-1">
            <IndiaChoropleth states={geo.rows} max={geo.max} className="h-[190px] w-[160px]" />
            <ul className="min-w-0 flex-1 space-y-1">
              {geoTop.map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="min-w-0 truncate text-ink-2">{r.label}</span>
                  <span className="tabular shrink-0 font-semibold text-ink">{r.value.toLocaleString('en-IN')}</span>
                </li>
              ))}
              {geoOthers > 0 && (
                <li className="flex items-center justify-between gap-2 border-t border-line-soft pt-1 text-[11.5px]">
                  <span className="text-ink-3">Others</span>
                  <span className="tabular shrink-0 font-semibold text-ink">{geoOthers.toLocaleString('en-IN')}</span>
                </li>
              )}
            </ul>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line-soft pt-2.5">
            {geoLegend(geo.max).map((g) => (<li key={g.label} className="flex items-center gap-1.5 text-[10px] text-ink-3"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />{g.label}</li>))}
          </ul>
        </Panel>
      </section>

      {/* tables row */}
      <section className="rise rise-4 grid grid-cols-2 gap-5">
        <Panel title="Recent Activities Summary" action={<ViewAll />}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
                <th className="py-2 font-semibold">#</th><th className="py-2 font-semibold">Activity</th>
                <th className="py-2 text-right font-semibold">This Month</th><th className="py-2 text-right font-semibold">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {report.summary.map((s, i) => (
                <tr key={s.label} className="text-[12px]">
                  <td className="py-2.5 text-ink-4">{i + 1}</td>
                  <td className="py-2.5"><span className="flex items-center gap-2 font-medium text-ink"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: s.tint.bg, color: s.tint.fg }}><Icon name={s.icon} className="h-3.5 w-3.5" /></span>{s.label}</span></td>
                  <td className="py-2.5 text-right tabular font-semibold text-ink">{s.count.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 text-right tabular text-ink-4"><Trend pct={s.pct} />{s.pct == null || s.pct === 0 ? '—' : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Top Users by Orders" action={<ViewAll />}>
          {report.topOrders.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-3">No orders yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
                  <th className="py-2 font-semibold">#</th><th className="py-2 font-semibold">User / Company</th>
                  <th className="py-2 text-right font-semibold">Orders</th><th className="py-2 text-right font-semibold">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {report.topOrders.map((u, i) => (
                  <tr key={u.id} className="text-[12px]">
                    <td className="py-2.5 text-ink-4">{i + 1}</td>
                    <td className="py-2.5"><span className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[9px] font-bold text-brand">{u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span><span className="max-w-[120px] truncate font-medium text-ink">{u.name}</span></span></td>
                    <td className="py-2.5 text-right tabular font-semibold text-ink">{u.orders}</td>
                    <td className="py-2.5 text-right tabular font-semibold text-ink">{fmtINR(u.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

      </section>

      {/* quick actions */}
      <section className="rise rise-4 grid grid-cols-4 gap-3">
        {QUICK.map((a) => (
          <Link key={a.label} href={a.href} className="flex items-center gap-2.5 rounded-card border border-line bg-white p-3.5 shadow-card transition-colors hover:border-brand/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: a.bg, color: a.fg }}><Icon name={a.icon} className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block truncate text-[12.5px] font-semibold text-ink">{a.label}</span><span className="block truncate text-[10.5px] text-ink-4">{a.hint}</span></span>
          </Link>
        ))}
      </section>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────
/** The series are always the last 30 days — say so rather than offer a switch that does nothing. */
function PeriodTag() {
  return <span className="rounded-lg border border-line bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-3">Last 30 days</span>
}

/** A measured month-over-month change; nothing when there is no base month. */
function Trend({ pct }: { pct: number | null }) {
  if (pct == null || pct === 0) return null
  return pct > 0
    ? <span className="font-semibold text-ok">↑ {pct}%</span>
    : <span className="font-semibold text-danger">↓ {Math.abs(pct)}%</span>
}
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{items.map((i) => (<li key={i.label} className="flex items-center gap-1.5 text-[10.5px] text-ink-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.color }} />{i.label}</li>))}</ul>
}

/** Bars (left axis) + line (own scale) combo chart — pure SVG, no client JS. */
function ComboChart({ data, barColor, lineColor }: { data: TrendSeries; barColor: string; lineColor: string }) {
  const W = 340, H = 180, padL = 6, padR = 6, padT = 10, padB = 20
  const iW = W - padL - padR, iH = H - padT - padB
  const n = data.labels.length
  const maxBar = Math.max(1, ...data.bars)
  const maxLine = Math.max(1, ...data.line)
  const bw = (iW / n) * 0.55
  const x = (i: number) => padL + (i + 0.5) * (iW / n)
  const yBar = (v: number) => padT + iH - (v / maxBar) * iH
  const yLine = (v: number) => padT + iH - (v / maxLine) * iH
  const linePath = data.line.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${yLine(v).toFixed(1)}`).join(' ')
  const ticks = [0, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Trend">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (<line key={g} x1={padL} x2={W - padR} y1={padT + g * iH} y2={padT + g * iH} stroke="#EEF0F4" strokeWidth={1} />))}
      {data.bars.map((v, i) => (<rect key={i} x={x(i) - bw / 2} y={yBar(v)} width={bw} height={Math.max(0, padT + iH - yBar(v))} rx={1.5} fill={barColor} />))}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={1.6} strokeLinejoin="round" />
      {data.line.map((v, i) => (<circle key={i} cx={x(i)} cy={yLine(v)} r={1.6} fill={lineColor} />))}
      {ticks.map((i) => (<text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={8} fill="#9AA3AF">{data.labels[i]}</text>))}
    </svg>
  )
}

const QUICK: { label: string; hint: string; icon: IconName; href: string; bg: string; fg: string }[] = [
  { label: 'Export Data', hint: 'Download this report as CSV', icon: 'download', href: '/admin/reports/export', bg: '#E7F7EE', fg: '#16A34A' },
  { label: 'User Activity', hint: 'Logins, updates and orders', icon: 'chart', href: '/admin/user-activity', bg: '#EEF1FF', fg: '#6366F1' },
  { label: 'Leads & Enquiries', hint: 'Every enquiry and its routing', icon: 'file', href: '/admin/leads', bg: '#F3EAFE', fg: '#8B5CF6' },
  { label: 'Newsletter', hint: 'Subscribers and exports', icon: 'settings', href: '/admin/newsletter', bg: '#FEF7E0', fg: '#D97706' },
]
