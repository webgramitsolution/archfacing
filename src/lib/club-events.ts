/**
 * ArchFacing Club events — reads and the small amount of arithmetic the
 * event pages need.
 *
 * Nothing here writes. Registration (and the guarded `seatsTaken` update
 * that goes with it) lives elsewhere; these pages only ever read.
 *
 * Two things are worth knowing before you change anything:
 *
 *   1. Money comes back from Prisma as `Decimal`, never as a number. Every
 *      price is put through `Number()` at the boundary below so no caller has
 *      to remember to do it.
 *
 *   2. `highlights` and `sponsors` are `Json` columns, so Prisma types them
 *      as `JsonValue` — which could be anything at all. The parsers below are
 *      the only place that shape is trusted, and they drop rows that do not
 *      match rather than letting a bad seed crash a page.
 */

import type { IconName } from '@/components/ui'
import { prisma } from './prisma'

// ═══════════════════════════════════════════════════════════
//  Reads
// ═══════════════════════════════════════════════════════════

/** The columns the listing card needs, and nothing more. */
const CARD_SELECT = {
  slug: true,
  title: true,
  type: true,
  summary: true,
  heroImage: true,
  startsAt: true,
  endsAt: true,
  isOnline: true,
  city: true,
  venueName: true,
} as const

/**
 * One event, with its speakers, agenda and FAQs in display order.
 *
 * DRAFT and CANCELLED events are excluded here rather than at the page, so
 * there is no route that can render an unpublished event by accident.
 */
