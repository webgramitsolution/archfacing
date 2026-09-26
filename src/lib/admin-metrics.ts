import { Prisma, type Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isPaymentLive } from '@/lib/payments'
import { isMailConfigured } from '@/lib/mailer'
import type { IconName } from '@/components/ui'

/**
 * The Super-Admin dashboard's numbers — ALL of them real.
 *
 * The reference comp shows tens of thousands of users and neat upward trends;
 * this module refuses to paint any of that. Every figure below is a live
 * `count`, `aggregate` or `groupBy` against the database, and every "vs last 30
 * days" is a genuine window-over-window delta. When the seed data is small the
 * numbers are small — that is the honest state of the platform, not a bug.
 */

const DAY = 86_400_000

export type Trend = {
  /** Percentage change vs the preceding equal-length window. */
  pct: number
  direction: 'up' | 'down' | 'flat'
  /** Whether the previous window had anything to compare against. */
  hasBase: boolean
}

export type StatMetric = {
  key: string
  label: string
  icon: IconName
  value: number
  trend: Trend
  href?: string
}

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

/** Count in the last 30 days and the 30 before that, for one model + filter. */
async function windowed(
  table: 'User' | 'Enquiry' | 'Post' | 'AdBooking' | 'ClubMembership' | 'Payment',
  where: Prisma.Sql = Prisma.empty,
  now = Date.now()
): Promise<{ last: number; prev: number }> {
  const t = Prisma.raw(`"${table}"`)
  const start30 = new Date(now - 30 * DAY)
  const start60 = new Date(now - 60 * DAY)
  const [row] = await prisma.$queryRaw<{ last: number; prev: number }[]>`
    SELECT
      count(*) FILTER (WHERE "createdAt" >= ${start30})::int AS last,
      count(*) FILTER (WHERE "createdAt" >= ${start60} AND "createdAt" < ${start30})::int AS prev
    FROM ${t}
    WHERE TRUE ${where}
  `
  return { last: Number(row?.last ?? 0), prev: Number(row?.prev ?? 0) }
}

// ═══════════════════════════════════════════════════════════
//  Stat rows
// ═══════════════════════════════════════════════════════════

export type UserStats = {
  totalUsers: StatMetric
  professionals: StatMetric
  consultants: StatMetric
  corporatesBmfs: StatMetric
  students: StatMetric
  visitorsClients: StatMetric
  enquiries: StatMetric
}

export async function userStats(): Promise<UserStats> {
  const [
    totalUsers, professionals, consultants, corpBmf, clients, studentsCount, enquiries,
    tAll, tPro, tCon, tCorp, tClient, tEnq,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: 'PROFESSIONAL', deletedAt: null } }),
    prisma.user.count({ where: { role: 'CONSULTANT', deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ['CORPORATE', 'BMF'] }, deletedAt: null } }),
    prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } }),
    prisma.professionalProfile.count({ where: { tier: 'STUDENT' } }),
    prisma.enquiry.count(),
    windowed('User', Prisma.sql`AND "deletedAt" IS NULL`),
    windowed('User', Prisma.sql`AND role = 'PROFESSIONAL' AND "deletedAt" IS NULL`),
    windowed('User', Prisma.sql`AND role = 'CONSULTANT' AND "deletedAt" IS NULL`),
    windowed('User', Prisma.sql`AND role IN ('CORPORATE','BMF') AND "deletedAt" IS NULL`),
    windowed('User', Prisma.sql`AND role = 'CLIENT' AND "deletedAt" IS NULL`),
    windowed('Enquiry'),
  ])
  // Students live on ProfessionalProfile.tier — trend by their account's createdAt.
  const tStu = await windowed('User', Prisma.sql`AND "deletedAt" IS NULL AND id IN (SELECT "userId" FROM "ProfessionalProfile" WHERE tier = 'STUDENT')`)

  return {
    totalUsers: { key: 'users', label: 'Total Users', icon: 'users', value: totalUsers, trend: trend(tAll.last, tAll.prev), href: '/admin/users' },
    professionals: { key: 'pro', label: 'Professionals', icon: 'user', value: professionals, trend: trend(tPro.last, tPro.prev), href: '/admin/professionals' },
    consultants: { key: 'consultants', label: 'Consultants', icon: 'target', value: consultants, trend: trend(tCon.last, tCon.prev), href: '/admin/users?role=CONSULTANT' },
    corporatesBmfs: { key: 'corp', label: 'Corporates / BMFs', icon: 'building', value: corpBmf, trend: trend(tCorp.last, tCorp.prev), href: '/admin/corporates' },
    students: { key: 'students', label: 'Students', icon: 'award', value: studentsCount, trend: trend(tStu.last, tStu.prev), href: '/admin/students' },
    visitorsClients: { key: 'clients', label: 'Visitors / Clients', icon: 'heart', value: clients, trend: trend(tClient.last, tClient.prev), href: '/admin/visitors' },
    enquiries: { key: 'enq', label: 'Total Enquiries', icon: 'inbox', value: enquiries, trend: trend(tEnq.last, tEnq.prev) },
  }
}

export type ContentStats = {
  projects: StatMetric
  products: StatMetric
  artistry: StatMetric
  aroundUs: StatMetric
  blog: StatMetric
  ads: StatMetric
}

