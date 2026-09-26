import type { Metadata } from 'next'
import { statValue } from '@/lib/platform-stats'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listClubPlans, getActiveMembership, daysLeft } from '@/lib/club'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Icon, Callout, type IconName } from '@/components/ui'
import {
  ClubGallery, ClubNewsletter,
  ClubStat, EventCard, TYPE_LABEL,
} from '@/components/club'
import { EVENT_TYPES } from '@/lib/club-events'
import { AutoRail } from '@/components/auto-rail'
import { getBrandLogos } from '@/lib/brand-logos'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'ArchFacing Club — Learn. Connect. Grow Together.',
  description:
    'Join ArchFacing Club to be part of a vibrant community of architects, designers, ' +
    'manufacturers and industry experts. Exclusive events, networking and member benefits.',
}

// ═══════════════════════════════════════════════════════════
//  Static copy from the design
// ═══════════════════════════════════════════════════════════

const HERO_FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'users', label: 'Industry\nNetworking' },
  { icon: 'grid', label: 'Knowledge\nSharing' },
  { icon: 'star', label: 'Exclusive\nEvents' },
  { icon: 'chart', label: 'Career\nGrowth' },
]

const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'star',
    title: 'Exclusive Events',
    body: 'Access to premium seminars, webinars, workshops and exhibitions.',
  },
  {
    icon: 'shield',
    title: 'Certificates & Recognition',
    body: 'Get certificates for events and recognition for your contributions.',
  },
  {
    icon: 'users',
    title: 'Networking Opportunities',
    body: 'Connect with industry professionals, experts and potential collaborators.',
  },
  {
    icon: 'clock',
    title: 'Priority Access',
    body: 'Early access and special discounts on events & programs.',
  },
  {
    icon: 'file',
    title: 'Knowledge & Learning',
    body: 'Gain insights from experts, case studies and latest industry trends.',
  },
  {
    icon: 'chart',
    title: 'Business Growth',
    body: 'New opportunities, brand visibility and professional growth.',
  },
  {
    icon: 'tag',
    title: 'Exclusive Discounts',
    body: 'Member-only pricing on paid events, merchandise and partner offers.',
  },
  {
    icon: 'calendar',
    title: 'Early Event Access',
    body: 'Priority registration for high-demand seminars, webinars and workshops.',
  },
]

/*
 * The band is built from real counts inside the page — see `clubStats`.
 *
 * It used to read 5000+ Active Members / 200+ Events Organized / 50+ Industry
 * Partners / 20+ Cities / 100+ Expert Speakers / 10+ Years of Impact. None of
 * those were counted, and "5000+ Active Members" sat on this page while
 * /membership claimed 29,450+ for the same platform. "Industry Partners",
 * "Expert Speakers" and "Years of Impact" have no table behind them at all,
 * so they are gone rather than guessed.
 */

/** Icon and audience line per plan slug, so the cards read like the design. */
const PLAN_FACE: Record<string, { icon: IconName; audience: string }> = {
  'club-individual': { icon: 'users', audience: 'For Professionals & Individuals' },
  'club-corporate': { icon: 'building', audience: 'For Companies & Brands' },
}

