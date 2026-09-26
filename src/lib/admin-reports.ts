import { prisma } from '@/lib/prisma'
import { inLastMonth, inThisMonth, momPct, monthWindows } from '@/lib/mom'
import type { IconName } from '@/components/ui'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the "Reports" analytics dashboard — every figure a live query.
 * Reuses the shared metric helpers for distribution / categories / geo; this
 * file adds the report-specific stat cards, trend series and ranking tables.
 */

const DAY = 86_400_000

/** `pct` is measured month-over-month, or null when last month had nothing to compare. */
export type ReportStat = { key: string; label: string; icon: IconName; value: string; pct: number | null; tint: Tint }
export type TrendSeries = { labels: string[]; bars: number[]; line: number[] }
export type ReportOverview = {
  stats: ReportStat[]
  ordersRevenue: TrendSeries
  enquiriesRfqs: TrendSeries
  /** `count` is this calendar month; `pct` compares it with last month. */
  summary: { icon: IconName; label: string; count: number; pct: number | null; tint: Tint }[]
  topOrders: { id: string; name: string; orders: number; value: number }[]
}

const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN')

function dailySeries(rows: { b: Date; c: number }[]): { labels: string[]; points: number[] } {
  const dayKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  const map = new Map(rows.map((r) => [dayKey(new Date(r.b)), Number(r.c)]))
  const labels: string[] = []
  const points: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    points.push(map.get(dayKey(d)) ?? 0)
  }
  return { labels, points }
}

