import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { PageHeading } from '@/components/dashboard-shell'
import { MiniStat } from '@/components/admin/parts'
import { AreaTrendChart } from '@/components/admin/charts'
import { POST_TYPES } from '@/config/post-types'
import { memberAnalytics } from '@/lib/member-analytics'

export const metadata: Metadata = { title: 'Analytics & Insights' }
export const dynamic = 'force-dynamic'

const SOURCE_LABEL: Record<string, string> = {
  PROJECT: 'Project page', PRODUCT: 'Product page', PROFESSIONAL: 'Profile', CORPORATE: 'Corporate page', BMF: 'BMF page',
  CONSULT_NEARBY: 'Consult nearby (PACT)', WEBSITE_FORM: 'Website form', RFQ: 'Request for quote',
  PRODUCT_ENQUIRY: 'Product enquiry', SERVICE_ENQUIRY: 'Service enquiry', PROJECT_ENQUIRY: 'Project enquiry', CONTACT_REQUEST: 'Contact request',
}

const LEADS_HREF: Record<string, string> = {
  PROFESSIONAL: '/dashboard/professional/enquiries', CONSULTANT: '/dashboard/consultant/enquiries',
  BMF: '/dashboard/bmf/enquiries',
}

function Bars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-[12.5px]">
            <span className="truncate text-ink-2">{r.label}{r.sub && <span className="text-ink-4"> · {r.sub}</span>}</span>
            <span className="tabular font-semibold text-ink">{r.value.toLocaleString('en-IN')}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-3">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Views, leads and reviews for the signed-in member — all counted from their own rows. */
export default async function AnalyticsPage() {
  const me = await requireRole('PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE')
  const a = await memberAnalytics(me.id)
  const k = a.kpis

  return (
    <div className="space-y-5">
      <PageHeading title="Analytics & Insights" />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat icon="eye" label="Posting views" value={k.views.toLocaleString('en-IN')} tint={{ bg: '#EAF2FF', fg: '#2563EB' }} hint={`${k.live} live posting${k.live === 1 ? '' : 's'}`} />
        <MiniStat icon="inbox" label="Leads received" value={k.leads.toLocaleString('en-IN')} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint={`${k.leadsThisMonth} this month`} />
        <MiniStat icon="mail" label="Response rate" value={k.responseRate == null ? '—' : `${k.responseRate}%`} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="leads you replied to" />
        <MiniStat icon="star" label="Rating" value={k.rating == null ? '—' : k.rating.toFixed(1)} tint={{ bg: '#FEF7E0', fg: '#D97706' }} hint={`${k.reviews} review${k.reviews === 1 ? '' : 's'}`} />
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[15px] font-bold text-navy">Leads per month</h2>
          {LEADS_HREF[me.role] && <Link href={LEADS_HREF[me.role]} className="text-[12px] font-semibold text-brand hover:underline">Open leads →</Link>}
        </div>
        <AreaTrendChart labels={a.leadTrend.labels} points={a.leadTrend.points} height={220} />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-[15px] font-bold text-navy">Views by posting type</h2>
          {a.viewsByType.length === 0 ? <p className="text-[13px] text-ink-3">No postings yet.</p> : (
            <Bars rows={a.viewsByType.map((t) => ({ label: POST_TYPES[t.type]?.label ?? t.type, value: t.views, sub: `${t.posts} posted` }))} />
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-[15px] font-bold text-navy">Most viewed postings</h2>
          {a.topPosts.length === 0 ? <p className="text-[13px] text-ink-3">No postings yet.</p> : (
            <ol className="divide-y divide-line-soft">
              {a.topPosts.map((p, i) => {
                const cfg = POST_TYPES[p.type]
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="tabular w-5 text-[12px] font-semibold text-ink-4">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      {p.status === 'PUBLISHED' && cfg ? (
                        <Link href={`${cfg.publicPath}/${p.slug}`} className="block truncate text-[13px] font-semibold text-ink hover:text-brand">{p.title}</Link>
                      ) : <span className="block truncate text-[13px] font-semibold text-ink">{p.title}</span>}
                      <span className="text-[11.5px] text-ink-3">{cfg?.label ?? p.type}</span>
                    </span>
                    <span className="tabular text-[13px] font-semibold text-ink">{p.views.toLocaleString('en-IN')}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-[15px] font-bold text-navy">Where leads come from</h2>
          {a.leadSources.length === 0 ? <p className="text-[13px] text-ink-3">No leads yet.</p> : (
            <Bars rows={a.leadSources.map((s) => ({ label: SOURCE_LABEL[s.source] ?? s.source, value: s.count }))} />
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-[15px] font-bold text-navy">Leads by PIN code</h2>
          {a.leadAreas.length === 0 ? <p className="text-[13px] text-ink-3">No leads yet.</p> : (
            <Bars rows={a.leadAreas.map((r) => ({ label: r.pincode, sub: r.city ?? undefined, value: r.count }))} />
          )}
        </section>
      </div>
    </div>
  )
}
