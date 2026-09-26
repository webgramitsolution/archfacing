import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * The RM employee's panel — everything scoped to their territory.
 *
 * Territory = User.assignedPincodes ('*' means every PIN code) plus, when no
 * PIN codes are set, User.assignedStates. With nothing assigned at all an
 * employee sees the whole country (the platform's long-standing behaviour).
 */

export type Territory = { everywhere: boolean; pins: string[]; label: string }

export async function territoryOf(userId: string): Promise<Territory> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { assignedPincodes: true, assignedStates: true } })
  const pinsSet = me?.assignedPincodes ?? []
  if (pinsSet.includes('*')) return { everywhere: true, pins: [], label: 'All PACT areas' }
  if (pinsSet.length) return { everywhere: false, pins: pinsSet, label: `${pinsSet.length} PIN code${pinsSet.length === 1 ? '' : 's'}` }
  if (me?.assignedStates.length) {
    const rows = await prisma.pincode.findMany({ where: { state: { in: me.assignedStates } }, select: { code: true }, take: 5000 })
    return { everywhere: false, pins: rows.map((r) => r.code), label: me.assignedStates.join(', ') }
  }
  return { everywhere: true, pins: [], label: 'No territory set — all areas' }
}

export const pinWhere = (t: Territory) => (t.everywhere ? {} : { pincode: { in: t.pins } })

export async function employeeOverview(userId: string) {
  const t = await territoryOf(userId)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const OPEN: Prisma.EnquiryWhereInput = { status: { notIn: ['CONVERTED', 'CLOSED'] } }

  const [mine, unrouted, convertedMonth, holders, complaints, recentMine, tickets] = await Promise.all([
    prisma.enquiry.count({ where: { employeeId: userId, ...OPEN } }),
    prisma.enquiry.count({ where: { status: 'UNROUTED', ...pinWhere(t) } }),
    prisma.enquiry.count({ where: { employeeId: userId, status: 'CONVERTED', closedAt: { gte: monthStart } } }),
    prisma.pact.count({ where: { status: 'ACTIVE', ...pinWhere(t) } }),
    openComplaintsIn(t).then((r) => r.length),
    prisma.enquiry.findMany({
      where: { employeeId: userId, ...OPEN },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: { id: true, subject: true, contactName: true, pincode: true, status: true, updatedAt: true },
    }),
    prisma.supportTicket.count({ where: { assigneeId: userId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ])
  return { territory: t, mine, unrouted, convertedMonth, holders, complaints, recentMine, tickets }
}

/** Open complaints about PACT holders in the territory. */
export async function openComplaintsIn(t: Territory) {
  const pacts = await prisma.pact.findMany({
    where: { status: { in: ['ACTIVE', 'SUSPENDED'] }, ...pinWhere(t) },
    select: { id: true, holderId: true, pincode: true },
    take: 2000,
  })
  const holderIds = [...new Set(pacts.map((p) => p.holderId).filter((x): x is string => Boolean(x)))]
  if (!t.everywhere && holderIds.length === 0) return []
  return prisma.complaint.findMany({
    where: {
      status: { in: ['OPEN', 'UNDER_REVIEW'] },
      ...(t.everywhere ? {} : { OR: [{ pactId: { in: pacts.map((p) => p.id) } }, { againstId: { in: holderIds } }] }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { against: { select: { id: true, name: true, email: true, mobile: true } }, by: { select: { name: true } } },
  })
}