export async function reportOverview(): Promise<ReportOverview> {
  const since30 = new Date(Date.now() - 29 * DAY)
  const [
    totalUsers, corpBmf, companyBuyers, totalOrders, rfqs, leadClients, revenueAgg,
    orderDaily, revenueDaily, enquiryDaily, rfqDaily,
    topOrderRows,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ['CORPORATE', 'BMF'] }, deletedAt: null } }),
    prisma.user.count({ where: { role: 'CLIENT', buyerProfile: { accountType: 'COMPANY' } } }),
    prisma.order.count(),
    prisma.enquiry.count(),
    prisma.enquiry.findMany({ distinct: ['clientId'], select: { clientId: true } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.$queryRaw<{ b: Date; c: number }[]>`SELECT date_trunc('day',"createdAt") b, count(*)::int c FROM "Order" WHERE "createdAt" >= ${since30} GROUP BY 1`,
    prisma.$queryRaw<{ b: Date; c: number }[]>`SELECT date_trunc('day',"createdAt") b, coalesce(sum("totalAmount"),0)::int c FROM "Payment" WHERE status = 'PAID' AND "createdAt" >= ${since30} GROUP BY 1`,
    prisma.$queryRaw<{ b: Date; c: number }[]>`SELECT date_trunc('day',"createdAt") b, count(*)::int c FROM "Enquiry" WHERE "createdAt" >= ${since30} GROUP BY 1`,
    prisma.$queryRaw<{ b: Date; c: number }[]>`SELECT date_trunc('day',"createdAt") b, count(*)::int c FROM "Enquiry" WHERE "serviceType" IS NOT NULL AND "createdAt" >= ${since30} GROUP BY 1`,
    prisma.order.groupBy({ by: ['userId'], _count: true, _sum: { total: true }, orderBy: { _count: { userId: 'desc' } }, take: 5 }),
  ])

  const revenue = Number(revenueAgg._sum.totalAmount ?? 0)

  const w = monthWindows()
  const both = <T,>(q: (r: { gte: Date; lt?: Date }) => Promise<T>) => Promise.all([q(inThisMonth(w)), q(inLastMonth(w))])
  const companyWhere = (createdAt: { gte: Date; lt?: Date }) => ({
    deletedAt: null,
    createdAt,
    OR: [
      { role: { in: ['CORPORATE', 'BMF'] as ('CORPORATE' | 'BMF')[] } },
      { role: 'CLIENT' as const, buyerProfile: { accountType: 'COMPANY' as const } },
    ],
  })
  const [
    [usersT, usersL], [compT, compL], [ordT, ordL], [rfqT, rfqL], [revT, revL], [leadT, leadL],
    [regT, regL], [ordPT, ordPL], [rfqST, rfqSL], [enqT, enqL],
  ] = await Promise.all([
    both((createdAt) => prisma.user.count({ where: { deletedAt: null, createdAt } })),
    both((createdAt) => prisma.user.count({ where: companyWhere(createdAt) })),
    both((createdAt) => prisma.order.count({ where: { createdAt } })),
    both((createdAt) => prisma.enquiry.count({ where: { createdAt } })),
    both((createdAt) => prisma.payment.aggregate({ where: { status: 'PAID', createdAt }, _sum: { totalAmount: true } }).then((a) => Number(a._sum.totalAmount ?? 0))),
    both((createdAt) => prisma.enquiry.findMany({ where: { createdAt }, distinct: ['clientId'], select: { clientId: true } }).then((r) => r.length)),
    both((createdAt) => prisma.auditLog.count({ where: { action: 'REGISTRATION', createdAt } })),
    both((createdAt) => prisma.auditLog.count({ where: { action: 'ORDER_PLACED', createdAt } })),
    both((createdAt) => prisma.auditLog.count({ where: { action: 'RFQ_SUBMITTED', createdAt } })),
    both((createdAt) => prisma.auditLog.count({ where: { action: 'ENQUIRY', createdAt } })),
  ])

  const stats: ReportStat[] = [
    { key: 'users', label: 'Total Users', icon: 'users', value: totalUsers.toLocaleString('en-IN'), pct: momPct(usersT, usersL), tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'companies', label: 'Active Companies', icon: 'building', value: (corpBmf + companyBuyers).toLocaleString('en-IN'), pct: momPct(compT, compL), tint: { bg: '#EAF2FF', fg: '#2563EB' } },
    { key: 'orders', label: 'Total Orders', icon: 'bag', value: totalOrders.toLocaleString('en-IN'), pct: momPct(ordT, ordL), tint: { bg: '#FEF3E0', fg: '#D97706' } },
    { key: 'rfqs', label: 'RFQs Received', icon: 'file', value: rfqs.toLocaleString('en-IN'), pct: momPct(rfqT, rfqL), tint: { bg: '#FDE9EF', fg: '#DB2777' } },
    { key: 'revenue', label: 'Total Revenue', icon: 'rupee', value: fmtINR(revenue), pct: momPct(revT, revL), tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'leads', label: 'Total Leads', icon: 'target', value: leadClients.length.toLocaleString('en-IN'), pct: momPct(leadT, leadL), tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  ]

  const od = dailySeries(orderDaily)
  const rd = dailySeries(revenueDaily)
  const ed = dailySeries(enquiryDaily)
  const qd = dailySeries(rfqDaily)

  const summary: ReportOverview['summary'] = [
    { icon: 'users', label: 'New User Registrations', count: regT, pct: momPct(regT, regL), tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { icon: 'building', label: 'New Company Clients', count: compT, pct: momPct(compT, compL), tint: { bg: '#EAF2FF', fg: '#2563EB' } },
    { icon: 'bag', label: 'Orders Placed', count: ordPT, pct: momPct(ordPT, ordPL), tint: { bg: '#FEF3E0', fg: '#D97706' } },
    { icon: 'file', label: 'RFQs Submitted', count: rfqST, pct: momPct(rfqST, rfqSL), tint: { bg: '#FDE9EF', fg: '#DB2777' } },
    { icon: 'inbox', label: 'Product Enquiries', count: enqT, pct: momPct(enqT, enqL), tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  ]

  const topIds = topOrderRows.map((r) => r.userId)
  const topUsers = await prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true, buyerProfile: { select: { companyName: true, accountType: true } } } })
  const nameOf = new Map(topUsers.map((u) => [u.id, u.buyerProfile?.accountType === 'COMPANY' ? u.buyerProfile.companyName ?? u.name : u.name]))
  const topOrders = topOrderRows.map((r) => ({ id: r.userId, name: nameOf.get(r.userId) ?? 'Unknown', orders: r._count, value: Number(r._sum.total ?? 0) }))


  return {
    stats,
    ordersRevenue: { labels: od.labels, bars: od.points, line: rd.points },
    enquiriesRfqs: { labels: ed.labels, bars: ed.points, line: qd.points },
    summary, topOrders,
  }
}
