import { prisma } from '@/lib/prisma'

/**
 * Everything the "My PACT" tab shows, for ONE holder.
 *
 * Security: every query is scoped by `holderId` / `holderId`-owned pincodes, so
 * a reader can only ever see their own territories and their own leads. The
 * caller is responsible for authenticating; this never takes a holder id from
 * the client.
 *
 * Nothing here is invented — lead counts come from real `Enquiry` rows routed
 * to this holder, and the response rate is the share of those the holder has
 * actually replied to.
 */

export type PactRow = {
  id: string
  pincode: string
  city: string | null
  state: string
  serviceType: string
  subCategory: string | null
  status: string
  /** ISO, or null when a reservation has not been paid for yet. */
  expiresAt: string | null
  daysLeft: number | null
  /** Enquiries routed to this holder from this PIN code. */
  leadsTotal: number
  leadsThisMonth: number
}

export type MyPactData = {
  rows: PactRow[]
  activeCount: number
  expiringSoon: number
  totalLeads: number
  leadsThisMonth: number
  /** Percentage of routed enquiries this holder has replied to, or null. */
  responseRate: number | null
  /** Territory count per service type, for the breakdown ring. */
  byCategory: { label: string; count: number }[]
  canBuy: boolean
}

const SERVICE_LABEL: Record<string, string> = {
  DESIGNA: 'Architecture',
  DESIGNI: 'Interior Design',
  CONSULTANT: 'Consultant',
  BMF: 'Building Material',
}

export function serviceLabel(t: string): string {
  return SERVICE_LABEL[t] ?? t
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000)
}

export async function myPactData(holderId: string, accountActive: boolean): Promise<MyPactData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const pacts = await prisma.pact.findMany({
    where: { holderId, status: { in: ['ACTIVE', 'RESERVED', 'SUSPENDED'] } },
    orderBy: [{ expiresAt: 'asc' }, { purchasedAt: 'desc' }],
    select: {
      id: true, pincode: true, city: true, state: true,
      serviceType: true, subCategory: true, status: true, expiresAt: true,
    },
  })

  const pincodes = [...new Set(pacts.map((p) => p.pincode))]

  /*
   * Leads per PIN code — counted from the enquiries actually routed to this
   * holder, grouped in one query rather than one per row.
   */
  const [leadGroups, monthGroups, respondedCount, routedCount] = await Promise.all([
    pincodes.length
      ? prisma.enquiry.groupBy({
          by: ['pincode'],
          where: { holderId, pincode: { in: pincodes } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { pincode: string; _count: { _all: number } }[]),
    pincodes.length
      ? prisma.enquiry.groupBy({
          by: ['pincode'],
          where: { holderId, pincode: { in: pincodes }, createdAt: { gte: monthStart } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { pincode: string; _count: { _all: number } }[]),
    prisma.enquiry.count({
      where: { holderId, status: { in: ['RESPONDED', 'CONVERTED', 'CLOSED'] } },
    }),
    prisma.enquiry.count({ where: { holderId } }),
  ])

  const totalBy = new Map(leadGroups.map((g) => [g.pincode, g._count._all]))
  const monthBy = new Map(monthGroups.map((g) => [g.pincode, g._count._all]))

  const rows: PactRow[] = pacts.map((p) => ({
    id: p.id,
    pincode: p.pincode,
    city: p.city,
    state: p.state,
    serviceType: p.serviceType,
    subCategory: p.subCategory && p.subCategory !== '-' ? p.subCategory : null,
    status: p.status,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    daysLeft: p.expiresAt ? daysBetween(now, p.expiresAt) : null,
    leadsTotal: totalBy.get(p.pincode) ?? 0,
    leadsThisMonth: monthBy.get(p.pincode) ?? 0,
  }))

  const byCategoryMap = new Map<string, number>()
  for (const p of pacts) {
    const label = serviceLabel(p.serviceType)
    byCategoryMap.set(label, (byCategoryMap.get(label) ?? 0) + 1)
  }

  return {
    rows,
    activeCount: rows.filter((r) => r.status === 'ACTIVE').length,
    // "Expiring soon" is the platform's own 7-day window.
    expiringSoon: rows.filter((r) => r.daysLeft != null && r.daysLeft <= 7 && r.daysLeft >= 0).length,
    totalLeads: rows.reduce((n, r) => n + r.leadsTotal, 0),
    leadsThisMonth: rows.reduce((n, r) => n + r.leadsThisMonth, 0),
    responseRate: routedCount > 0 ? Math.round((respondedCount / routedCount) * 100) : null,
    byCategory: [...byCategoryMap].map(([label, count]) => ({ label, count })),
    canBuy: accountActive,
  }
}
