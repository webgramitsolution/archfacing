import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, permissionsFor, ACCESS_TEMPLATES } from '@/config/permissions'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Role Permissions admin page — the real ArchFacing permission
 * matrix (`src/config/permissions.ts`), not invented roles.
 *
 * ArchFacing's roles are a fixed platform set (the `Role` enum), so every role
 * here is a SYSTEM role — there is no custom-role engine, and the page says so
 * (Custom Roles = 0) rather than pretending otherwise. Each figure is either a
 * live user count or read straight off the permission matrix.
 */

const DAY = 86_400_000
const ALL_PERMISSIONS = Object.keys(PERMISSIONS)

export type RoleRow = {
  role: Role
  label: string
  description: string
  icon: IconName
  type: 'System' | 'Custom'
  users: number
  permissions: number
  active: boolean
}

const ROLE_META: { role: Role; label: string; description: string; icon: IconName }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full access to all modules and settings', icon: 'shield' },
  { role: 'ADMIN', label: 'Admin', description: 'Manage platform operations and moderation', icon: 'shield' },
  { role: 'ADMIN_SELLER', label: 'Seller Admin', description: 'Merchandise & podcast management', icon: 'bag' },
  { role: 'RM_EMPLOYEE', label: 'RM Employee', description: 'Lead routing & territory management', icon: 'user' },
  { role: 'PROFESSIONAL', label: 'Professional', description: 'Design professionals and service providers', icon: 'user' },
  { role: 'CONSULTANT', label: 'Consultant', description: 'Engineering, real-estate & financial consultants', icon: 'users' },
  { role: 'BMF', label: 'BMF', description: 'Building material facilitators', icon: 'building' },
  { role: 'CORPORATE', label: 'Corporate', description: 'Corporate companies & brands', icon: 'building' },
  { role: 'CLIENT', label: 'Client / Visitor', description: 'General visitors and clients', icon: 'heart' },
  { role: 'EXTERNAL_ADVERTISER', label: 'External Advertiser', description: 'External advertising partners', icon: 'star' },
]

export type RoleStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }

export type RolesOverview = {
  stats: RoleStat[]
  usersByRole: { total: number; slices: DonutSlice[] }
  permissionDist: { total: number; slices: DonutSlice[] }
  trend: { labels: string[]; points: number[] }
  tabs: { key: string; label: string; count: number }[]
  roles: RoleRow[]
  totalPermissions: number
  templateUse: Record<string, number>
}

function trend(last: number, prev: number): Trend {
  if (prev === 0) return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  const pct = ((last - prev) / prev) * 100
  return { pct: Math.round(pct * 10) / 10, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat', hasBase: true }
}

export async function rolesOverview(): Promise<RolesOverview> {
  const [byRole, totalUsers, pending, students, uLast, uPrev, pLast, pPrev, staffGrants] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], where: { deletedAt: null }, _count: true }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: 'PENDING_VERIFICATION' } }),
    prisma.professionalProfile.count({ where: { tier: 'STUDENT' } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 60 * DAY), lt: new Date(Date.now() - 30 * DAY) } } }),
    prisma.user.count({ where: { deletedAt: null, status: 'PENDING_VERIFICATION', createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    prisma.user.count({ where: { deletedAt: null, status: 'PENDING_VERIFICATION', createdAt: { gte: new Date(Date.now() - 60 * DAY), lt: new Date(Date.now() - 30 * DAY) } } }),
    // Staff accounts carrying extra admin modules — the platform's only "custom" access.
    prisma.user.findMany({ where: { deletedAt: null, NOT: { permissions: { isEmpty: true } } }, select: { permissions: true } }),
  ])
  const usersOf = (r: Role) => byRole.find((x) => x.role === r)?._count ?? 0

  const roles: RoleRow[] = ROLE_META.map((m) => {
    const users = usersOf(m.role)
    return {
      role: m.role,
      label: m.label,
      description: m.description,
      icon: m.icon,
      type: 'System',
      users,
      permissions: permissionsFor(m.role).length,
      active: users > 0,
    }
  })

  const activeRoles = roles.filter((r) => r.active).length

  const stats: RoleStat[] = [
    { key: 'total', label: 'Total Roles', icon: 'shield', value: roles.length, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'active', label: 'Active Roles', icon: 'check', value: activeRoles, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'custom', label: 'Staff with Extra Modules', icon: 'settings', value: staffGrants.length, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
    { key: 'assigned', label: 'Users Assigned', icon: 'users', value: totalUsers, trend: trend(uLast, uPrev), tint: { bg: '#FEF7E0', fg: '#D97706' } },
    { key: 'pending', label: 'Pending Requests', icon: 'clock', value: pending, trend: trend(pLast, pPrev), tint: { bg: '#FFE9EC', fg: '#E11D48' } },
  ]

  // Users by role (Professional / Corporate / Student / Visitor), like the dashboard.
  const professionals = Math.max(0, usersOf('PROFESSIONAL') - students)
  const corporate = usersOf('CORPORATE') + usersOf('BMF')
  const consultants = usersOf('CONSULTANT')
  const visitor = usersOf('CLIENT')
  const roleSlices = [
    { label: 'Professional', value: professionals, color: '#8B5CF6' },
    { label: 'Corporate', value: corporate, color: '#F59E0B' },
    { label: 'Student', value: students, color: '#16A34A' },
    { label: 'Consultant', value: consultants, color: '#0D9488' },
    { label: 'Visitor', value: visitor, color: '#2563EB' },
  ].filter((s) => s.value > 0)
  const usersByRole = { total: roleSlices.reduce((a, s) => a + s.value, 0), slices: roleSlices }

  // Permission distribution across every role × permission combination.
  const combos = roles.length * ALL_PERMISSIONS.length
  const granted = roles.reduce((a, r) => a + r.permissions, 0)
  const permissionDist = {
    total: combos,
    slices: [
      { label: 'Granted', value: granted, color: '#16A34A' },
      { label: 'Not Assigned', value: Math.max(0, combos - granted), color: '#EF4444' },
    ].filter((s) => s.value > 0),
  }

  // Role Assignment Trend — daily new users (a role is assigned at sign-up).
  const since = new Date(Date.now() - 29 * DAY)
  since.setUTCHours(0, 0, 0, 0)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('day', "createdAt") AS b, count(*)::int AS c
    FROM "User" WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
    GROUP BY 1
  `
  const byDay = new Map(rows.map((r) => [`${new Date(r.b).getUTCFullYear()}-${new Date(r.b).getUTCMonth()}-${new Date(r.b).getUTCDate()}`, Number(r.c)]))
  const labels: string[] = []
  const points: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    points.push(byDay.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`) ?? 0)
  }

  const tabs = [
    { key: 'all', label: 'All Roles', count: roles.length },
    { key: 'system', label: 'System Roles', count: roles.length },
    { key: 'custom', label: 'Custom Roles', count: 0 },
  ]

  // How many staff carry exactly each template's modules.
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const templateUse = Object.fromEntries(ACCESS_TEMPLATES.map((t) => [t.key, staffGrants.filter((g) => same(g.permissions, t.keys)).length]))
  return { stats, usersByRole, permissionDist, trend: { labels, points }, tabs, roles, totalPermissions: ALL_PERMISSIONS.length, templateUse }
}
