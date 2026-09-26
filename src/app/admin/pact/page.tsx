import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { AreaTrendChart, DonutChart } from '@/components/admin/charts'
import { AdminPageHead, MiniStat, Panel } from '@/components/admin/parts'
import { DataTable, Td, EmptyState } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { CONSULTANT_SUBCATEGORY_SLUGS } from '@/config/taxonomy'
import { AssignPactForm } from './assign-form'
import { PactRowActions, PactPriceRow } from './pact-controls'
import { BUSINESS_RULES, termYears } from '@/config/permissions'

export const metadata: Metadata = { title: 'PACT Areas' }
export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, string> = {
  ACTIVE: 'pill-ok',
  RESERVED: 'pill-info',
  SUSPENDED: 'pill-warn',
  EXPIRED: 'pill-muted',
  TRANSFERRED: 'pill-muted',
}

const SERVICE_COLOR: Record<string, string> = {
  DESIGNA: '#F97316',
  DESIGNI: '#8B5CF6',
  CONSULTANT: '#2563EB',
  BMF: '#16A34A',
  CORPORATE: '#6B7280',
}

const DAY = 86_400_000

export default async function AdminPactPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  await requirePermission('admin:pact')
  const { status: rawStatus, q: rawQ } = await searchParams
  const q = (rawQ ?? '').trim().slice(0, 80)
  const statuses = ['ACTIVE', 'RESERVED', 'SUSPENDED', 'EXPIRED'] as const
  const filter = statuses.find((s) => s === rawStatus)

  const in30 = new Date(Date.now() + 30 * DAY)
  const [byStatus, byService, expiring, revenue, prices, rows, monthly] = await Promise.all([
    prisma.pact.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.pact.groupBy({ by: ['serviceType'], where: { status: 'ACTIVE' }, _count: { _all: true } }),
    prisma.pact.count({ where: { status: 'ACTIVE', expiresAt: { gte: new Date(), lte: in30 } } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', purpose: { in: ['PACT_PURCHASE', 'PACT_RENEWAL'] } },
      _sum: { totalAmount: true },
    }),
    prisma.pactPrice.findMany({ where: { isActive: true }, orderBy: { serviceType: 'asc' } }),
    prisma.pact.findMany({
      where: {
        ...(filter ? { status: filter } : { status: { in: ['ACTIVE', 'RESERVED', 'SUSPENDED'] } }),
        // PIN, city or holder — one box finds a seat however the admin remembers it.
        ...(q
          ? {
              OR: [
                { pincode: { startsWith: q } },
                { city: { contains: q, mode: 'insensitive' as const } },
                { holder: { name: { contains: q, mode: 'insensitive' as const } } },
                { holder: { email: { contains: q, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: { holder: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.$queryRaw<{ b: Date; c: number }[]>`
      SELECT date_trunc('month', "purchasedAt") AS b, count(*)::int AS c
      FROM "Pact"
      WHERE "purchasedAt" IS NOT NULL AND "purchasedAt" >= now() - interval '6 months'
      GROUP BY 1 ORDER BY 1
    `,
  ])

  const countOf = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  const active = countOf('ACTIVE')
  const totalSeats = byStatus.reduce((a, r) => a + r._count._all, 0)

  // last 6 calendar months, zero-filled
  const months: { label: string; key: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push({
      label: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
    })
  }
  const byMonth = new Map(
    monthly.map((r) => {
      const d = new Date(r.b)
      return [`${d.getUTCFullYear()}-${d.getUTCMonth()}`, Number(r.c)]
    })
  )
  const trendPoints = months.map((m) => byMonth.get(m.key) ?? 0)

  const serviceSlices = byService
    .map((r) => ({
      label: r.serviceType,
      value: r._count._all,
      color: SERVICE_COLOR[r.serviceType] ?? '#6B7280',
    }))
    .filter((s) => s.value > 0)

  const statusSlices = [
    { label: 'Active', value: active, color: '#16A34A' },
    { label: 'Reserved', value: countOf('RESERVED'), color: '#2563EB' },
    { label: 'Suspended', value: countOf('SUSPENDED'), color: '#EA9412' },
    { label: 'Expired', value: countOf('EXPIRED'), color: '#9CA3AF' },
  ].filter((s) => s.value > 0)

  const pillRow: { key: string | undefined; label: string; count: number }[] = [
    { key: undefined, label: 'Current', count: active + countOf('RESERVED') + countOf('SUSPENDED') },
    { key: 'ACTIVE', label: 'Active', count: active },
    { key: 'RESERVED', label: 'Reserved', count: countOf('RESERVED') },
    { key: 'SUSPENDED', label: 'Suspended', count: countOf('SUSPENDED') },
    { key: 'EXPIRED', label: 'Expired', count: countOf('EXPIRED') },
  ]

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="PACT Area Management"
        action={
          <Link
            href="/pact"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
          >
            <Icon name="map" className="h-4 w-4" />
            Public PACT page
          </Link>
        }
      >
        Territory allotment, pricing and cessation — every PIN code seat the platform
        has sold or reserved. Validity is {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)} per territory.
      </AdminPageHead>

      {/* stats */}
      <section className="grid grid-cols-5 gap-4">
        <MiniStat icon="map" label="Active PACT" value={active} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint={`${totalSeats} seats ever issued`} />
        <MiniStat icon="clock" label="Payment pending" value={countOf('RESERVED')} tint={{ bg: '#E4EEFF', fg: '#2563EB' }} hint="15-min reservations" />
        <MiniStat icon="alert" label="Suspended" value={countOf('SUSPENDED')} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint="complaint / inactivity" />
        <MiniStat icon="calendar" label="Expiring in 30 days" value={expiring} tint={{ bg: '#FFE9EC', fg: '#E11D48' }} hint="renewal reminders due" />
        <MiniStat icon="rupee" label="PACT revenue" value={formatINR(Number(revenue._sum.totalAmount ?? 0))} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint="purchases + renewals" />
      </section>

      {/* charts */}
      <section className="grid grid-cols-[1.5fr_1fr_1fr] gap-5">
        <Panel title="PACT Purchases" subtitle="last 6 months">
          <AreaTrendChart labels={months.map((m) => m.label)} points={trendPoints} />
        </Panel>
        <Panel title="Active by Service">
          <div className="pt-2">
            {serviceSlices.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-ink-3">No active PACT yet.</p>
            ) : (
              <DonutChart
                total={serviceSlices.reduce((a, s) => a + s.value, 0)}
                slices={serviceSlices}
                centerLabel="Active"
                showCounts
                stacked
              />
            )}
          </div>
        </Panel>
        <Panel title="Seat Status">
          <div className="pt-2">
            {statusSlices.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-ink-3">No seats issued yet.</p>
            ) : (
              <DonutChart
                total={totalSeats}
                slices={statusSlices}
                centerLabel="Seats"
                showCounts
                stacked
              />
            )}
          </div>
        </Panel>
      </section>

      {/* table + pricing rail */}
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-4">
          {/* status filter + search */}
          <form method="get" className="flex items-center gap-2">
            {filter && <input type="hidden" name="status" value={filter} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search PIN, city, holder name or email…"
              className="h-9 flex-1 rounded-lg border border-line bg-white px-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
            />
            <button type="submit" className="h-9 rounded-lg bg-brand px-4 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Search</button>
            {q && <Link href={filter ? `/admin/pact?status=${filter}` : '/admin/pact'} className="text-[12px] font-medium text-ink-3 hover:text-brand">Clear</Link>}
          </form>
          <div className="flex flex-wrap gap-1.5">
            {pillRow.map((p) => {
              const on = filter === p.key
              const href = p.key ? `/admin/pact?status=${p.key}` : '/admin/pact'
              return (
                <Link
                  key={p.label}
                  href={href}
                  className={
                    'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
                    (on ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
                  }
                >
                  {p.label}
                  <span className={'tabular ' + (on ? 'text-white/70' : 'text-ink-4')}>{p.count}</span>
                </Link>
              )
            })}
          </div>

          <Panel title={`Territories — ${rows.length} shown`}>
            {rows.length === 0 ? (
              <EmptyState icon="map" title="Nothing here">
                No territory matches this filter yet.
              </EmptyState>
            ) : (
              <DataTable bare head={['PIN', 'Service', 'Holder', 'Status', 'Valid until', 'Actions']}>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <span className="tabular block font-mono font-semibold text-ink">{p.pincode}</span>
                      <span className="block text-[11.5px] text-ink-3">
                        {p.city ? `${p.city}, ` : ''}{p.state}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[13px] text-ink">{p.serviceType}</span>
                      {p.subCategory !== '-' && (
                        <span className="block text-[11.5px] text-ink-3">{p.subCategory.replace(/-/g, ' ')}</span>
                      )}
                    </Td>
                    <Td>
                      <span className="block text-[13px] text-ink">{p.holder?.name ?? '—'}</span>
                      <span className="block text-[11.5px] text-ink-3">{p.holder?.email}</span>
                    </Td>
                    <Td>
                      <span className={STATUS_PILL[p.status] ?? 'pill-muted'}>{p.status}</span>
                      {p.suspensionReason && (
                        <span className="mt-1 block max-w-[14rem] text-[11.5px] text-warn">{p.suspensionReason}</span>
                      )}
                    </Td>
                    <Td className="text-[12.5px] text-ink-2">
                      {p.expiresAt
                        ? new Date(p.expiresAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                        : p.reservedTill
                          ? 'Payment pending'
                          : '—'}
                    </Td>
                    <Td className="text-right">
                      <PactRowActions id={p.id} status={p.status} />
                    </Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </div>

        {/* assign + pricing rail */}
        <div className="w-[320px] shrink-0 space-y-5">
          <Panel title="Assign a PACT" subtitle="offline deal / complimentary">
            <AssignPactForm consultantSubs={CONSULTANT_SUBCATEGORY_SLUGS} />
          </Panel>

          <Panel title="Pricing" subtitle="admin-controlled">
            <ul className="divide-y divide-line-soft">
              {(['DESIGNA', 'DESIGNI', 'CONSULTANT', 'BMF'] as const).map((svc) => {
                // The all-states row is the list price; state overrides stay as they are.
                const p = prices.find((x) => x.serviceType === svc && x.state == null) ?? prices.find((x) => x.serviceType === svc)
                return (
                  <PactPriceRow
                    key={svc}
                    serviceType={svc}
                    price={p ? Number(p.price) : 0}
                    renewalPrice={p?.renewalPrice != null ? Number(p.renewalPrice) : null}
                    taxPercent={p ? Number(p.taxPercent) : 18}
                  />
                )
              })}
            </ul>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] leading-snug text-ink-3">
              <Icon name="help" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink-4" />
              Pricing and per-person territory assignment are controlled from here —
              a buyer only ever sees the list price.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
