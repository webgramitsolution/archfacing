import type { Metadata } from 'next'
import Link from 'next/link'

import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { EventCard, ClubNewsletter, TYPE_LABEL } from '@/components/club'
import { EmptyState, Icon } from '@/components/ui'
import {
  EVENT_TYPES,
  isEventType,
  listUpcomingEvents,
  listPastEvents,
} from '@/lib/club-events'

/**
 * Every ArchFacing Club event.
 *
 * The type filter is a plain `?type=` link, so the whole page stays a server
 * component — no state, no client bundle, and each filter is a real URL that
 * can be shared or bookmarked.
 */

export const metadata: Metadata = {
  title: 'Club Events',
  description:
    'Seminars, exhibitions, webinars, conferences and networking meets from the ' +
    'ArchFacing Club — open to architects, designers, manufacturers and students.',
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const active = isEventType(type) ? type : undefined

  const [upcoming, past] = await Promise.all([
    listUpcomingEvents(active),
    listPastEvents(active),
  ])

  return (
    <>
      <SiteHeader />

      <main>
        {/* ─── hero strip ─── */}
        <section className="bg-navy-deep">
          <div className="container-af py-11 lg:py-14">
            <span className="pill-on-photo">ARCHFACING CLUB</span>

            <h1 className="mt-4 font-display text-[30px] font-bold leading-[1.12] tracking-tight text-white md:text-[40px]">
              Club Events
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
              Seminars, exhibitions, webinars and meets run through the year, in cities
              across India and online. Members register first and pay less; everyone else
              is welcome to buy a pass.
            </p>
          </div>
        </section>

        <div className="container-af py-10">
          {/* ─── filter chips ─── */}
          <nav aria-label="Filter by event type" className="mb-7 overflow-x-auto">
            <ul className="flex w-max items-center gap-2 pb-1">
              <li>
                <FilterChip label="All Events" href="/club/events" active={!active} />
              </li>
              {EVENT_TYPES.map((t) => (
                <li key={t}>
                  <FilterChip
                    label={TYPE_LABEL[t] ?? t}
                    href={`/club/events?type=${t}`}
                    active={active === t}
                  />
                </li>
              ))}
            </ul>
          </nav>

          {/* ─── upcoming ─── */}
          <section>
            <h2 className="club-section-title mb-5">
              Upcoming Events
              <span className="ml-2 font-sans text-[12.5px] font-normal normal-case tracking-normal text-ink-4">
                {upcoming.length} scheduled
              </span>
            </h2>

            {upcoming.length === 0 ? (
              <EmptyState
                icon="bell"
                title="Nothing scheduled just now"
                action={
                  active ? (
                    <Link href="/club/events" className="btn-gold-outline">
                      See every event
                    </Link>
                  ) : undefined
                }
              >
                {active
                  ? 'There is no event of this type in the calendar at the moment. Try another type, or subscribe below and we will tell you when one is announced.'
                  : 'The next set of dates has not been announced yet. Subscribe below and it will reach you first.'}
              </EmptyState>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {upcoming.map((e) => (
                  <li key={e.slug} className="min-w-0">
                    <EventCard event={e} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── past ─── */}
          {past.length > 0 && (
            <section className="mt-12 border-t border-line pt-9">
              <h2 className="club-section-title mb-1.5 flex items-center gap-2">
                <Icon name="clock" className="h-4 w-4 text-ink-4" />
                Past Events
              </h2>
              <p className="mb-5 text-[13px] text-ink-3">
                Registration is closed on these. The write-ups and photographs stay up.
              </p>

              <ul className="grid gap-5 opacity-60 transition-opacity hover:opacity-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {past.map((e) => (
                  <li key={e.slug} className="min-w-0">
                    <EventCard event={e} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-12">
            <ClubNewsletter />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex whitespace-nowrap rounded-pill border px-4 py-2 text-[13px] font-semibold transition-colors
                  ${
                    active
                      ? 'border-gold bg-gold text-white'
                      : 'border-line bg-paper-2 text-ink-2 hover:border-gold hover:text-gold'
                  }`}
    >
      {label}
    </Link>
  )
}
