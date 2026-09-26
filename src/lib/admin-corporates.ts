import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PRODUCT_CATEGORIES } from '@/config/taxonomy'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Corporates & BMFs admin page — every figure a live query.
 *
 * "Corporate" here is the business universe: the CORPORATE role (brands,
 * manufacturers) and the BMF role (building-material facilitators). The
 * reference shows an "Industry" for each; this schema has no industry column,
 * so a company's industry is derived — honestly — from the product category it
 * actually publishes most under. A company with no products yet shows as
 * "General".
 */

const DAY = 86_400_000
const UNIVERSE: Prisma.UserWhereInput = { deletedAt: null, role: { in: ['CORPORATE', 'BMF'] } }

// slug → readable name, from the product taxonomy (both levels).
const CAT_LABEL = new Map<string, string>()
for (const g of PRODUCT_CATEGORIES) {
  CAT_LABEL.set(g.slug, g.name)
  for (const c of g.children ?? []) CAT_LABEL.set(c.slug, c.name)
}
function industryLabel(slug?: string | null): string {
  if (!slug) return 'General'
  return CAT_LABEL.get(slug) ?? prettify(slug)
}
function prettify(slug: string): string {
  return slug.replace(/[-_']/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()).replace(/\bS\b/g, 's')
}

const INDUSTRY_COLORS = ['#2563EB', '#F59E0B', '#8B5CF6', '#0D9488', '#16A34A', '#EF4444', '#6366F1', '#94A3B8']

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

/** authorId → the product category slug it publishes most under. */
async function dominantIndustry(): Promise<Map<string, string>> {
  const pairs = await prisma.post.groupBy({
    by: ['authorId', 'category'],
    where: { type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null, author: { role: { in: ['CORPORATE', 'BMF'] } } },
    _count: true,
  })
  const best = new Map<string, { cat: string; n: number }>()
  for (const p of pairs) {
    const cur = best.get(p.authorId)
    const n = typeof p._count === 'number' ? p._count : 0
    if (!cur || n > cur.n) best.set(p.authorId, { cat: p.category, n })
  }
  const out = new Map<string, string>()
  for (const [id, v] of best) out.set(id, v.cat)
  return out
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type CorpStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; tint: Tint }
export type CorpOverview = {
  stats: CorpStat[]
  byIndustry: { total: number; slices: DonutSlice[] }
  verification: { total: number; slices: DonutSlice[] }
  registration: { labels: string[]; points: number[] }
  tabs: { key: string; label: string; count: number }[]
  topCities: { city: string; count: number }[]
  cityOptions: { value: string; label: string }[]
  industryOptions: { value: string; label: string }[]
  dominant: Record<string, string>
}

export async function corpOverview(): Promise<CorpOverview> {
  const [
    total, active, pending, bmf, verifiedCorp, verifiedBmf, rejected,
    tTotal, tActive, tPending, tVerified, tBmf,
    universeUsers, cityGroups, dominant,
  ] = await Promise.all([
    prisma.user.count({ where: UNIVERSE }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'ACTIVE' } }),
    prisma.user.count({ where: { ...UNIVERSE, status: 'PENDING_VERIFICATION' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'BMF' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'CORPORATE', corporateProfile: { isVerified: true } } }),
    prisma.user.count({ where: { deletedAt: null, role: 'BMF', bmfProfile: { isVerified: true } } }),
    prisma.user.count({ where: { ...UNIVERSE, status: { in: ['SUSPENDED', 'BANNED'] } } }),
    windowed(),
    windowed({ status: 'ACTIVE' }),
    windowed({ status: 'PENDING_VERIFICATION' }),
    windowed({ OR: [{ corporateProfile: { isVerified: true } }, { bmfProfile: { isVerified: true } }] }),
    windowed({ role: 'BMF' }),
    prisma.user.findMany({ where: UNIVERSE, select: { id: true } }),
    prisma.user.groupBy({ by: ['city'], where: { ...UNIVERSE, city: { not: null } }, _count: true }),
    dominantIndustry(),
  ])

  const verifiedTotal = verifiedCorp + verifiedBmf

  const stats: CorpStat[] = [
    { key: 'total', label: 'Total Corporates', icon: 'building', value: total, trend: tTotal, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'active', label: 'Active Corporates', icon: 'check', value: active, trend: tActive, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'pending', label: 'Pending Approvals', icon: 'clock', value: pending, trend: tPending, tint: { bg: '#FEF2E2', fg: '#EA9412' } },
    { key: 'verified', label: 'Verified Corporates', icon: 'shield', value: verifiedTotal, trend: tVerified, tint: { bg: '#E3F6F5', fg: '#0D9488' } },
    { key: 'bmf', label: 'BMF Partners', icon: 'award', value: bmf, trend: tBmf, tint: { bg: '#FEF7E0', fg: '#D97706' } },
  ]

  // Tally companies by their dominant industry (slug → count).
  const bySlug = new Map<string, number>()
  for (const u of universeUsers) {
    const slug = dominant.get(u.id) ?? 'general'
    bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1)
  }
  const sortedIndustries = [...bySlug.entries()].sort((a, b) => b[1] - a[1])

  const byIndustry = {
    total,
    slices: sortedIndustries.slice(0, 6).map(([slug, count], i) => ({
      label: slug === 'general' ? 'General' : industryLabel(slug),
      value: count,
      color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length],
    })),
  }
  // Fold the long tail into "Others" so the ring closes.
  const shown = byIndustry.slices.reduce((a, s) => a + s.value, 0)
  if (shown < total) {
    byIndustry.slices.push({ label: 'Others', value: total - shown, color: '#94A3B8' })
  }

  // Everything not verified and not rejected is awaiting verification, so the
  // ring represents all companies rather than only the verified ones.
  const notVerified = Math.max(0, total - verifiedTotal - rejected)
  const verRows = [
    { label: 'Verified', value: verifiedTotal, color: '#16A34A' },
    { label: 'Pending', value: notVerified, color: '#F59E0B' },
    { label: 'Rejected', value: rejected, color: '#EF4444' },
  ].filter((s) => s.value > 0)
  const verification = { total, slices: verRows }

  // Daily new corporates over the last 30 days.
  const since = new Date(Date.now() - 29 * DAY)
  since.setUTCHours(0, 0, 0, 0)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('day', "createdAt") AS b, count(*)::int AS c
    FROM "User"
    WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL AND (role = 'CORPORATE' OR role = 'BMF')
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
    { key: 'all', label: 'All Corporates', count: total },
    ...sortedIndustries.slice(0, 6).map(([slug, count]) => ({
      key: slug,
      label: slug === 'general' ? 'General' : industryLabel(slug),
      count,
    })),
  ]

  const topCities = cityGroups.map((g) => ({ city: g.city as string, count: g._count })).sort((a, b) => b.count - a.count).slice(0, 6)
  const cityOptions = [
    { value: 'all', label: 'All Cities' },
    ...cityGroups.map((g) => ({ city: g.city as string, count: g._count })).sort((a, b) => b.count - a.count).slice(0, 20).map((c) => ({ value: c.city, label: c.city })),
  ]
  const industryOptions = [
    { value: 'all', label: 'All Industries' },
    ...sortedIndustries.map(([slug]) => ({ value: slug, label: slug === 'general' ? 'General' : industryLabel(slug) })),
  ]

  return {
    stats, byIndustry, verification, registration: { labels, points }, tabs, topCities,
    cityOptions, industryOptions, dominant: Object.fromEntries(dominant),
  }
}

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

