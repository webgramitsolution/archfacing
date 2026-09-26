import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Professionals (Designa / Designi) admin page — every figure a
 * live query against the real professional accounts.
 *
 * "Professional" here means the design/creative practitioners: the PROFESSIONAL
 * role (architects = Designa, interior designers = Designi) and the CONSULTANT
 * role. Students (professional tier STUDENT) are their own page and are left
 * out. The reference's Civil-Engineer / Product-Designer facets have no column
 * behind them in this schema, so the categories shown are the real ones:
 * Architect, Interior Designer, Consultant.
 */

const DAY = 86_400_000

/** The professional universe — used everywhere as an AND clause. */
const UNIVERSE_OR: Prisma.UserWhereInput[] = [
  { role: 'PROFESSIONAL', professionalProfile: { tier: { not: 'STUDENT' } } },
  { role: 'CONSULTANT' },
]
const UNIVERSE: Prisma.UserWhereInput = { deletedAt: null, OR: UNIVERSE_OR }

function trend(last: number, prev: number): Trend {
  if (prev === 0) return { pct: last > 0 ? 100 : 0, direction: last > 0 ? 'up' : 'flat', hasBase: false }
  const pct = ((last - prev) / prev) * 100
  return { pct: Math.round(pct * 10) / 10, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat', hasBase: true }
}

async function windowed(extra: Prisma.UserWhereInput = {}): Promise<Trend> {
  const now = Date.now()
  const base: Prisma.UserWhereInput = { deletedAt: null, AND: [{ OR: UNIVERSE_OR }, extra] }
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({ where: { ...base, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type ProStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }

export type ProOverview = {
  stats: ProStat[]
  byCategory: { total: number; slices: DonutSlice[] }
  verification: { total: number; slices: DonutSlice[] }
  registration: { labels: string[]; points: number[] }
  tabs: { key: string; label: string; count: number }[]
  topLocations: { city: string; count: number }[]
  cityOptions: { value: string; label: string }[]
}

const CAT_COLORS: Record<string, string> = {
  Architect: '#6366F1',
  'Interior Designer': '#8B5CF6',
  Consultant: '#0D9488',
  Others: '#94A3B8',
}

export async function proOverview(): Promise<ProOverview> {
  const [
    total, active, pending,
    architects, interior, consultants, others,
    verifiedPro, verifiedCons, featured,
    verified, rejected,
    tTotal, tActive, tPending, tVerifiedPro, tFeatured,
    cityGroups,
  ] = await Promise.all([
    prisma.user.count({ where: UNIVERSE }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { designaType: 'DESIGNA', tier: { not: 'STUDENT' } } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { designaType: 'DESIGNI', tier: { not: 'STUDENT' } } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'CONSULTANT' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { is: null } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { isVerified: true, tier: { not: 'STUDENT' } } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'CONSULTANT', consultantProfile: { isVerified: true } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { tier: { in: ['LEGEND', 'INNOVATOR'] } } } }),
    // verification donut buckets
    prisma.user.count({ where: { ...UNIVERSE, OR: [{ professionalProfile: { isVerified: true } }, { consultantProfile: { isVerified: true } }] } }),
    prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    windowed(),
    windowed({ status: 'ACTIVE' }),
    windowed({ status: 'PENDING_VERIFICATION' }),
    windowed({ professionalProfile: { isVerified: true } }),
    windowed({ professionalProfile: { tier: { in: ['LEGEND', 'INNOVATOR'] } } }),
    prisma.user.groupBy({ by: ['city'], where: { ...UNIVERSE, city: { not: null } }, _count: true }),
  ])

  const verifiedTotal = verifiedPro + verifiedCons

  const stats: ProStat[] = [
    { key: 'total', label: 'Total Professionals', icon: 'users', value: total, trend: tTotal, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'active', label: 'Active Professionals', icon: 'check', value: active, trend: tActive, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'pending', label: 'Pending Approvals', icon: 'clock', value: pending, trend: tPending, tint: { bg: '#FEF2E2', fg: '#EA9412' } },
    { key: 'verified', label: 'Verified Professionals', icon: 'shield', value: verifiedTotal, trend: tVerifiedPro, tint: { bg: '#E3F6F5', fg: '#0D9488' } },
    { key: 'featured', label: 'Featured Professionals', icon: 'star', value: featured, trend: tFeatured, tint: { bg: '#FEF7E0', fg: '#D97706' } },
  ]

  const catRows = [
    { label: 'Architect', value: architects },
    { label: 'Interior Designer', value: interior },
    { label: 'Consultant', value: consultants },
    { label: 'Others', value: others },
  ].filter((s) => s.value > 0)
  const byCategory = {
    total: catRows.reduce((a, s) => a + s.value, 0),
    slices: catRows.map((s) => ({ ...s, color: CAT_COLORS[s.label] ?? '#94A3B8' })),
  }

  const verRows = [
    { label: 'Verified', value: verified, color: '#16A34A' },
    { label: 'Pending', value: pending, color: '#F59E0B' },
    { label: 'Rejected', value: rejected, color: '#EF4444' },
  ].filter((s) => s.value > 0)
  const verification = { total: verRows.reduce((a, s) => a + s.value, 0), slices: verRows }

  // Daily new professionals over the last 30 days.
  const since = new Date(Date.now() - 29 * DAY)
  since.setUTCHours(0, 0, 0, 0)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('day', "createdAt") AS b, count(*)::int AS c
    FROM "User"
    WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
      AND (role = 'CONSULTANT' OR role = 'PROFESSIONAL')
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
    { key: 'all', label: 'All Professionals', count: total },
    { key: 'architects', label: 'Architects', count: architects },
    { key: 'interior', label: 'Interior Designers', count: interior },
    { key: 'consultants', label: 'Consultants', count: consultants },
  ].filter((t) => t.key === 'all' || t.count > 0)

  const topLocations = cityGroups
    .map((g) => ({ city: g.city as string, count: g._count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const cityOptions = [
    { value: 'all', label: 'All Cities' },
    ...cityGroups
      .map((g) => ({ city: g.city as string, count: g._count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((c) => ({ value: c.city, label: c.city })),
  ]

  return { stats, byCategory, verification, registration: { labels, points }, tabs, topLocations, cityOptions }
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

// ═══════════════════════════════════════════════════════════
//  The professional table
// ═══════════════════════════════════════════════════════════

export type ProRow = {
  id: string
  name: string
  email: string
  category: string
  city: string | null
  skills: string[]
  status: UserStatus
  verified: boolean
  createdAt: Date
  photo: string | null
}

export type ProListQuery = {
  tab?: string
  city?: string
  verification?: string
  q?: string
  page?: number
  perPage?: number
}

function tabWhere(tab?: string): Prisma.UserWhereInput {
  switch (tab) {
    case 'architects':
      return { role: 'PROFESSIONAL', professionalProfile: { designaType: 'DESIGNA', tier: { not: 'STUDENT' } } }
    case 'interior':
      return { role: 'PROFESSIONAL', professionalProfile: { designaType: 'DESIGNI', tier: { not: 'STUDENT' } } }
    case 'consultants':
      return { role: 'CONSULTANT' }
    default:
      return { OR: UNIVERSE_OR }
  }
}

export async function listProfessionals(query: ProListQuery): Promise<{
  rows: ProRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.UserWhereInput[] = [tabWhere(query.tab)]
  if (query.city && query.city !== 'all') and.push({ city: query.city })
  if (query.verification && query.verification !== 'all') {
    if (query.verification === 'verified') and.push({ OR: [{ professionalProfile: { isVerified: true } }, { consultantProfile: { isVerified: true } }] })
    else if (query.verification === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
    else if (query.verification === 'rejected') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })
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
        id: true, name: true, email: true, city: true, status: true, createdAt: true, profilePhoto: true, role: true,
        professionalProfile: { select: { designaType: true, isVerified: true, categories: true } },
        consultantProfile: { select: { group: true, subCategory: true, isVerified: true } },
      },
    }),
  ])

  const rows: ProRow[] = users.map((u) => {
    const category =
      u.role === 'CONSULTANT'
        ? 'Consultant'
        : u.professionalProfile?.designaType === 'DESIGNA'
          ? 'Architect'
          : u.professionalProfile?.designaType === 'DESIGNI'
            ? 'Interior Designer'
            : 'Professional'
    const skills =
      u.professionalProfile?.categories?.slice(0, 3).map(prettify) ??
      (u.consultantProfile?.subCategory ? [prettify(u.consultantProfile.subCategory)] : [])
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      category,
      city: u.city,
      skills,
      status: u.status,
      verified: Boolean(u.professionalProfile?.isVerified || u.consultantProfile?.isVerified),
      createdAt: u.createdAt,
      photo: u.profilePhoto,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

function prettify(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

// ═══════════════════════════════════════════════════════════
//  Recent registrations
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  Reference "Professionals" page — richer overview + table
// ═══════════════════════════════════════════════════════════

const PRO: Prisma.UserWhereInput = { deletedAt: null, role: 'PROFESSIONAL', professionalProfile: { tier: { not: 'STUDENT' } } }

async function proWindow(extra: Prisma.UserWhereInput = {}): Promise<Trend> {
  const now = Date.now()
  const b = { ...PRO, AND: [extra] }
  const [last, prev] = await Promise.all([
    prisma.user.count({ where: { ...b, createdAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.user.count({ where: { ...b, createdAt: { gte: new Date(now - 60 * DAY), lt: new Date(now - 30 * DAY) } } }),
  ])
  return trend(last, prev)
}

export type ProStatCard = { key: string; label: string; icon: IconName; value: number; trend: Trend }
export type VerifyBar = { label: string; value: number; pct: number; color: string }

export type ProfessionalsOverview = {
  stats: ProStatCard[]
  tabs: { key: string; label: string; count: number }[]
  typeDistribution: { total: number; slices: DonutSlice[] }
  verification: { total: number; rows: VerifyBar[] }
  topCities: { rows: { label: string; value: number }[]; max: number }
}

const TYPE_COLORS = ['#6366F1', '#2563EB', '#0D9488', '#F97316', '#8B5CF6', '#16A34A', '#E11D48', '#EA9412', '#9CA3AF']

export async function professionalsOverview(): Promise<ProfessionalsOverview> {
  const since30 = new Date(Date.now() - 30 * DAY)
  const [
    total, verified, pending, featured, active, withProjects,
    banned, typeGroups, cityGroups,
    tTotal, tVerified, tPending, tFeatured, tActive, tProjects,
  ] = await Promise.all([
    prisma.user.count({ where: PRO }),
    prisma.user.count({ where: { ...PRO, professionalProfile: { isVerified: true, tier: { not: 'STUDENT' } } } }),
    prisma.user.count({ where: { ...PRO, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { ...PRO, professionalProfile: { isFeatured: true, tier: { not: 'STUDENT' } } } }),
    prisma.user.count({ where: { ...PRO, lastLoginAt: { gte: since30 } } }),
    prisma.user.count({ where: { ...PRO, posts: { some: { type: 'PROJECT', deletedAt: null } } } }),
    prisma.user.count({ where: { ...PRO, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    prisma.professionalProfile.groupBy({ by: ['professionType'], where: { tier: { not: 'STUDENT' }, professionType: { not: null } }, _count: { _all: true }, orderBy: { _count: { professionType: 'desc' } } }),
    prisma.user.groupBy({ by: ['city'], where: { ...PRO, city: { not: null } }, _count: { _all: true }, orderBy: { _count: { city: 'desc' } }, take: 10 }),
    proWindow(),
    proWindow({ professionalProfile: { isVerified: true } }),
    proWindow({ status: 'PENDING_VERIFICATION' }),
    proWindow({ professionalProfile: { isFeatured: true } }),
    proWindow({ lastLoginAt: { gte: since30 } }),
    proWindow({ posts: { some: { type: 'PROJECT', deletedAt: null } } }),
  ])

  const stats: ProStatCard[] = [
    { key: 'total', label: 'Total Professionals', icon: 'users', value: total, trend: tTotal },
    { key: 'verified', label: 'Verified Professionals', icon: 'check', value: verified, trend: tVerified },
    { key: 'pending', label: 'Pending Verification', icon: 'clock', value: pending, trend: tPending },
    { key: 'featured', label: 'Featured Professionals', icon: 'star', value: featured, trend: tFeatured },
    { key: 'active', label: 'Active (Last 30 Days)', icon: 'target', value: active, trend: tActive },
    { key: 'projects', label: 'Professionals with Projects', icon: 'building', value: withProjects, trend: tProjects },
  ]

  const tabs = [
    { key: 'all', label: 'All Professionals', count: total },
    { key: 'pending', label: 'Pending Verification', count: pending },
    { key: 'verified', label: 'Verified', count: verified },
    { key: 'featured', label: 'Featured', count: featured },
    { key: 'top', label: 'Top Rated', count: withProjects },
    { key: 'recent', label: 'Recently Joined', count: active },
    { key: 'inactive', label: 'Inactive', count: banned },
  ]

  const typeSlices = typeGroups.map((g, i) => ({ label: g.professionType ?? 'Others', value: g._count._all, color: TYPE_COLORS[i % TYPE_COLORS.length] })).filter((s) => s.value > 0)
  const typeDistribution = { total: typeSlices.reduce((a, s) => a + s.value, 0), slices: typeSlices }

  const unverified = Math.max(0, total - verified - pending - banned)
  const denom = Math.max(1, total)
  const pct = (v: number) => Math.round((v / denom) * 1000) / 10
  const verification = {
    total,
    rows: [
      { label: 'Verified', value: verified, pct: pct(verified), color: '#16A34A' },
      { label: 'Pending', value: pending, pct: pct(pending), color: '#EA9412' },
      { label: 'Rejected', value: banned, pct: pct(banned), color: '#E11D48' },
      { label: 'Unverified', value: unverified, pct: pct(unverified), color: '#94A3B8' },
    ],
  }

  const cityRows = cityGroups.map((g) => ({ label: g.city ?? 'Unknown', value: g._count._all })).filter((r) => r.value > 0)
  const topCities = { rows: cityRows, max: Math.max(1, ...cityRows.map((r) => r.value)) }

  return { stats, tabs, typeDistribution, verification, topCities }
}

export async function professionTypes(): Promise<string[]> {
  const rows = await prisma.professionalProfile.groupBy({ by: ['professionType'], where: { professionType: { not: null } }, _count: true, orderBy: { professionType: 'asc' } })
  return rows.map((r) => r.professionType!).filter(Boolean)
}

export type ProTableRow = {
  id: string
  name: string
  email: string
  type: string
  company: string
  location: string
  experience: number | null
  projects: number
  status: UserStatus
  verified: boolean
  featured: boolean
  createdAt: Date
  photo: string | null
}

export async function listProfessionalsTable(query: { tab?: string; type?: string; city?: string; verification?: string; q?: string; page?: number; perPage?: number }): Promise<{
  rows: ProTableRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.UserWhereInput[] = []
  switch (query.tab) {
    case 'pending': and.push({ status: 'PENDING_VERIFICATION' }); break
    case 'verified': and.push({ professionalProfile: { isVerified: true } }); break
    case 'featured': and.push({ professionalProfile: { isFeatured: true } }); break
    case 'top': and.push({ posts: { some: { type: 'PROJECT', deletedAt: null } } }); break
    case 'inactive': and.push({ status: { in: ['SUSPENDED', 'BANNED'] } }); break
  }
  if (query.type && query.type !== 'all') and.push({ professionalProfile: { professionType: query.type } })
  if (query.city && query.city !== 'all') and.push({ city: query.city })
  if (query.verification && query.verification !== 'all') {
    if (query.verification === 'verified') and.push({ professionalProfile: { isVerified: true } })
    else if (query.verification === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
    else if (query.verification === 'rejected') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })
  }
  if (query.q) {
    and.push({ OR: [
      { name: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { professionalProfile: { firmName: { contains: query.q, mode: 'insensitive' } } },
    ] })
  }

  const where: Prisma.UserWhereInput = { ...PRO, ...(query.tab === 'recent' ? {} : {}), AND: and }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: query.tab === 'recent' ? { createdAt: 'desc' } : { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, name: true, email: true, city: true, status: true, createdAt: true, profilePhoto: true,
        professionalProfile: { select: { professionType: true, designaType: true, firmName: true, experience: true, isVerified: true, isFeatured: true } },
        _count: { select: { posts: { where: { type: 'PROJECT', deletedAt: null } } } },
      },
    }),
  ])

  const rows: ProTableRow[] = users.map((u) => {
    const pp = u.professionalProfile
    const type = pp?.professionType ?? (pp?.designaType === 'DESIGNI' ? 'Interior Designer' : 'Architect')
    return {
      id: u.id, name: u.name, email: u.email, type,
      company: pp?.firmName ?? '—', location: u.city ?? '—',
      experience: pp?.experience ?? null, projects: u._count.posts,
      status: u.status, verified: Boolean(pp?.isVerified), featured: Boolean(pp?.isFeatured),
      createdAt: u.createdAt, photo: u.profilePhoto,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export type RecentPro = { id: string; name: string; category: string; photo: string | null; at: Date }

export async function recentProfessionals(take = 5): Promise<RecentPro[]> {
  const users = await prisma.user.findMany({
    where: UNIVERSE,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, name: true, createdAt: true, profilePhoto: true, role: true,
      professionalProfile: { select: { designaType: true } },
    },
  })
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    category:
      u.role === 'CONSULTANT'
        ? 'Consultant'
        : u.professionalProfile?.designaType === 'DESIGNA'
          ? 'Architect'
          : u.professionalProfile?.designaType === 'DESIGNI'
            ? 'Interior Designer'
            : 'Professional',
    photo: u.profilePhoto,
    at: u.createdAt,
  }))
}
