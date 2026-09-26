import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { AD_STATUS_META, type CampaignView } from '@/lib/advertiser'
import { cn, formatINR } from '@/lib/utils'
import { adTone } from '@/lib/ad-tone'
import type { AdStatus } from '@prisma/client'

/**
 * The pieces the eight advertisement screens share.
 *
 * Every one of those screens is the same shape — masthead, promo strip, a row
 * of statistic tiles, a filter bar, a list, a right rail — so the shape lives
 * here once. A screen supplies the numbers and the rows; it does not repeat
 * the layout.
 *
 * All Server Components: none of this needs to be interactive, and shipping it
 * as client code would put the whole campaign list into the browser bundle.
 */

// ═══════════════════════════════════════════════════════════
//  Masthead
// ═══════════════════════════════════════════════════════════

export function AdPageHead({
  title,
  subtitle,
  trail,
  action,
  showHelp = true,
}: {
  title: string
  subtitle: string
  /** The breadcrumb tail — "Advertisements › Drafts". */
  trail: string[]
  /**
   * Replaces the default "Create New Advertisement" button.
   *
   * The overview uses the two-line CTA from the design; the status screens use
   * the plain one, which is why this is a slot rather than a flag.
   */
  action?: React.ReactNode
  /**
   * The "Need Help? · Contact Support" chip beside the action.
   *
   * On by default because the status screens show it; the overview turns it
   * off, since that page closes with the full help bar instead and two
   * invitations to contact support on one screen is one too many.
   */
  showHelp?: boolean
}) {
  return (
    <div className="mb-5">
      {/*
        Kept in the markup, hidden from sight.

        The trail sat above every heading and told a reader nothing they could
        not already see from the sidebar's lit item. `sr-only` rather than
        removal, so it stays in the accessibility tree and a keyboard user can
        still step back up.
      */}
      <nav aria-label="Breadcrumb" className="sr-only">
        <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
          <li>
            <Link href="/dashboard" className="transition-colors hover:text-brand">
              Dashboard
            </Link>
          </li>
          {trail.map((t, i) => (
            <li key={t} className="flex items-center gap-1.5">
              <span aria-hidden className="text-ink-4">›</span>
              {i === trail.length - 1 ? (
                <span className="font-medium text-ink-2">{t}</span>
              ) : (
                <Link href="/dashboard/advertisements" className="transition-colors hover:text-brand">
                  {t}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/*
        One row, not a wrapping one.

        `flex-wrap` used to drop the action under the heading the moment the
        two together passed the content width — which on a tablet is always —
        and the design has it on the right at every size above a phone. The
        heading column carries `min-w-0` so it is the side that gives way.
      */}
      {/*
        `items-center`, so the action sits on the heading block's midline
        rather than pinned to its first line. With a two-line subtitle the
        button used to hang off the top edge.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {/*
            Held to roughly half its single-line width and balanced, so it sets
            as two lines of about the same length rather than a long line and
            an orphan.
          */}
          <p className="mt-1.5 max-w-[24rem] text-balance text-[13px] leading-snug text-ink-3">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
          {showHelp && (
          /*
            From `xl`, not `sm`.

            The chip is ~330px wide; beside the Create button it left the
            heading about 270px on a tablet, so "Pending Approval" broke
            across two lines with the buttons alongside it — the layout the
            design never draws. The chip is also the least load-bearing thing
            on the screen: every one of these pages carries a Need Help card
            in the rail as well.
          */
          <div className="hidden items-center gap-3 rounded-card border border-line bg-paper px-4 py-2.5 shadow-card xl:flex">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-brand-soft text-brand">
              <Icon name="help" className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold text-ink">Need Help?</span>
              <span className="block text-[11.5px] text-ink-3">Talk to our advertising team</span>
            </span>
            <Link
              href="/legal/contact"
              className="shrink-0 rounded-card border border-brand-border px-3 py-1.5 text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand-soft"
            >
              Contact Support
            </Link>
          </div>
          )}

          {action ?? (
            <Link href="/dashboard/advertisements/create" className="btn-primary gap-2 px-5">
              <Icon name="plus" className="h-4 w-4" />
              Create New Advertisement
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  The promo strip
// ═══════════════════════════════════════════════════════════

/**
 * The band's colour, one per screen.
 *
 * These are deliberately stronger than the `-soft` semantic tokens. Those are
 * sized for a chip behind 11px type; across a 160px band they read as a smudge
 * of off-white, which is exactly how an earlier build looked next to the
 * design. Each ramp below runs through three related hues so the band has
 * somewhere to travel from left to right.
 */
const BANNER_TONE = {
  /** Pending — peach into pink into periwinkle */
  brand: 'from-[#FFEDE0] via-[#FCE7F3] to-[#E0E7FF]',
  /** Drafts — amber into cream */
  warn: 'from-[#FEF0C7] via-[#FFEBD5] to-[#FFF6EC]',
  /** Scheduled and Active — mint into sky */
  ok: 'from-[#D7FAE4] via-[#D3F5F0] to-[#DDEAFE]',
  /** Completed — mint into teal into sky */
  info: 'from-[#D9FBE7] via-[#CFF9F1] to-[#DCE9FE]',
  /** Rejected — rose into pink into lilac */
  danger: 'from-[#FEE0E0] via-[#FCE3EF] to-[#EBE6FE]',
} as const

const BANNER_ICON_TONE = {
  brand: 'text-brand',
  warn: 'text-warn',
  ok: 'text-ok',
  info: 'text-info',
  danger: 'text-danger',
} as const

/**
 * How much of the band's colour sits over the photograph, left to right.
 *
 * Solid across the copy, then **fully gone** by 78% — so the right of the
 * band is the photograph itself, unveiled, rather than a picture behind a
 * tint. The earlier mask stopped at 66% opacity everywhere on the right,
 * which left the whole band looking grey: neither a clean colour nor a clear
 * image. The ramp is what keeps there being no seam, so it stays gradual.
 */
const BANNER_MASK =
  'linear-gradient(to right, #000 0%, #000 46%, rgba(0,0,0,0.62) 62%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0) 78%)'

/** The photograph on the right edge of every band — ArchFacing's own artwork. */
const BANNER_PHOTO =
  'https://ik.imagekit.io/archfacing/around%20us%20banner%201.png?updatedAt=1784753557073'

/**
 * The pastel band under the masthead.
 *
 * It carries a single sentence about the state the reader is in, so it earns
 * its height; it is not decoration looking for something to say.
 */
export function AdBanner({
  icon,
  title,
  body,
  tone = 'brand',
}: {
  icon: IconName
  title: string
  body: string
  tone?: keyof typeof BANNER_TONE
}) {
  return (
    <section
      className={cn(
        'relative mb-5 flex min-h-[104px] flex-wrap items-center gap-5 overflow-hidden rounded-card bg-gradient-to-r px-5 py-5',
        BANNER_TONE[tone]
      )}
    >
      {/*
        The photograph on the right — as part of the band, not a panel stuck
        onto it.

        It used to be dropped in at full colour: a dark blue night photograph
        against a pale peach pastel, which read as two unrelated images butted
        together rather than one surface. Three things fix that, in order:

         1. `mix-blend-color` paints the band's own end hue through the
            photograph, keeping its light and shade but taking its colour —
            so the picture is in the band's colour family by construction,
            not by a hand-picked overlay that would need redoing per tone.
         2. The opacity holds it back to a texture.
         3. The fade runs most of the width, so there is no vertical seam
            anywhere for the eye to catch.

        It also shows from `sm` up rather than `lg`, so the band does not
        change character between a tablet and a desktop.
      */}
      <span aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {/*
          The photograph spans the WHOLE band, anchored right.

          It used to be a 52%-wide panel, and that panel had a left edge — a
          vertical line where the band's colour stopped and a picture started.
          No amount of fading the panel's own contents removes that edge,
          because the band underneath is a gradient and the panel's overlay is
          not: the two can only agree at one x. Spanning the full width means
          there is no boundary to disagree at.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BANNER_PHOTO} alt="" className="h-full w-full object-cover object-right" />

        {/*
          …and the band's own ramp is painted back over it, masked so it is
          solid across the copy and thins towards the right. Same gradient as
          the section background, so what shows through is the picture's light
          and shade in the band's colour — one surface, no seam.
        */}
        <span
          className={cn('absolute inset-0 bg-gradient-to-r', BANNER_TONE[tone])}
          style={{
            maskImage: BANNER_MASK,
            WebkitMaskImage: BANNER_MASK,
          }}
        />
      </span>

      <span
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-paper/85 shadow-card',
          BANNER_ICON_TONE[tone]
        )}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>

      {/*
        Both lines balanced and held to the same measure, so the sentence
        under the heading breaks at about the same width the heading does
        instead of running on to a different edge.
      */}
      {/*
        Held to 56% from `sm` up — where the mask still has the band's colour
        at full strength. Without it, a narrow band (the photo appears from
        `sm`, and the claim blocks beside it only from `lg`) let the sentence
        run on into the clear half of the picture.
      */}
      <span className="relative min-w-0 max-w-[30rem] flex-1 sm:max-w-[56%] lg:min-w-[16rem]">
        <span className="block text-balance font-display text-[17px] font-bold leading-tight text-navy">
          {title}
        </span>
        <span className="mt-1 block text-balance text-[12.5px] leading-snug text-ink-2">
          {body}
        </span>
      </span>

      {/*
        The handwritten slogan and the dark claim block that used to sit here
        are gone. They said nothing the reader did not already know — "More
        Visibility · More Business · Only on ArchFacing" is advertising copy
        aimed at someone who has already bought — and the dark navy block in
        particular fought the photograph behind it. The band now carries one
        sentence about the state the reader is in, and the picture.
      */}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Statistic tiles
// ═══════════════════════════════════════════════════════════

const TILE_TONE = {
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  violet: 'bg-[#F5F3FF] text-[#7C3AED]',
} as const

export type Tile = {
  icon: IconName
  label: string
  value: string
  /** The small word under the number — "Campaigns", "Days". */
  unit?: string
  tone?: keyof typeof TILE_TONE
  /** A change against the previous period, e.g. "+28%". */
  delta?: string
  /** Highlights the tile that names the screen you are on. */
  active?: boolean
  /**
   * Where the tile goes when clicked.
   *
   * Given only to a tile that names a SET of campaigns — "Approved This
   * Month" opens the campaigns that were approved. A tile holding a derived
   * measurement ("Avg. Review Time", "Approval Rate") has nowhere to go, so
   * it is left as a plain figure rather than dressed up as a link that leads
   * nowhere in particular.
   */
  href?: string
}

export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    /*
      Flex, not grid — so the last row fills.
      `auto-fit` grid tracks left five tiles as four across and a fifth
      sitting alone at a quarter width, with three quarters of that row
      empty; on a tablet that ragged orphan was the first thing you saw.
      Flex with a `basis` and `flex-1` stretches whatever is on the final
      row to fill it, for any number of tiles.
    */
    <section className="mb-5 flex flex-wrap gap-3">
      {tiles.map((t) => {
        // A link when it leads somewhere, a plain box otherwise. Typed as the
        // union rather than a conditional spread, so `href` stays required on
        // the Link branch.
        const Box = (props: { className: string; children: React.ReactNode }) =>
          t.href ? <Link href={t.href} {...props} /> : <div {...props} />

        return (
        <Box
          key={t.label}
          className={cn(
            'flex min-w-[168px] flex-1 basis-[240px] items-center gap-3 rounded-card border bg-paper p-4 shadow-card',
            t.active ? 'border-brand' : 'border-line',
            t.href &&
              'transition-colors hover:border-brand hover:bg-brand-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
          )}
        >
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-card',
              TILE_TONE[t.tone ?? 'brand']
            )}
          >
            <Icon name={t.icon} className="h-5 w-5" />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-ink-3">{t.label}</span>
            <span className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
              {/*
                Most tiles hold a number, but one holds a phrase — the Rejected
                screen's "Common Issue" prints the reviewer's reason. At 20px
                that overran the tile and clipped, so a long value steps down
                and is allowed to wrap onto a second line.
              */}
              <span
                className={cn(
                  'tabular font-display font-bold text-ink',
                  t.value.length > 12
                    ? 'text-[13px] leading-tight'
                    : 'text-[20px] leading-none'
                )}
              >
                {t.value}
              </span>
              {t.unit && <span className="text-[11.5px] text-ink-3">{t.unit}</span>}
              {t.delta && (
                <span className="text-[11px] font-semibold text-ok">↑ {t.delta}</span>
              )}
            </span>
          </span>

          {/* Only a tile that leads somewhere says so. */}
          {t.href && (
            <Icon name="arrow" className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-4" />
          )}
        </Box>
        )
      })}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Status pill
// ═══════════════════════════════════════════════════════════

const PILL_TONE = {
  muted: 'border-line bg-paper-3 text-ink-3',
  warn: 'border-warn/30 bg-warn-soft text-warn',
  info: 'border-info/30 bg-info-soft text-info',
  ok: 'border-ok/30 bg-ok-soft text-ok',
  brand: 'border-brand-border bg-brand-soft text-brand',
  danger: 'border-danger/30 bg-danger-soft text-danger',
} as const

const PILL_ICON: Record<string, IconName> = {
  muted: 'file',
  warn: 'clock',
  info: 'calendar',
  ok: 'check',
  brand: 'alert',
  danger: 'alert',
}

export function StatusPill({ status, className }: { status: AdStatus; className?: string }) {
  const meta = AD_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-card border px-2.5 py-1 text-[11px] font-semibold',
        PILL_TONE[meta.tone],
        className
      )}
    >
      <Icon name={PILL_ICON[meta.tone]} className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

/** The advertisement type, as the coloured word beside a campaign name. */
/**
 * The advertisement type, in that type's own colour.
 *
 * `slug` is what chooses the hue — see `lib/ad-tone.ts`. It is optional only
 * so a caller that has a name and nothing else still renders; without it the
 * pill falls back to the brand tone.
 */
export function TypePill({ name, slug }: { name: string; slug?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-card border px-2 py-[3px] text-[10.5px] font-semibold',
        adTone(slug).pill
      )}
    >
      {name}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Creative thumbnail
// ═══════════════════════════════════════════════════════════

/**
 * A campaign's creative.
 *
 * A plain `<img>`, not `next/image`: an advertiser's artwork can be hosted on
 * their own domain, and the optimiser only loads hosts listed in
 * `remotePatterns` — widening that to a wildcard would turn it into an open
 * proxy for any URL a user can type.
 */
export function CampaignThumb({
  src,
  alt,
  className,
}: {
  src: string | null
  alt: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative flex h-[68px] w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-paper-3',
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Icon name="image" className="h-5 w-5 text-ink-4" />
      )}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Facts under a campaign name
// ═══════════════════════════════════════════════════════════

export function FactRow({
  icon,
  label,
  value,
}: {
  icon: IconName
  label: string
  value: string
}) {
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Icon name={icon} className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-4" />
      <span className="min-w-0">
        <span className="block text-[10.5px] text-ink-4">{label}</span>
        <span className="block truncate text-[12px] font-medium text-ink-2">{value}</span>
      </span>
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Right rail
// ═══════════════════════════════════════════════════════════

export function RailCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card p-4">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="min-w-0 font-display text-[14px] font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SupportCard() {
  return (
    <section className="card flex flex-col items-start gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-card bg-brand-soft text-brand">
        <Icon name="help" className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-display text-[14px] font-bold text-ink">Need Help?</span>
        <span className="mt-0.5 block text-[12px] text-ink-3">
          Talk to our advertising team for faster support.
        </span>
      </span>
      <Link href="/legal/contact" className="btn-primary w-full gap-2 text-[12.5px]">
        Contact Support
        <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Empty state
// ═══════════════════════════════════════════════════════════

export function NoCampaigns({
  icon,
  title,
  body,
  cta,
}: {
  icon: IconName
  title: string
  body: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-card bg-paper-3 text-ink-4">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="font-display text-[15.5px] font-bold text-ink">{title}</p>
      <p className="max-w-sm text-[13px] text-ink-3">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn-primary mt-1 gap-2">
          <Icon name="plus" className="h-4 w-4" />
          {cta.label}
        </Link>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

export function compact(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function shortDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function tinyDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function dateTime(d: Date | null | undefined): string {
  if (!d) return '—'
  return `${shortDate(d)}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export function ago(d: Date): string {
  const mins = Math.round((Date.now() - +d) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.round(days / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

/** "01 Oct 2026 - 31 Oct 2026", or a single date, or a dash. */
export function dateRange(a: Date | null, b: Date | null): string {
  if (!a && !b) return '—'
  if (a && b) return `${shortDate(a)} - ${shortDate(b)}`
  return shortDate(a ?? b)
}

export function money(n: number): string {
  return formatINR(n)
}

/** The line of numbers under a running campaign. */
export function PerformanceCell({ c }: { c: CampaignView }) {
  return (
    <span className="tabular flex flex-col gap-0.5 text-[11.5px]">
      <span className="flex items-center gap-1.5 text-ink-2">
        <Icon name="eye" className="h-3 w-3 text-info" />
        {compact(c.impressions)}
      </span>
      <span className="flex items-center gap-1.5 text-ink-2">
        <Icon name="target" className="h-3 w-3 text-brand" />
        {compact(c.clicks)}
      </span>
    </span>
  )
}
