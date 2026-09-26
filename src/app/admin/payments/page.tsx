import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel } from '@/components/admin/parts'
import { AreaTrendChart } from '@/components/admin/charts'
import { DataTable, Td, EmptyState } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { BUSINESS_RULES } from '@/config/permissions'
import { RefundControl } from './refund-control'

export const metadata: Metadata = { title: 'Payments & Transactions' }
export const dynamic = 'force-dynamic'

/**
 * PDF §7.11.1.8 — "Payment link and accounts statements."
 * Every rupee that moved through the platform: collected, refunded, failed —
 * with a monthly statement and the full transaction ledger.
 */

const PURPOSE_LABEL: Record<string, string> = {
  PACT_PURCHASE: 'PACT purchase',
  PACT_RENEWAL: 'PACT renewal',
  CLUB_MEMBERSHIP: 'Club membership',
  PORTAL_SPACE: 'Portal space',
  REGISTRATION_FEE: 'Registration fee',
  ADVERTISEMENT: 'Advertisement',
  MERCHANDISE_ORDER: 'Merchandise',
  COMPETITION_ENTRY: 'Competition entry',
  DA_INVOICE: 'DA invoice',
  CLUB_EVENT: 'Club event',
}

const STATUS_PILL: Record<string, string> = {
  PAID: 'pill-ok',
  CREATED: 'pill-muted',
  PENDING: 'pill-info',
  FAILED: 'pill-warn',
  REFUNDED: 'pill-muted',
  PARTIALLY_REFUNDED: 'pill-info',
}

