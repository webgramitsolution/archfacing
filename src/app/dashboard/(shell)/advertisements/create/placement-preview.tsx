import { cn } from '@/lib/utils'

/**
 * Where a placement sits on the page it belongs to — with the advertiser's
 * own creative in the slot.
 *
 * Two layers, and the split matters:
 *
 *  · **The page**, drawn as an SVG wireframe. Deliberately not a screenshot:
 *    a screenshot goes stale the first time that page is redesigned, and ten
 *    of them would be ten assets to keep in step.
 *  · **The advertisement**, an ordinary HTML element positioned over the
 *    slot. This is the part that used to be missing — the slot was an empty
 *    peach rectangle with an orange border, so every one of the ten cards
 *    looked the same and none of them showed the reader their own ad.
 *
 * The slot rectangle is data (`SLOT` below) rather than drawing commands, so
 * both layers read the same numbers and cannot drift apart.
 */

export type Spot =
  | 'hero'
  | 'top'
  | 'sidebar'
  | 'inline'
  | 'bottom'
  | 'card'
  | 'mobile'

/** Reads the position out of the placement slug. */
export function spotOf(slug: string): Spot {
  if (slug.includes('mobile')) return 'mobile'
  if (slug.includes('hero')) return 'hero'
  if (slug.includes('sidebar')) return 'sidebar'
  if (slug.includes('inline') || slug.includes('article')) return 'inline'
  if (slug.includes('bottom')) return 'bottom'
  if (slug.includes('sponsored') || slug.includes('product')) return 'card'
  return 'top'
}

/** The wireframe's coordinate space. Every number below is in these units. */
const VIEW = { w: 160, h: 70 }

/**
 * The slot, per position — where the advertisement actually goes.
 *
 * Read by the wireframe to leave a hole and by the overlay to fill it.
 */
const SLOT: Record<Spot, { x: number; y: number; w: number; h: number }> = {
  hero: { x: 6, y: 12, w: 148, h: 26 },
  top: { x: 6, y: 21, w: 148, h: 16 },
  sidebar: { x: 116, y: 12, w: 38, h: 52 },
  inline: { x: 6, y: 33, w: 148, h: 14 },
  bottom: { x: 6, y: 48, w: 148, h: 16 },
  card: { x: 6, y: 21, w: 46, h: 43 },
  mobile: { x: 63, y: 24, w: 34, h: 12 },
}

const BAR = '#E2E8F0'
const INK = '#CBD5E1'
const SLOT_LINE = '#F97316'
const SLOT_SOFT = '#FFEDD5'

export type Creative = {
  /** The uploaded desktop creative, if there is one yet. */
  image?: string
  headline?: string
  cta?: string
}

