import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { AreaTrendChart } from '@/components/admin/charts'
import { AdminPageHead, MiniStat, Panel, Pagination, fmtDate } from '@/components/admin/parts'
import { toggleSubscriberAction } from './actions'

export const metadata: Metadata = { title: 'Newsletter' }
export const dynamic = 'force-dynamic'

/**
 * Newsletter — every address collected by the public sign-up forms, where it
 * came from, the 6-month growth curve, and a CSV of the active list for
 * whichever mailing tool sends the newsletter.
 */

const PER_PAGE = 20

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; page?: string }>
}) {
  await requirePermission('admin:reports')
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 80)
  const status = sp.status === 'unsubscribed' ? 'unsubscribed' : sp.status === 'all' ? 'all' : 'active'
  const page = Math.max(1, Number(sp.page) || 1)

  const where = {
    ...(status === 'active' ? { unsubscribedAt: null } : status === 'unsubscribed' ? { unsubscribedAt: { not: null } } : {}),
    ...(sp.source ? { source: sp.source } : {}),
    ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}),
  }
  const since30 = new Date(Date.now() - 30 * 86_400_000)
  const [rows, total, active, unsub, new30, bySource, monthly] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
    prisma.newsletterSubscriber.count({ where: { createdAt: { gte: since30 } } }),
    prisma.newsletterSubscriber.groupBy({ by: ['source'], where: { unsubscribedAt: null }, _count: { _all: true }, orderBy: { _count: { source: 'desc' } } }),
    prisma.$queryRaw<{ b: Date; c: number }[]>`
      SELECT date_trunc('month', "createdAt") AS b, count(*)::int AS c
      FROM "NewsletterSubscriber" WHERE "createdAt" >= now() - interval '6 months' GROUP BY 1`,
  ])

  const months: { label: string; key: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push({ label: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }), key: `${d.getUTCFullYear()}-${d.getUTCMonth()}` })
  }
  const byMonth = new Map(monthly.map((r) => { const d = new Date(r.b); return [`${d.getUTCFullYear()}-${d.getUTCMonth()}`, Number(r.c)] }))
  const maxSource = Math.max(1, ...bySource.map((s) => s._count._all))
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { q: q || undefined, status: status === 'active' ? undefined : status, source: sp.source, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `/admin/newsletter?${s}` : '/admin/newsletter'
  }

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Newsletter"
        action={
          <a href="/admin/newsletter/export" download className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-navy/90">
            <Icon name="download" className="h-4 w-4" /> Export active list (CSV)
          </a>
        }
      />

      <section className="grid grid-cols-4 gap-4">
        <MiniStat icon="mail" label="Active subscribers" value={active} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="will receive the newsletter" />
        <MiniStat icon="trending" label="New in 30 days" value={new30} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="sign-ups" />
        <MiniStat icon="alert" label="Unsubscribed" value={unsub} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint="kept for the record" />
        <MiniStat icon="globe" label="Sign-up sources" value={bySource.length} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint="pages collecting emails" />
      </section>

      <section className="grid grid-cols-[1.5fr_1fr] gap-5">
        <Panel title="Sign-ups" subtitle="last 6 months">
          <AreaTrendChart labels={months.map((m) => m.label)} points={months.map((m) => byMonth.get(m.key) ?? 0)} />
        </Panel>
        <Panel title="Where they signed up">
          {bySource.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-ink-3">No subscribers yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {bySource.map((s) => (
                <li key={s.source}>
                  <Link href={qs({ source: s.source, page: undefined })} className="flex items-center gap-2.5 hover:text-brand">
                    <span className="w-[110px] shrink-0 truncate text-[12px] capitalize text-ink-2">{s.source.replace(/-/g, ' ')}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-[#6366F1]" style={{ width: `${(s._count._all / maxSource) * 100}%` }} /></span>
                    <span className="tabular w-10 shrink-0 text-right text-[12px] font-semibold text-ink">{s._count._all}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel
        title="Subscribers"
        subtitle={String(total)}
        action={
          <div className="flex items-center gap-2">
            {(['active', 'unsubscribed', 'all'] as const).map((s) => (
              <Link key={s} href={qs({ status: s === 'active' ? undefined : s, page: undefined })}
                className={'rounded-pill px-3 py-1 text-[12px] font-medium capitalize ' + (status === s ? 'bg-brand text-white' : 'border border-line text-ink-2 hover:border-ink-4')}>
                {s}
              </Link>
            ))}
            {sp.source && <Link href={qs({ source: undefined, page: undefined })} className="text-[12px] text-ink-3 hover:text-brand">Source: {sp.source} ×</Link>}
            <form method="get" className="flex gap-1.5">
              {status !== 'active' && <input type="hidden" name="status" value={status} />}
              {sp.source && <input type="hidden" name="source" value={sp.source} />}
              <input name="q" defaultValue={q} placeholder="Search email…" className="h-8 w-[180px] rounded-lg border border-line px-2.5 text-[12px] focus:border-brand focus:outline-none" />
            </form>
          </div>
        }
      >
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-3">No subscribers match.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                <th className="py-2 font-semibold">Email</th><th className="py-2 font-semibold">Source</th>
                <th className="py-2 font-semibold">Subscribed</th><th className="py-2 font-semibold">Status</th><th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((r) => (
                <tr key={r.id} className="text-[12.5px]">
                  <td className="py-2.5 font-medium text-ink">{r.email}</td>
                  <td className="py-2.5 capitalize text-ink-3">{r.source.replace(/-/g, ' ')}</td>
                  <td className="py-2.5 text-ink-3">{fmtDate(r.createdAt)}</td>
                  <td className="py-2.5">
                    <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (r.unsubscribedAt ? 'bg-paper-3 text-ink-3' : 'bg-ok-soft text-ok')}>
                      {r.unsubscribedAt ? `Unsubscribed ${fmtDate(r.unsubscribedAt)}` : 'Active'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <form action={toggleSubscriberAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="rounded-md border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:border-brand hover:text-brand">
                        {r.unsubscribedAt ? 'Resubscribe' : 'Unsubscribe'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="mt-4 flex justify-end"><Pagination page={page} pages={pages} makeHref={(n) => qs({ page: String(n) })} perPageLabel={`${PER_PAGE} per page`} /></div>
        )}
      </Panel>
    </div>
  )
}
