import { Prisma, type Role, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'

/**
 * Data for the Users & Roles admin page — every figure a live query.
 *
 * The reference comp shows 52,842 users and tidy percentages; this module
 * counts what is actually in the database. Small seed data means small
 * numbers, which is the honest state of the platform.
 */

const DAY = 86_400_000

/** Staff roles never appear in the public user table or its tabs. */
const STAFF: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE']

function trend(last: number, prev: number): Trend {
  if (prev === 0) {
    return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  }
  const pct = ((last - prev) / prev) * 100
  return {
    pct: Math.round(pct * 10) / 10,
    direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat',
    hasBase: true,
  }
}

/** Count in the last 30 days and the 30 before, for a user filter. */
async function windowed(where: Prisma.UserWhereInput): Promise<Trend> {
  const now = Date.now()
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...where, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({
      where: { ...where, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } },
    }),
  ])
  return trend(last, prev)
}

// ═══════════════════════════════════════════════════════════
//  Overview — stats, trends, donuts, role rail, tab counts
// ═══════════════════════════════════════════════════════════

export type UserStatMetric = {
  key: string
  label: string
  icon: IconName
  value: number
  trend: Trend
  tone?: 'up' | 'down'
}

export type VerifyRow = { label: string; value: number; pct: number; color: string }

export type UsersOverview = {
  stats: UserStatMetric[]
  tabs: { key: string; label: string; count: number }[]
  distribution: { total: number; slices: DonutSlice[] }
  verification: { total: number; rows: VerifyRow[] }
  topCities: { rows: { label: string; value: number }[]; max: number }
}

