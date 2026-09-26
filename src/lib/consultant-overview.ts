import { prisma } from '@/lib/prisma'
import { professionalReviewSummary } from '@/lib/professional-reviews'

/**
 * The consultant dashboard's real figures.
 *
 * Everything here is counted from the signed-in consultant's own rows. Where
 * the platform genuinely has no source for a number yet (earnings, profile
 * visitors, appointment bookings) this returns null / an empty list so the
 * screen can print "—" instead of inventing a figure — the same honesty the
 * professional, BMF and corporate dashboards already keep.
 */

export type ConsultantOverviewData = {
  stats: {
    enquiries: number
    consultations: number
    pactLeads: number
    projects: number
    services: number
    rating: number | null
    reviewCount: number
  }
  plan: { name: string; validTill: string | null; memberSince: string; profileViews: number } | null
  enquiries: {
    id: string
    title: string
    cat: string
    place: string
    ago: string
    status: string
    tone: string
  }[]
  services: { id: string; title: string; price: string; active: boolean }[]
  /** Where the consultant's enquiries actually came from. */
  leadSources: { label: string; value: number; pct: number; color: string }[]
  pact: { pincode: string; label: string } | null
  profileStrength: number
}

const STATUS_TONE: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'New', tone: 'text-brand' },
  ASSIGNED: { label: 'Assigned', tone: 'text-info' },
  IN_PROGRESS: { label: 'In progress', tone: 'text-info' },
  RESPONDED: { label: 'Replied', tone: 'text-ok' },
  CONVERTED: { label: 'Won', tone: 'text-ok' },
  CLOSED: { label: 'Closed', tone: 'text-ink-3' },
}

const SOURCE_COLOR = ['#2563EB', '#16A34A', '#F97316', '#7C3AED', '#D4AF37']

function ago(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function consultantOverviewData(userId: string): Promise<ConsultantOverviewData> {
  const [
    user,
    enquiryTotal,
    consultationTotal,
    pactLeadTotal,
    projectCount,
    serviceCount,
    recentEnquiries,
    services,
    sourceGroups,
    views,
    reviews,
    membership,
    pact,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true, mobile: true, addressLine: true, profilePhoto: true, logo: true,
        consultantProfile: { select: { bio: true, isVerified: true, subCategory: true } },
      },
    }),
    prisma.enquiry.count({ where: { holderId: userId } }),
    prisma.enquiry.count({ where: { clientId: userId } }),
    prisma.leadRecipient.count({ where: { recipientId: userId } }).catch(() => 0),
    prisma.post.count({ where: { authorId: userId, type: 'PROJECT' } }),
    prisma.post.count({ where: { authorId: userId, type: 'PRODUCT' } }),
    prisma.enquiry.findMany({
      where: { holderId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, subject: true, subCategory: true, serviceType: true, city: true, pincode: true, status: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { authorId: userId, type: 'PRODUCT' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, meta: true },
    }),
    prisma.enquiry.groupBy({
      by: ['sourceType'],
      where: { holderId: userId },
      _count: { _all: true },
    }).catch(() => [] as { sourceType: string; _count: { _all: number } }[]),
    prisma.post.aggregate({ where: { authorId: userId }, _sum: { viewCount: true } }),
    professionalReviewSummary(userId).catch(() => ({ average: 0, total: 0 })),
    prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gte: new Date() } },
      orderBy: { expiresAt: 'desc' },
      select: { planName: true, expiresAt: true },
    }),
    prisma.pact.findFirst({
      where: { holderId: userId, status: 'ACTIVE' },
      select: { pincode: true, city: true, state: true },
    }),
  ])

  const sourceTotal = sourceGroups.reduce((n, g) => n + g._count._all, 0)

  // Profile strength — the same honest measure the sidebar uses: how many of
  // the fields that matter are actually filled in.
  const filled = [
    !!user?.consultantProfile?.bio,
    !!user?.mobile,
    !!user?.addressLine,
    !!(user?.profilePhoto ?? user?.logo),
    !!user?.consultantProfile?.isVerified,
    projectCount > 0,
  ].filter(Boolean).length

  return {
    stats: {
      enquiries: enquiryTotal,
      consultations: consultationTotal,
      pactLeads: pactLeadTotal,
      projects: projectCount,
      services: serviceCount,
      rating: reviews.total > 0 ? reviews.average : null,
      reviewCount: reviews.total,
    },
    plan: membership
      ? {
          name: membership.planName,
          validTill: membership.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          memberSince: (user?.createdAt ?? new Date()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          profileViews: views._sum.viewCount ?? 0,
        }
      : user
        ? {
            name: 'No active plan',
            validTill: null,
            memberSince: user.createdAt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            profileViews: views._sum.viewCount ?? 0,
          }
        : null,
    enquiries: recentEnquiries.map((e) => {
      const s = STATUS_TONE[e.status] ?? STATUS_TONE.NEW
      return {
        id: e.id,
        title: e.subject,
        cat: e.subCategory || e.serviceType,
        place: [e.city, e.pincode].filter(Boolean).join(' · '),
        ago: ago(e.createdAt),
        status: s.label,
        tone: s.tone,
      }
    }),
    services: services.map((p) => {
      const m = (p.meta ?? {}) as Record<string, unknown>
      const price = typeof m.price === 'number' ? m.price : Number(m.price ?? 0)
      return {
        id: p.id,
        title: p.title,
        price: price > 0 ? `₹${price.toLocaleString('en-IN')}` : '—',
        active: p.status === 'PUBLISHED',
      }
    }),
    leadSources: sourceGroups
      .map((g, i) => ({
        label: String(g.sourceType ?? 'Direct').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
        value: g._count._all,
        pct: sourceTotal > 0 ? Math.round((g._count._all / sourceTotal) * 100) : 0,
        color: SOURCE_COLOR[i % SOURCE_COLOR.length],
      }))
      .sort((a, b) => b.value - a.value),
    pact: pact
      ? { pincode: pact.pincode, label: [pact.city, pact.state].filter(Boolean).join(', ') || pact.pincode }
      : null,
    profileStrength: Math.round((filled / 6) * 100),
  }
}
