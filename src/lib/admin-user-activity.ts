import { Prisma } from '@prisma/client'
import { inLastMonth, inThisMonth, momPct, monthWindows } from '@/lib/mom'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the "User Activity" admin page — every figure a live AuditLog query.
 * Each AuditLog row is one activity (login, profile update, order, RFQ,
 * registration, document upload, …) with the actor, IP, device and status.
 */

const DAY = 86_400_000

/** action → display label + pill classes + which tab it falls under */
export const ACTIVITY_META: Record<string, { label: string; pill: string; tab: string }> = {
  LOGIN: { label: 'Login', pill: 'bg-ok-soft text-ok', tab: 'logins' },
  PROFILE_UPDATE: { label: 'Profile Update', pill: 'bg-[#EAF2FF] text-[#2563EB]', tab: 'profile' },
  RFQ_SUBMITTED: { label: 'RFQ', pill: 'bg-[#F3EAFE] text-[#8B5CF6]', tab: 'rfqs' },
  ORDER_PLACED: { label: 'Order', pill: 'bg-[#FEF3E0] text-[#D97706]', tab: 'orders' },
  REGISTRATION: { label: 'Registration', pill: 'bg-[#FDE9EF] text-[#DB2777]', tab: 'registrations' },
  DOCUMENT_UPLOAD: { label: 'Document Upload', pill: 'bg-[#E3F6F5] text-[#0D9488]', tab: 'other' },
  PASSWORD_RESET: { label: 'Password Reset', pill: 'bg-[#FEECEC] text-[#EF4444]', tab: 'other' },
  ENQUIRY: { label: 'Enquiry', pill: 'bg-[#EEF1FF] text-[#6366F1]', tab: 'other' },
}

function metaFor(action: string) {
  return ACTIVITY_META[action] ?? { label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), pill: 'bg-paper-3 text-ink-3', tab: 'other' }
}

