import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Students admin page — every figure a live query.
 *
 * A "student" is a PROFESSIONAL account whose profile tier is STUDENT (the free
 * registration, PDF §3.1.3). Their course/discipline is the first slug in
 * `professionalProfile.categories`, and their college is the profile's
 * `firmName` — the fields the registration form fills for a student.
 */

const DAY = 86_400_000
const UNIVERSE: Prisma.UserWhereInput = {
  deletedAt: null,
  role: 'PROFESSIONAL',
  professionalProfile: { tier: 'STUDENT' },
}

const COURSE_LABEL: Record<string, string> = {
  architecture: 'Architecture',
  'interior-design': 'Interior Design',
  'civil-engineering': 'Civil Engineering',
  'product-design': 'Product Design',
  'fine-arts': 'Fine Arts',
  others: 'Others',
}
const COURSE_COLOR: Record<string, string> = {
  architecture: '#6366F1',
  'interior-design': '#8B5CF6',
  'civil-engineering': '#F59E0B',
  'product-design': '#16A34A',
  'fine-arts': '#EC4899',
  others: '#94A3B8',
}
function courseLabel(slug?: string | null): string {
  if (!slug) return 'Others'
  return COURSE_LABEL[slug] ?? prettify(slug)
}
function prettify(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

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

export type StudentStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }
export type StudentsOverview = {
  stats: StudentStat[]
  byCourse: { total: number; slices: DonutSlice[] }
  verification: { total: number; slices: DonutSlice[] }
  registration: { labels: string[]; points: number[] }
  tabs: { key: string; label: string; count: number }[]
  topColleges: { name: string; count: number }[]
  collegeOptions: { value: string; label: string }[]
  courseOptions: { value: string; label: string }[]
}

export async function studentsOverview(): Promise<StudentsOverview> {
  const [
    total, active, pending, verified, newReg,
    tTotal, tActive, tPending, tNew,
    profiles,
  ] = await Promise.all([
    prisma.user.count({ where: UNIVERSE }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { ...UNIVERSE, professionalProfile: { tier: 'STUDENT', isVerified: true } } }),
    prisma.user.count({ where: { ...UNIVERSE, createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    windowed(),
    windowed({ status: 'ACTIVE' }),
    windowed({ status: 'PENDING_VERIFICATION' }),
    windowed(),
    prisma.professionalProfile.findMany({
      where: { tier: 'STUDENT', user: { deletedAt: null } },
      select: { categories: true, firmName: true },
    }),
  ])

  const rejected = await prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } })

  // Course tally (categories[0]) and college tally (firmName).
  const byCourseSlug = new Map<string, number>()
  const byCollege = new Map<string, number>()
  for (const pr of profiles) {
    const slug = pr.categories[0] ?? 'others'
    byCourseSlug.set(slug, (byCourseSlug.get(slug) ?? 0) + 1)
    if (pr.firmName) byCollege.set(pr.firmName, (byCollege.get(pr.firmName) ?? 0) + 1)
  }
  const campusPartners = byCollege.size

  const stats: StudentStat[] = [
    { key: 'total', label: 'Total Students', icon: 'users', value: total, trend: tTotal, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'active', label: 'Active Students', icon: 'check', value: active, trend: tActive, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'new', label: 'New Registrations', icon: 'user', value: newReg, trend: tNew, tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
    { key: 'pending', label: 'Pending Verifications', icon: 'shield', value: pending, trend: tPending, tint: { bg: '#FEF2E2', fg: '#EA9412' } },
    { key: 'campus', label: 'Campus Partners', icon: 'building', value: campusPartners, trend: { pct: 0, direction: 'flat', hasBase: false }, tint: { bg: '#E3F6F5', fg: '#0D9488' } },
  ]

  const sortedCourses = [...byCourseSlug.entries()].sort((a, b) => b[1] - a[1])
  const byCourse = {
    total,
    slices: sortedCourses.map(([slug, count]) => ({
      label: courseLabel(slug),
      value: count,
      color: COURSE_COLOR[slug] ?? '#94A3B8',
    })),
  }

  const notVerified = Math.max(0, total - verified - rejected)
  const verRows = [
    { label: 'Verified', value: verified, color: '#16A34A' },
    { label: 'Pending', value: notVerified, color: '#F59E0B' },
    { label: 'Rejected', value: rejected, color: '#EF4444' },
  ].filter((s) => s.value > 0)
  const verification = { total, slices: verRows }

  // Daily new students over the last 30 days.
  const since = new Date(Date.now() - 29 * DAY)
  since.setUTCHours(0, 0, 0, 0)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('day', u."createdAt") AS b, count(*)::int AS c
    FROM "User" u
    JOIN "ProfessionalProfile" pp ON pp."userId" = u.id
    WHERE u."createdAt" >= ${since} AND u."deletedAt" IS NULL AND pp.tier = 'STUDENT'
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
    { key: 'all', label: 'All Students', count: total },
    ...sortedCourses.map(([slug, count]) => ({ key: slug, label: courseLabel(slug), count })),
  ]

  const topColleges = [...byCollege.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const collegeOptions = [
    { value: 'all', label: 'All Colleges' },
    ...[...byCollege.entries()].map(([name]) => ({ value: name, label: name })).sort((a, b) => a.label.localeCompare(b.label)),
  ]
  const courseOptions = [
    { value: 'all', label: 'All Courses' },
    ...sortedCourses.map(([slug]) => ({ value: slug, label: courseLabel(slug) })),
  ]

  return { stats, byCourse, verification, registration: { labels, points }, tabs, topColleges, collegeOptions, courseOptions }
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

// ═══════════════════════════════════════════════════════════
//  The student table
// ═══════════════════════════════════════════════════════════

export type StudentRow = {
  id: string
  name: string
  email: string
  course: string
  college: string
  city: string | null
  status: UserStatus
  createdAt: Date
  photo: string | null
}

export type StudentListQuery = {
  tab?: string
  course?: string
  college?: string
  status?: string
  q?: string
  page?: number
  perPage?: number
}

export async function listStudents(query: StudentListQuery): Promise<{
  rows: StudentRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const profileFilter: Prisma.ProfessionalProfileWhereInput = { tier: 'STUDENT' }
  const courseKey = (query.tab && query.tab !== 'all' ? query.tab : query.course) ?? 'all'
  if (courseKey && courseKey !== 'all') profileFilter.categories = { has: courseKey }
  if (query.college && query.college !== 'all') profileFilter.firmName = query.college

  const and: Prisma.UserWhereInput[] = [{ role: 'PROFESSIONAL', professionalProfile: profileFilter }]
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
        { professionalProfile: { firmName: { contains: query.q, mode: 'insensitive' } } },
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
        id: true, name: true, email: true, city: true, status: true, createdAt: true, profilePhoto: true,
        professionalProfile: { select: { categories: true, firmName: true } },
      },
    }),
  ])

  const rows: StudentRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    course: courseLabel(u.professionalProfile?.categories[0]),
    college: u.professionalProfile?.firmName ?? '—',
    city: u.city,
    status: u.status,
    createdAt: u.createdAt,
    photo: u.profilePhoto,
  }))

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