// ═══════════════════════════════════════════════════════════
//  The corporate table
// ═══════════════════════════════════════════════════════════

export type CorpRow = {
  id: string
  company: string
  industry: string
  city: string | null
  contact: string
  contactEmail: string
  status: UserStatus
  verified: boolean
  isBmf: boolean
  createdAt: Date
  logo: string | null
}

export type CorpListQuery = {
  tab?: string
  industry?: string
  city?: string
  status?: string
  q?: string
  page?: number
  perPage?: number
  dominant: Record<string, string>
}

export async function listCorporates(query: CorpListQuery): Promise<{
  rows: CorpRow[]
  total: number
  page: number
  perPage: number
  pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)
  const dom = query.dominant

  const and: Prisma.UserWhereInput[] = [{ role: { in: ['CORPORATE', 'BMF'] } }]

  // Industry facet (from tab or the dropdown) resolves to a set of author ids.
  const industryKey = (query.tab && query.tab !== 'all' ? query.tab : query.industry) ?? 'all'
  if (industryKey && industryKey !== 'all') {
    const ids = Object.entries(dom).filter(([, slug]) => slug === industryKey).map(([id]) => id)
    if (industryKey === 'general') {
      // companies with no products (not present in the dominant map)
      and.push({ NOT: { id: { in: Object.keys(dom) } } })
    } else {
      and.push({ id: { in: ids.length ? ids : ['__none__'] } })
    }
  }

  if (query.city && query.city !== 'all') and.push({ city: query.city })
  if (query.status && query.status !== 'all') {
    if (query.status === 'active') and.push({ status: 'ACTIVE' })
    else if (query.status === 'pending') and.push({ status: 'PENDING_VERIFICATION' })
    else if (query.status === 'inactive') and.push({ status: { in: ['SUSPENDED', 'BANNED'] } })
    else if (query.status === 'verified') and.push({ OR: [{ corporateProfile: { isVerified: true } }, { bmfProfile: { isVerified: true } }] })
  }
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { corporateProfile: { companyName: { contains: query.q, mode: 'insensitive' } } },
        { bmfProfile: { businessName: { contains: query.q, mode: 'insensitive' } } },
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
        id: true, name: true, email: true, city: true, status: true, createdAt: true, role: true, logo: true, profilePhoto: true,
        corporateProfile: { select: { companyName: true, companyLogo: true, isVerified: true } },
        bmfProfile: { select: { businessName: true, isVerified: true } },
      },
    }),
  ])

  const rows: CorpRow[] = users.map((u) => {
    const isBmf = u.role === 'BMF'
    const company = u.corporateProfile?.companyName ?? u.bmfProfile?.businessName ?? u.name
    return {
      id: u.id,
      company,
      industry: query.dominant[u.id] ? industryLabel(query.dominant[u.id]) : 'General',
      city: u.city,
      contact: u.name,
      contactEmail: u.email,
      status: u.status,
      verified: Boolean(u.corporateProfile?.isVerified || u.bmfProfile?.isVerified),
      isBmf,
      createdAt: u.createdAt,
      logo: u.corporateProfile?.companyLogo ?? u.logo ?? u.profilePhoto,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

// ═══════════════════════════════════════════════════════════
//  Recent registrations
// ═══════════════════════════════════════════════════════════

export type RecentCorp = { id: string; company: string; industry: string; logo: string | null; at: Date }

export async function recentCorporates(dominant: Record<string, string>, take = 5): Promise<RecentCorp[]> {
  const users = await prisma.user.findMany({
    where: UNIVERSE,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, name: true, createdAt: true, logo: true, profilePhoto: true,
      corporateProfile: { select: { companyName: true, companyLogo: true } },
      bmfProfile: { select: { businessName: true } },
    },
  })
  return users.map((u) => ({
    id: u.id,
    company: u.corporateProfile?.companyName ?? u.bmfProfile?.businessName ?? u.name,
    industry: dominant[u.id] ? industryLabel(dominant[u.id]) : 'General',
    logo: u.corporateProfile?.companyLogo ?? u.logo ?? u.profilePhoto,
    at: u.createdAt,
  }))
}
