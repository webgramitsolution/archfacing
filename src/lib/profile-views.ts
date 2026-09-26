import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

/**
 * Profile Views — visits to a member's public storefront.
 *
 * Recorded from the storefront layout, which renders once per visit (moving
 * between tabs inside the storefront re-renders only the page, not the
 * layout). One row per visitor per profile per day; the owner looking at
 * their own storefront and obvious bots are not counted. An anonymous
 * visitor is a salted hash of IP + user agent — no raw IP is kept.
 */

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget/i
const SALT = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'archfacing'

function today(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export async function recordProfileView(p: { profileUserId: string; viewerId: string | null; ip: string | null; userAgent: string | null }) {
  if (p.viewerId === p.profileUserId) return
  if (!p.viewerId && (!p.userAgent || BOT.test(p.userAgent))) return
  const visitorKey = p.viewerId
    ? `u:${p.viewerId}`
    : `a:${createHash('sha256').update(`${SALT}|${p.ip ?? ''}|${p.userAgent ?? ''}`).digest('hex').slice(0, 32)}`
  await prisma.profileView.createMany({
    data: [{ profileUserId: p.profileUserId, viewerId: p.viewerId, visitorKey, day: today() }],
    skipDuplicates: true,
  })
}

export type ProfileViewStats = {
  total: number
  last30: number
  prev30: number
  signedIn30: number
  daily: { labels: string[]; points: number[] }
  byRole: { role: string; count: number }[]
  byCity: { city: string; count: number }[]
  recent: { id: string; name: string; role: string; city: string | null; at: Date; href: string | null }[]
}

const DAY = 86_400_000

export async function profileViewStats(userId: string): Promise<ProfileViewStats> {
  const now = Date.now()
  const d30 = new Date(now - 30 * DAY)
  const d60 = new Date(now - 60 * DAY)
  const [total, last30Rows, prev30, recent] = await Promise.all([
    prisma.profileView.count({ where: { profileUserId: userId } }),
    prisma.profileView.findMany({
      where: { profileUserId: userId, createdAt: { gte: d30 } },
      select: { createdAt: true, viewer: { select: { role: true, city: true } } },
    }),
    prisma.profileView.count({ where: { profileUserId: userId, createdAt: { gte: d60, lt: d30 } } }),
    prisma.profileView.findMany({
      where: { profileUserId: userId, viewerId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, createdAt: true,
        viewer: { select: { name: true, role: true, city: true, sellerSlug: true, deletedAt: true } },
      },
    }),
  ])

  const labels: string[] = []
  const counts = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY)
    const k = d.toISOString().slice(0, 10)
    labels.push(k)
    counts.set(k, 0)
  }
  const roles = new Map<string, number>()
  const cities = new Map<string, number>()
  for (const v of last30Rows) {
    const k = v.createdAt.toISOString().slice(0, 10)
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1)
    const role = v.viewer?.role ?? 'VISITOR'
    roles.set(role, (roles.get(role) ?? 0) + 1)
    if (v.viewer?.city) cities.set(v.viewer.city, (cities.get(v.viewer.city) ?? 0) + 1)
  }

  return {
    total,
    last30: last30Rows.length,
    prev30,
    signedIn30: last30Rows.filter((v) => v.viewer).length,
    daily: {
      labels: labels.map((k) => new Date(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
      points: labels.map((k) => counts.get(k) ?? 0),
    },
    byRole: [...roles].map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count),
    byCity: [...cities].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    recent: recent
      .filter((r) => r.viewer && !r.viewer.deletedAt)
      .map((r) => ({
        id: r.id, name: r.viewer!.name, role: r.viewer!.role, city: r.viewer!.city, at: r.createdAt,
        href: r.viewer!.sellerSlug ? `/${r.viewer!.sellerSlug}` : null,
      })),
  }
}
