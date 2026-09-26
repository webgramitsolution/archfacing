import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Visitors / Clients admin page — every figure a live query.
 *
 * A "visitor/client" is a CLIENT account. The distinction the reference draws
 * is real here: a CLIENT who has raised an Enquiry is an engaged *Client*; one
 * who has not is still a *Visitor*. "Source" is the account's real
 * `acquisitionSource`. There is no anonymous-traffic table, so "Total Visitors"
 * counts registered visitor/client accounts, not raw page views — the honest
 * figure the database can stand behind.
 */

const DAY = 86_400_000
const UNIVERSE: Prisma.UserWhereInput = { deletedAt: null, role: 'CLIENT' }
const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED']

const SOURCE_COLOR: Record<string, string> = {
  Direct: '#2563EB',
  'Google Search': '#16A34A',
  'Social Media': '#F59E0B',
  Referral: '#8B5CF6',
  Advertisement: '#EC4899',
  Other: '#94A3B8',
}

function trend(last: number, prev: number): Trend {
  if (prev === 0) return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  const pct = ((last - prev) / prev) * 100
  return { pct: Math.round(pct * 10) / 10, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat', hasBase: true }
}
async function windowedUser(extra: Prisma.UserWhereInput = {}): Promise<Trend> {
  const now = Date.now()
  const base: Prisma.UserWhereInput = { ...UNIVERSE, ...extra }
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}
async function windowedEnquiry(extra: Prisma.EnquiryWhereInput = {}): Promise<Trend> {
  const now = Date.now()
  const [last, prev] = await Promise.all([
    prisma.enquiry.count({ where: { ...extra, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.enquiry.count({ where: { ...extra, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type VisitorStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }
export type EngagementSets = { engaged: string[]; open: string[]; converted: string[] }
export type VisitorsOverview = {
  stats: VisitorStat[]
  bySource: { total: number; slices: DonutSlice[] }
  clientStatus: { total: number; slices: DonutSlice[] }
  trend: { labels: string[]; points: number[] }
  tabs: { key: string; label: string; count: number }[]
  topLocations: { city: string; count: number }[]
  sets: EngagementSets
  sourceOptions: { value: string; label: string }[]
}

export async function visitorsOverview(): Promise<VisitorsOverview> {
  const [total, active, pending, inactive, newInq, converted, enquiries, bySourceRows, cityGroups, tTotal, tActive, tInq, tConv] =
    await Promise.all([
      prisma.user.count({ where: UNIVERSE }),
      prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE' } }),
      prisma.user.count({ where: { ...UNIVERSE, status: 'PENDING_VERIFICATION' } }),
      prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } }),
      prisma.enquiry.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
      prisma.enquiry.count({ where: { status: 'CONVERTED' } }),
      prisma.enquiry.findMany({ select: { clientId: true, status: true } }),
      prisma.user.groupBy({ by: ['acquisitionSource'], where: UNIVERSE, _count: true }),
      prisma.user.groupBy({ by: ['city'], where: { ...UNIVERSE, city: { not: null } }, _count: true }),
      windowedUser(),
      windowedUser({ status: 'ACTIVE' }),
      windowedEnquiry(),
      windowedEnquiry({ status: 'CONVERTED' }),
    ])

  const engaged = new Set(enquiries.map((e) => e.clientId))
  const open = new Set(enquiries.filter((e) => OPEN_STATUSES.includes(e.status)).map((e) => e.clientId))
  const convertedSet = new Set(enquiries.filter((e) => e.status === 'CONVERTED').map((e) => e.clientId))

  // Registered clients = CLIENT accounts that have actually raised an enquiry.
  const registeredClients = await prisma.user.count({ where: { ...UNIVERSE, id: { in: [...engaged] } } })

  const stats: VisitorStat[] = [
    { key: 'total', label: 'Total Visitors', icon: 'users', value: total, trend: tTotal, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'registered', label: 'Registered Clients', icon: 'user', value: registeredClients, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'inquiries', label: 'New Inquiries', icon: 'inbox', value: newInq, trend: tInq, tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
    { key: 'active', label: 'Active Clients', icon: 'star', value: active, trend: tActive, tint: { bg: '#FEF7E0', fg: '#D97706' } },
    { key: 'converted', label: 'Converted Leads', icon: 'trending', value: converted, trend: tConv, tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  ]

  const srcRows = bySourceRows
    .map((r) => ({ label: r.acquisitionSource ?? 'Direct', value: r._count }))
    .reduce((acc, r) => {
      const found = acc.find((x) => x.label === r.label)
      if (found) found.value += r.value
      else acc.push({ ...r })
      return acc
    }, [] as { label: string; value: number }[])
    .sort((a, b) => b.value - a.value)
  const bySource = {
    total,
    slices: srcRows.map((r) => ({ label: r.label, value: r.value, color: SOURCE_COLOR[r.label] ?? '#94A3B8' })),
  }

  const clientStatus = {
    total,
    slices: [
      { label: 'Active', value: active, color: '#16A34A' },
      { label: 'Inactive', value: inactive, color: '#EF4444' },
      { label: 'Pending', value: pending, color: '#F59E0B' },
    ].filter((s) => s.value > 0),
  }

  // Daily new visitors over the last 30 days.
  const since = new Date(Date.now() - 29 * DAY)
  since.setUTCHours(0, 0, 0, 0)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('day', "createdAt") AS b, count(*)::int AS c
    FROM "User"
    WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL AND role = 'CLIENT'
    GROUP BY 1
  `
  const byDay = new Map(rows.map((r) => [dayKey(new Date(r.b)), Number(r.c)]))
  const labels: string[] = []
  const points: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    points.push(byDay.get(dayKey(d)) ?? 0)
  }

  const tabs = [
    { key: 'all', label: 'All Visitors', count: total },
    { key: 'clients', label: 'Registered Clients', count: registeredClients },
    { key: 'inquiries', label: 'Inquiries', count: open.size },
    { key: 'converted', label: 'Converted', count: convertedSet.size },
  ]

  const topLocations = cityGroups.map((g) => ({ city: g.city as string, count: g._count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    ...srcRows.map((r) => ({ value: r.label, label: r.label })),
  ]

  return {
    stats, bySource, clientStatus, trend: { labels, points }, tabs, topLocations,
    sets: { engaged: [...engaged], open: [...open], converted: [...convertedSet] },
    sourceOptions,
  }
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

// ═══════════════════════════════════════════════════════════
//  The table
// ═══════════════════════════════════════════════════════════

export type VisitorRow = {
  id: string
  name: string
  email: string
  type: 'Client' | 'Visitor'
  city: string | null
  source: string
  status: UserStatus
  createdAt: Date
}

export type VisitorListQuery = {
  tab?: string
  source?: string
  status?: string
  q?: string
  page?: number
  perPage?: number
  sets: EngagementSets
}

export async function listVisitors(query: VisitorListQuery): Promise<{
  rows: VisitorRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)
  const { engaged, open, converted } = query.sets

  const and: Prisma.UserWhereInput[] = [{ role: 'CLIENT' }]
  if (query.tab === 'clients') and.push({ id: { in: engaged.length ? engaged : ['__none__'] } })
  else if (query.tab === 'inquiries') and.push({ id: { in: open.length ? open : ['__none__'] } })
  else if (query.tab === 'converted') and.push({ id: { in: converted.length ? converted : ['__none__'] } })

  if (query.source && query.source !== 'all') and.push({ acquisitionSource: query.source })
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') and.push({ status: 'ACTIVE' })
    else if (query.status === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
    else if (query.status === 'inactive') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })
  }
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
      ],
    })
  }

  const where: Prisma.UserWhereInput = { deletedAt: null, AND: and }
  const engagedSet = new Set(engaged)

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, name: true, email: true, city: true, status: true, createdAt: true, acquisitionSource: true },
    }),
  ])

  const rows: VisitorRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    type: engagedSet.has(u.id) ? 'Client' : 'Visitor',
    city: u.city,
    source: u.acquisitionSource ?? '—',
    status: u.status,
    createdAt: u.createdAt,
  }))

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

// ═══════════════════════════════════════════════════════════
//  Recent inquiries
// ═══════════════════════════════════════════════════════════

export type RecentInquiry = { id: string; name: string; subject: string; at: Date }

export async function recentInquiries(take = 4): Promise<RecentInquiry[]> {
  const rows = await prisma.enquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, subject: true, contactName: true, createdAt: true },
  })
  return rows.map((e) => ({ id: e.id, name: e.contactName, subject: e.subject, at: e.createdAt }))
}