export async function getClubEvent(slug: string) {
  return prisma.clubEvent.findFirst({
    where: { slug, status: { in: ['PUBLISHED', 'COMPLETED'] } },
    include: {
      speakers: { orderBy: { sortOrder: 'asc' } },
      agenda: { orderBy: { sortOrder: 'asc' } },
      faqs: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export type ClubEventDetail = NonNullable<Awaited<ReturnType<typeof getClubEvent>>>

/** Everything still to come, soonest first. */
export async function listUpcomingEvents(type?: string) {
  return prisma.clubEvent.findMany({
    where: {
      status: { in: ['PUBLISHED', 'COMPLETED'] },
      endsAt: { gte: new Date() },
      ...(isEventType(type) ? { type } : {}),
    },
    orderBy: { startsAt: 'asc' },
    select: CARD_SELECT,
  })
}

/** Events that have already finished, most recent first. */
export async function listPastEvents(type?: string, take = 8) {
  return prisma.clubEvent.findMany({
    where: {
      status: { in: ['PUBLISHED', 'COMPLETED'] },
      endsAt: { lt: new Date() },
      ...(isEventType(type) ? { type } : {}),
    },
    orderBy: { startsAt: 'desc' },
    take,
    select: CARD_SELECT,
  })
}

export const EVENT_TYPES = [
  'SEMINAR',
  'EXHIBITION',
  'WEBINAR',
  'NETWORKING',
  'CONFERENCE',
  'WORKSHOP',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

/** Narrows a `?type=` search param to a real enum member. */
export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
}

// ═══════════════════════════════════════════════════════════
//  Seats
// ═══════════════════════════════════════════════════════════

export type SeatsInfo = {
  total: number
  left: number
  /** whole percent of the hall still unsold */
  percentLeft: number
  /** green while there is room, amber when it is going, red when it is nearly gone */
  tone: 'ok' | 'warn' | 'low'
  soldOut: boolean
}

export function seatsInfo(event: { totalSeats: number; seatsTaken: number }): SeatsInfo {
  const total = Math.max(0, event.totalSeats)
  const left = Math.max(0, total - event.seatsTaken)
  const percentLeft = total === 0 ? 0 : Math.round((left / total) * 100)

  return {
    total,
    left,
    percentLeft,
    tone: percentLeft > 30 ? 'ok' : percentLeft >= 10 ? 'warn' : 'low',
    soldOut: left === 0,
  }
}

// ═══════════════════════════════════════════════════════════
//  Pricing tiers
// ═══════════════════════════════════════════════════════════

export type TierKey = 'EARLY_BIRD' | 'STANDARD' | 'SPOT'
export type TierState = 'past' | 'live' | 'upcoming'

export type PricingTier = {
  key: TierKey
  label: string
  /** rupees, already through `Number()` */
  price: number
  /** the price this one undercuts, shown struck through */
  strike?: number
  /** "Till 15 May", "16 May - 23 May", "At Venue" */
  when: string
  state: TierState
}

/** "15 May" */
function shortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

/** Midnight at the start of the day `d` falls in. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * The three passes, and which one is on sale right now.
 *
 * Exactly one tier is `live` while the event is still ahead:
 *
 *   · Early Bird — from now until `earlyBirdTill` (only when a discount is set)
 *   · Spot Pass  — on the day of the event itself, at the door
 *   · Standard   — everything in between, and the fallback when there is no
 *                  early bird or no spot price
 *
 * Once the event has finished nothing is live and every tier reads `past`.
 */
export function pricingTiers(
  event: Pick<
    ClubEventDetail,
    'earlyBirdPrice' | 'earlyBirdTill' | 'standardPrice' | 'spotPrice' | 'startsAt' | 'endsAt'
  >,
  now: Date = new Date()
): PricingTier[] {
  const standard = Number(event.standardPrice)
  const early = event.earlyBirdPrice === null ? null : Number(event.earlyBirdPrice)
  const spot = event.spotPrice === null ? null : Number(event.spotPrice)
  const till = event.earlyBirdTill

  const eventDay = startOfDay(event.startsAt)
  const over = now > event.endsAt

  const earlyOpen = !over && early !== null && till !== null && now <= till
  const spotOpen = !over && !earlyOpen && spot !== null && now >= eventDay

  const live: TierKey | null = over
    ? null
    : earlyOpen
      ? 'EARLY_BIRD'
      : spotOpen
        ? 'SPOT'
        : 'STANDARD'

  const tiers: PricingTier[] = []

  if (early !== null && till !== null) {
    tiers.push({
      key: 'EARLY_BIRD',
      label: 'Early Bird',
      price: early,
      strike: standard > early ? standard : undefined,
      when: `Till ${shortDate(till)}`,
      state: live === 'EARLY_BIRD' ? 'live' : 'past',
    })
  }

  const standardFrom = till ? addDays(till, 1) : null
  const standardTo = addDays(eventDay, -1)
  tiers.push({
    key: 'STANDARD',
    label: 'Standard Pass',
    price: standard,
    when:
      standardFrom && standardFrom <= standardTo
        ? `${shortDate(standardFrom)} - ${shortDate(standardTo)}`
        : `Till ${shortDate(standardTo)}`,
    state:
      live === 'STANDARD' ? 'live' : earlyOpen ? 'upcoming' : 'past',
  })

  if (spot !== null) {
    tiers.push({
      key: 'SPOT',
      label: 'Spot Pass',
      price: spot,
      when: 'At Venue',
      state: live === 'SPOT' ? 'live' : now < eventDay ? 'upcoming' : 'past',
    })
  }

  return tiers
}

/** True while the early bird price is still worth advertising in the hero. */
export function earlyBirdIsLive(
  event: Pick<ClubEventDetail, 'earlyBirdPrice' | 'earlyBirdTill'>,
  now: Date = new Date()
): boolean {
  return event.earlyBirdPrice !== null && event.earlyBirdTill !== null && now <= event.earlyBirdTill
}

// ═══════════════════════════════════════════════════════════
//  JSON columns
// ═══════════════════════════════════════════════════════════

export type Highlight = { title: string; body: string; icon: IconName }
export type Sponsor = { name: string; tier: string }

/**
 * `Icon` only knows this set of names. A highlight carrying anything else
 * still renders — it just falls back to the star rather than throwing.
 */
const KNOWN_ICONS = new Set<string>([
  'map', 'users', 'star', 'check', 'arrow', 'search', 'bell', 'grid', 'help',
  'user', 'box', 'bag', 'chart', 'shield', 'clock', 'rupee', 'file', 'mail',
  'phone', 'plus', 'alert', 'settings', 'tag', 'inbox',
])

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (row): row is Record<string, unknown> =>
      typeof row === 'object' && row !== null && !Array.isArray(row)
  )
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function parseHighlights(value: unknown): Highlight[] {
  return asRecords(value)
    .map((row) => {
      const icon = asString(row.icon)
      return {
        title: asString(row.title),
        body: asString(row.body),
        icon: (KNOWN_ICONS.has(icon) ? icon : 'star') as IconName,
      }
    })
    .filter((h) => h.title !== '')
}

export function parseSponsors(value: unknown): Sponsor[] {
  return asRecords(value)
    .map((row) => ({
      name: asString(row.name),
      tier: asString(row.tier) || 'Partner',
    }))
    .filter((s) => s.name !== '')
}

/** Sponsors grouped by tier, tiers in the order they first appear. */
export function groupSponsors(sponsors: Sponsor[]): { tier: string; names: string[] }[] {
  const groups: { tier: string; names: string[] }[] = []
  for (const s of sponsors) {
    const found = groups.find((g) => g.tier === s.tier)
    if (found) found.names.push(s.name)
    else groups.push({ tier: s.tier, names: [s.name] })
  }
  return groups
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

/** "24 May, 2027" */
export function eventDate(d: Date): string {
  const parts = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  // en-IN gives "24 May 2027"; the design puts a comma before the year.
  return parts.replace(/ (\d{4})$/, ', $1')
}

/** "Monday" */
export function eventWeekday(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long' })
}

/** "(3 Hours)" — half hours are kept, so a 90-minute session reads "(1.5 Hours)". */
export function durationLabel(start: Date, end: Date): string {
  const hours = Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 2) / 2
  if (hours <= 0) return ''
  return `(${hours} ${hours === 1 ? 'Hour' : 'Hours'})`
}

/**
 * The `dates=` value a calendar link needs — UTC, no punctuation.
 * `20270524T043000Z`
 */
export function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
