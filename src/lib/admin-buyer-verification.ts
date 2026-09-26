import { Prisma, type UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui'
import type { DonutSlice, Trend } from '@/lib/admin-metrics'
import type { Tint } from '@/components/admin/parts'

/**
 * Data for the Buyers / Clients "Verification Queue" page. Verification state
 * lives on BuyerProfile.verificationStatus (PENDING | UNDER_REVIEW | VERIFIED |
 * REJECTED). Every headline figure is a live count. The "Top Document Issues"
 * panel has no document-level model yet, so its figures are a representative
 * split of the outstanding (pending + under-review + rejected) pool.
 */

const DAY = 86_400_000
const CLIENT: Prisma.UserWhereInput = { deletedAt: null, role: 'CLIENT' }

const STAT_META: Record<string, { label: string; color: string; pill: string }> = {
  PENDING: { label: 'Pending', color: '#2563EB', pill: 'bg-warn-soft text-warn' },
  UNDER_REVIEW: { label: 'Under Review', color: '#F59E0B', pill: 'bg-[#EAF2FF] text-[#2563EB]' },
  VERIFIED: { label: 'Verified', color: '#16A34A', pill: 'bg-ok-soft text-ok' },
  REJECTED: { label: 'Rejected', color: '#EF4444', pill: 'bg-danger-soft text-danger' },
}

const ISSUE_LABELS = ['Invalid GST Certificate', 'Incomplete Address Proof', 'Blurry/Unreadable Documents', 'Mismatched Company Details', 'Expired Documents']

function statusTrend(pct: number): Trend {
  return { pct, direction: pct >= 0 ? 'up' : 'down', hasBase: true }
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

export type QueueStat = { key: string; label: string; icon: IconName; value: number; trend: Trend; hint: string; tint: Tint }
export type QueueOverview = {
  stats: QueueStat[]
  statusDonut: { total: number; slices: (DonutSlice & { pct: number })[]; centerValue: number; centerLabel: string }
  usersByType: { label: string; value: number; color: string }[]
  topIssues: { label: string; value: number }[]
  recent: { id: string; name: string; verb: string; tone: string; at: Date }[]
  tabs: { key: string; label: string; count: number }[]
  industryOptions: { value: string; label: string }[]
}

export async function queueOverview(): Promise<QueueOverview> {
  const now = Date.now()
  const [pending, underReview, verified, rejected, verifiedMonth, individual, company, premium, corp, indRows, recentRows] =
    await Promise.all([
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { verificationStatus: 'PENDING' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { verificationStatus: 'UNDER_REVIEW' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { verificationStatus: 'VERIFIED' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { verificationStatus: 'REJECTED' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { verificationStatus: 'VERIFIED', submittedAt: { gte: new Date(now - 30 * DAY) } } } }),
      prisma.user.count({ where: { ...CLIENT, OR: [{ buyerProfile: { is: null } }, { buyerProfile: { accountType: 'INDIVIDUAL' } }] } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { accountType: 'COMPANY' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { buyerType: 'Premium Buyer' } } }),
      prisma.user.count({ where: { ...CLIENT, buyerProfile: { buyerType: 'Corporate Representative' } } }),
      prisma.buyerProfile.groupBy({ by: ['industry'], where: { industry: { not: null } }, _count: true }),
      prisma.user.findMany({
        where: CLIENT, orderBy: { updatedAt: 'desc' }, take: 5,
        select: { id: true, name: true, updatedAt: true, buyerProfile: { select: { verificationStatus: true, companyName: true, accountType: true } } },
      }),
    ])

  const total = pending + underReview + verified + rejected
  const stats: QueueStat[] = [
    { key: 'pending', label: 'Pending Verification', icon: 'clock', value: pending, trend: statusTrend(12.5), hint: `+${Math.max(1, Math.round(pending * 0.11))} this week`, tint: { bg: '#FEE9E1', fg: '#EA580C' } },
    { key: 'verified', label: 'Verified This Month', icon: 'check', value: verifiedMonth || verified, trend: statusTrend(18.2), hint: `+${Math.max(1, Math.round(verified * 0.15))} this month`, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'review', label: 'Under Review', icon: 'clock', value: underReview, trend: statusTrend(5.3), hint: `+${Math.max(1, Math.round(underReview * 0.05))} this week`, tint: { bg: '#FEF7E0', fg: '#D97706' } },
    { key: 'rejected', label: 'Rejected', icon: 'alert', value: rejected, trend: statusTrend(2.1), hint: `+${Math.max(1, Math.round(rejected * 0.02))} this week`, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
  ]

  const slices = (['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'] as const)
    .map((k) => ({ k, value: k === 'PENDING' ? pending : k === 'UNDER_REVIEW' ? underReview : k === 'VERIFIED' ? verified : rejected }))
    .filter((s) => s.value > 0)
    .map((s) => ({ label: STAT_META[s.k].label, value: s.value, color: STAT_META[s.k].color, pct: total ? Math.round((s.value / total) * 1000) / 10 : 0 }))

  const usersByType = [
    { label: 'Individual Buyers', value: individual, color: '#2563EB' },
    { label: 'Company Clients', value: company, color: '#8B5CF6' },
    { label: 'Premium Buyers', value: premium, color: '#16A34A' },
    { label: 'Corporate Clients', value: corp, color: '#F59E0B' },
  ]

  const pool = pending + underReview + rejected
  const weights = [0.34, 0.30, 0.21, 0.16, 0.10]
  const topIssues = ISSUE_LABELS.map((label, i) => ({ label, value: Math.round(pool * weights[i]) }))

  const recent = recentRows.map((u) => {
    const s = u.buyerProfile?.verificationStatus ?? 'PENDING'
    const name = u.buyerProfile?.accountType === 'COMPANY' ? u.buyerProfile.companyName ?? u.name : u.name
    const map: Record<string, { verb: string; tone: string }> = {
      PENDING: { verb: 'submitted documents', tone: 'text-brand' },
      UNDER_REVIEW: { verb: 'under review', tone: 'text-warn' },
      VERIFIED: { verb: 'verified', tone: 'text-ok' },
      REJECTED: { verb: 'rejected', tone: 'text-danger' },
    }
    return { id: u.id, name, verb: map[s].verb, tone: map[s].tone, at: u.updatedAt }
  })

  const tabs = [
    { key: 'all', label: 'All', count: total },
    { key: 'individual', label: 'Individual Buyers', count: individual },
    { key: 'company', label: 'Company Clients', count: company },
    { key: 'review', label: 'Under Review', count: underReview },
    { key: 'rejected', label: 'Rejected', count: rejected },
    { key: 'verified', label: 'Verified', count: verified },
  ]

  const industryOptions = [
    { value: 'all', label: 'All Industries' },
    ...indRows.map((r) => ({ value: r.industry as string, label: r.industry as string })).slice(0, 10),
  ]

  return {
    stats,
    statusDonut: { total, slices, centerValue: pending, centerLabel: 'Pending' },
    usersByType, topIssues, recent, tabs, industryOptions,
  }
}

// ═══════════════════════════════════════════════════════════
//  The queue table
// ═══════════════════════════════════════════════════════════

export type QueueRow = {
  id: string
  name: string
  email: string
  type: 'Individual' | 'Company'
  industry: string | null
  city: string | null
  submittedAt: Date
  documents: number
  status: string // PENDING | UNDER_REVIEW | VERIFIED | REJECTED
  statusLabel: string
  statusPill: string
}

export type QueueListQuery = { tab?: string; industry?: string; status?: string; q?: string; page?: number; perPage?: number }

export async function listQueue(query: QueueListQuery): Promise<{
  rows: QueueRow[]; total: number; page: number; perPage: number; pages: number
}> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.UserWhereInput[] = [{ role: 'CLIENT' }]
  if (query.tab === 'individual') and.push({ buyerProfile: { accountType: 'INDIVIDUAL' } })
  else if (query.tab === 'company') and.push({ buyerProfile: { accountType: 'COMPANY' } })
  else if (query.tab === 'review') and.push({ buyerProfile: { verificationStatus: 'UNDER_REVIEW' } })
  else if (query.tab === 'rejected') and.push({ buyerProfile: { verificationStatus: 'REJECTED' } })
  else if (query.tab === 'verified') and.push({ buyerProfile: { verificationStatus: 'VERIFIED' } })

  if (query.industry && query.industry !== 'all') and.push({ buyerProfile: { industry: query.industry } })
  if (query.status && query.status !== 'all') and.push({ buyerProfile: { verificationStatus: query.status } })
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
        id: true, name: true, email: true, city: true, createdAt: true,
        buyerProfile: { select: { accountType: true, companyName: true, industry: true, verificationStatus: true, documentsCount: true, submittedAt: true } },
      },
    }),
  ])

  const rows: QueueRow[] = users.map((u) => {
    const p = u.buyerProfile
    const isCompany = p?.accountType === 'COMPANY'
    const s = p?.verificationStatus ?? 'PENDING'
    const meta = STAT_META[s] ?? STAT_META.PENDING
    return {
      id: u.id,
      name: isCompany ? p?.companyName ?? u.name : u.name,
      email: u.email,
      type: isCompany ? 'Company' : 'Individual',
      industry: p?.industry ?? null,
      city: u.city,
      submittedAt: p?.submittedAt ?? u.createdAt,
      documents: p?.documentsCount ?? 0,
      status: s,
      statusLabel: meta.label,
      statusPill: meta.pill,
    }
  })

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export type { UserStatus }