const DEVICE_ICON: Record<string, IconName> = { Windows: 'monitor', Mac: 'monitor', Linux: 'monitor', Mobile: 'mobile' }
export function deviceIcon(d: string | null): IconName {
  return d ? DEVICE_ICON[d] ?? 'monitor' : 'monitor'
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type ActivityStat = { key: string; label: string; icon: IconName; value: number; pct: number | null; hint: string; tint: Tint }
export type LineSeries = { label: string; color: string; points: number[] }
export type ActivityOverview = {
  stats: ActivityStat[]
  chart: { labels: string[]; series: LineSeries[] }
  topUsers: { id: string; name: string; count: number }[]
  recent: { id: string; name: string; action: string; label: string; detail: string; at: Date }[]
  tabs: { key: string; label: string; count: number }[]
}

async function countAction(action: string) {
  return prisma.auditLog.count({ where: { action } })
}

export async function activityOverview(): Promise<ActivityOverview> {
  const [total, logins, profile, orders, rfqs, regs, topRows, recentRows, dayRows] = await Promise.all([
    prisma.auditLog.count(),
    countAction('LOGIN'),
    countAction('PROFILE_UPDATE'),
    countAction('ORDER_PLACED'),
    countAction('RFQ_SUBMITTED'),
    countAction('REGISTRATION'),
    prisma.auditLog.groupBy({ by: ['actorId'], where: { actorId: { not: null } }, _count: true, orderBy: { _count: { actorId: 'desc' } }, take: 5 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, action: true, after: true, createdAt: true, actor: { select: { name: true } } } }),
    prisma.$queryRaw<{ b: Date; action: string; c: number }[]>`
      SELECT date_trunc('day', "createdAt") AS b, action, count(*)::int AS c
      FROM "AuditLog"
      WHERE "createdAt" >= ${new Date(Date.now() - 29 * DAY)}
        AND action IN ('LOGIN','ORDER_PLACED','RFQ_SUBMITTED','REGISTRATION')
      GROUP BY 1, 2
    `,
  ])

  const other = total - logins - profile - orders - rfqs - regs

  // Month-over-month from the audit log's own timestamps — one pair per card.
  const w = monthWindows()
  const pair = (action?: string) => Promise.all(
    [inThisMonth(w), inLastMonth(w)].map((createdAt) =>
      prisma.auditLog.count({ where: action ? { action, createdAt } : { createdAt } })),
  )
  const [pTotal, pLogin, pProfile, pOrders, pRfqs, pRegs] = await Promise.all([
    pair(), pair('LOGIN'), pair('PROFILE_UPDATE'), pair('ORDER_PLACED'), pair('RFQ_SUBMITTED'), pair('REGISTRATION'),
  ])
  const trend = ([t, l]: number[]) => momPct(t, l)
  const hint = ([t, l]: number[]) => (l > 0 ? 'vs last month' : `${t} this month`)

  const stats: ActivityStat[] = [
    { key: 'total', label: 'Total Activities', icon: 'chart', value: total, pct: trend(pTotal), hint: hint(pTotal), tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'logins', label: 'User Logins', icon: 'user', value: logins, pct: trend(pLogin), hint: hint(pLogin), tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'profile', label: 'Profile Updates', icon: 'file', value: profile, pct: trend(pProfile), hint: hint(pProfile), tint: { bg: '#EAF2FF', fg: '#2563EB' } },
    { key: 'orders', label: 'Orders Placed', icon: 'bag', value: orders, pct: trend(pOrders), hint: hint(pOrders), tint: { bg: '#FEF3E0', fg: '#D97706' } },
    { key: 'rfqs', label: 'RFQs Submitted', icon: 'file', value: rfqs, pct: trend(pRfqs), hint: hint(pRfqs), tint: { bg: '#FDE9EF', fg: '#DB2777' } },
    { key: 'regs', label: 'New Registrations', icon: 'users', value: regs, pct: trend(pRegs), hint: hint(pRegs), tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  ]

  // daily chart series
  const dayKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  const byDay = new Map<string, Record<string, number>>()
  for (const r of dayRows) {
    const k = dayKey(new Date(r.b))
    const cur = byDay.get(k) ?? {}
    cur[r.action] = Number(r.c)
    byDay.set(k, cur)
  }
  const labels: string[] = []
  const P: Record<string, number[]> = { LOGIN: [], ORDER_PLACED: [], RFQ_SUBMITTED: [], REGISTRATION: [] }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }))
    const row = byDay.get(dayKey(d)) ?? {}
    for (const a of Object.keys(P)) P[a].push(row[a] ?? 0)
  }
  const chart = {
    labels,
    series: [
      { label: 'Logins', color: '#2563EB', points: P.LOGIN },
      { label: 'Orders', color: '#F97316', points: P.ORDER_PLACED },
      { label: 'RFQs', color: '#16A34A', points: P.RFQ_SUBMITTED },
      { label: 'Registrations', color: '#8B5CF6', points: P.REGISTRATION },
    ],
  }

  // top active users
  const topIds = topRows.map((r) => r.actorId!).filter(Boolean)
  const topUserRows = await prisma.user.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true } })
  const nameOf = new Map(topUserRows.map((u) => [u.id, u.name]))
  const topUsers = topRows.map((r) => ({ id: r.actorId!, name: nameOf.get(r.actorId!) ?? 'Unknown', count: r._count }))

  const recent = recentRows.map((r) => {
    const m = metaFor(r.action)
    const detail = (r.after as { detail?: string } | null)?.detail ?? m.label
    return { id: r.id, name: r.actor?.name ?? 'System', action: r.action, label: m.label, detail, at: r.createdAt }
  })

  const tabs = [
    { key: 'all', label: 'All Activities', count: total },
    { key: 'logins', label: 'Logins', count: logins },
    { key: 'profile', label: 'Profile Updates', count: profile },
    { key: 'orders', label: 'Orders', count: orders },
    { key: 'rfqs', label: 'RFQs', count: rfqs },
    { key: 'registrations', label: 'Registrations', count: regs },
    { key: 'other', label: 'Other', count: other },
  ]

  return { stats, chart, topUsers, recent, tabs }
}

// ═══════════════════════════════════════════════════════════
//  The activity table
// ═══════════════════════════════════════════════════════════

export type ActivityRow = {
  id: string
  userName: string
  userEmail: string
  action: string
  label: string
  pill: string
  detail: string
  ip: string
  device: string
  status: string
  at: Date
}

const TAB_ACTIONS: Record<string, string[]> = {
  logins: ['LOGIN'],
  profile: ['PROFILE_UPDATE'],
  orders: ['ORDER_PLACED'],
  rfqs: ['RFQ_SUBMITTED'],
  registrations: ['REGISTRATION'],
  other: ['DOCUMENT_UPLOAD', 'PASSWORD_RESET', 'ENQUIRY'],
}

export async function listActivity(query: { tab?: string; q?: string; page?: number; perPage?: number }): Promise<{
  rows: ActivityRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.AuditLogWhereInput[] = []
  if (query.tab && query.tab !== 'all') {
    const actions = TAB_ACTIONS[query.tab]
    if (actions) and.push({ action: { in: actions } })
  }
  if (query.q) {
    and.push({ actor: { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] } })
  }
  const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {}

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, action: true, after: true, ipAddress: true, device: true, status: true, createdAt: true, actor: { select: { name: true, email: true } } },
    }),
  ])

  const out: ActivityRow[] = rows.map((r) => {
    const m = metaFor(r.action)
    return {
      id: r.id,
      userName: r.actor?.name ?? 'System',
      userEmail: r.actor?.email ?? '—',
      action: r.action,
      label: m.label,
      pill: m.pill,
      detail: (r.after as { detail?: string } | null)?.detail ?? m.label,
      ip: r.ipAddress ?? '—',
      device: r.device ?? 'Windows',
      status: r.status ?? 'SUCCESS',
      at: r.createdAt,
    }
  })

  return { rows: out, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}