const STATUSES = ['PAID', 'PENDING', 'CREATED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const

/** What can still be refunded (§6.1.2.2.6: 25% cap, 15-day window) — 0 when none. */
function refundLeft(p: { status: string; totalAmount: unknown; refundedAmount: unknown; paidAt: Date | null }) {
  if ((p.status !== 'PAID' && p.status !== 'PARTIALLY_REFUNDED') || !p.paidAt) return 0
  if (Date.now() > p.paidAt.getTime() + BUSINESS_RULES.REFUND_WINDOW_DAYS * 86_400_000) return 0
  const cap = Math.floor(Number(p.totalAmount) * BUSINESS_RULES.REFUND_MAX_PERCENT) / 100
  return Math.max(0, Math.round((cap - Number(p.refundedAmount)) * 100) / 100)
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; purpose?: string }>
}) {
  await requirePermission('admin:payments')
  const sp = await searchParams
  const status = STATUSES.find((s) => s === sp.status)
  const purpose = Object.keys(PURPOSE_LABEL).find((p) => p === sp.purpose)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [collected, thisMonth, refunded, failed30, byStatus, monthly, rows] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true }, _count: true }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({ _sum: { refundedAmount: true } }),
    prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.$queryRaw<{ b: Date; c: number }[]>`
      SELECT date_trunc('month', COALESCE("paidAt", "createdAt")) AS b, sum("totalAmount")::float AS c
      FROM "Payment"
      WHERE status = 'PAID' AND COALESCE("paidAt", "createdAt") >= now() - interval '6 months'
      GROUP BY 1 ORDER BY 1
    `,
    prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(purpose ? { purpose: purpose as never } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const countOf = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  const allCount = byStatus.reduce((a, r) => a + r._count._all, 0)

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

  const qs = (over: { status?: string; purpose?: string }) => {
    const p = new URLSearchParams()
    const s = 'status' in over ? over.status : status
    const pu = 'purpose' in over ? over.purpose : purpose
    if (s) p.set('status', s)
    if (pu) p.set('purpose', pu)
    const str = p.toString()
    return str ? `/admin/payments?${str}` : '/admin/payments'
  }

  return (
    <div className="space-y-5">
      <AdminPageHead title="Payments & Transactions">
        Accounts statement for the whole platform — every payment, refund and
        failure, with invoice numbers.
      </AdminPageHead>

      {/* stats */}
      <section className="grid grid-cols-4 gap-4">
        <MiniStat
          icon="rupee"
          label="Collected (all time)"
          value={formatINR(Number(collected._sum.totalAmount ?? 0))}
          tint={{ bg: '#E7F7EE', fg: '#16A34A' }}
          hint={`${collected._count} paid transactions`}
        />
        <MiniStat
          icon="calendar"
          label="This month"
          value={formatINR(Number(thisMonth._sum.totalAmount ?? 0))}
          tint={{ bg: '#FFEEE0', fg: '#F97316' }}
          hint="paid since the 1st"
        />
        <MiniStat
          icon="download"
          label="Refunded"
          value={formatINR(Number(refunded._sum.refundedAmount ?? 0))}
          tint={{ bg: '#E4EEFF', fg: '#2563EB' }}
          hint="max 25% within 15 days"
        />
        <MiniStat
          icon="alert"
          label="Failed (30 days)"
          value={failed30}
          tint={failed30 > 0 ? { bg: '#FFE9EC', fg: '#E11D48' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint={failed30 > 0 ? 'gateway errors to investigate' : 'no failures'}
        />
      </section>

      {/* statement chart */}
      <Panel title="Monthly Statement" subtitle="paid revenue, last 6 months">
        <AreaTrendChart
          labels={months.map((m) => m.label)}
          points={months.map((m) => byMonth.get(m.key) ?? 0)}
        />
      </Panel>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={qs({ status: undefined })}
          className={
            'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
            (!status ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
          }
        >
          All <span className={'tabular ' + (!status ? 'text-white/70' : 'text-ink-4')}>{allCount}</span>
        </Link>
        {STATUSES.map((s) => {
          const on = status === s
          return (
            <Link
              key={s}
              href={qs({ status: s })}
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

        <span className="mx-1 h-5 w-px bg-line" />

        <form method="get" className="flex items-center gap-1.5">
          {status && <input type="hidden" name="status" value={status} />}
          <select
            name="purpose"
            defaultValue={purpose ?? ''}
            className="h-8 rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink-2 focus:border-brand focus:outline-none"
          >
            <option value="">All purposes</option>
            {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-8 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink"
          >
            Apply
          </button>
        </form>
        <a href={`/admin/payments/export${qs({}).replace('/admin/payments', '')}`} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink-2 hover:border-brand hover:text-brand">
          Export CSV
        </a>
      </div>

      {/* ledger */}
      <Panel title={`Transactions — ${rows.length} shown, newest first`}>
        {rows.length === 0 ? (
          <EmptyState icon="rupee" title="No transactions match">
            Try a different status or purpose filter.
          </EmptyState>
        ) : (
          <DataTable bare head={['Invoice', 'User', 'Purpose', 'Amount', 'Status', 'Date', 'Action']}>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>
                  <span className="tabular block font-mono text-[12px] font-semibold text-ink">
                    {p.invoiceNumber ?? `#${p.id.slice(-8)}`}
                  </span>
                  {p.razorpayPaymentId && (
                    <span className="block text-[10.5px] text-ink-4">{p.razorpayPaymentId}</span>
                  )}
                </Td>
                <Td>
                  <span className="block text-[13px] text-ink">{p.user.name}</span>
                  <span className="block text-[11.5px] text-ink-3">{p.user.email}</span>
                </Td>
                <Td className="text-[12.5px] text-ink-2">{PURPOSE_LABEL[p.purpose] ?? p.purpose}</Td>
                <Td>
                  <span className="tabular block font-semibold text-ink">
                    {formatINR(Number(p.totalAmount))}
                  </span>
                  {Number(p.refundedAmount) > 0 && (
                    <span className="tabular block text-[11px] text-info">
                      −{formatINR(Number(p.refundedAmount))} refunded
                    </span>
                  )}
                </Td>
                <Td>
                  <span className={STATUS_PILL[p.status] ?? 'pill-muted'}>
                    {p.status.replace('_', ' ')}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-[12px] text-ink-3">
                  {new Date(p.paidAt ?? p.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Td>
                <Td>
                  {refundLeft(p) > 0 ? <RefundControl id={p.id} left={refundLeft(p)} /> : <span className="text-[11px] text-ink-4">—</span>}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  )
}
