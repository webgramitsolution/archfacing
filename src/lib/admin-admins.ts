import { Prisma, type Role, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'

/**
 * Data for the Admins page (Users & Roles › Admins) — every figure a live
 * query over the real admin accounts (roles SUPER_ADMIN / ADMIN / ADMIN_SELLER).
 *
 * The reference comp shows 248 admins across departments; this counts what is
 * actually in the database. Department is a real column; Access Level is
 * derived from role + department (the platform has no separate access-tier
 * field), so it is deterministic rather than invented.
 */

const DAY = 86_400_000
const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER']

function trend(last: number, prev: number): Trend {
  if (prev === 0) return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  const pct = ((last - prev) / prev) * 100
  return { pct: Math.round(pct * 10) / 10, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat', hasBase: true }
}

async function windowed(where: Prisma.UserWhereInput): Promise<Trend> {
  const now = Date.now()
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...where, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({ where: { ...where, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}

/** The admin "role" shown in the Admins-by-Role ring — derived from department. */
export function adminType(role: Role, department: string | null): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  const d = department ?? ''
  if (d === 'Content Management') return 'Content Admin'
  if (['Business & Marketing', 'Leads & Enquiries', 'Advertisements'].includes(d)) return 'Operations Admin'
  if (d === 'Support & Security') return 'Support Admin'
  if (['Membership & Finance', 'Reports & Analytics'].includes(d)) return 'Finance Admin'
  if (['Management', 'System Management', 'Technology'].includes(d)) return 'Department Admin'
  return 'Others'
}

/** Access level — Full for super admins, High for core departments, else Medium. */
export function accessLevel(role: Role, department: string | null): 'Full Access' | 'High' | 'Medium' {
  if (role === 'SUPER_ADMIN') return 'Full Access'
  const d = department ?? ''
  if (['Management', 'System Management', 'Technology', 'Content Management', 'Business & Marketing'].includes(d)) return 'High'
  return 'Medium'
}

function roleLabel(role: Role): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ADMIN' || role === 'ADMIN_SELLER') return 'Admin'
  return role
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type AdminStat = { key: string; label: string; icon: IconName; value: number; trend: Trend }
export type RankBar = { label: string; value: number }
export type AdminActivity = { name: string; action: string; at: Date; photo: string | null }

export type AdminsOverview = {
  stats: AdminStat[]
  tabs: { key: string; label: string; count: number }[]
  byRole: { total: number; slices: DonutSlice[] }
  byDept: { rows: RankBar[]; max: number }
  activity: AdminActivity[]
}

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': '#8B5CF6',
  'Department Admin': '#2563EB',
  'Content Admin': '#16A34A',
  'Operations Admin': '#0D9488',
  'Support Admin': '#F97316',
  'Finance Admin': '#E11D48',
  Others: '#9CA3AF',
}

export async function adminsOverview(): Promise<AdminsOverview> {
  const ND = { deletedAt: null } as const
  const ADMINS = { ...ND, role: { in: ADMIN_ROLES } } as const

  const [
    total, active, inactive, pending, superAdmins, deptAdmins,
    all, deptGroups,
    tTotal, tActive, tInactive, tPending, tSuper, tDept,
    logs,
  ] = await Promise.all([
    prisma.user.count({ where: ADMINS }),
    prisma.user.count({ where: { ...ADMINS, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...ADMINS, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    prisma.user.count({ where: { ...ADMINS, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { ...ND, role: 'SUPER_ADMIN' } }),
    prisma.user.count({ where: { ...ND, role: { in: ['ADMIN', 'ADMIN_SELLER'] } } }),
    prisma.user.findMany({ where: ADMINS, select: { role: true, department: true } }),
    prisma.user.groupBy({
      by: ['department'],
      where: { ...ADMINS, department: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { department: 'desc' } },
    }),
    windowed(ADMINS),
    windowed({ ...ADMINS, status: 'ACTIVE' }),
    windowed({ ...ADMINS, status: { in: ['SUSPENDED', 'BANNED'] } }),
    windowed({ ...ADMINS, status: 'PENDING_VERIFICATION' }),
    windowed({ ...ND, role: 'SUPER_ADMIN' }),
    windowed({ ...ND, role: { in: ['ADMIN', 'ADMIN_SELLER'] } }),
    prisma.auditLog.findMany({
      where: { actor: { role: { in: ADMIN_ROLES } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true, profilePhoto: true } } },
    }),
  ])

  const stats: AdminStat[] = [
    { key: 'total', label: 'Total Admins', icon: 'users', value: total, trend: tTotal },
    { key: 'active', label: 'Active Admins', icon: 'check', value: active, trend: tActive },
    { key: 'inactive', label: 'Inactive Admins', icon: 'map', value: inactive, trend: tInactive },
    { key: 'pending', label: 'Pending Approval', icon: 'clock', value: pending, trend: tPending },
    { key: 'super', label: 'Super Admins', icon: 'award', value: superAdmins, trend: tSuper },
    { key: 'dept', label: 'Department Admins', icon: 'users', value: deptAdmins, trend: tDept },
  ]

  const tabs = [
    { key: 'all', label: 'All Admins', count: total },
    { key: 'super', label: 'Super Admins', count: superAdmins },
    { key: 'department', label: 'Department Admins', count: deptAdmins },
    { key: 'pending', label: 'Pending Approval', count: pending },
    { key: 'inactive', label: 'Inactive', count: inactive },
  ]

  // Admins by Role (derived types)
  const typeCounts = new Map<string, number>()
  for (const a of all) {
    const t = adminType(a.role, a.department)
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1)
  }
  const order = ['Super Admin', 'Department Admin', 'Content Admin', 'Operations Admin', 'Support Admin', 'Finance Admin', 'Others']
  const byRole = {
    total,
    slices: order
      .filter((k) => (typeCounts.get(k) ?? 0) > 0)
      .map((k) => ({ label: k, value: typeCounts.get(k) ?? 0, color: ROLE_COLORS[k] })),
  }

  // Admins by Department
  const deptRows = deptGroups
    .map((g) => ({ label: g.department ?? 'Others', value: g._count._all }))
    .filter((r) => r.value > 0)
  const byDept = { rows: deptRows, max: Math.max(1, ...deptRows.map((r) => r.value)) }

  const activity: AdminActivity[] = logs.map((l) => ({
    name: l.actor?.name ?? 'System',
    action: humanize(l.action),
    at: l.createdAt,
    photo: l.actor?.profilePhoto ?? null,
  }))

  return { stats, tabs, byRole, byDept, activity }
}

function humanize(action: string): string {
  return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

// ═══════════════════════════════════════════════════════════
//  The admin table
// ═══════════════════════════════════════════════════════════

export type AdminRow = {
  id: string
  name: string
  email: string
  roleLabel: string
  isSuper: boolean
  department: string
  accessLevel: 'Full Access' | 'High' | 'Medium'
  location: string
  status: UserStatus
  lastLoginAt: Date | null
  photo: string | null
}

export type AdminListQuery = { tab?: string; role?: string; department?: string; status?: string; q?: string; page?: number; perPage?: number }

export async function listAdmins(query: AdminListQuery): Promise<{
  rows: AdminRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const where: Prisma.UserWhereInput = { deletedAt: null, role: { in: ADMIN_ROLES } }

  switch (query.tab) {
    case 'super': where.role = 'SUPER_ADMIN'; break
    case 'department': where.role = { in: ['ADMIN', 'ADMIN_SELLER'] }; break
    case 'pending': where.status = 'PENDING_VERIFICATION'; break
    case 'inactive': where.status = { in: ['SUSPENDED', 'BANNED'] }; break
  }

  if (query.role && query.role !== 'all') where.role = query.role as Role
  if (query.department && query.department !== 'all') where.department = query.department
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') where.status = 'ACTIVE'
    else if (query.status === 'inactive') where.status = { in: ['SUSPENDED', 'BANNED'] }
    else if (query.status === 'pending') where.status = 'PENDING_VERIFICATION'
  }
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { department: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  const [total, admins] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, name: true, email: true, role: true, department: true,
        city: true, status: true, lastLoginAt: true, profilePhoto: true,
      },
    }),
  ])

  const rows: AdminRow[] = admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    roleLabel: roleLabel(a.role),
    isSuper: a.role === 'SUPER_ADMIN',
    department: a.department ?? '—',
    accessLevel: accessLevel(a.role, a.department),
    location: a.city ?? '—',
    status: a.status,
    lastLoginAt: a.lastLoginAt,
    photo: a.profilePhoto,
  }))

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Departments that actually have admins — for the filter dropdown. */
export async function adminDepartments(): Promise<string[]> {
  const rows = await prisma.user.groupBy({
    by: ['department'],
    where: { deletedAt: null, role: { in: ADMIN_ROLES }, department: { not: null } },
    _count: true,
    orderBy: { department: 'asc' },
  })
  return rows.map((r) => r.department!).filter(Boolean)
}
