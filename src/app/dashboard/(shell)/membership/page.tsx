import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { subscriptionPlans } from '@/lib/membership'
import { MembershipView } from './membership-view'

export const metadata = { title: 'Membership & Plans · ArchFacing' }

/**
 * The seller's Membership & Plans page.
 *
 * Every plan, price, benefit and quota comes from the `SubscriptionPlan` table
 * — the same rows the admin manages — so this page can never show a plan that
 * does not exist or a price that has drifted. `subscriptionPlans()` returns
 * only the active plans, ordered by `sortOrder`.
 */
export default async function MembershipPlansPage() {
  const user = await requireAuth()

  const [plansRaw, activeSub] = await Promise.all([
    subscriptionPlans(),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE', expiresAt: { gte: new Date() } },
      orderBy: { expiresAt: 'desc' },
      select: { planId: true, planName: true, startsAt: true, expiresAt: true },
    }),
  ])

  // Prisma `Decimal` is not serialisable across the server/client boundary, so
  // the money fields are flattened to plain numbers here before they travel.
  const plans = plansRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline ?? '',
    price: Number(p.price),
    months: p.months,
    benefits: p.benefits,
    maxProjects: p.maxProjects,
    maxProducts: p.maxProducts,
    maxAroundUs: p.maxAroundUs,
    maxArtistry: p.maxArtistry,
    pactTerritories: p.pactTerritories,
    isPopular: p.isPopular,
  }))

  return (
    <MembershipView
      plans={plans}
      currentPlanId={activeSub?.planId ?? null}
      currentPlanName={activeSub?.planName ?? null}
      startsAt={activeSub?.startsAt?.toISOString() ?? null}
      expiresAt={activeSub?.expiresAt?.toISOString() ?? null}
    />
  )
}