async function postTypeStat(
  type: 'PROJECT' | 'PRODUCT' | 'ARTISTRY' | 'AROUND_US' | 'BLOG',
  label: string,
  icon: IconName,
  href?: string
): Promise<StatMetric> {
  const [value, t] = await Promise.all([
    prisma.post.count({ where: { type, status: 'PUBLISHED', deletedAt: null } }),
    windowed('Post', Prisma.sql`AND type = ${type}::"PostType" AND "deletedAt" IS NULL`),
  ])
  return { key: type, label, icon, value, trend: trend(t.last, t.prev), href }
}

export async function contentStats(): Promise<ContentStats> {
  const [projects, products, artistry, aroundUs, blog, ads, tAd] = await Promise.all([
    postTypeStat('PROJECT', 'Total Projects', 'building', '/admin/moderation'),
    postTypeStat('PRODUCT', 'Total Products', 'box', '/admin/moderation'),
    postTypeStat('ARTISTRY', 'Total Artistry', 'image', '/admin/moderation'),
    postTypeStat('AROUND_US', 'Around Us Posts', 'globe', '/admin/moderation'),
    postTypeStat('BLOG', 'Blog Posts', 'file', '/admin/moderation'),
    prisma.adBooking.count(),
    windowed('AdBooking'),
  ])
  return {
    projects, products, artistry, aroundUs, blog,
    ads: { key: 'ads', label: 'Advertisements', icon: 'star', value: ads, trend: trend(tAd.last, tAd.prev), href: '/admin/ads' },
  }
}

// ═══════════════════════════════════════════════════════════
//  Role distribution (donut)
// ═══════════════════════════════════════════════════════════

export type DonutSlice = { label: string; value: number; color: string }

export async function roleDistribution(): Promise<{ total: number; slices: DonutSlice[] }> {
  const [byRole, students, companyClients] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], where: { deletedAt: null }, _count: true }),
    prisma.professionalProfile.count({ where: { tier: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'CLIENT', deletedAt: null, buyerProfile: { accountType: 'COMPANY' } } }),
  ])
  const count = (r: Role) => byRole.find((x) => x.role === r)?._count ?? 0

  // The reference's 7-role split (same order & labels).
  const clients = count('CLIENT')
  const professionals = Math.max(0, count('PROFESSIONAL') - students)
  const corporatesBmfs = count('CORPORATE') + count('BMF')
  const visitorsClients = Math.max(0, clients - companyClients) // individual buyers = visitors/clients
  const buyersOther = companyClients + count('CONSULTANT') + count('EXTERNAL_ADVERTISER') // company buyers + others
  const employees = count('RM_EMPLOYEE')
  const admins = count('SUPER_ADMIN') + count('ADMIN') + count('ADMIN_SELLER')

  const raw: DonutSlice[] = [
    { label: 'Professionals', value: professionals, color: '#8B5CF6' },
    { label: 'Corporates / BMFs', value: corporatesBmfs, color: '#A5B4FC' },
    { label: 'Students', value: students, color: '#2DD4BF' },
    { label: 'Visitors / Clients', value: visitorsClients, color: '#22C55E' },
    { label: 'Buyers / Other', value: buyersOther, color: '#F97316' },
    { label: 'Employees', value: employees, color: '#F59E0B' },
    { label: 'Admins', value: admins, color: '#EF4444' },
  ].filter((s) => s.value > 0)

  const total = raw.reduce((a, s) => a + s.value, 0)
  return { total, slices: raw }
}

// ═══════════════════════════════════════════════════════════
//  Platform Overview (multi-line time series)
// ═══════════════════════════════════════════════════════════

export type SeriesPeriod = 'daily' | 'weekly' | 'monthly'
export type LineSeries = { label: string; color: string; points: number[] }
export type PlatformOverview = { labels: string[]; series: LineSeries[] }

const PERIOD_CFG: Record<SeriesPeriod, { unit: 'day' | 'week' | 'month'; count: number }> = {
  daily: { unit: 'day', count: 30 },
  weekly: { unit: 'week', count: 12 },
  monthly: { unit: 'month', count: 12 },
}

/** date_trunc-compatible bucket key, computed in UTC to match Postgres. */
function keyOf(d: Date, unit: 'day' | 'week' | 'month'): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  if (unit === 'month') return `${y}-${m}`
  if (unit === 'day') return `${y}-${m}-${String(d.getUTCDate()).padStart(2, '0')}`
  // week — Monday of the week (Postgres date_trunc('week') convention)
  const dow = (d.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate() - dow))
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`
}

/** The bucket start dates we expect, oldest → newest, in UTC. */
function bucketStarts(unit: 'day' | 'week' | 'month', n: number): Date[] {
  const now = new Date()
  const out: Date[] = []
  if (unit === 'month') {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1)))
  } else if (unit === 'day') {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    for (let i = n - 1; i >= 0; i--) out.push(new Date(base.getTime() - i * DAY))
  } else {
    const dow = (now.getUTCDay() + 6) % 7
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow))
    for (let i = n - 1; i >= 0; i--) out.push(new Date(monday.getTime() - i * 7 * DAY))
  }
  return out
}

async function bucketCounts(
  table: 'User' | 'Enquiry' | 'Post',
  unit: 'day' | 'week' | 'month',
  since: Date,
  where: Prisma.Sql = Prisma.empty
): Promise<Map<string, number>> {
  const t = Prisma.raw(`"${table}"`)
  const u = Prisma.raw(`'${unit}'`)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc(${u}, "createdAt") AS b, count(*)::int AS c
    FROM ${t}
    WHERE "createdAt" >= ${since} ${where}
    GROUP BY 1
  `
  return new Map(rows.map((r) => [keyOf(new Date(r.b), unit), Number(r.c)]))
}

