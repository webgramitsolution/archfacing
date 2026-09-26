import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { listClubPlans, getActiveMembership, daysLeft } from '@/lib/club'
import { BUSINESS_RULES } from '@/config/permissions'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageHero, HeroStats } from '@/components/page-hero'
import { ClubNewsletter } from '@/components/club'
import { SectionHead, Callout, Icon } from '@/components/ui'
import { CLUB_PHOTOS, unsplash } from '@/config/club-media'
import { PlanPicker, type PlanCard } from '../plan-picker'

export const metadata: Metadata = {
  title: 'Join ArchFacing Club',
  description:
    'Choose a Club Membership plan — priority placement in Consult Nearby, a member ' +
    'badge on every posting, discounts on Merchandise and early access to events.',
}

const FAQ = [
  {
    q: 'Do I need a PACT to join the Club?',
    a: 'No. Club Membership and PACT are separate. A PACT gives you exclusive rights to a PIN code and service category; Club Membership improves how you appear and what you get across the whole platform. Most professionals hold both, but either works on its own.',
  },
  {
    q: 'What happens if I renew before my term ends?',
    a: 'Nothing is lost. The new term begins the day the current one ends, so every day you have paid for is still yours. Renewing early only extends the finish date.',
  },
  {
    q: 'Is Club Membership free for a Design Associate?',
    a: `Yes. An approved Design Associate receives ${BUSINESS_RULES.DA_FREE_CLUB_YEARS} years of Club Membership at no cost, granted automatically on approval. There is nothing to buy and nothing to renew during that period.`,
  },
  {
    q: 'Can I get a refund?',
    a: `A cancellation request within ${BUSINESS_RULES.REFUND_WINDOW_DAYS} days of payment is considered, and any approved refund is capped at ${BUSINESS_RULES.REFUND_MAX_PERCENT}% of the amount paid, as set out in our Return, Refund & Cancellation Policy.`,
  },
  {
    q: 'Which plan suits a company rather than an individual?',
    a: 'Club Corporate. It covers up to 10 team logins, adds a brand page with a downloadable catalogue, and includes two banner weeks a year. It is open to Corporate and Building Materials Facilitator accounts.',
  },
]

export default async function ClubJoinPage() {
  const session = await auth()
  const role = session?.user?.role

  const [plans, membership, memberCount] = await Promise.all([
    listClubPlans(role),
    session?.user?.id ? getActiveMembership(session.user.id) : Promise.resolve(null),
    // Counted, not claimed. "5000+" sat between two genuinely derived stats,
    // which lent it their credibility.
    prisma.clubMembership.count({ where: { expiresAt: { gte: new Date() } } }).catch(() => 0),
  ])

  const cards: PlanCard[] = plans.map((p) => ({
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    months: p.months,
    price: Number(p.price),
    taxPercent: Number(p.taxPercent),
    benefits: p.benefits,
    isPopular: p.isPopular,
  }))

  return (
    <>
      <SiteHeader />

      <main className="bg-paper">
        <PageHero
          eyebrow="ArchFacing Club"
          title="Join the Club"
          subtitle="A membership for professionals who want to be found first. Better placement in Consult Nearby, a badge clients recognise, and the numbers behind your reach — for a fixed fee, with no commission on your work."
          image={unsplash(CLUB_PHOTOS.clubHero, { w: 1400, h: 875 })}
          breadcrumb="Join the Club"
        >
          <HeroStats
            items={[
              { value: memberCount.toLocaleString('en-IN'), label: 'active members' },
              { value: String(cards.length), label: 'plans to choose from' },
              {
                value: `${BUSINESS_RULES.DA_FREE_CLUB_YEARS} yrs`,
                label: 'free for Design Associates',
              },
            ]}
          />
        </PageHero>

        {membership && (
          <div className="container-af pt-8">
            <Callout tone="ok" title={`${membership.planName} is active`}>
              Running until{' '}
              <strong>{membership.expiresAt.toLocaleDateString('en-IN')}</strong> —{' '}
              {daysLeft(membership.expiresAt)} days left. Buying again extends the
              term rather than replacing it.{' '}
              <Link href="/dashboard/club" className="font-semibold text-gold hover:underline">
                Open your membership
              </Link>
            </Callout>
          </div>
        )}

        <section className="container-af py-10">
          <SectionHead title="Choose a plan">
            Every plan carries the same benefits; the longer terms simply cost
            less per month. Prices are shown before GST.
          </SectionHead>

          <div className="mt-6">
            <PlanPicker
              plans={cards}
              isSignedIn={Boolean(session?.user)}
              hasActive={Boolean(membership)}
            />
          </div>
        </section>

        <section className="container-af pb-10">
          <SectionHead title="Questions we get asked" />

          <dl className="mt-5 grid gap-4 lg:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q} className="card p-5">
                <dt className="font-display text-[14.5px] font-bold text-ink">{f.q}</dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-ink-2">{f.a}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
            <Icon name="help" className="h-4 w-4 text-gold" />
            Still unsure which plan fits?
            <Link href="/legal/contact" className="font-semibold text-gold hover:underline">
              Talk to us
            </Link>
            — or read the
            <Link href="/legal/refund" className="font-semibold text-gold hover:underline">
              refund policy
            </Link>
            before you decide.
          </p>
        </section>

        <section className="container-af pb-12">
          <ClubNewsletter />
        </section>
      </main>

      <SiteFooter variant="club" />
    </>
  )
}
