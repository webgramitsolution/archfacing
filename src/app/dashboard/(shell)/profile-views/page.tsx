import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { MiniStat } from '@/components/admin/parts'
import { AreaTrendChart } from '@/components/admin/charts'
import { profileViewStats } from '@/lib/profile-views'
import { ago } from '@/components/admin/parts'

export const metadata: Metadata = { title: 'Profile Views' }
export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  VISITOR: 'Visitors (not signed in)', CLIENT: 'Buyers / clients', PROFESSIONAL: 'Professionals', CONSULTANT: 'Consultants',
  BMF: 'BMFs', CORPORATE: 'Corporates', ADVERTISER: 'Advertisers',
}

function pct(now: number, before: number): string | undefined {
  if (!before) return undefined
  const p = Math.round(((now - before) / before) * 100)
  return `${p >= 0 ? '↑' : '↓'} ${Math.abs(p)}% vs previous 30 days`
}

/** Who opened this member's public storefront — counted once per visitor per day. */
export default async function ProfileViewsPage() {
  const me = await requireRole('PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE')
  const [u, s] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, select: { sellerSlug: true } }),
    profileViewStats(me.id),
  ])
  const max = Math.max(1, ...s.byRole.map((r) => r.count))

  return (
    <div className="space-y-5">
      <PageHeading title="Profile Views" />

      {!u?.sellerSlug && (
        <p className="rounded-card border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink-2">
          Your public page is not live yet, so nobody can view it. Complete your profile and business details to get one.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat icon="eye" label="Views, last 30 days" value={s.last30.toLocaleString('en-IN')} tint={{ bg: '#EAF2FF', fg: '#2563EB' }} hint={pct(s.last30, s.prev30)} />
        <MiniStat icon="users" label="Signed-in viewers" value={s.signedIn30.toLocaleString('en-IN')} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="last 30 days" />
        <MiniStat icon="globe" label="Anonymous visitors" value={(s.last30 - s.signedIn30).toLocaleString('en-IN')} tint={{ bg: '#FEF7E0', fg: '#D97706' }} hint="last 30 days" />
        <MiniStat icon="chart" label="All-time views" value={s.total.toLocaleString('en-IN')} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="since tracking began" />
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[15px] font-bold text-navy">Daily views</h2>
          {u?.sellerSlug && <Link href={`/${u.sellerSlug}`} className="text-[12px] font-semibold text-brand hover:underline">Open my public page →</Link>}
        </div>
        <AreaTrendChart labels={s.daily.labels} points={s.daily.points} height={220} everyNthLabel={5} />
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-[15px] font-bold text-navy">Who is looking</h2>
          {s.byRole.length === 0 ? <p className="text-[13px] text-ink-3">No views in the last 30 days.</p> : (
            <ul className="space-y-2.5">
              {s.byRole.map((r) => (
                <li key={r.role}>
                  <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-ink-2">{ROLE_LABEL[r.role] ?? r.role}</span><span className="tabular font-semibold text-ink">{r.count}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-3"><div className="h-full rounded-full bg-brand" style={{ width: `${(r.count / max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          {s.byCity.length > 0 && (
            <p className="mt-4 text-[12px] text-ink-3">Top cities (signed-in viewers): {s.byCity.map((c) => `${c.city} (${c.count})`).join(', ')}</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-display text-[15px] font-bold text-navy">Recent signed-in viewers</h2>
          {s.recent.length === 0 ? <p className="text-[13px] text-ink-3">No signed-in member has viewed your page yet.</p> : (
            <ul className="divide-y divide-line-soft">
              {s.recent.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    {r.href ? <Link href={r.href} className="block truncate text-[13px] font-semibold text-ink hover:text-brand">{r.name}</Link>
                      : <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>}
                    <span className="text-[11.5px] text-ink-3">{ROLE_LABEL[r.role]?.replace(/s$/, '') ?? r.role}{r.city ? ` · ${r.city}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-ink-4">{ago(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