function labelFor(d: Date, unit: 'day' | 'week' | 'month'): string {
  if (unit === 'month') return d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export async function platformOverview(period: SeriesPeriod = 'monthly'): Promise<PlatformOverview> {
  const { unit, count } = PERIOD_CFG[period]
  const starts = bucketStarts(unit, count)
  const since = starts[0]

  const defs: { label: string; color: string; table: 'User' | 'Enquiry' | 'Post'; where?: Prisma.Sql }[] = [
    { label: 'Users', color: '#2563EB', table: 'User', where: Prisma.sql`AND "deletedAt" IS NULL` },
    { label: 'Professionals', color: '#8B5CF6', table: 'User', where: Prisma.sql`AND role = 'PROFESSIONAL' AND "deletedAt" IS NULL` },
    { label: 'Enquiries', color: '#16A34A', table: 'Enquiry' },
    { label: 'Projects', color: '#F97316', table: 'Post', where: Prisma.sql`AND type = 'PROJECT' AND "deletedAt" IS NULL` },
    { label: 'Products', color: '#F59E0B', table: 'Post', where: Prisma.sql`AND type = 'PRODUCT' AND "deletedAt" IS NULL` },
  ]

  const maps = await Promise.all(defs.map((d) => bucketCounts(d.table, unit, since, d.where)))

  return {
    labels: starts.map((d) => labelFor(d, unit)),
    series: defs.map((d, i) => ({
      label: d.label,
      color: d.color,
      points: starts.map((s) => maps[i].get(keyOf(s, unit)) ?? 0),
    })),
  }
}

// ═══════════════════════════════════════════════════════════
//  Recent enquiries
// ═══════════════════════════════════════════════════════════

export async function recentEnquiries(take = 5) {
  return prisma.enquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, subject: true, contactName: true, pincode: true,
      status: true, createdAt: true, serviceType: true,
    },
  })
}

// ═══════════════════════════════════════════════════════════
//  Top performing professionals (real project counts + real ratings)
// ═══════════════════════════════════════════════════════════

export type TopPro = {
  id: string
  name: string
  discipline: string
  projects: number
  rating: number | null
  photo: string | null
}