export default async function ClubPage() {
  const session = await auth()
  const role = session?.user?.role

  const [plans, membership, events, memberCount, eventCount, eventCityRows, logos] = await Promise.all([
    listClubPlans(role),
    session?.user?.id ? getActiveMembership(session.user.id) : Promise.resolve(null),
    prisma.clubEvent.findMany({
      where: { status: 'PUBLISHED', startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 12,
      select: {
        slug: true, title: true, type: true, summary: true, heroImage: true,
        startsAt: true, endsAt: true, isOnline: true, city: true, venueName: true,
      },
    }),
    prisma.clubMembership.count({ where: { expiresAt: { gte: new Date() } } }).catch(() => 0),
    prisma.clubEvent.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    prisma.clubEvent
      .findMany({ where: { status: 'PUBLISHED' }, select: { city: true }, distinct: ['city'] })
      .catch(() => [] as { city: string | null }[]),
    getBrandLogos(),
  ])

  /* Only figures the database can answer. A count of zero prints "0", which
     is the truth for a club that has not run an event yet. */
  const clubStats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'users', value: statValue(memberCount), label: 'Active Members' },
    { icon: 'grid', value: statValue(eventCount), label: 'Events Published' },
    { icon: 'map', value: statValue(eventCityRows.filter((c) => c.city).length), label: 'Cities Covered' },
  ]

  // Only two plans are shown — Basic and Professional. Premium is dropped, but
  // its benefits are folded in so nothing is lost: Professional (the top plan)
  // gains all of Premium's, and Basic gains Premium's over what it already has.
  const premium = plans.find(
    (p) => p.slug === 'club-premium' || /premium/i.test(p.name)
  )
  const premiumBenefits = premium?.benefits ?? []
  const cards = plans
    .filter((p) => p.slug !== 'club-premium' && !/premium/i.test(p.name))
    .slice(0, 2)
    .map((p) => ({
      ...p,
      benefits: [
        ...p.benefits,
        ...premiumBenefits.filter((b) => !p.benefits.includes(b)),
      ],
    }))

  return (
    <>
      <SiteHeader />

      <main className="bg-paper">
        {/* ═══════════════════ hero ═══════════════════ */}
        <section className="relative overflow-hidden bg-navy-deep">
          {/* The client's banner, shown CLEAR on the right — the navy only
              washes the left, as far as the text runs, then fades away. */}
          <span aria-hidden className="absolute inset-0">
            <Image
              src="https://ik.imagekit.io/archfacing/banener%20club1.png?updatedAt=1784733612068"
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-center"
            />
            <span className="absolute inset-0 bg-gradient-to-r from-navy-deep from-0% via-navy-deep/60 via-38% to-transparent to-72%" />
          </span>

          <div className="container-af relative py-10 md:py-12 lg:py-16">
            <div className="grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
              <div className="min-w-0">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold md:text-[12px]">
                  ArchFacing Club
                </p>

                <h1 className="font-display text-[32px] font-bold leading-[1.06] tracking-tight text-white md:text-[40px] lg:text-[52px]">
                  Learn. Connect.
                  <br />
                  <span className="text-gold">Grow Together.</span>
                </h1>

                {/* Two balanced lines. */}
                <p className="mt-4 max-w-[52ch] text-[12.5px] leading-relaxed text-white/70 [text-wrap:balance] lg:mt-5 lg:text-[15px]">
                  Join ArchFacing Club to be part of a vibrant community of
                  architects, designers, manufacturers and industry experts.
                </p>

                <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3.5 lg:mt-7 lg:gap-x-8">
                  {HERO_FEATURES.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5">
                      <Icon name={f.icon} className="h-[22px] w-[22px] shrink-0 text-gold lg:h-6 lg:w-6" />
                      <span className="whitespace-pre-line text-[11.5px] font-semibold leading-tight text-white/85 lg:text-[12.5px]">
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap gap-3 lg:mt-8">
                  <Link href="/club/join" className="btn-gold btn-shine">
                    Become a Member
                  </Link>
                  <Link href="#about-club" className="btn-on-navy">
                    <Icon name="arrow" className="h-4 w-4" />
                    Watch Video
                  </Link>
                </div>
              </div>

              {/* The club badge — the client's crest artwork. */}
              <div className="hidden justify-center md:flex">
                <Image
                  src="https://ik.imagekit.io/archfacing/Icon/badge.png?updatedAt=1784698763551"
                  alt="ArchFacing Club — Stronger Together"
                  width={320}
                  height={320}
                  unoptimized
                  priority
                  className="h-auto w-[220px] object-contain lg:w-[300px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* current membership, when signed in */}
        {membership && (
          <div className="container-af pt-8">
            <Callout tone="ok" title={`${membership.planName} is active`}>
              Running until{' '}
              <strong>{membership.expiresAt.toLocaleDateString('en-IN')}</strong> —{' '}
              {daysLeft(membership.expiresAt)} days left.{' '}
              <Link href="/dashboard/club" className="font-semibold text-gold hover:underline">
                Open your membership
              </Link>
              {membership.isFree && ' · Included with your Design Associate status.'}
            </Callout>
          </div>
        )}

        {/* ═══════════════════ upcoming events ═══════════════════ */}
        <section className="container-af py-10" id="events">
          {/* Heading on the left, the type filters on the SAME row (they
              scroll sideways if they run out of space). */}
          <div className="mb-6 flex items-center gap-3 md:gap-5">
            <h2 className="club-section-title shrink-0">UPCOMING EVENTS</h2>

            <nav
              aria-label="Filter by event type"
              className="no-scrollbar min-w-0 flex-1 overflow-x-auto"
            >
              <ul className="flex w-max items-center gap-2">
                <li>
                  <Link
                    href="/club/events"
                    className="inline-flex whitespace-nowrap rounded-pill border border-gold bg-gold px-3.5 py-1.5 text-[12px] font-semibold text-white"
                  >
                    All Events
                  </Link>
                </li>
                {EVENT_TYPES.map((t) => (
                  <li key={t}>
                    <Link
                      href={`/club/events?type=${t}`}
                      className="inline-flex whitespace-nowrap rounded-pill border border-line bg-paper-2 px-3.5 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-gold hover:text-gold"
                    >
                      {TYPE_LABEL[t] ?? t}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Link href="/club/events" className="club-more hidden shrink-0 lg:inline-flex">
              View All
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[14px] text-ink-2">
                No events are scheduled just now. Subscribe below and we will tell
                you as soon as the next one opens.
              </p>
            </div>
          ) : (
            // One row, swipable — 3 cards on a tablet, 4 on a computer, the rest
            // reachable by swiping. Soonest event first on the left.
            <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-1">
              {events.map((e) => (
                <li
                  key={e.slug}
                  className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)]
                             md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]"
                >
                  <EventCard event={e} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ═══════════════════ benefits + plans ═══════════════════ */}
        <section className="container-af pb-10" id="plans">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* benefits */}
            <div className="flex min-w-0 flex-col">
              <h2 className="club-section-title mb-5">CLUB MEMBERSHIP BENEFITS</h2>

              {/* flex-1 so the card fills the row's height and lines up with the
                  Plans column on a computer. */}
              <div className="card flex flex-1 flex-col p-5">
                {/* Tablet keeps the two-column layout; only the computer (lg)
                    stacks the eight benefits into one vertical column, spread to
                    fill the height so it matches the Plans column. */}
                <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 lg:flex-1 lg:content-between lg:gap-y-2.5">
                  {BENEFITS.map((b) => (
                    <li key={b.title} className="flex min-w-0 gap-3.5">
                      <span className="chip-icon shrink-0 bg-gold-soft text-gold">
                        <Icon name={b.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-ink">
                          {b.title}
                        </span>
                        <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-3">
                          {b.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* plans */}
            <div className="min-w-0">
              <h2 className="club-section-title mb-5">MEMBERSHIP PLANS</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((plan) => {
                  const face = PLAN_FACE[plan.slug] ?? { icon: 'star' as IconName, audience: 'For Members' }
                  const featured = plan.isPopular
                  const perYear = plan.months >= 12

                  return (
                    <div
                      key={plan.slug}
                      className={
                        featured
                          ? 'relative flex min-w-0 flex-col rounded-card bg-navy-deep p-5 pt-7 text-white shadow-lift'
                          : 'card relative flex min-w-0 flex-col p-5 pt-7'
                      }
                    >
                      {featured && (
                        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-b-lg bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                          Best Value
                        </span>
                      )}

                      <Icon
                        name={face.icon}
                        className={`h-6 w-6 ${featured ? 'text-gold' : 'text-ink-3'}`}
                      />

                      <p
                        className={`mt-3 font-display text-[15px] font-bold uppercase tracking-[0.05em] ${
                          featured ? 'text-white' : 'text-ink'
                        }`}
                      >
                        {plan.name.replace(/^Club\s+/i, '')}
                      </p>
                      <p
                        className={`mt-0.5 text-[11.5px] ${
                          featured ? 'text-white/55' : 'text-ink-3'
                        }`}
                      >
                        {face.audience}
                      </p>

                      <p className="mt-4">
                        <span
                          className={`tabular font-display text-[24px] font-bold ${
                            featured ? 'text-gold' : 'text-ink'
                          }`}
                        >
                          {formatINR(Number(plan.price))}
                        </span>
                        <span
                          className={`ml-1 text-[11.5px] ${
                            featured ? 'text-white/50' : 'text-ink-3'
                          }`}
                        >
                          / {perYear ? 'Year' : `${plan.months} Months`}
                        </span>
                      </p>

                      <ul
                        className={`mt-4 flex flex-1 flex-col gap-2 border-t pt-4 ${
                          featured ? 'border-white/12' : 'border-line'
                        }`}
                      >
                        {plan.benefits.slice(0, 10).map((b) => (
                          <li
                            key={b}
                            className={`flex gap-2 text-[11.5px] leading-snug ${
                              featured ? 'text-white/80' : 'text-ink-2'
                            }`}
                          >
                            <Icon
                              name="check"
                              className={`mt-px h-3.5 w-3.5 shrink-0 ${
                                featured ? 'text-gold' : 'text-ok'
                              }`}
                            />
                            <span className="min-w-0">{b}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={`/club/join#${plan.slug}`}
                        className={
                          featured
                            ? 'btn-gold mt-5 w-full'
                            : 'btn-outline mt-5 w-full hover:border-gold hover:text-gold'
                        }
                      >
                        Join Now
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Note sits under the whole row so it does not add height to the
              Plans column — that keeps the Benefits card level with the cards. */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Membership is valid for 12 months from the date of purchase.
          </p>
        </section>

        {/* ═══════════════════ stats band ═══════════════════ */}
        <section className="container-af pb-10">
          <div className="rounded-card bg-navy-deep px-6 py-6">
            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {clubStats.map((s) => (
                <li key={s.label}>
                  <ClubStat icon={s.icon} value={s.value} label={s.label} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══════════════════ gallery ═══════════════════ */}
        <section className="container-af pb-10" id="about-club">
          <ClubGallery />
        </section>

        {/* ═══════════════════ partners ═══════════════════ */}
        {/* The same logos as the home page trust strip — Admin → Website Settings → Trusted Brands. */}
        {logos.length > 0 && (
        <section className="container-af pb-10">
          <h2 className="club-section-title mb-5">OUR PARTNERS</h2>
          <AutoRail
            label="Our partners"
            perView={{ base: 2, md: 4, lg: 6 }}
            gap={16}
            intervalMs={2400}
            items={logos.map((b) => (
              <span
                key={b.id}
                className="relative block h-14 w-full overflow-hidden rounded-[5px] border border-line bg-white"
              >
                <Image
                  src={b.src}
                  alt={b.name}
                  fill
                  sizes="220px"
                  className="object-contain p-2.5"
                />
              </span>
            ))}
          />
        </section>
        )}

        {/* ═══════════════════ newsletter ═══════════════════ */}
        {/* -mb-5 offsets the footer's own mt-10 so only a 20px gap remains. */}
        <section className="container-af -mb-5 pb-0">
          <ClubNewsletter />
        </section>
      </main>

      <SiteFooter variant="club" />
    </>
  )
}
