import Link from 'next/link'
import { Icon } from '@/components/ui'
import { NewsletterForm } from '@/components/newsletter-form'
import { upcomingEvents } from '@/lib/around-us'
import { listUpcomingEvents } from '@/lib/club-events'
import { cn } from '@/lib/utils'

/**
 * Pieces shared by the Membership, Blog and Podcast phone layouts — the
 * "Upcoming Events" list (real Around Us event posts + Club events only), the
 * peach "Subscribe to Newsletter" card and the small section-head row.
 */

export type PhoneEvent = { href: string; title: string; when: Date; place: string }

/**
 * Upcoming events from the two real sources: Around Us posts whose
 * `meta.eventDate` is still ahead, and published Club events that have not
 * ended. Soonest first. Empty when neither has anything — the card then hides.
 */
export async function loadPhoneEvents(take = 4): Promise<PhoneEvent[]> {
  const [posts, club] = await Promise.all([
    upcomingEvents(take).catch(() => []),
    listUpcomingEvents().catch(() => []),
  ])
  const out: PhoneEvent[] = [
    ...posts.map((p) => ({
      href: `/around-us/${p.slug}`,
      title: p.title,
      when: p.when,
      place: [p.city, p.state].filter(Boolean).join(', '),
    })),
    ...club.map((e) => ({
      href: `/club/events/${e.slug}`,
      title: e.title,
      when: e.startsAt,
      place: e.isOnline ? 'Online' : e.city ?? e.venueName ?? '',
    })),
  ]
  return out.sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, take)
}

/** "Title ........ View All" — the head row every phone card uses. */
export function PhoneSectionHead({
  title,
  href,
  action = 'View All',
  icon,
  className,
}: {
  title: string
  href?: string
  action?: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="flex min-w-0 items-center gap-1.5 font-display text-[15px] font-bold tracking-tight text-ink">
        {icon}
        {title}
      </h2>
      {href && (
        <Link href={href} className="shrink-0 py-2 text-[12px] font-semibold text-brand">
          {action}
        </Link>
      )}
    </div>
  )
}

export function PhoneEventsCard({ events, viewAll = '/club/events' }: { events: PhoneEvent[]; viewAll?: string }) {
  if (events.length === 0) return null
  return (
    <section className="rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
      <PhoneSectionHead title="Upcoming Events" href={viewAll} />
      <ul className="mt-1.5 flex flex-col gap-3">
        {events.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className="group flex min-w-0 items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-white leading-none">
                <span className="tabular font-display text-[17px] font-bold text-ink">
                  {e.when.toLocaleDateString('en-IN', { day: '2-digit' })}
                </span>
                <span className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-3">
                  {e.when.toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[13px] font-semibold text-ink group-hover:text-brand">
                  {e.title}
                </span>
                {e.place && (
                  <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-ink-3">
                    <Icon name="map" className="h-3 w-3 shrink-0 text-brand" />
                    <span className="truncate">{e.place}</span>
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A paper plane with a dashed trail — the illustration in the newsletter card. */
function PaperPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 56" aria-hidden className={className} fill="none">
      <path d="M4 44c10-2 16-10 26-8s10 10 20 6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" className="text-ink-4" />
      <path d="M50 30L92 6 78 44 66 34z" fill="#F97316" />
      <path d="M50 30l16 4 26-28z" fill="#FDBA74" />
      <path d="M66 34l-2 12 8-8z" fill="#C2410C" />
    </svg>
  )
}

export function PhoneNewsletterCard({ source }: { source: string }) {
  return (
    <section className="relative overflow-hidden rounded-card border border-brand-border bg-brand-soft px-4 py-4">
      <PaperPlane className="absolute right-3 top-2 h-12 w-20" />
      <h2 className="pr-20 font-display text-[15px] font-bold text-ink">Subscribe to Newsletter</h2>
      <p className="mt-1 pr-16 text-[12px] leading-relaxed text-ink-2">
        Get the latest articles, insights and updates straight to your inbox.
      </p>
      {/* The form's inline (dark) look is the reference's input + button row;
          the success line is re-inked because the card is light. */}
      <div className="mt-3 [&>p]:bg-white [&>p]:text-ink [&_form]:border [&_form]:border-line [&_input]:py-2.5 [&_input]:text-[13px] [&_button]:px-5 [&_button]:py-2.5">
        <NewsletterForm source={source} />
      </div>
      <p className="mt-2.5 text-[11px] text-ink-3">We respect your privacy. Unsubscribe anytime.</p>
    </section>
  )
}