export async function topProfessionals(take = 5): Promise<TopPro[]> {
  // Rank by number of published PROJECT posts.
  const grouped = await prisma.post.groupBy({
    by: ['authorId'],
    where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { authorId: 'desc' } },
    take,
  })
  if (grouped.length === 0) return []

  const ids = grouped.map((g) => g.authorId)
  const [users, ratings] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, name: true, profilePhoto: true,
        professionalProfile: { select: { designaType: true, firmName: true } },
      },
    }),
    prisma.review.groupBy({
      by: ['postId'],
      where: { post: { authorId: { in: ids }, deletedAt: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ])

  // Roll per-post ratings up to per-author averages.
  const postAuthors = await prisma.post.findMany({
    where: { id: { in: ratings.map((r) => r.postId) } },
    select: { id: true, authorId: true },
  })
  const authorOfPost = new Map(postAuthors.map((p) => [p.id, p.authorId]))
  const perAuthor = new Map<string, { sum: number; n: number }>()
  for (const r of ratings) {
    const a = authorOfPost.get(r.postId)
    if (!a) continue
    const cur = perAuthor.get(a) ?? { sum: 0, n: 0 }
    cur.sum += (r._avg.rating ?? 0) * r._count._all
    cur.n += r._count._all
    perAuthor.set(a, cur)
  }

  const uById = new Map(users.map((u) => [u.id, u]))
  return grouped.map((g) => {
    const u = uById.get(g.authorId)
    const pr = u?.professionalProfile
    const agg = perAuthor.get(g.authorId)
    return {
      id: g.authorId,
      name: u?.name ?? 'Unknown',
      discipline: pr?.firmName ?? (pr?.designaType === 'DESIGNA' ? 'Architect' : pr?.designaType === 'DESIGNI' ? 'Interior Designer' : 'Professional'),
      projects: g._count._all,
      rating: agg && agg.n > 0 ? Math.round((agg.sum / agg.n) * 10) / 10 : null,
      photo: u?.profilePhoto ?? null,
    }
  })
}

// ═══════════════════════════════════════════════════════════
//  Revenue
// ═══════════════════════════════════════════════════════════

export type RevenueBreak = { label: string; value: number; pct: number }
export type RevenueOverview = {
  total: number
  breakdown: RevenueBreak[]
  monthly: number[]
  labels: string[]
}

export async function revenueOverview(): Promise<RevenueOverview> {
  const [total, byPurpose] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.payment.groupBy({
      by: ['purpose'],
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    }),
  ])
  const grand = Number(total._sum.totalAmount ?? 0)
  const sum = (purposes: string[]) =>
    byPurpose
      .filter((p) => purposes.includes(p.purpose))
      .reduce((a, p) => a + Number(p._sum.totalAmount ?? 0), 0)

  const groups: { label: string; purposes: string[] }[] = [
    { label: 'Subscriptions', purposes: ['CLUB_MEMBERSHIP', 'PORTAL_SPACE', 'REGISTRATION_FEE'] },
    { label: 'PACT & Renewals', purposes: ['PACT_PURCHASE', 'PACT_RENEWAL'] },
    { label: 'Advertisements', purposes: ['ADVERTISEMENT'] },
    { label: 'Others', purposes: ['MERCHANDISE_ORDER', 'COMPETITION_ENTRY', 'DA_INVOICE'] },
  ]
  const breakdown = groups.map((g) => {
    const value = sum(g.purposes)
    return { label: g.label, value, pct: grand > 0 ? Math.round((value / grand) * 1000) / 10 : 0 }
  })

  // Last 6 months of PAID revenue.
  const starts = bucketStarts('month', 6)
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('month', COALESCE("paidAt", "createdAt")) AS b, sum("totalAmount")::float AS c
    FROM "Payment"
    WHERE status = 'PAID' AND COALESCE("paidAt", "createdAt") >= ${starts[0]}
    GROUP BY 1
  `
  const map = new Map(rows.map((r) => [keyOf(new Date(r.b), 'month'), Number(r.c)]))

  return {
    total: grand,
    breakdown,
    monthly: starts.map((s) => map.get(keyOf(s, 'month')) ?? 0),
    labels: starts.map((s) => labelFor(s, 'month')),
  }
}

// ═══════════════════════════════════════════════════════════
//  Latest admin activities (audit log)
// ═══════════════════════════════════════════════════════════

export async function latestActivities(take = 6) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, action: true, entityType: true, entityId: true, createdAt: true,
      actor: { select: { name: true, role: true } },
    },
  })
  return logs
}

// ═══════════════════════════════════════════════════════════
//  Top PACT areas by enquiry volume
// ═══════════════════════════════════════════════════════════

export type PactArea = { pincode: string; place: string; count: number }

export async function topPactAreas(take = 5): Promise<PactArea[]> {
  const grouped = await prisma.enquiry.groupBy({
    by: ['pincode'],
    _count: { _all: true },
    orderBy: { _count: { pincode: 'desc' } },
    take,
  })
  if (grouped.length === 0) return []

  const pins = grouped.map((g) => g.pincode)
  const [pincodes, pacts] = await Promise.all([
    prisma.pincode.findMany({
      where: { code: { in: pins } },
      select: { code: true, district: true, state: true },
    }),
    prisma.pact.findMany({
      where: { pincode: { in: pins } },
      select: { pincode: true, city: true, state: true },
    }),
  ])
  const placeByPin = new Map<string, string>()
  for (const p of pincodes) placeByPin.set(p.code, p.district || p.state || '')
  for (const p of pacts) if (!placeByPin.get(p.pincode)) placeByPin.set(p.pincode, p.city || p.state || '')

  return grouped.map((g) => ({
    pincode: g.pincode,
    place: placeByPin.get(g.pincode) ?? '—',
    count: g._count._all,
  }))
}

// ═══════════════════════════════════════════════════════════
//  System health — the real signals the platform can actually report
// ═══════════════════════════════════════════════════════════

export type HealthRow = { label: string; value: string; tone: 'ok' | 'warn' | 'info' }

export async function systemHealth(): Promise<HealthRow[]> {
  /*
   * Only signals this process can actually measure. The old panel printed
   * "Storage 68%", "Backup Up to date" and "SSL Valid" as constants, and
   * labelled posts awaiting review as "Queue Jobs Running". There is no
   * backup job to report on, so that row is gone.
   */
  const t0 = Date.now()
  let dbOk = true
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    dbOk = false
  }
  const dbMs = Date.now() - t0

  const [mediaAgg, quotaAgg, queued] = await Promise.all([
    prisma.media.aggregate({ _sum: { sizeBytes: true } }).catch(() => ({ _sum: { sizeBytes: 0 } })),
    prisma.user.aggregate({ where: { deletedAt: null }, _sum: { storageQuotaMb: true } }).catch(() => ({ _sum: { storageQuotaMb: 0 } })),
    prisma.post.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
  ])
  const usedMb = Math.round(((mediaAgg._sum.sizeBytes ?? 0) / 1_048_576) * 10) / 10
  const quotaMb = quotaAgg._sum.storageQuotaMb ?? 0
  const pctUsed = quotaMb > 0 ? Math.round((usedMb / quotaMb) * 1000) / 10 : null

  const upHrs = process.uptime() / 3600
  const uptime = upHrs < 1 ? `${Math.max(1, Math.round(upHrs * 60))} min` : upHrs < 48 ? `${upHrs.toFixed(1)} h` : `${Math.round(upHrs / 24)} days`

  const storageLive = Boolean(process.env.R2_ACCOUNT_ID?.trim() && process.env.R2_BUCKET?.trim())
  const paymentsLive = Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim())
  const mailLive = Boolean(process.env.SMTP_USER?.trim())
  const https = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://')

  return [
    { label: 'Server', value: `Up ${uptime}`, tone: 'ok' },
    { label: 'Database', value: dbOk ? `Healthy · ${dbMs} ms` : 'Unreachable', tone: dbOk ? (dbMs > 500 ? 'warn' : 'ok') : 'warn' },
    {
      label: 'Storage',
      value: `${usedMb} MB${pctUsed != null ? ` · ${pctUsed}% of quota` : ''}${storageLive ? '' : ' · local disk'}`,
      tone: pctUsed != null && pctUsed > 85 ? 'warn' : 'info',
    },
    { label: 'Payments', value: paymentsLive ? 'Razorpay live' : 'Mock provider', tone: paymentsLive ? 'ok' : 'warn' },
    { label: 'Email', value: mailLive ? 'SMTP connected' : 'Not configured', tone: mailLive ? 'ok' : 'warn' },
    { label: 'HTTPS', value: https ? 'Enabled' : 'Not on HTTPS', tone: https ? 'ok' : 'warn' },
    { label: 'Moderation Queue', value: `${queued} awaiting review`, tone: queued > 0 ? 'info' : 'ok' },
  ]
}

/** Unread notifications for one admin — the bell badge. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } })
}

// ═══════════════════════════════════════════════════════════
//  "Needs your attention" — the decision queue
// ═══════════════════════════════════════════════════════════

export type AttentionTone = 'danger' | 'warn' | 'ok'
export type AttentionCard = {
  key: string
  title: string
  count: number
  detail: string
  tone: AttentionTone
  href: string
  cta: string
}

/**
 * The heart of the dashboard: everything currently waiting on an admin's
 * decision, each with a live count and a direct link into the queue that
 * resolves it. A card whose count is 0 renders as "all clear" — the numbers
 * are never invented.
 */
export async function attentionQueue(): Promise<AttentionCard[]> {
  const in30 = new Date(Date.now() + 30 * DAY)
  const now = new Date()

  const [
    pendingByType,
    verifyPro, verifyConsultant, verifyBmf, verifyCorp,
    failedPayments,
    pactExpiring,
    complaintsOpen, pactsNearLimit,
    subsExpiring, unrouted,
  ] = await Promise.all([
    prisma.post.groupBy({
      by: ['type'],
      where: { status: 'PENDING_REVIEW', deletedAt: null },
      _count: { _all: true },
    }),
    prisma.professionalProfile.count({ where: { isVerified: false } }),
    prisma.consultantProfile.count({ where: { isVerified: false } }),
    prisma.bmfProfile.count({ where: { isVerified: false } }),
    prisma.corporateProfile.count({ where: { isVerified: false } }),
    prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    prisma.pact.count({ where: { status: 'ACTIVE', expiresAt: { gte: now, lte: in30 } } }),
    prisma.complaint.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.pact.count({ where: { status: 'ACTIVE', complaintCount: { gte: 4 } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gte: now, lte: in30 } } }),
    prisma.enquiry.count({ where: { status: 'UNROUTED' } }),
  ])

  const pendingTotal = pendingByType.reduce((a, r) => a + r._count._all, 0)
  const typeLabel: Record<string, string> = {
    PROJECT: 'Projects', PRODUCT: 'Products', AROUND_US: 'Around Us',
    ARTISTRY: 'Artistry', BLOG: 'Blog', DESIGN_COMPETITION: 'Competition',
  }
  const pendingDetail =
    pendingTotal === 0
      ? 'Nothing waiting for review'
      : pendingByType
          .filter((r) => r._count._all > 0)
          .map((r) => `${typeLabel[r.type] ?? r.type} ${r._count._all}`)
          .join(' · ')

  const verifyTotal = verifyPro + verifyConsultant + verifyBmf + verifyCorp

  return [
    {
      key: 'moderation', title: 'Moderation queue', count: pendingTotal,
      detail: pendingDetail, tone: pendingTotal > 0 ? 'danger' : 'ok',
      href: '/admin/moderation', cta: 'Open queue',
    },
    {
      key: 'verify', title: 'Verification (KYC / profiles)', count: verifyTotal,
      detail: verifyTotal === 0 ? 'Every profile is verified' : `Pro ${verifyPro} · Consultant ${verifyConsultant} · BMF ${verifyBmf} · Corporate ${verifyCorp}`,
      tone: verifyTotal > 0 ? 'danger' : 'ok',
      href: '/admin/professionals', cta: 'Review now',
    },
    {
      key: 'payments', title: 'Failed payments (30d)', count: failedPayments,
      detail: failedPayments === 0 ? 'No failures this month' : 'Payments that errored at the gateway',
      tone: failedPayments > 0 ? 'danger' : 'ok',
      href: '/admin/settings', cta: 'Investigate',
    },
    {
      key: 'pact-expiry', title: 'PACT expiring in 30 days', count: pactExpiring,
      detail: pactExpiring === 0 ? 'No territories due for renewal' : 'Renewal reminders are due',
      tone: pactExpiring > 0 ? 'warn' : 'ok',
      href: '/admin/pact', cta: 'View territories',
    },
    {
      key: 'complaints', title: 'Open complaints', count: complaintsOpen,
      detail:
        pactsNearLimit > 0
          ? `${pactsNearLimit} PACT holder${pactsNearLimit > 1 ? 's' : ''} at 4 of 5 complaints`
          : complaintsOpen === 0 ? 'No complaints open' : 'Waiting on the Design Cell',
      tone: pactsNearLimit > 0 ? 'danger' : complaintsOpen > 0 ? 'warn' : 'ok',
      href: '/admin/pact', cta: 'Check',
    },
    {
      key: 'subs-expiry', title: 'Subscriptions expiring (30d)', count: subsExpiring,
      detail: subsExpiring === 0 ? 'No renewals due' : 'Send renewal offers to these sellers',
      tone: subsExpiring > 0 ? 'warn' : 'ok',
      href: '/admin/users', cta: 'Send offers',
    },
    {
      key: 'unrouted', title: 'Unrouted enquiries', count: unrouted,
      detail: unrouted === 0 ? 'Every enquiry reached a PACT holder' : 'No PACT holder found for these PIN codes',
      tone: unrouted > 0 ? 'warn' : 'ok',
      href: '/admin/growth', cta: 'Route them',
    },
  ]
}

/** Live sidebar badges — pending moderation, unverified profiles, open complaints. */
export async function sidebarBadges(): Promise<{
  moderation: number
  verification: number
  complaints: number
}> {
  const [moderation, pro, con, bmf, corp, complaints] = await Promise.all([
    prisma.post.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
    prisma.professionalProfile.count({ where: { isVerified: false } }),
    prisma.consultantProfile.count({ where: { isVerified: false } }),
    prisma.bmfProfile.count({ where: { isVerified: false } }),
    prisma.corporateProfile.count({ where: { isVerified: false } }),
    prisma.complaint.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
  ])
  return { moderation, verification: pro + con + bmf + corp, complaints }
}

// ═══════════════════════════════════════════════════════════
//  Command center — the four numbers + the live feed
// ═══════════════════════════════════════════════════════════

export type CommandStats = {
  totalUsers: number
  usersTrend: Trend
  activeWeek: number
  revenueToday: number
  revenueMonthTrend: Trend
  healthy: boolean
}

export async function commandStats(): Promise<CommandStats> {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const week = new Date(Date.now() - 7 * DAY)

  const [total, tUsers, active, today, monthly, dbOk] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    windowed('User', Prisma.sql`AND "deletedAt" IS NULL`),
    prisma.user.count({ where: { deletedAt: null, lastLoginAt: { gte: week } } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: dayStart } },
      _sum: { totalAmount: true },
    }),
    prisma.$queryRaw<{ last: number; prev: number }[]>`
      SELECT
        COALESCE(sum("totalAmount") FILTER (WHERE COALESCE("paidAt","createdAt") >= date_trunc('month', now())), 0)::float AS last,
        COALESCE(sum("totalAmount") FILTER (
          WHERE COALESCE("paidAt","createdAt") >= date_trunc('month', now()) - interval '1 month'
            AND COALESCE("paidAt","createdAt") < date_trunc('month', now())
        ), 0)::float AS prev
      FROM "Payment" WHERE status = 'PAID'
    `,
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
  ])

  const m = monthly[0] ?? { last: 0, prev: 0 }
  return {
    totalUsers: total,
    usersTrend: trend(tUsers.last, tUsers.prev),
    activeWeek: active,
    revenueToday: Number(today._sum.totalAmount ?? 0),
    revenueMonthTrend: trend(m.last, m.prev),
    healthy: dbOk,
  }
}

export type ActivityItem = {
  id: string
  icon: IconName
  title: string
  detail: string
  at: Date
}

/** One merged feed: registrations, PACT sales and admin actions, newest first. */
export async function liveActivity(take = 8): Promise<ActivityItem[]> {
  const [users, pacts, logs] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, name: true, role: true, createdAt: true },
    }),
    prisma.pact.findMany({
      where: { status: 'ACTIVE', purchasedAt: { not: null } },
      orderBy: { purchasedAt: 'desc' },
      take: 4,
      include: { holder: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, entityType: true, createdAt: true, actor: { select: { name: true } } },
    }),
  ])

  const human = (s: string) =>
    s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

  const items: ActivityItem[] = [
    ...users.map((u) => ({
      id: `u-${u.id}`,
      icon: 'user' as IconName,
      title: `New ${u.role.toLowerCase()} registered`,
      detail: u.name,
      at: u.createdAt,
    })),
    ...pacts.map((p) => ({
      id: `p-${p.id}`,
      icon: 'map' as IconName,
      title: `PACT active · ${p.pincode}`,
      detail: p.holder?.name ?? p.serviceType,
      at: p.purchasedAt!,
    })),
    ...logs.map((l) => ({
      id: `l-${l.id}`,
      icon: 'shield' as IconName,
      title: human(l.action),
      detail: `${l.actor?.name ?? 'System'} · ${l.entityType.toLowerCase()}`,
      at: l.createdAt,
    })),
  ]

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take)
}

// ═══════════════════════════════════════════════════════════
//  Platform Overview — the dense super-admin dashboard
// ═══════════════════════════════════════════════════════════

/** Last 12 whole months, UTC, as bucket keys + short labels. */
function twelveMonths(): { keys: string[]; labels: string[] } {
  const starts = bucketStarts('month', 12)
  return {
    keys: starts.map((d) => keyOf(d, 'month')),
    labels: starts.map((d) => labelFor(d, 'month')),
  }
}

/** 12-month row counts for a table, on its createdAt. */
async function monthlyCount(table: string, where: Prisma.Sql = Prisma.empty): Promise<number[]> {
  const t = Prisma.raw(`"${table}"`)
  const since = bucketStarts('month', 12)[0]
  const rows = await prisma.$queryRaw<{ b: Date; c: number }[]>`
    SELECT date_trunc('month', "createdAt") AS b, count(*)::int AS c
    FROM ${t} WHERE "createdAt" >= ${since} ${where} GROUP BY 1
  `
  const map = new Map(rows.map((r) => [keyOf(new Date(r.b), 'month'), Number(r.c)]))
  return twelveMonths().keys.map((k) => map.get(k) ?? 0)
}

export type StatPanel = {
  total: number
  trend: Trend
  spark: number[]
  breakdown: { label: string; value: number; pct: number }[]
}

/** Leads & Enquiries panel — total, trend, 12-month bars, status mix. */
export async function leadsPanel(): Promise<StatPanel> {
  const [total, byStatus, w, spark] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    windowed('Enquiry'),
    monthlyCount('Enquiry'),
  ])
  const count = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  const rows: { label: string; value: number }[] = [
    { label: 'New', value: count('NEW') + count('UNROUTED') },
    { label: 'Assigned', value: count('ASSIGNED') },
    { label: 'In Discussion', value: count('IN_PROGRESS') },
    { label: 'Qualified', value: count('RESPONDED') },
    { label: 'Converted', value: count('CONVERTED') },
  ]
  const denom = Math.max(1, total)
  return {
    total,
    trend: trend(w.last, w.prev),
    spark,
    breakdown: rows.map((r) => ({ ...r, pct: Math.round((r.value / denom) * 1000) / 10 })),
  }
}

/** Revenue panel — total paid, month-over-month trend, 12-month bars, mix. */
export async function revenuePanel(): Promise<StatPanel> {
  const since = bucketStarts('month', 12)[0]
  const [agg, byPurpose, rows] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.payment.groupBy({ by: ['purpose'], where: { status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.$queryRaw<{ b: Date; c: number }[]>`
      SELECT date_trunc('month', COALESCE("paidAt","createdAt")) AS b, sum("totalAmount")::float AS c
      FROM "Payment" WHERE status = 'PAID' AND COALESCE("paidAt","createdAt") >= ${since} GROUP BY 1
    `,
  ])
  const grand = Number(agg._sum.totalAmount ?? 0)
  const sum = (ps: string[]) =>
    byPurpose.filter((p) => ps.includes(p.purpose)).reduce((a, p) => a + Number(p._sum.totalAmount ?? 0), 0)

  const groups: { label: string; purposes: string[] }[] = [
    { label: 'Subscriptions', purposes: ['CLUB_MEMBERSHIP', 'PORTAL_SPACE', 'REGISTRATION_FEE', 'PACT_PURCHASE', 'PACT_RENEWAL'] },
    { label: 'Advertisements', purposes: ['ADVERTISEMENT'] },
    { label: 'Merchandise', purposes: ['MERCHANDISE_ORDER'] },
    { label: 'Others', purposes: ['COMPETITION_ENTRY', 'DA_INVOICE'] },
  ]
  const denom = Math.max(1, grand)
  const map = new Map(rows.map((r) => [keyOf(new Date(r.b), 'month'), Number(r.c)]))
  const spark = twelveMonths().keys.map((k) => map.get(k) ?? 0)

  const rn = spark.length
  const trendVal: Trend =
    spark[rn - 2] > 0
      ? {
          pct: Math.round(((spark[rn - 1] - spark[rn - 2]) / spark[rn - 2]) * 1000) / 10,
          direction: spark[rn - 1] >= spark[rn - 2] ? 'up' : 'down',
          hasBase: true,
        }
      : { pct: 0, direction: 'flat', hasBase: false }

  return {
    total: grand,
    trend: trendVal,
    spark,
    breakdown: groups.map((g) => {
      const value = sum(g.purposes)
      return { label: g.label, value, pct: Math.round((value / denom) * 1000) / 10 }
    }),
  }
}

/** Club Membership panel — count with Active / Pending / Expired. */
export async function clubPanel(): Promise<StatPanel> {
  const now = new Date()
  const [total, active, pending, w, spark] = await Promise.all([
    prisma.clubMembership.count(),
    prisma.clubMembership.count({ where: { expiresAt: { gte: now } } }),
    prisma.payment.count({ where: { purpose: 'CLUB_MEMBERSHIP', status: { in: ['CREATED', 'PENDING'] } } }),
    windowed('ClubMembership'),
    monthlyCount('ClubMembership'),
  ])
  const expired = Math.max(0, total - active)
  return {
    total,
    trend: trend(w.last, w.prev),
    spark,
    breakdown: [
      { label: 'Active', value: active, pct: total ? Math.round((active / total) * 1000) / 10 : 0 },
      { label: 'Pending', value: pending, pct: total + pending ? Math.round((pending / (total + pending)) * 1000) / 10 : 0 },
      { label: 'Expired', value: expired, pct: total ? Math.round((expired / total) * 1000) / 10 : 0 },
    ],
  }
}

/** Advertisements panel — bookings with Active / Scheduled / Completed. */
export async function adsPanel(): Promise<StatPanel> {
  const [total, running, scheduled, ended, review, w, spark] = await Promise.all([
    prisma.adBooking.count(),
    prisma.adBooking.count({ where: { status: 'RUNNING' } }),
    prisma.adBooking.count({ where: { status: 'SCHEDULED' } }),
    prisma.adBooking.count({ where: { status: 'ENDED' } }),
    prisma.adBooking.count({ where: { status: 'PENDING_REVIEW' } }),
    windowed('AdBooking'),
    monthlyCount('AdBooking'),
  ])
  return {
    total,
    trend: trend(w.last, w.prev),
    spark,
    breakdown: [
      { label: 'Active', value: running },
      { label: 'Awaiting Approval', value: review },
      { label: 'Scheduled', value: scheduled },
      { label: 'Completed', value: ended },
    ].map((r) => ({ ...r, pct: total ? Math.round((r.value / total) * 1000) / 10 : 0 })),
  }
}

// ── Geographical distribution — users by state ───────────────

export type RankedBar = { label: string; value: number }

export async function geoDistribution(top = 8): Promise<{ rows: RankedBar[]; max: number }> {
  const grouped = await prisma.user.groupBy({
    by: ['state'],
    where: { deletedAt: null, state: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { state: 'desc' } },
  })
  // State is free text on the user row, so "delhi", "Delhi " and "DELHI"
  // arrive as three groups. Fold them into one before ranking.
  const folded = new Map<string, number>()
  for (const g of grouped) {
    const raw = (g.state ?? '').trim()
    if (!raw) continue
    const label = raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, 'and')
    folded.set(label, (folded.get(label) ?? 0) + g._count._all)
  }
  const clean = [...folded.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const head = clean.slice(0, top)
  const rest = clean.slice(top).reduce((a, r) => a + r.value, 0)
  if (rest > 0) head.push({ label: 'Others', value: rest })
  return { rows: head, max: Math.max(1, ...head.map((r) => r.value)) }
}

// ── Top performing categories, for a post type ──────────────

export async function topCategories(
  type: 'PROJECT' | 'PRODUCT' | 'ARTISTRY' | 'AROUND_US' | 'BLOG',
  take = 9
): Promise<{ rows: RankedBar[]; max: number }> {
  const grouped = await prisma.post.groupBy({
    by: ['category'],
    where: { type, status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
    orderBy: { _count: { category: 'desc' } },
    take,
  })
  const slugs = grouped.map((g) => g.category).filter(Boolean)
  const cats = slugs.length
    ? await prisma.category.findMany({
        where: { type, slug: { in: slugs } },
        select: { slug: true, name: true },
      })
    : []
  const name = new Map(cats.map((c) => [c.slug, c.name]))
  const rows = grouped.map((g) => ({
    label: name.get(g.category) ?? g.category.replace(/-/g, ' '),
    value: g._count._all,
  }))
  return { rows, max: Math.max(1, ...rows.map((r) => r.value)) }
}

// ── Top cities, by enquiry volume ───────────────────────────

export async function topCitiesByEnquiry(take = 10): Promise<{ rows: RankedBar[]; max: number }> {
  const grouped = await prisma.enquiry.groupBy({
    by: ['pincode'],
    _count: { _all: true },
    orderBy: { _count: { pincode: 'desc' } },
    take: 60,
  })
  if (grouped.length === 0) return { rows: [], max: 1 }

  const pins = grouped.map((g) => g.pincode)
  const places = await prisma.pincode.findMany({
    where: { code: { in: pins } },
    select: { code: true, district: true, state: true },
  })
  const CITY_LABEL: Record<string, string> = { 'New Delhi': 'Delhi NCR', 'Central Delhi': 'Delhi NCR', Bengaluru: 'Bangalore' }
  const cityOf = new Map(places.map((p) => [p.code, CITY_LABEL[p.district ?? ''] ?? p.district ?? p.state ?? 'Unknown']))

  const byCity = new Map<string, number>()
  for (const g of grouped) {
    const city = cityOf.get(g.pincode) ?? 'Unknown'
    byCity.set(city, (byCity.get(city) ?? 0) + g._count._all)
  }
  const rows = [...byCity.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, take)
  return { rows, max: Math.max(1, ...rows.map((r) => r.value)) }
}

// ── Recent platform activity — a rich, mixed, filterable feed ─

export type ActivityKind = 'user' | 'project' | 'product' | 'lead' | 'membership' | 'ad'
export type PlatformActivity = {
  id: string
  kind: ActivityKind
  name: string
  role: string
  action: string
  detail: string
  at: Date
  photo: string | null
}

export async function platformActivity(take = 10): Promise<PlatformActivity[]> {
  const [posts, users, memberships, enquiries, ads] = await Promise.all([
    prisma.post.findMany({
      where: { type: { in: ['PROJECT', 'PRODUCT'] }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, type: true, title: true, category: true, createdAt: true,
        author: { select: { name: true, role: true, profilePhoto: true } },
      },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, role: true, city: true, createdAt: true, profilePhoto: true },
    }),
    prisma.clubMembership.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, planName: true, createdAt: true, user: { select: { name: true, role: true, profilePhoto: true } } },
    }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, subject: true, contactName: true, pincode: true, createdAt: true },
    }),
    prisma.adBooking.findMany({
      where: { status: { in: ['RUNNING', 'SCHEDULED', 'PENDING_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, createdAt: true, advertiser: { select: { name: true, role: true, profilePhoto: true } } },
    }),
  ])

  const roleLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase().replace('_', ' ')

  const items: PlatformActivity[] = [
    ...posts.map((p) => ({
      id: `post-${p.id}`,
      kind: (p.type === 'PROJECT' ? 'project' : 'product') as ActivityKind,
      name: p.author.name,
      role: roleLabel(p.author.role),
      action: p.type === 'PROJECT' ? 'New Project Submitted' : 'New Product Added',
      detail: p.title,
      at: p.createdAt,
      photo: p.author.profilePhoto,
    })),
    ...users.map((u) => ({
      id: `user-${u.id}`,
      kind: 'user' as ActivityKind,
      name: u.name,
      role: roleLabel(u.role),
      action: 'Registered on Platform',
      detail: u.city ?? 'India',
      at: u.createdAt,
      photo: u.profilePhoto,
    })),
    ...memberships.map((m) => ({
      id: `club-${m.id}`,
      kind: 'membership' as ActivityKind,
      name: m.user.name,
      role: roleLabel(m.user.role),
      action: 'Membership Upgraded',
      detail: `${m.planName} plan`,
      at: m.createdAt,
      photo: m.user.profilePhoto,
    })),
    ...enquiries.map((e) => ({
      id: `enq-${e.id}`,
      kind: 'lead' as ActivityKind,
      name: e.contactName,
      role: 'Client',
      action: 'Enquiry Submitted',
      detail: `${e.subject} · ${e.pincode}`,
      at: e.createdAt,
      photo: null,
    })),
    ...ads.map((a) => ({
      id: `ad-${a.id}`,
      kind: 'ad' as ActivityKind,
      name: a.advertiser.name,
      role: roleLabel(a.advertiser.role),
      action: 'Ad Campaign Created',
      detail: a.title,
      at: a.createdAt,
      photo: a.advertiser.profilePhoto,
    })),
  ]

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take)
}
