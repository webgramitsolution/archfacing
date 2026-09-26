import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'

/**
 * Data for the Employees admin page (Users & Roles › Employees). Employees are
 * `RM_EMPLOYEE` users; their HR fields (code, designation, PACT area, work
 * mode, leave) are real columns on User. Every figure is a live query.
 */

const DAY = 86_400_000
const EMP = { role: 'RM_EMPLOYEE' as const, deletedAt: null }

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

export type EmpStat = { key: string; label: string; icon: IconName; value: number; trend: Trend }
export type RankBar = { label: string; value: number }
export type LeaveItem = { name: string; type: string; from: Date; to: Date; photo: string | null }

export type EmployeesOverview = {
  stats: EmpStat[]
  tabs: { key: string; label: string; count: number }[]
  distribution: { total: number; slices: DonutSlice[] }
  byLocation: { rows: RankBar[]; max: number }
  upcomingLeave: LeaveItem[]
}

const DEPT_COLORS = ['#6366F1', '#2563EB', '#8B5CF6', '#0D9488', '#16A34A', '#F97316', '#E11D48', '#EA9412', '#9CA3AF']

export async function employeesOverview(): Promise<EmployeesOverview> {
  const [
    total, active, inactive, onLeave, field, remote,
    deptGroups, cityGroups, leaves,
    tTotal, tActive, tInactive, tField, tRemote,
  ] = await Promise.all([
    prisma.user.count({ where: EMP }),
    prisma.user.count({ where: { ...EMP, status: 'ACTIVE', onLeave: false } }),
    prisma.user.count({ where: { ...EMP, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    prisma.user.count({ where: { ...EMP, onLeave: true } }),
    prisma.user.count({ where: { ...EMP, workMode: { in: ['Hybrid', 'Remote'] } } }),
    prisma.user.count({ where: { ...EMP, workMode: 'Remote' } }),
    prisma.user.groupBy({ by: ['department'], where: { ...EMP, department: { not: null } }, _count: { _all: true }, orderBy: { _count: { department: 'desc' } } }),
    prisma.user.groupBy({ by: ['city'], where: { ...EMP, city: { not: null } }, _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 9 }),
    prisma.user.findMany({ where: { ...EMP, onLeave: true, leaveFrom: { not: null } }, orderBy: { leaveFrom: 'asc' }, take: 6, select: { name: true, leaveType: true, leaveFrom: true, leaveTo: true, profilePhoto: true } }),
    windowed(EMP),
    windowed({ ...EMP, status: 'ACTIVE' }),
    windowed({ ...EMP, status: { in: ['SUSPENDED', 'BANNED'] } }),
    windowed({ ...EMP, workMode: { in: ['Hybrid', 'Remote'] } }),
    windowed({ ...EMP, workMode: 'Remote' }),
  ])

  const office = Math.max(0, total - field)

  const stats: EmpStat[] = [
    { key: 'total', label: 'Total Employees', icon: 'users', value: total, trend: tTotal },
    { key: 'active', label: 'Active Employees', icon: 'check', value: active, trend: tActive },
    { key: 'inactive', label: 'Inactive Employees', icon: 'map', value: inactive, trend: tInactive },
    { key: 'leave', label: 'On Leave', icon: 'clock', value: onLeave, trend: { pct: 0, direction: 'flat', hasBase: false } },
    { key: 'field', label: 'Field Employees', icon: 'star', value: field, trend: tField },
    { key: 'remote', label: 'Remote Employees', icon: 'globe', value: remote, trend: tRemote },
  ]

  const tabs = [
    { key: 'all', label: 'All Employees', count: total },
    { key: 'field', label: 'Field Staff', count: field },
    { key: 'office', label: 'Office Staff', count: office },
    { key: 'leave', label: 'On Leave', count: onLeave },
    { key: 'inactive', label: 'Inactive', count: inactive },
  ]

  const deptRows = deptGroups.map((g, i) => ({ label: g.department ?? 'Others', value: g._count._all, color: DEPT_COLORS[i % DEPT_COLORS.length] })).filter((r) => r.value > 0)
  const distribution = { total, slices: deptRows }

  const cityRows = cityGroups.map((g) => ({ label: g.city ?? 'Unknown', value: g._count._all })).filter((r) => r.value > 0)
  const byLocation = { rows: cityRows, max: Math.max(1, ...cityRows.map((r) => r.value)) }

  const upcomingLeave: LeaveItem[] = leaves.map((l) => ({
    name: l.name, type: l.leaveType ?? 'Leave', from: l.leaveFrom!, to: l.leaveTo ?? l.leaveFrom!, photo: l.profilePhoto,
  }))

  return { stats, tabs, distribution, byLocation, upcomingLeave }
}

// ── the table ───────────────────────────────────────────────

export type EmployeeRow = {
  id: string
  name: string
  email: string
  code: string
  department: string
  designation: string
  location: string
  pactCode: string
  level: string
  status: UserStatus
  onLeave: boolean
  joinedAt: Date | null
  photo: string | null
}
export type EmpListQuery = { tab?: string; department?: string; role?: string; status?: string; q?: string; page?: number; perPage?: number }

export async function listEmployeesPaged(query: EmpListQuery): Promise<{
  rows: EmployeeRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const where: Prisma.UserWhereInput = { ...EMP }
  switch (query.tab) {
    case 'field': where.workMode = { in: ['Hybrid', 'Remote'] }; break
    case 'office': where.workMode = 'Office'; break
    case 'leave': where.onLeave = true; break
    case 'inactive': where.status = { in: ['SUSPENDED', 'BANNED'] }; break
  }
  if (query.department && query.department !== 'all') where.department = query.department
  if (query.role && query.role !== 'all') where.designationLevel = query.role
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') where.status = 'ACTIVE'
    else if (query.status === 'inactive') where.status = { in: ['SUSPENDED', 'BANNED'] }
    else if (query.status === 'leave') where.onLeave = true
  }
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { employeeCode: { contains: query.q, mode: 'insensitive' } },
      { department: { contains: query.q, mode: 'insensitive' } },
    ]
  }

  const [total, emps] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, name: true, email: true, employeeCode: true, department: true, designation: true,
        city: true, pactCode: true, designationLevel: true, status: true, onLeave: true, joinedAt: true, profilePhoto: true,
      },
    }),
  ])

  const rows: EmployeeRow[] = emps.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    code: e.employeeCode ?? '—',
    department: e.department ?? '—',
    designation: e.designation ?? '—',
    location: e.city ?? '—',
    pactCode: e.pactCode ?? '—',
    level: e.designationLevel ?? 'Employee',
    status: e.status,
    onLeave: e.onLeave,
    joinedAt: e.joinedAt,
    photo: e.profilePhoto,
  }))

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export async function employeeDepartments(): Promise<string[]> {
  const rows = await prisma.user.groupBy({ by: ['department'], where: { ...EMP, department: { not: null } }, _count: true, orderBy: { department: 'asc' } })
  return rows.map((r) => r.department!).filter(Boolean)
}

/** Next auto employee code, e.g. EMP001275. */
export async function nextEmployeeCode(): Promise<string> {
  const last = await prisma.user.findFirst({
    where: { role: 'RM_EMPLOYEE', employeeCode: { not: null } },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  })
  const n = last?.employeeCode ? Number(last.employeeCode.replace(/\D/g, '')) : 1244
  return `EMP${String(n + 1).padStart(6, '0')}`
}