export function PlacementPreview({
  spot,
  creative,
  className,
}: {
  spot: Spot
  /** Omitted before step 2 — the slot then draws as an empty reserved box. */
  creative?: Creative
  className?: string
}) {
  const slot = SLOT[spot]
  const filled = Boolean(creative?.image)

  /** The slot as CSS percentages, so the overlay lands exactly on the hole. */
  const box = {
    left: `${(slot.x / VIEW.w) * 100}%`,
    top: `${(slot.y / VIEW.h) * 100}%`,
    width: `${(slot.w / VIEW.w) * 100}%`,
    height: `${(slot.h / VIEW.h) * 100}%`,
  }

  /*
   * How much room the slot has, as a share of the card.
   *
   * A hero band is a quarter of the wireframe's height and can carry a line
   * of type; the mobile slot is a twelfth and can carry none. Rather than
   * guess, the overlay only prints the headline where the slot is tall
   * enough for it to be legible at this size.
   */
  const roomy = slot.h >= 20
  const tall = slot.h / slot.w >= 1.1

  return (
    <span className={cn('relative block h-full w-full overflow-hidden', className)}>
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Where the ${spot} placement appears on the page`}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width={VIEW.w} height={VIEW.h} fill="#F8FAFC" />

        {/* the page's own header, on every variant */}
        <rect x="0" y="0" width={VIEW.w} height="8" fill="#111827" />
        <rect x="5" y="3" width="18" height="2.5" rx="1.25" fill="#F97316" />
        <rect x="120" y="3" width="12" height="2.5" rx="1.25" fill="#475569" />
        <rect x="136" y="3" width="19" height="2.5" rx="1.25" fill="#475569" />

        {/* everything on the page EXCEPT the slot — the overlay fills that */}
        {spot === 'mobile' && (
          <>
            <rect x="58" y="12" width="44" height="54" rx="4" fill="#fff" stroke={BAR} />
            <rect x="63" y="17" width="34" height="4" rx="2" fill={BAR} />
            <rect x="63" y="39" width="34" height="3" rx="1.5" fill={INK} />
            <rect x="63" y="45" width="26" height="3" rx="1.5" fill={INK} />
            <rect x="63" y="51" width="34" height="10" rx="2" fill={BAR} />
          </>
        )}

        {spot === 'hero' && (
          <>
            <rect x="6" y="42" width="70" height="22" rx="2" fill={BAR} />
            <rect x="80" y="42" width="34" height="22" rx="2" fill={BAR} />
            <rect x="118" y="42" width="36" height="22" rx="2" fill={BAR} />
          </>
        )}

        {spot === 'top' && (
          <>
            <rect x="6" y="12" width="148" height="5" rx="1.5" fill={BAR} />
            <rect x="6" y="41" width="46" height="23" rx="2" fill={BAR} />
            <rect x="57" y="41" width="46" height="23" rx="2" fill={BAR} />
            <rect x="108" y="41" width="46" height="23" rx="2" fill={BAR} />
          </>
        )}

        {spot === 'sidebar' && (
          <>
            <rect x="6" y="12" width="104" height="10" rx="2" fill={BAR} />
            <rect x="6" y="25" width="50" height="18" rx="2" fill={BAR} />
            <rect x="60" y="25" width="50" height="18" rx="2" fill={BAR} />
            <rect x="6" y="46" width="50" height="18" rx="2" fill={BAR} />
            <rect x="60" y="46" width="50" height="18" rx="2" fill={BAR} />
          </>
        )}

        {spot === 'inline' && (
          <>
            <rect x="6" y="12" width="148" height="4" rx="2" fill={INK} />
            <rect x="6" y="19" width="124" height="3" rx="1.5" fill={BAR} />
            <rect x="6" y="25" width="136" height="3" rx="1.5" fill={BAR} />
            <rect x="6" y="52" width="130" height="3" rx="1.5" fill={BAR} />
            <rect x="6" y="58" width="112" height="3" rx="1.5" fill={BAR} />
          </>
        )}

        {spot === 'bottom' && (
          <>
            <rect x="6" y="12" width="148" height="5" rx="1.5" fill={BAR} />
            <rect x="6" y="21" width="46" height="22" rx="2" fill={BAR} />
            <rect x="57" y="21" width="46" height="22" rx="2" fill={BAR} />
            <rect x="108" y="21" width="46" height="22" rx="2" fill={BAR} />
          </>
        )}

        {spot === 'card' && (
          <>
            <rect x="6" y="12" width="148" height="5" rx="1.5" fill={BAR} />
            <rect x="57" y="21" width="46" height="43" rx="2" fill={BAR} />
            <rect x="108" y="21" width="46" height="43" rx="2" fill={BAR} />
          </>
        )}
      </svg>

      {/* ─── the advertisement, in the slot ─── */}
      <span
        className={cn(
          'absolute overflow-hidden rounded-[2px]',
          filled ? 'bg-navy' : 'border border-dashed'
        )}
        style={{
          ...box,
          ...(filled ? {} : { background: SLOT_SOFT, borderColor: SLOT_LINE }),
        }}
      >
        {filled ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={creative!.image} alt="" className="h-full w-full object-cover" />

            {/*
              The headline only where it would be readable. At this scale the
              inline and mobile slots are a few pixels tall, and type there is
              a smudge that makes the card look broken rather than informative.
            */}
            {roomy && creative?.headline && (
              <span
                className={cn(
                  'absolute inset-0 flex flex-col justify-center px-[6%]',
                  tall ? 'w-full' : 'w-1/2'
                )}
              >
                <span className="truncate text-[7px] font-bold leading-tight text-white">
                  {creative.headline}
                </span>
                {creative.cta && (
                  <span className="mt-[3px] w-fit rounded-[2px] bg-brand px-[3px] py-[1px] text-[5.5px] font-bold leading-none text-white">
                    {creative.cta}
                  </span>
                )}
              </span>
            )}
          </>
        ) : (
          /* Nothing uploaded yet — the slot is drawn as reserved space. */
          <span className="sr-only">Your advertisement appears here</span>
        )}
      </span>
    </span>
  )
}