// ═══════════════════════════════════════════════════════════
//  Recent registrations
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  Reference "Students" page — 6 stats, level tabs, richer table
// ═══════════════════════════════════════════════════════════

export type StudentStatCard = { key: string; label: string; icon: IconName; value: number; trend: Trend }
export type SRank = { label: string; value: number }

export type StudentsPageOverview = {
  stats: StudentStatCard[]
  tabs: { key: string; label: string; count: number }[]
  distribution: { total: number; slices: DonutSlice[] }
  topInstitutions: { rows: SRank[]; max: number }
  recent: { id: string; name: string; photo: string | null; at: Date }[]
}

const LEVELS = ['Undergraduate', 'Postgraduate', 'Diploma', 'Other']

export async function studentsPageOverview(): Promise<StudentsPageOverview> {
  const [
    total, active, inactive, compParticipants,
    tTotal, tActive, tInactive,
    profiles, levelGroups, recentUsers,
  ] = await Promise.all([
    prisma.user.count({ where: UNIVERSE }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    prisma.user.count({ where: { ...UNIVERSE, compEntries: { some: {} } } }),
    windowed(),
    windowed({ status: 'ACTIVE' }),
    windowed({ status: { in: ['SUSPENDED', 'BANNED'] } }),
    prisma.professionalProfile.findMany({ where: { tier: 'STUDENT', user: { deletedAt: null } }, select: { categories: true, firmName: true, studentLevel: true } }),
    prisma.professionalProfile.groupBy({ by: ['studentLevel'], where: { tier: 'STUDENT', studentLevel: { not: null }, user: { deletedAt: null } }, _count: { _all: true } }),
    prisma.user.findMany({ where: UNIVERSE, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, createdAt: true, profilePhoto: true } }),
  ])

  const byCourse = new Map<string, number>()
  const byInst = new Map<string, number>()
  for (const pr of profiles) {
    const slug = pr.categories[0] ?? 'others'
    byCourse.set(slug, (byCourse.get(slug) ?? 0) + 1)
    if (pr.firmName) byInst.set(pr.firmName, (byInst.get(pr.firmName) ?? 0) + 1)
  }

  const stats: StudentStatCard[] = [
    { key: 'total', label: 'Total Students', icon: 'users', value: total, trend: tTotal },
    { key: 'active', label: 'Active Students', icon: 'check', value: active, trend: tActive },
    { key: 'inactive', label: 'Inactive Students', icon: 'map', value: inactive, trend: tInactive },
    { key: 'inst', label: 'Institutions', icon: 'building', value: byInst.size, trend: { pct: 0, direction: 'flat', hasBase: false } },
    { key: 'intern', label: 'Internship Applications', icon: 'inbox', value: 0, trend: { pct: 0, direction: 'flat', hasBase: false } },
    { key: 'comp', label: 'Competition Participants', icon: 'trophy', value: compParticipants, trend: { pct: 0, direction: 'flat', hasBase: false } },
  ]

  const levelCount = (l: string) => levelGroups.find((g) => g.studentLevel === l)?._count._all ?? 0
  const tabs = [
    { key: 'all', label: 'All Students', count: total },
    ...LEVELS.map((l) => ({ key: l.toLowerCase(), label: l, count: levelCount(l) })),
  ]

  const courseSorted = [...byCourse.entries()].sort((a, b) => b[1] - a[1])
  const distribution = {
    total,
    slices: courseSorted.map(([slug, count]) => ({ label: courseLabel(slug), value: count, color: COURSE_COLOR[slug] ?? '#94A3B8' })),
  }

  const instRows = [...byInst.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5)
  const topInstitutions = { rows: instRows, max: Math.max(1, ...instRows.map((r) => r.value)) }

  const recent = recentUsers.map((u) => ({ id: u.id, name: u.name, photo: u.profilePhoto, at: u.createdAt }))

  return { stats, tabs, distribution, topInstitutions, recent }
}

