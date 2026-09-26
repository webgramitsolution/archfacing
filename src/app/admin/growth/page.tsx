import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel, ago } from '@/components/admin/parts'
import { AreaTrendChart } from '@/components/admin/charts'
import { DataTable, Td, EmptyState } from '@/components/ui'
import { platformOverview } from '@/lib/admin-metrics'

export const metadata: Metadata = { title: 'Growth & Leads' }
export const dynamic = 'force-dynamic'

/**
 * Growth & leads — where demand shows up. Every Consult-Nearby enquiry is a
 * lead; an UNROUTED one is a lead with no PACT holder to receive it, which is
 * both a service failure and a PACT sales signal.
 */

const ENQ_PILL: Record<string, string> = {
  NEW: 'pill-info',
  ASSIGNED: 'pill-info',
  IN_PROGRESS: 'pill-warn',
  RESPONDED: 'pill-ok',
  CONVERTED: 'pill-ok',
  CLOSED: 'pill-muted',
  UNROUTED: 'pill-warn',
}

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requirePermission('admin:leads')
  const { status: rawStatus } = await searchParams
  const statuses = ['UNROUTED', 'NEW', 'ASSIGNED', 'RESPONDED', 'CONVERTED'] as const
  const filter = statuses.find((s) => s === rawStatus)

  const since30 = new Date(Date.now() - 30 * 86_400_000)
  const [total, new30, unrouted, converted, byStatus, overview, rows] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { createdAt: { gte: since30 } } }),
    prisma.enquiry.count({ where: { status: 'UNROUTED' } }),
    prisma.enquiry.count({ where: { status: 'CONVERTED' } }),
    prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    platformOverview('daily'),
    prisma.enquiry.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, subject: true, contactName: true, contactPhone: true,
        pincode: true, serviceType: true, status: true, createdAt: true,
      },
    }),
  ])

  const countOf = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  const signups = overview.series.find((s) => s.label === 'Users')
  const enquirySeries = overview.series.find((s) => s.label === 'Enquiries')

  return (
    <div className="space-y-5">
      <div className="rise">
        <AdminPageHead title="Growth & leads">
          Demand on the platform — sign-ups, Consult-Nearby enquiries, and the
          unrouted ones that point at PIN codes worth selling a PACT in.
        </AdminPageHead>
      </div>

      <section className="rise rise-1 grid grid-cols-4 gap-4">
        <MiniStat icon="inbox" label="Total enquiries" value={total} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} />
        <MiniStat icon="trending" label="New (30 days)" value={new30} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} />
        <MiniStat
          icon="alert" label="Unrouted" value={unrouted}
          tint={unrouted > 0 ? { bg: '#FEF2E2', fg: '#EA9412' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint={unrouted > 0 ? 'no PACT holder for these PINs' : 'all routed'}
        />
        <MiniStat icon="check" label="Converted" value={converted} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint="became real work" />
      </section>

      <section className="rise rise-2 grid grid-cols-2 gap-5">
        <Panel title="Sign-ups" subtitle="last 30 days, daily">
          <AreaTrendChart labels={overview.labels} points={signups?.points ?? []} everyNthLabel={5} />
        </Panel>
        <Panel title="Enquiries" subtitle="last 30 days, daily">
          <AreaTrendChart labels={overview.labels} points={enquirySeries?.points ?? []} everyNthLabel={5} />
        </Panel>
      </section>

      <div className="rise rise-3 space-y-4">
        {/* status filter */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/growth"
            className={
              'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
              (!filter ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
            }
          >
            All <span className={'tabular ' + (!filter ? 'text-white/70' : 'text-ink-4')}>{total}</span>
          </Link>
          {statuses.map((s) => {
            const on = filter === s
            return (
              <Link
                key={s}
                href={`/admin/growth?status=${s}`}
                className={
                  'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ' +
                  (on ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
                }
              >
                {s.toLowerCase().replace('_', ' ')}
                <span className={'tabular ' + (on ? 'text-white/70' : 'text-ink-4')}>{countOf(s)}</span>
              </Link>
            )
          })}
        </div>

        <Panel title={`Leads — ${rows.length} shown, newest first`}>
          {rows.length === 0 ? (
            <EmptyState icon="inbox" title="No enquiries here">
              Try a different status filter.
            </EmptyState>
          ) : (
            <DataTable bare head={['Enquiry', 'Contact', 'PIN', 'Service', 'Status', 'When']}>
              {rows.map((e) => (
                <tr key={e.id} className="row-hover">
                  <Td>
                    <span className="block max-w-[260px] truncate text-[13px] font-medium text-ink">{e.subject}</span>
                  </Td>
                  <Td>
                    <span className="block text-[12.5px] text-ink-2">{e.contactName}</span>
                    <span className="block text-[11.5px] text-ink-3">{e.contactPhone}</span>
                  </Td>
                  <Td className="tabular font-mono text-[12.5px] text-ink">{e.pincode}</Td>
                  <Td className="text-[12.5px] text-ink-2">{e.serviceType}</Td>
                  <Td>
                    <span className={ENQ_PILL[e.status] ?? 'pill-muted'}>{e.status.replace('_', ' ')}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-[12px] text-ink-3">{ago(e.createdAt)}</Td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
    </div>
  )
}