export async function usersOverview(): Promise<UsersOverview> {
  const ND = { deletedAt: null } as const

  const [
    total, students, byRole,
    profVerified, conVerified, bmfVerified, corpVerified,
    pendingStatus, banned,
    cityGroups,
    tTotal, tPro, tCorp, tStudents, tBuyers, tEmp, tAdmin,
  ] = await Promise.all([
    prisma.user.count({ where: ND }),
    prisma.professionalProfile.count({ where: { tier: 'STUDENT' } }),
    prisma.user.groupBy({ by: ['role'], where: ND, _count: true }),
    prisma.professionalProfile.count({ where: { isVerified: true } }),
    prisma.consultantProfile.count({ where: { isVerified: true } }),
    prisma.bmfProfile.count({ where: { isVerified: true } }),
    prisma.corporateProfile.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { ...ND, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { ...ND, status: 'BANNED' } }),
    prisma.user.groupBy({
      by: ['city'],
      where: { ...ND, city: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    }),
    windowed(ND),
    windowed({ ...ND, role: 'PROFESSIONAL', professionalProfile: { tier: { not: 'STUDENT' } } }),
    windowed({ ...ND, role: { in: ['CORPORATE', 'BMF'] } }),
    windowed({ ...ND, role: 'PROFESSIONAL', professionalProfile: { tier: 'STUDENT' } }),
    windowed({ ...ND, role: 'CLIENT' }),
    windowed({ ...ND, role: 'RM_EMPLOYEE' }),
    windowed({ ...ND, role: { in: ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER'] } }),
  ])

  const roleCount = (r: Role) => byRole.find((x) => x.role === r)?._count ?? 0
  const professionals = Math.max(0, roleCount('PROFESSIONAL') - students)
  const corporates = roleCount('CORPORATE') + roleCount('BMF')
  const buyers = roleCount('CLIENT')
  const employees = roleCount('RM_EMPLOYEE')
  const admins = roleCount('SUPER_ADMIN') + roleCount('ADMIN') + roleCount('ADMIN_SELLER')
  const consultants = roleCount('CONSULTANT')

  const stats: UserStatMetric[] = [
    { key: 'total', label: 'Total Users', icon: 'users', value: total, trend: tTotal },
    { key: 'pro', label: 'Professionals', icon: 'user', value: professionals, trend: tPro },
    { key: 'corp', label: 'Corporates & BMFs', icon: 'building', value: corporates, trend: tCorp },
    { key: 'students', label: 'Students', icon: 'award', value: students, trend: tStudents },
    { key: 'buyers', label: 'Buyers / Clients', icon: 'heart', value: buyers, trend: tBuyers },
    { key: 'employees', label: 'Employees', icon: 'users', value: employees, trend: tEmp },
    { key: 'admins', label: 'Admins', icon: 'shield', value: admins, trend: tAdmin },
  ]

  const tabs = [
    { key: 'all', label: 'All Users', count: total },
    { key: 'admins', label: 'Admins', count: admins },
    { key: 'employees', label: 'Employees', count: employees },
    { key: 'professional', label: 'Professionals', count: professionals },
    { key: 'corporates', label: 'Corporates', count: corporates },
    { key: 'students', label: 'Students', count: students },
    { key: 'visitors', label: 'Buyers / Clients', count: buyers },
  ]

  // User Type Distribution — the six named buckets plus Others (consultants,
  // advertisers, anything not one of the six), so the ring closes on `total`.
  const named = professionals + corporates + students + buyers + employees + admins
  const others = Math.max(0, total - named)
  const distribution = {
    total,
    slices: [
      { label: 'Professionals', value: professionals, color: '#6366F1' },
      { label: 'Corporates', value: corporates, color: '#2563EB' },
      { label: 'Students', value: students, color: '#16A34A' },
      { label: 'Buyers / Clients', value: buyers, color: '#8B5CF6' },
      { label: 'Employees', value: employees, color: '#0D9488' },
      { label: 'Admins', value: admins, color: '#E11D48' },
      { label: 'Others', value: others, color: '#9CA3AF' },
    ].filter((s) => s.value > 0),
  }

  // Verification Status — verified = a verified seller profile; pending =
  // awaiting review; rejected = banned; unverified = everyone else.
  const verified = profVerified + conVerified + bmfVerified + corpVerified
  const unverified = Math.max(0, total - verified - pendingStatus - banned)
  const denom = Math.max(1, total)
  const pct = (v: number) => Math.round((v / denom) * 1000) / 10
  const verification = {
    total,
    rows: [
      { label: 'Verified', value: verified, pct: pct(verified), color: '#16A34A' },
      { label: 'Pending', value: pendingStatus, pct: pct(pendingStatus), color: '#EA9412' },
      { label: 'Rejected', value: banned, pct: pct(banned), color: '#E11D48' },
      { label: 'Unverified', value: unverified, pct: pct(unverified), color: '#94A3B8' },
    ],
  }

  const cityRows = cityGroups
    .map((g) => ({ label: g.city ?? 'Unknown', value: g._count._all }))
    .filter((r) => r.label && r.value > 0)
  const topCities = { rows: cityRows, max: Math.max(1, ...cityRows.map((r) => r.value)) }

  return { stats, tabs, distribution, verification, topCities }
}

// ═══════════════════════════════════════════════════════════
//  The user table — filtered, paginated
// ═══════════════════════════════════════════════════════════

export type Verification = 'verified' | 'pending' | 'rejected' | 'unverified'

export type UserRow = {
  id: string
  name: string
  email: string
  mobile: string | null
  role: Role
  roleLabel: string
  status: UserStatus
  company: string
  location: string
  verification: Verification
  photo: string | null
  createdAt: Date
  lastLoginAt: Date | null
}

export type UserListQuery = {
  tab?: string
  role?: string
  status?: string
  q?: string
  page?: number
  perPage?: number
}

function tabWhere(tab?: string): Prisma.UserWhereInput {
  switch (tab) {
    case 'admins':
      return { role: { in: ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER'] } }
    case 'employees':
      return { role: 'RM_EMPLOYEE' }
    case 'professional':
      return { role: 'PROFESSIONAL', professionalProfile: { tier: { not: 'STUDENT' } } }
    case 'students':
      return { role: 'PROFESSIONAL', professionalProfile: { tier: 'STUDENT' } }
    case 'corporates':
      return { role: { in: ['CORPORATE', 'BMF'] } }
    case 'visitors':
      return { role: 'CLIENT' }
    default:
      return {} // All Users — everyone (staff included), as the reference shows
  }
}

export async function listUsers(query: UserListQuery): Promise<{
  rows: UserRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...tabWhere(query.tab),
  }

  if (query.role && query.role !== 'all') where.role = query.role as Role
  if (query.status && query.status !== 'all') {
    if (query.status === 'inactive') where.status = { in: ['SUSPENDED', 'BANNED'] }
    else if (query.status === 'active') where.status = 'ACTIVE'
    else if (query.status === 'pending') where.status = 'PENDING_VERIFICATION'
  }
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { mobile: { contains: query.q } },
    ]
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, name: true, email: true, mobile: true, role: true,
        status: true, city: true, profilePhoto: true, createdAt: true, lastLoginAt: true,
        professionalProfile: { select: { tier: true, firmName: true, isVerified: true } },
        consultantProfile: { select: { firmName: true, isVerified: true } },
        bmfProfile: { select: { businessName: true, isVerified: true } },
        corporateProfile: { select: { companyName: true, isVerified: true } },
      },
    }),
  ])

  const rows: UserRow[] = users.map((u) => {
    const company =
      u.professionalProfile?.firmName ??
      u.consultantProfile?.firmName ??
      u.bmfProfile?.businessName ??
      u.corporateProfile?.companyName ??
      (u.role === 'CLIENT' ? 'Individual' : '—')

    const profileVerified =
      u.professionalProfile?.isVerified ??
      u.consultantProfile?.isVerified ??
      u.bmfProfile?.isVerified ??
      u.corporateProfile?.isVerified
    const hasProfile = profileVerified !== undefined

    let verification: Verification
    if (u.status === 'BANNED') verification = 'rejected'
    else if (hasProfile) verification = profileVerified ? 'verified' : 'pending'
    else if (u.status === 'ACTIVE') verification = 'verified'
    else if (u.status === 'PENDING_VERIFICATION') verification = 'pending'
    else verification = 'unverified'

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      roleLabel: roleLabel(u.role, u.professionalProfile?.tier),
      status: u.status,
      company,
      location: u.city ?? '—',
      verification,
      photo: u.profilePhoto,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export function roleLabel(role: Role, tier?: string | null): string {
  if (role === 'PROFESSIONAL') return tier === 'STUDENT' ? 'Student' : 'Professional'
  const map: Record<string, string> = {
    CLIENT: 'Visitor',
    CONSULTANT: 'Consultant',
    BMF: 'BMF',
    CORPORATE: 'Corporate',
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    ADMIN_SELLER: 'Admin',
    RM_EMPLOYEE: 'RM Employee',
    EXTERNAL_ADVERTISER: 'Advertiser',
  }
  return map[role] ?? role
}

// ═══════════════════════════════════════════════════════════
//  Recent user activity
// ═══════════════════════════════════════════════════════════

export type ActivityItem = { icon: IconName; text: string; sub: string; at: Date; tint: string }

export async function recentUserActivity(take = 5): Promise<ActivityItem[]> {
  const [newUsers, logs] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, role: { notIn: STAFF } },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, name: true, role: true, createdAt: true, professionalProfile: { select: { tier: true } } },
    }),
    prisma.auditLog.findMany({
      where: { entityType: 'User' },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ])

  const items: ActivityItem[] = [
    ...newUsers.map((u) => ({
      icon: 'user' as IconName,
      text: 'New user registered',
      sub: `${u.name} (${roleLabel(u.role, u.professionalProfile?.tier)})`,
      at: u.createdAt,
      tint: '#6366F1',
    })),
    ...logs.map((l) => ({
      icon: activityIcon(l.action),
      text: humanize(l.action),
      sub: l.actor?.name ? `by ${l.actor.name}` : 'System',
      at: l.createdAt,
      tint: activityTint(l.action),
    })),
  ]

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take)
}

function humanize(action: string): string {
  return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function activityIcon(action: string): IconName {
  const a = action.toUpperCase()
  if (a.includes('VERIF') || a.includes('ACTIVE')) return 'check'
  if (a.includes('SUSPEND') || a.includes('BAN') || a.includes('REJECT')) return 'alert'
  return 'user'
}
function activityTint(action: string): string {
  const a = action.toUpperCase()
  if (a.includes('VERIF') || a.includes('ACTIVE')) return '#16A34A'
  if (a.includes('SUSPEND') || a.includes('BAN') || a.includes('REJECT')) return '#EF4444'
  return '#8B5CF6'
}
