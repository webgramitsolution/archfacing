import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the "Buyers / Clients" admin page — every figure a live query.
 *
 * A buyer/client is a CLIENT account. Its BuyerProfile carries the
 * Individual-vs-Company split, industry, PACT area and cached order / RFQ
 * counters. Accounts created before BuyerProfile existed are treated as
 * INDIVIDUAL buyers with no company details — the honest fallback.
 */

const DAY = 86_400_000
const UNIVERSE: Prisma.UserWhereInput = { deletedAt: null, role: 'CLIENT' }

const INDUSTRY_COLOR = ['#2563EB', '#16A34A', '#F59E0B', '#8B5CF6', '#EC4899', '#0D9488', '#EF4444', '#6366F1', '#D97706', '#64748B']

function trend(last: number, prev: number): Trend {
  if (prev === 0) return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  const pct = ((last - prev) / prev) * 100
  return { pct: Math.round(pct * 10) / 10, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat', hasBase: true }
}
async function windowed(extra: Prisma.UserWhereInput = {}): Promise<Trend> {
  const now = Date.now()
  const base: Prisma.UserWhereInput = { ...UNIVERSE, ...extra }
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type BuyerStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }
export type BuyersOverview = {
  stats: BuyerStat[]
  typeDistribution: { total: number; slices: DonutSlice[] }
  topIndustries: { label: string; value: number; color: string }[]
  recent: { id: string; name: string; type: 'Individual' | 'Company'; at: Date }[]
  tabs: { key: string; label: string; count: number }[]
  industryOptions: { value: string; label: string }[]
}

export async function buyersOverview(): Promise<BuyersOverview> {
  const now = Date.now()
  const [total, company, verified, pending, inactive, activeMonth, indRows, recentRows, tTotal, tCompany, tActive] =
    await Promise.all([
      prisma.user.count({ where: UNIVERSE }),
      prisma.user.count({ where: { ...UNIVERSE, buyerProfile: { accountType: 'COMPANY' } } }),
      prisma.user.count({ where: { ...UNIVERSE, buyerProfile: { isVerified: true } } }),
      prisma.user.count({ where: { ...UNIVERSE, status: 'PENDING_VERIFICATION' } }),
      prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } }),
      prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE', createdAt: { gte: new Date(now - 30 * DAY) } } }),
      prisma.buyerProfile.groupBy({ by: ['industry'], where: { industry: { not: null } }, _count: true }),
      prisma.user.findMany({
        where: UNIVERSE, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, createdAt: true, buyerProfile: { select: { accountType: true, companyName: true } } },
      }),
      windowed(),
      windowed({ buyerProfile: { accountType: 'COMPANY' } }),
      windowed({ status: 'ACTIVE' }),
    ])

  const individual = total - company

  const stats: BuyerStat[] = [
    { key: 'total', label: 'Total Buyers / Clients', icon: 'users', value: total, trend: tTotal, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'individual', label: 'Individual Buyers', icon: 'user', value: individual, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'company', label: 'Company Clients', icon: 'building', value: company, trend: tCompany, tint: { bg: '#EAF2FF', fg: '#2563EB' } },
    { key: 'verified', label: 'Verified Accounts', icon: 'check', value: verified, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'pending', label: 'Pending Verification', icon: 'clock', value: pending, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#FEE9E1', fg: '#EA580C' } },
    { key: 'active', label: 'Active This Month', icon: 'trending', value: activeMonth, trend: tActive, tint: { bg: '#FEF7E0', fg: '#D97706' } },
  ]

  const typeDistribution = {
    total,
    slices: [
      { label: 'Individual Buyers', value: individual, color: '#2563EB' },
      { label: 'Company Clients', value: company, color: '#8B5CF6' },
    ].filter((s) => s.value > 0),
  }

  const topIndustries = indRows
    .map((r) => ({ label: r.industry as string, value: r._count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((r, i) => ({ ...r, color: INDUSTRY_COLOR[i % INDUSTRY_COLOR.length] }))

  const recent = recentRows.map((u) => ({
    id: u.id,
    name: u.buyerProfile?.accountType === 'COMPANY' ? u.buyerProfile.companyName ?? u.name : u.name,
    type: (u.buyerProfile?.accountType === 'COMPANY' ? 'Company' : 'Individual') as 'Individual' | 'Company',
    at: u.createdAt,
  }))

  const tabs = [
    { key: 'all', label: 'All Buyers / Clients', count: total },
    { key: 'individual', label: 'Individual Buyers', count: individual },
    { key: 'company', label: 'Company Clients', count: company },
    { key: 'pending', label: 'Pending Verification', count: pending },
    { key: 'inactive', label: 'Inactive', count: inactive },
  ]

  const industryOptions = [
    { value: 'all', label: 'All Industries' },
    ...topIndustries.map((r) => ({ value: r.label, label: r.label })),
  ]

  return { stats, typeDistribution, topIndustries, recent, tabs, industryOptions }
}

// ═══════════════════════════════════════════════════════════
//  The table
// ═══════════════════════════════════════════════════════════

export type BuyerRow = {
  id: string
  name: string
  email: string
  type: 'Individual' | 'Company'
  industry: string | null
  city: string | null
  pactArea: string | null
  orders: number
  rfqs: number
  status: UserStatus
  createdAt: Date
}

export type BuyerListQuery = { tab?: string; industry?: string; status?: string; q?: string; page?: number; perPage?: number }

export async function listBuyers(query: BuyerListQuery): Promise<{
  rows: BuyerRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.UserWhereInput[] = [{ role: 'CLIENT' }]
  if (query.tab === 'individual') and.push({ OR: [{ buyerProfile: { is: null } }, { buyerProfile: { accountType: 'INDIVIDUAL' } }] })
  else if (query.tab === 'company') and.push({ buyerProfile: { accountType: 'COMPANY' } })
  else if (query.tab === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
  else if (query.tab === 'inactive') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })

  if (query.industry && query.industry !== 'all') and.push({ buyerProfile: { industry: query.industry } })
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
        { buyerProfile: { companyName: { contains: query.q, mode: 'insensitive' } } },
      ],
    })
  }

  const where: Prisma.UserWhereInput = { deletedAt: null, AND: and }
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, name: true, email: true, city: true, status: true, createdAt: true,
        buyerProfile: { select: { accountType: true, companyName: true, industry: true, pactArea: true, ordersCount: true, rfqsCount: true } },
      },
    }),
  ])

  const rows: BuyerRow[] = users.map((u) => {
    const p = u.buyerProfile
    const isCompany = p?.accountType === 'COMPANY'
    return {
      id: u.id,
      name: isCompany ? p?.companyName ?? u.name : u.name,
      email: u.email,
      type: isCompany ? 'Company' : 'Individual',
      industry: p?.industry ?? null,
      city: u.city,
      pactArea: p?.pactArea ?? null,
      orders: p?.ordersCount ?? 0,
      rfqs: p?.rfqsCount ?? 0,
      status: u.status,
      createdAt: u.createdAt,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}
