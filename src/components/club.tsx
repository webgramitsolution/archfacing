import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from './ui'
import { CLUB_GALLERY, CLUB_PARTNERS, unsplash } from '@/config/club-media'
import { PartnerStrip } from './partner-strip'
import { NewsletterForm } from './newsletter-form'

/**
 * Pieces shared by the Club landing page and every event page.
 *
 * The Club runs on gold over deep navy rather than the site's orange — see
 * the `gold` tokens in tailwind.config.ts and the `.btn-gold` family in
 * globals.css.
 */

// ═══════════════════════════════════════════════════════════
//  The laurel shield — "ARCHFACING CLUB · STRONGER TOGETHER"
// ═══════════════════════════════════════════════════════════

export function ClubCrest({
  size = 200,
  withWordmark = true,
  className = '',
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        role="img"
        aria-label="ArchFacing Club crest"
        className="drop-shadow-lg"
      >
        <defs>
          <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E8C77E" />
            <stop offset="0.5" stopColor="#D4A24C" />
            <stop offset="1" stopColor="#B8862F" />
          </linearGradient>
        </defs>

        {/* laurel wreath — mirrored leaves down each side */}
        <g fill="url(#crestGold)">
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8
            const angle = 205 - t * 60
            const rad = (angle * Math.PI) / 180
            const cx = 120 + Math.cos(rad) * 96
            const cy = 128 + Math.sin(rad) * 96
            const rot = angle + 90
            return (
              <g key={`l${i}`}>
                <ellipse
                  cx={cx} cy={cy} rx="13" ry="6"
                  transform={`rotate(${rot} ${cx} ${cy})`}
                  opacity={0.55 + t * 0.45}
                />
                <ellipse
                  cx={240 - cx} cy={cy} rx="13" ry="6"
                  transform={`rotate(${-rot} ${240 - cx} ${cy})`}
                  opacity={0.55 + t * 0.45}
                />
              </g>
            )
          })}
        </g>

        {/* shield */}
        <path
          d="M120 30 L186 56 V126 c0 40 -30 66 -66 82 c-36 -16 -66 -42 -66 -82 V56 Z"
          fill="url(#crestGold)"
        />
        <path
          d="M120 42 L175 64 V125 c0 33 -25 55 -55 69 c-30 -14 -55 -36 -55 -69 V64 Z"
          fill="#0E1B33"
        />

        {/* the A */}
        <path d="M120 74 L150 150 H134 L120 112 L106 150 H90 Z" fill="url(#crestGold)" />
        <rect x="106" y="130" width="28" height="8" fill="#0E1B33" />

        {/* banner */}
        <path d="M40 150 h160 l-14 20 h-132 Z" fill="url(#crestGold)" />
        <text
          x="120" y="165"
          textAnchor="middle"
          fontFamily="var(--font-archivo), system-ui, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="1.2"
          fill="#0E1B33"
        >
          ARCHFACING CLUB
        </text>
      </svg>

      {withWordmark && (
        <p className="mt-2 font-display text-[15px] font-bold uppercase tracking-[0.16em] text-white">
          Stronger Together
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Section heading with an optional link on the right
// ═══════════════════════════════════════════════════════════

export function ClubSectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="club-section-title">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="club-more">
          {linkLabel}
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Gallery strip
// ═══════════════════════════════════════════════════════════

export function ClubGallery({
  title = 'GLIMPSES FROM OUR EVENTS',
  linkLabel = 'View Gallery',
  photos,
  count = 5,
}: {
  title?: string
  linkLabel?: string
  /** full URLs; falls back to the shared Club set */
  photos?: string[]
  count?: number
}) {
  const shots =
    photos && photos.length > 0
      ? photos.slice(0, count)
      : CLUB_GALLERY.slice(0, count).map((id) => unsplash(id, { w: 600, h: 400 }))

  return (
    <section className="card p-5 lg:p-6">
      <ClubSectionHead title={title} href="/club/gallery" linkLabel={linkLabel} />

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {shots.map((src, i) => (
          <li
            key={`${src}-${i}`}
            className="relative aspect-[3/2] overflow-hidden rounded-lg bg-paper-3"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Partners
// ═══════════════════════════════════════════════════════════

/**
 * A scrolling strip of partner names.
 *
 * These are wordmarks set in type, not reproductions of the companies' logo
 * artwork — see the note in `src/config/club-media.ts`. Once you have real
 * logo files and permission to use them, add a `logo` path there and this
 * renders the image instead.
 */
export function ClubPartners() {
  return (
    <section>
      <h2 className="club-section-title mb-5">OUR PARTNERS</h2>
      <PartnerStrip partners={CLUB_PARTNERS} />
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Newsletter band
// ═══════════════════════════════════════════════════════════

export function ClubNewsletter() {
  return (
    <section className="rounded-card bg-navy-deep px-6 py-7 lg:px-9">
      <div className="flex flex-col items-start gap-6 md:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold text-white">
            <Icon name="mail" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-[17px] font-bold text-white">
              Stay Updated with ArchFacing Club
            </p>
            <p className="mt-1 text-[13px] text-white/60">
              Subscribe to get latest event updates, invitations and industry insights.
            </p>
          </div>
        </div>

        <NewsletterForm variant="club" />

      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Event card — the listing tile
// ═══════════════════════════════════════════════════════════

export type EventCardData = {
  slug: string
  title: string
  type: string
  summary: string
  heroImage: string
  startsAt: Date
  endsAt: Date
  isOnline: boolean
  city: string | null
  venueName: string | null
}

const TYPE_LABEL: Record<string, string> = {
  SEMINAR: 'Seminar',
  EXHIBITION: 'Exhibition',
  WEBINAR: 'Webinar',
  NETWORKING: 'Networking',
  CONFERENCE: 'Conference',
  WORKSHOP: 'Workshop',
}

export function formatTimeRange(start: Date, end: Date): string {
  const f = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${f(start)} - ${f(end)}`
}

export function EventCard({ event }: { event: EventCardData }) {
  const day = event.startsAt.toLocaleDateString('en-IN', { day: '2-digit' })
  const month = event.startsAt
    .toLocaleDateString('en-IN', { month: 'short' })
    .toUpperCase()

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden">
      <Link href={`/club/events/${event.slug}`} className="relative block aspect-[16/10] bg-paper-3">
        <Image
          src={event.heroImage}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent" />

        {/* date block, top-left */}
        <span className="absolute left-3 top-3 flex w-[52px] flex-col items-center overflow-hidden rounded-lg bg-white shadow-card">
          <span className="w-full bg-navy-deep py-1 text-center font-display text-[17px] font-bold leading-none text-white">
            {day}
          </span>
          <span className="w-full py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
            {month}
          </span>
        </span>

        {/* category tag, bottom-left */}
        <span className="pill-on-photo absolute bottom-3 left-3">
          {(TYPE_LABEL[event.type] ?? event.type).toUpperCase()}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[15px] font-bold leading-snug text-ink">
          <Link href={`/club/events/${event.slug}`} className="hover:text-gold">
            {event.title}
          </Link>
        </h3>

        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <Icon name="map" className="h-3.5 w-3.5 shrink-0 text-gold" />
          {event.isOnline ? 'Online' : (event.city ?? event.venueName ?? 'To be announced')}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-gold" />
          {formatTimeRange(event.startsAt, event.endsAt)}
        </p>

        <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-ink-3">
          {event.summary}
        </p>

        <Link
          href={`/club/events/${event.slug}`}
          className="btn-outline mt-4 w-full hover:border-gold hover:text-gold"
        >
          Register Now
        </Link>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  Small shared bits
// ═══════════════════════════════════════════════════════════

export function ClubStat({
  icon,
  value,
  label,
}: {
  icon: IconName
  value: string
  label: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Icon name={icon} className="h-6 w-6 shrink-0 text-gold" />
      <div className="min-w-0">
        <p className="tabular font-display text-[19px] font-bold leading-none text-white">
          {value}
        </p>
        <p className="mt-1 truncate text-[11.5px] text-white/55">{label}</p>
      </div>
    </div>
  )
}

export { TYPE_LABEL }
