import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { EventRegisterButton, type MyRegistration } from './register-button'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'
import { formatINR } from '@/lib/utils'
import {
  getClubEvent,
  pricingTiers,
  earlyBirdIsLive,
  seatsInfo,
  parseHighlights,
  parseSponsors,
  groupSponsors,
  eventDate,
  eventWeekday,
  durationLabel,
  icsStamp,
  type ClubEventDetail,
  type PricingTier,
} from '@/lib/club-events'

import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Icon, type IconName } from '@/components/ui'
import {
  ClubGallery,
  ClubNewsletter,
  formatTimeRange,
  TYPE_LABEL,
} from '@/components/club'
import {
  CalendarIcon,
  ChevronIcon,
  GiftIcon,
  SocialIcon,
  TicketIcon,
  type SocialNetwork,
} from '../event-icons'

/**
 * A single ArchFacing Club event.
 *
 * Everything on this page is server-rendered — the tab bar is six anchors,
 * the FAQs are `<details>`, the speaker arrows are anchors to the first and
 * last card (the browser scrolls the strip to bring them into view). There is
 * no client bundle for any of it.
 *
 * The Register buttons deliberately do not submit anything. Signed out they
 * send you to login; signed in they are inert until the registration action
 * is wired up separately.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://archfacing.com'

// ═══════════════════════════════════════════════════════════
//  Metadata
// ═══════════════════════════════════════════════════════════

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getClubEvent(slug)
  if (!event) return { title: 'Event Not Found' }

  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      type: 'article',
      images: [{ url: event.heroImage, alt: event.title }],
    },
  }
}

// ═══════════════════════════════════════════════════════════
//  Page
// ═══════════════════════════════════════════════════════════

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [event, session] = await Promise.all([getClubEvent(slug), auth()])

  // Covers a slug that does not exist and one that is DRAFT or CANCELLED —
  // `getClubEvent` only ever returns PUBLISHED and COMPLETED events.
  if (!event) notFound()

  const now = new Date()
  const highlights = parseHighlights(event.highlights)
  const sponsorGroups = groupSponsors(parseSponsors(event.sponsors))
  const tiers = pricingTiers(event, now)
  const seats = seatsInfo(event)
  const isOver = now > event.endsAt

  const url = `${BASE_URL}/club/events/${event.slug}`
  const registerHref = session?.user
    ? null
    : `/login?next=${encodeURIComponent(`/club/events/${event.slug}`)}`

  // A signed-in member's own registration drives the button: register, finish
  // paying, or show the ticket.
  const mine: MyRegistration = session?.user?.id
    ? await prisma.clubRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
        select: { id: true, status: true, ticketCode: true, paymentId: true },
      }).then((r) => (r && r.status !== 'CANCELLED' ? r : null))
    : null
  const slot = (compact: boolean) => (
    <EventRegisterButton eventId={event.id} slug={event.slug} soldOut={seats.soldOut} mine={mine} compact={compact} />
  )

  const paragraphs = event.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const tabs = [
    { id: 'about', label: 'About Event', icon: 'file' as IconName, show: true },
    { id: 'speakers', label: 'Speakers', icon: 'users' as IconName, show: event.speakers.length > 0 },
    { id: 'agenda', label: 'Agenda', icon: 'clock' as IconName, show: event.agenda.length > 0 },
    { id: 'venue', label: 'Venue', icon: 'map' as IconName, show: true },
    { id: 'sponsors', label: 'Sponsors', icon: 'star' as IconName, show: sponsorGroups.length > 0 },
    { id: 'faqs', label: 'FAQs', icon: 'help' as IconName, show: event.faqs.length > 0 },
  ].filter((t) => t.show)

  return (
    <>
      <SiteHeader />

      <main>
        <Hero event={event} registerHref={registerHref} isOver={isOver} registerSlot={slot(true)} />

        <div className="container-af relative z-10 pt-10 pb-0">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_248px] lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* ══════════════ left column ══════════════ */}
            <div className="min-w-0">
              {/* ─── tab bar ─── */}
              <nav
                aria-label="Sections of this event"
                className="no-scrollbar mb-6 overflow-x-auto border-b border-line"
              >
                <ul className="flex w-max gap-0.5">
                  {tabs.map((t, i) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className={`-mb-px inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-2.5 py-2.5
                                    text-[12px] font-semibold transition-colors lg:gap-1.5 lg:px-3.5 lg:py-3 lg:text-[13px]
                                    ${
                                      i === 0
                                        ? 'border-gold text-gold'
                                        : 'border-transparent text-ink-2 hover:border-gold/40 hover:text-gold'
                                    }`}
                      >
                        <Icon name={t.icon} className="hidden h-4 w-4 lg:inline" />
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex flex-col gap-6">
                {/* ─── 5. about ─── */}
                <section id="about" className="card scroll-mt-24 p-5 lg:p-6">
                  <h2 className="club-section-title mb-4">About the Event</h2>

                  <div className="flex flex-col gap-3 text-[13px] leading-[1.7] text-ink-2 lg:gap-3.5 lg:text-[13.5px]">
                    {paragraphs.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  {event.audience.length > 0 && (
                    <>
                      <h3 className="mb-3 mt-6 font-display text-[13.5px] font-bold text-ink lg:mt-7 lg:text-[14px]">
                        Who Should Attend?
                      </h3>
                      <ul className="flex flex-wrap gap-2">
                        {event.audience.map((a) => (
                          <li
                            key={a}
                            className="rounded-pill border border-line bg-paper-3 px-3.5 py-1.5
                                       text-[12.5px] font-medium text-ink-2"
                          >
                            {a}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>

                {/* ─── 6. speakers ─── */}
                {event.speakers.length > 0 && (
                  <Speakers speakers={event.speakers} />
                )}

                {/* ─── 7. highlights ─── */}
                {highlights.length > 0 && (
                  <section className="card p-5 lg:p-6">
                    <h2 className="club-section-title mb-5">Event Highlights</h2>
                    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {highlights.map((h) => (
                        <li key={h.title} className="flex min-w-0 items-start gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                                       border border-gold-border bg-gold-soft text-gold"
                          >
                            <Icon name={h.icon} className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-display text-[14px] font-bold text-ink">
                              {h.title}
                            </p>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                              {h.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ─── 8. agenda ─── */}
                {event.agenda.length > 0 && (
                  <section id="agenda" className="card scroll-mt-24 p-5 lg:p-6">
                    <h2 className="club-section-title mb-5">Event Agenda</h2>

                    <ol className="flex flex-col">
                      {event.agenda.map((item, i) => (
                        <li key={item.id} className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-4">
                          {/* time */}
                          <p className="tabular whitespace-nowrap pb-7 text-[12.5px] font-semibold leading-5 text-ink-2">
                            {item.startTime}
                            <span className="block text-[11.5px] font-normal text-ink-4">
                              {item.endTime}
                            </span>
                          </p>

                          {/* dot and the line joining it to the next one */}
                          <div className="relative flex w-4 justify-center">
                            <span className="z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-gold bg-paper-2" />
                            {i < event.agenda.length - 1 && (
                              <span className="absolute left-1/2 top-1.5 h-full w-px -translate-x-1/2 bg-line" />
                            )}
                          </div>

                          {/* body */}
                          <div className="min-w-0 pb-7">
                            <p className="font-display text-[14.5px] font-bold leading-snug text-ink">
                              {item.title}
                            </p>
                            {item.detail && (
                              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                                {item.detail}
                              </p>
                            )}
                            {item.speaker && (
                              <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-gold">
                                <Icon name="user" className="h-3.5 w-3.5" />
                                {item.speaker}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* ─── 9. venue ─── */}
                <Venue event={event} />

                {/* ─── 10. sponsors ─── */}
                {sponsorGroups.length > 0 && (
                  <section id="sponsors" className="card scroll-mt-24 p-5 lg:p-6">
                    <h2 className="club-section-title mb-5">Sponsors &amp; Partners</h2>

                    <div className="flex flex-col gap-5">
                      {sponsorGroups.map((g) => (
                        <div key={g.tier} className="min-w-0">
                          <p className="eyebrow mb-2.5 text-gold">{g.tier}</p>
                          <ul className="flex flex-wrap gap-2.5">
                            {g.names.map((name) => (
                              <li
                                key={name}
                                className="rounded-lg border border-line bg-paper-3 px-3.5 py-2
                                           font-display text-[11.5px] font-bold uppercase tracking-[0.04em] text-ink-2
                                           lg:px-4 lg:py-2.5 lg:text-[13px]"
                              >
                                {name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-[12px] text-ink-4">
                      Partner names are set in type rather than reproduced from their logo
                      artwork.
                    </p>
                  </section>
                )}

                {/* ─── 11. FAQs ─── */}
                {event.faqs.length > 0 && (
                  <section id="faqs" className="card scroll-mt-24 p-5 lg:p-6">
                    <h2 className="club-section-title mb-3">Frequently Asked Questions</h2>

                    <div className="flex flex-col">
                      {event.faqs.map((f) => (
                        <details
                          key={f.id}
                          className="group border-b border-line-soft last:border-b-0"
                        >
                          <summary
                            className="flex cursor-pointer list-none items-center justify-between gap-4 py-4
                                       text-[14px] font-semibold text-ink marker:hidden
                                       hover:text-gold [&::-webkit-details-marker]:hidden"
                          >
                            <span className="min-w-0">{f.question}</span>
                            <ChevronIcon className="h-4 w-4 shrink-0 text-gold transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="pb-4 pr-6 text-[13.5px] leading-relaxed text-ink-2">
                            {f.answer}
                          </p>
                        </details>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* ══════════════ right column ══════════════ */}
            {/*
              Sticky, but with NO inner scroll: the cards flow normally (so all
              of them — Overview, Pricing, Includes, Share — are reachable with
              the page scrollbar), and the column sticks just below the 100px
              site header so the Event Overview stays in view while the left
              column scrolls past it.
            */}
            <aside className="flex min-w-0 flex-col gap-5 self-start md:sticky md:top-[108px] md:-mt-[220px] lg:-mt-[236px]">
              <Overview event={event} />
              <Pricing
                tiers={tiers}
                registerHref={registerHref}
                isOver={isOver}
                soldOut={seats.soldOut}
                registerSlot={slot(false)}
              />
              {event.includes.length > 0 && <Includes items={event.includes} />}
              <ShareCard url={url} title={event.title} />
            </aside>
          </div>

          {/* ─── 13. gallery ─── */}
          {event.gallery.length > 0 && (
            <div className="mt-10">
              <ClubGallery
                title="Glimpses from Our Previous Events"
                linkLabel="View All Gallery"
                photos={event.gallery}
              />
            </div>
          )}

          {/* ─── 14. newsletter ─── */}
          {/* -mb-5 offsets the footer's own mt-10 so only a 20px gap remains. */}
          <div className="mt-10 -mb-5">
            <ClubNewsletter />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════
//  1 + 2 — breadcrumb and hero
// ═══════════════════════════════════════════════════════════

function Hero({
  event,
  registerHref,
  isOver,
  registerSlot,
}: {
  event: ClubEventDetail
  registerHref: string | null
  isOver: boolean
  registerSlot: React.ReactNode
}) {
  const calendarHref = googleCalendarHref(event)
  const showEarlyBird = earlyBirdIsLive(event)

  return (
    <section className="relative overflow-hidden bg-navy-deep">
      {/* the photograph sits on the right and stays CLEAR — the navy only
          washes the left, as far as the text runs, then fades to nothing so
          the picture reads on its own on the right. */}
      <span aria-hidden className="absolute inset-y-0 right-0 w-full lg:w-[68%]">
        <Image
          src={event.heroImage}
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 68vw"
          className="object-cover"
        />
        <span className="absolute inset-0 bg-gradient-to-r from-navy-deep from-0% via-navy-deep/55 via-40% to-transparent to-72%" />
      </span>

      <div className="container-af relative py-6 md:py-8 lg:py-14">
        {/* ─── 1. breadcrumb — kept for SEO, hidden from sight ─── */}
        <Breadcrumb
          items={[
            homeCrumb(),
            { label: 'Club', href: '/club' },
            { label: 'Events', href: '/club/events' },
            { label: event.title },
          ]}
        />

        {/* Same two-column split on a tablet and a computer, per the brief. */}
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_248px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {/* Two clean lines on both tablet and desktop. */}
            <h1 className="max-w-[20ch] font-display text-[28px] font-bold leading-[1.1] tracking-tight text-white [text-wrap:balance] md:text-[32px] lg:text-[34px]">
              {event.title}
            </h1>

            {/* Two balanced lines. */}
            <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-white/70 [text-wrap:balance] lg:mt-5">
              {event.summary}
            </p>

            {/* ─── the three meta items — tight gap, 12px ─── */}
            <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-3 lg:mt-8 lg:gap-x-8">
              <HeroMeta
                icon={<CalendarIcon className="h-[18px] w-[18px]" />}
                top={eventDate(event.startsAt)}
                bottom={eventWeekday(event.startsAt)}
              />
              <HeroMeta
                icon={<Icon name="clock" className="h-[18px] w-[18px]" />}
                top={timeRange(event.startsAt, event.endsAt)}
                bottom={durationLabel(event.startsAt, event.endsAt)}
              />
              <HeroMeta
                icon={<Icon name="map" className="h-[18px] w-[18px]" />}
                top={event.isOnline ? 'Online' : (event.venueName ?? 'Venue to be announced')}
                bottom={event.isOnline ? 'Joining link emailed' : (event.city ?? '')}
              />
            </dl>

            {/* ─── buttons — compact padding, 5px radius ─── */}
            <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
              {isOver ? (
                <span className="btn cursor-not-allowed rounded-[5px] border border-white/20 bg-white/5 px-5 py-2.5 text-[13px] text-white/55">
                  Registration Closed
                </span>
              ) : registerHref ? (
                <Link href={registerHref} className="btn-gold btn-shine rounded-[5px] px-4 py-[5px] text-[12px]">
                  Register Now
                </Link>
              ) : (
                registerSlot
              )}

              <a
                href={calendarHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-on-navy rounded-[5px] px-4 py-[5px] text-[12px]"
              >
                <CalendarIcon className="h-4 w-4" />
                Add to Calendar
              </a>
            </div>

            {showEarlyBird && event.earlyBirdTill && (
              <p className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-gold-light">
                <Icon name="tag" className="h-4 w-4 shrink-0" />
                Early bird discount available till{' '}
                {event.earlyBirdTill.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}

          </div>

          {/* Kept empty on tablet & desktop — the Event Overview card overlaps in. */}
          <div aria-hidden className="hidden md:block" />
        </div>
      </div>
    </section>
  )
}

function HeroMeta({
  icon,
  top,
  bottom,
}: {
  icon: React.ReactNode
  top: string
  bottom: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-px shrink-0 text-gold">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[12px] font-semibold leading-tight text-white">{top}</dt>
        {bottom && <dd className="mt-0.5 text-[11px] text-white/55">{bottom}</dd>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  3 — Event Overview
// ═══════════════════════════════════════════════════════════

function Overview({ event }: { event: ClubEventDetail }) {
  const seats = seatsInfo(event)

  // No danger token exists in the palette — warn is the amber one — so the
  // "almost gone" red is spelled out here rather than borrowed from `brand`,
  // which is the site's orange and never belongs on a Club page.
  const seatTone = {
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    low: 'bg-[#FDECE8] text-[#C0361B]',
  }[seats.tone]

  return (
    <section className="card p-5">
      <h2 className="club-section-title mb-4">Event Overview</h2>

      <dl className="flex flex-col divide-y divide-line-soft">
        <OverviewRow icon={<Icon name="tag" className="h-[18px] w-[18px]" />} label="Event Type">
          {TYPE_LABEL[event.type] ?? event.type}
        </OverviewRow>

        <OverviewRow icon={<CalendarIcon className="h-[18px] w-[18px]" />} label="Date">
          {eventDate(event.startsAt)}{' '}
          <span className="text-ink-3">({eventWeekday(event.startsAt)})</span>
        </OverviewRow>

        <OverviewRow icon={<Icon name="clock" className="h-[18px] w-[18px]" />} label="Time">
          {timeRange(event.startsAt, event.endsAt)}{' '}
          <span className="text-ink-3">{durationLabel(event.startsAt, event.endsAt)}</span>
        </OverviewRow>

        <OverviewRow icon={<Icon name="map" className="h-[18px] w-[18px]" />} label="Venue">
          {event.isOnline ? 'Online' : (event.venueName ?? 'To be announced')}
          {event.venueAddress && (
            <span className="mt-0.5 block text-[12.5px] font-normal text-ink-3">
              {event.venueAddress}
            </span>
          )}
        </OverviewRow>

        <OverviewRow icon={<Icon name="shield" className="h-[18px] w-[18px]" />} label="Organizer">
          {event.organizer}
        </OverviewRow>

        {(event.contactPhone || event.contactEmail) && (
          <OverviewRow icon={<Icon name="phone" className="h-[18px] w-[18px]" />} label="Contact">
            {event.contactPhone && (
              <a href={`tel:${event.contactPhone.replace(/\s+/g, '')}`} className="hover:text-gold">
                {event.contactPhone}
              </a>
            )}
            {event.contactEmail && (
              <a
                href={`mailto:${event.contactEmail}`}
                className="mt-0.5 block break-words text-[12.5px] font-normal text-ink-3 hover:text-gold"
              >
                {event.contactEmail}
              </a>
            )}
          </OverviewRow>
        )}

        <OverviewRow icon={<Icon name="users" className="h-[18px] w-[18px]" />} label="Seats Available">
          <span className="flex flex-wrap items-center gap-2">
            <span className="tabular">
              {seats.left} / {seats.total} Seats Left
            </span>
            <span className={`pill ${seatTone}`}>
              {seats.soldOut ? 'Sold Out' : `${seats.percentLeft}% Left`}
            </span>
          </span>
        </OverviewRow>
      </dl>
    </section>
  )
}

function OverviewRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 shrink-0 text-gold">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-4">
          {label}
        </dt>
        <dd className="min-w-0 text-[13.5px] font-semibold text-ink">{children}</dd>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  6 — Featured Speakers
// ═══════════════════════════════════════════════════════════

function Speakers({ speakers }: { speakers: ClubEventDetail['speakers'] }) {
  const firstId = `speaker-${speakers[0].id}`
  const lastId = `speaker-${speakers[speakers.length - 1].id}`

  return (
    <section id="speakers" className="card scroll-mt-24 p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="club-section-title">Featured Speakers</h2>

        {/* Plain anchors — the browser scrolls the strip to bring the first or
            last card into view, so the arrows work without any client JS. */}
        {speakers.length > 2 && (
          <div className="flex shrink-0 gap-2">
            <ScrollArrow href={`#${firstId}`} side="left" />
            <ScrollArrow href={`#${lastId}`} side="right" />
          </div>
        )}
      </div>

      <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scroll-smooth">
        {speakers.map((s) => (
          <li
            key={s.id}
            id={`speaker-${s.id}`}
            className="w-[190px] shrink-0 snap-start scroll-mt-24 sm:w-[210px]"
          >
            <div className="relative aspect-square overflow-hidden rounded-card bg-paper-3">
              <Image
                src={s.photo}
                alt={s.name}
                fill
                sizes="210px"
                className="object-cover"
              />
            </div>

            <p className="mt-3 font-display text-[14px] font-bold leading-snug text-ink">
              {s.name}
            </p>
            <p className="mt-1 text-[12.5px] text-ink-2">{s.role}</p>
            <p className="text-[12.5px] text-ink-4">{s.company}</p>

            {s.linkedin ? (
              <a
                href={s.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold-outline mt-3 w-full px-3 py-2 text-[12.5px]"
              >
                View Profile
              </a>
            ) : (
              <a
                href={`#speaker-bio-${s.id}`}
                className="btn-gold-outline mt-3 w-full px-3 py-2 text-[12.5px]"
              >
                View Profile
              </a>
            )}
          </li>
        ))}
      </ul>

      {/* The bios sit below the strip so "View Profile" has somewhere real to
          go without a dialog and without any client JS. */}
      <div className="mt-6 flex flex-col divide-y divide-line-soft border-t border-line-soft">
        {speakers
          .filter((s) => s.bio)
          .map((s) => (
            <div
              key={s.id}
              id={`speaker-bio-${s.id}`}
              className="min-w-0 scroll-mt-24 py-3.5"
            >
              <p className="font-display text-[13.5px] font-bold text-ink">
                {s.name}
                <span className="ml-2 font-sans text-[12.5px] font-normal text-ink-4">
                  {s.role}, {s.company}
                </span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.bio}</p>
            </div>
          ))}
      </div>
    </section>
  )
}

function ScrollArrow({ href, side }: { href: string; side: 'left' | 'right' }) {
  return (
    <a
      href={href}
      aria-label={side === 'left' ? 'Back to the first speaker' : 'Jump to the last speaker'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line
                 bg-paper-2 text-ink-3 transition-colors hover:border-gold hover:text-gold"
    >
      <Icon name="arrow" className={`h-4 w-4 ${side === 'left' ? 'rotate-180' : ''}`} />
    </a>
  )
}

// ═══════════════════════════════════════════════════════════
//  9 — Venue
// ═══════════════════════════════════════════════════════════

function Venue({ event }: { event: ClubEventDetail }) {
  const address = [event.venueName, event.venueAddress].filter(Boolean).join(', ')
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

  return (
    <section id="venue" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className="club-section-title mb-4">Venue</h2>

      {event.isOnline ? (
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-border bg-gold-soft text-gold">
            <Icon name="grid" className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold text-ink">
              This is an online event
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              There is nowhere to travel to. The joining link is emailed to every
              registered attendee before the session starts, and again in a reminder on
              the day.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-border bg-gold-soft text-gold">
              <Icon name="map" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold text-ink">
                {event.venueName ?? 'Venue to be announced'}
              </p>
              {event.venueAddress && (
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                  {event.venueAddress}
                </p>
              )}
            </div>
          </div>

          {address && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-outline self-start"
            >
              <Icon name="arrow" className="h-4 w-4" />
              Get Directions
            </a>
          )}
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  12 — Registration pricing, includes, share
// ═══════════════════════════════════════════════════════════

function Pricing({
  tiers,
  registerHref,
  isOver,
  soldOut,
  registerSlot,
}: {
  tiers: PricingTier[]
  registerHref: string | null
  isOver: boolean
  soldOut: boolean
  registerSlot: React.ReactNode
}) {
  const closed = isOver || soldOut

  return (
    <section className="card p-5">
      <h2 className="club-section-title mb-4 flex items-center gap-2">
        <TicketIcon className="h-[18px] w-[18px] text-gold" />
        Registration Pricing
      </h2>

      {/* `min-w-0` is not optional here — a fieldset defaults to
          `min-inline-size: min-content`, which refuses to shrink and pushes the
          whole page sideways on a narrow phone. */}
      <fieldset className="flex min-w-0 flex-col gap-2.5" disabled={closed}>
        <legend className="sr-only">Choose a pass</legend>

        {tiers.map((t) => {
          const past = t.state === 'past'
          const live = t.state === 'live'

          return (
            <label
              key={t.key}
              className={`flex min-w-0 items-center gap-3 rounded-lg border p-3.5 transition-colors
                          ${
                            live
                              ? 'border-gold bg-gold-soft ring-1 ring-gold'
                              : past
                                ? 'cursor-not-allowed border-line bg-paper-3 opacity-55'
                                : 'cursor-pointer border-line bg-paper-2 hover:border-gold/50'
                          }`}
            >
              <input
                type="radio"
                name="tier"
                value={t.key}
                defaultChecked={live}
                disabled={past || closed}
                className="h-4 w-4 shrink-0 accent-gold"
              />

              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">{t.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-3">{t.when}</span>
              </span>

              <span className="shrink-0 text-right">
                <span className="tabular block font-display text-[15px] font-bold text-ink">
                  {t.price === 0 ? 'Free' : formatINR(t.price)}
                </span>
                {t.strike !== undefined && (
                  <span className="tabular block text-[11.5px] text-ink-4 line-through">
                    {formatINR(t.strike)}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="mt-4">
        {closed ? (
          <span className="btn w-full cursor-not-allowed border border-line bg-paper-3 text-ink-3">
            {soldOut && !isOver ? 'Sold Out' : 'Registration Closed'}
          </span>
        ) : registerHref ? (
          <Link href={registerHref} className="btn-gold btn-shine w-full">
            Register Now
          </Link>
        ) : (
          registerSlot
        )}
      </div>

      <div className="mt-4 flex min-w-0 items-start gap-2.5 border-t border-line-soft pt-4">
        <GiftIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-gold" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gold">
            Group Discount Available (3+ Members)
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-3">Contact us for more details.</p>
        </div>
      </div>
    </section>
  )
}

function Includes({ items }: { items: string[] }) {
  return (
    <section className="card p-5">
      <h2 className="club-section-title mb-4">Event Includes</h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((i) => (
          <li key={i} className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
              <Icon name="check" className="h-3 w-3" />
            </span>
            <span className="min-w-0 text-[13.5px] leading-snug text-ink-2">{i}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ShareCard({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent
  const links: { network: SocialNetwork; label: string; href: string }[] = [
    {
      network: 'facebook',
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    },
    {
      network: 'x',
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    },
    {
      network: 'linkedin',
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    {
      network: 'whatsapp',
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${enc(`${title} — ${url}`)}`,
    },
    {
      network: 'email',
      label: 'Share by email',
      href: `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${url}`)}`,
    },
  ]

  return (
    <section id="share" className="card scroll-mt-24 p-5">
      <h2 className="club-section-title mb-4">Share this Event</h2>

      <ul className="flex flex-wrap gap-2.5">
        {links.map((l) => (
          <li key={l.network}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={l.label}
              title={l.label}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line
                         bg-paper-2 text-ink-3 transition-colors hover:border-gold hover:bg-gold-soft hover:text-gold"
            >
              <SocialIcon network={l.network} className="h-[17px] w-[17px]" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * `formatTimeRange` hands back whatever `en-IN` gives for the meridiem, and
 * current ICU lowercases it ("10:00 am"). The agenda rows carry "10:00 AM"
 * from the seed, so the times in the hero and the overview are upper-cased to
 * match rather than sitting next to them in a different case.
 */
function timeRange(start: Date, end: Date): string {
  return formatTimeRange(start, end).toUpperCase()
}

/** A Google Calendar "add event" link — no download, no client JS. */
function googleCalendarHref(event: ClubEventDetail): string {
  const where = event.isOnline
    ? 'Online'
    : [event.venueName, event.venueAddress].filter(Boolean).join(', ')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${icsStamp(event.startsAt)}/${icsStamp(event.endsAt)}`,
    details: `${event.summary}\n\n${BASE_URL}/club/events/${event.slug}`,
    location: where,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