export async function courseOptionList(): Promise<{ value: string; label: string }[]> {
  const rows = await prisma.professionalProfile.findMany({ where: { tier: 'STUDENT', user: { deletedAt: null } }, select: { categories: true } })
  const set = new Set<string>()
  for (const r of rows) if (r.categories[0]) set.add(r.categories[0])
  return [...set].sort().map((slug) => ({ value: slug, label: courseLabel(slug) }))
}

export async function institutionOptions(): Promise<string[]> {
  const rows = await prisma.professionalProfile.groupBy({ by: ['firmName'], where: { tier: 'STUDENT', firmName: { not: null } }, _count: true, orderBy: { firmName: 'asc' } })
  return rows.map((r) => r.firmName!).filter(Boolean)
}

export type StudentTableRow = {
  id: string; name: string; email: string; studentId: string; institution: string
  course: string; year: string; location: string; status: UserStatus; createdAt: Date; photo: string | null
}

export async function listStudentsTable(query: { tab?: string; course?: string; institution?: string; status?: string; q?: string; page?: number; perPage?: number }): Promise<{
  rows: StudentTableRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const pf: Prisma.ProfessionalProfileWhereInput = { tier: 'STUDENT' }
  if (query.tab && query.tab !== 'all') pf.studentLevel = { equals: query.tab, mode: 'insensitive' }
  if (query.course && query.course !== 'all') pf.categories = { has: query.course }
  if (query.institution && query.institution !== 'all') pf.firmName = query.institution

  const and: Prisma.UserWhereInput[] = [{ role: 'PROFESSIONAL', professionalProfile: pf }]
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') and.push({ status: 'ACTIVE' })
    else if (query.status === 'inactive') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })
    else if (query.status === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
  }
  if (query.q) {
    and.push({ OR: [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { professionalProfile: { firmName: { contains: query.q, mode: 'insensitive' } } },
      { professionalProfile: { studentId: { contains: query.q, mode: 'insensitive' } } },
    ] })
  }

  const where: Prisma.UserWhereInput = { deletedAt: null, AND: and }
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { professionalProfile: { studentId: 'asc' } }, skip: (page - 1) * perPage, take: perPage,
      select: {
        id: true, name: true, email: true, city: true, status: true, createdAt: true, profilePhoto: true,
        professionalProfile: { select: { categories: true, firmName: true, studentId: true, studentYear: true } },
      },
    }),
  ])

  const rows: StudentTableRow[] = users.map((u) => ({
    id: u.id, name: u.name, email: u.email,
    studentId: u.professionalProfile?.studentId ?? '—',
    institution: u.professionalProfile?.firmName ?? '—',
    course: courseLabel(u.professionalProfile?.categories[0]),
    year: u.professionalProfile?.studentYear ?? '—',
    location: u.city ?? '—',
    status: u.status, createdAt: u.createdAt, photo: u.profilePhoto,
  }))

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export type RecentStudent = { id: string; name: string; course: string; photo: string | null; at: Date }

export async function recentStudents(take = 5): Promise<RecentStudent[]> {
  const users = await prisma.user.findMany({
    where: UNIVERSE,
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, name: true, createdAt: true, profilePhoto: true, professionalProfile: { select: { categories: true } } },
  })
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    course: courseLabel(u.professionalProfile?.categories[0]),
    photo: u.profilePhoto,
    at: u.createdAt,
  }))
}

export { courseLabel }
