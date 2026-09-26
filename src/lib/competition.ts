/**
 * Design Competitions — the reads, the parsers and the small amount of date
 * arithmetic the two competition pages need.
 *
 * Nothing here writes. Registration is not built yet; these pages only read.
 *
 * Four things are worth knowing before changing anything:
 *
 *   1. ★ There is no stored status. "Open for Registration", "Closing Soon"
 *      and "Closed" are derived from the two real date columns every time
 *      they are asked for — see `competitionStatus`. A status column would be
 *      correct on the day it was written and a lie the morning after a
 *      deadline passed, and nothing would be there to notice.
 *
 *   2. Money comes back from Prisma as `Decimal`, never as a number. Every
 *      amount is put through `Number()` at the boundary below, so no caller
 *      has to remember to.
 *
 *   3. Which column holds what:
 *        prizeMoney         → Prize Pool
 *        eventDate          → Registration Ends   ← "Ending Soon" sorts on this
 *        submissionDeadline → Submission Ends
 *        entryFee           → Registration Fee (null / 0 means free)
 *        isPaidCategory     → the Free / Paid pill
 *        _count.entries     → Participants (real CompetitionEntry rows)
 *      Everything the listing filters or sorts on is a real column, so the
 *      work happens in SQL rather than after the fetch.
 *
 *   4. `Post.meta` is `Json`, so Prisma types it as "could be anything".
 *      `competitionMeta` is the only place that shape is trusted, and every
 *      field is defaulted. A malformed block written years ago must never be
 *      able to take a published page down.
 */

import type { Prisma } from '@prisma/client'
import type { IconName } from '@/components/ui'
import { prisma } from './prisma'

// ═══════════════════════════════════════════════════════════
//  Status — derived, never stored
// ═══════════════════════════════════════════════════════════

/** How close to the registration deadline "Closing Soon" starts. */
export const CLOSING_SOON_DAYS = 7

const DAY_MS = 86_400_000

export type StatusKey = 'OPEN' | 'CLOSING_SOON' | 'CLOSED'

export type CompetitionStatus = {
  key: StatusKey
  /** the words the design prints on the pill */
  label: string
  /** whole days until registration closes; 0 once it has */
  daysLeft: number
  /** tailwind classes for the pill, from the palette tokens */
  pill: string
  /** tailwind classes for the wide status band in the sidebar */
  band: string
  /** the colour of the dot beside the band */
  dot: string
}

/**
 * Open / Closing Soon / Closed, worked out from the real dates.
 *
 * Registration closing is what the reader acts on, so that is the date that
 * decides. A competition whose submission window has also passed is closed
 * regardless — that covers a row where only one of the two dates was set.
 */
export function competitionStatus(
  c: { registrationEnds: Date | null; submissionEnds: Date | null },
  now: Date = new Date()
): CompetitionStatus {
  const closes = c.registrationEnds ?? c.submissionEnds
  const submissionOver = c.submissionEnds !== null && now > c.submissionEnds

  if (!closes || now > closes || submissionOver) {
    return {
      key: 'CLOSED',
      label: 'Registration Closed',
      daysLeft: 0,
      pill: 'bg-paper-3 text-ink-3',
      band: 'border-line bg-paper-3 text-ink-3',
      dot: 'bg-ink-4',
    }
  }

  const daysLeft = Math.max(0, Math.ceil((closes.getTime() - now.getTime()) / DAY_MS))

  if (daysLeft <= CLOSING_SOON_DAYS) {
    return {
      key: 'CLOSING_SOON',
      label: 'Closing Soon',
      daysLeft,
      pill: 'bg-warn-soft text-warn',
      band: 'border-warn/25 bg-warn-soft text-warn',
      dot: 'bg-warn',
    }
  }

  return {
    key: 'OPEN',
    label: 'Open for Registration',
    daysLeft,
    pill: 'bg-ok-soft text-ok',
    band: 'border-ok/25 bg-ok-soft text-ok',
    dot: 'bg-ok',
  }
}

/** The same three states, expressed as a `where` so the filter runs in SQL. */
function statusWhere(status: StatusKey | undefined, now: Date): Prisma.PostWhereInput {
  if (!status) return {}
  const soon = new Date(now.getTime() + CLOSING_SOON_DAYS * DAY_MS)

  switch (status) {
    case 'OPEN':
      return { eventDate: { gt: soon }, submissionDeadline: { gte: now } }
    case 'CLOSING_SOON':
      return { eventDate: { gt: now, lte: soon }, submissionDeadline: { gte: now } }
    case 'CLOSED':
      return {
        OR: [{ eventDate: { lte: now } }, { submissionDeadline: { lt: now } }, { eventDate: null }],
      }
  }
}

export const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: 'OPEN', label: 'Open for Registration' },
  { value: 'CLOSING_SOON', label: 'Closing Soon' },
  { value: 'CLOSED', label: 'Registration Closed' },
]

export function isStatusKey(v: unknown): v is StatusKey {
  return v === 'OPEN' || v === 'CLOSING_SOON' || v === 'CLOSED'
}

// ═══════════════════════════════════════════════════════════
//  meta — the Json column
// ═══════════════════════════════════════════════════════════

export type IconItem = { icon: IconName; title: string; body: string }
export type JuryRef = { name: string; role: string; email: string; photo: string }
export type Prize = { place: string; label: string; amount: number }
export type Guideline = { title: string; points: string[] }
export type Criterion = { label: string; weight: number; body: string }
export type TimelineStep = { label: string; dateKey: string; body: string }
export type Faq = { question: string; answer: string }

export type CompetitionMeta = {
  categoryLabel: string
  featured: boolean
  heroImage: string
  cardImage: string
  about: string[]
  focusTitle: string
  focus: string[]
  eligibility: IconItem[]
  deliverables: IconItem[]
  warning: string
  jury: JuryRef[]
  registrationStartsAt: Date | null
  queryDeadlineAt: Date | null
  resultsAt: Date | null
  prizes: Prize[]
  guidelines: Guideline[]
  evaluation: Criterion[]
  timeline: TimelineStep[]
  faqs: Faq[]
}

const FALLBACK_IMAGE = '/img/hero-professionals.svg'

/** `Icon` only knows this set. Anything else falls back to the star. */
const KNOWN_ICONS = new Set<string>([
  'map', 'users', 'star', 'check', 'arrow', 'search', 'bell', 'grid', 'help',
  'user', 'box', 'bag', 'chart', 'shield', 'clock', 'rupee', 'file', 'mail',
  'phone', 'plus', 'alert', 'settings', 'tag', 'inbox',
])

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function icon(v: unknown): IconName {
  const name = str(v)
  return (KNOWN_ICONS.has(name) ? name : 'star') as IconName
}

function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter(
        (x): x is Record<string, unknown> =>
          typeof x === 'object' && x !== null && !Array.isArray(x)
      )
    : []
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
}

/** An ISO string in the Json column, back to a Date. Anything unparseable is dropped. */
function date(v: unknown): Date | null {
  const s = str(v)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function iconItems(v: unknown): IconItem[] {
  return records(v)
    .map((r) => ({ icon: icon(r.icon), title: str(r.title), body: str(r.body) }))
    .filter((i) => i.title !== '')
}

/**
 * The prize split.
 *
 * Exported on its own because the sidebar card and the Prizes section both
 * want it and neither should be re-deriving the shape. Rows with no amount
 * are dropped rather than rendered as "₹0".
 */
export function parsePrizes(v: unknown): Prize[] {
  return records(v)
    .map((r) => ({
      place: str(r.place),
      label: str(r.label),
      amount: num(r.amount),
    }))
    .filter((p) => p.place !== '' && p.amount > 0)
}

/** What the three places add up to — checked against the prizeMoney column. */
export function prizeTotal(prizes: Prize[]): number {
  return prizes.reduce((sum, p) => sum + p.amount, 0)
}

export function competitionMeta(meta: unknown): CompetitionMeta {
  const m = (meta ?? {}) as Record<string, unknown>
  const hero = str(m.heroImage, FALLBACK_IMAGE)

  return {
    categoryLabel: str(m.categoryLabel, 'Design Competition'),
    featured: m.featured === true,
    heroImage: hero,
    cardImage: str(m.cardImage, hero),

    about: strings(m.about),
    focusTitle: str(m.focusTitle, 'Your design should focus on:'),
    focus: strings(m.focus),

    eligibility: iconItems(m.eligibility),
    deliverables: iconItems(m.deliverables),
    warning: str(m.warning),

    jury: records(m.jury)
      .map((r) => ({
        name: str(r.name),
        role: str(r.role),
        email: str(r.email),
        photo: str(r.photo),
      }))
      .filter((j) => j.name !== ''),

    registrationStartsAt: date(m.registrationStartsAt),
    queryDeadlineAt: date(m.queryDeadlineAt),
    resultsAt: date(m.resultsAt),

    prizes: parsePrizes(m.prizes),

    guidelines: records(m.guidelines)
      .map((r) => ({ title: str(r.title), points: strings(r.points) }))
      .filter((g) => g.title !== '' && g.points.length > 0),

    evaluation: records(m.evaluation)
      .map((r) => ({ label: str(r.label), weight: num(r.weight), body: str(r.body) }))
      .filter((c) => c.label !== ''),

    timeline: records(m.timeline)
      .map((r) => ({ label: str(r.label), dateKey: str(r.dateKey), body: str(r.body) }))
      .filter((t) => t.label !== ''),

    faqs: records(m.faqs)
      .map((r) => ({ question: str(r.question), answer: str(r.answer) }))
      .filter((f) => f.question !== '' && f.answer !== ''),
  }
}

// ═══════════════════════════════════════════════════════════
//  Reads
// ═══════════════════════════════════════════════════════════

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  prizeMoney: true,
  eventDate: true,
  submissionDeadline: true,
  entryFee: true,
  isPaidCategory: true,
  attendeeCount: true,
  // Participants = real entries, never the seeded attendeeCount.
  _count: { select: { entries: true } },
  juryRequired: true,
  publishedAt: true,
  meta: true,
} as const

type CardRow = Prisma.PostGetPayload<{ select: typeof CARD_SELECT }>

export type CompetitionCard = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  /** rupees, already through `Number()` */
  prize: number
  registrationEnds: Date | null
  submissionEnds: Date | null
  /** rupees; 0 means free entry */
  fee: number
  isPaid: boolean
  participants: number
  juryCount: number
  meta: CompetitionMeta
}

/** The one place a Prisma row becomes something a component can render. */
function toCard(row: CardRow): CompetitionCard {
  const fee = row.entryFee === null ? 0 : Number(row.entryFee)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    prize: row.prizeMoney === null ? 0 : Number(row.prizeMoney),
    registrationEnds: row.eventDate,
    submissionEnds: row.submissionDeadline,
    fee,
    // The column is the authority; the fee backs it up for a row where only
    // one of the two was ever filled in.
    isPaid: row.isPaidCategory || fee > 0,
    participants: row._count.entries,
    juryCount: row.juryRequired ?? 0,
    meta: competitionMeta(row.meta),
  }
}

export const SORT_OPTIONS = [
  { value: 'ending-soon', label: 'Ending Soon' },
  { value: 'newest', label: 'Newest First' },
  { value: 'prize', label: 'Highest Prize' },
  { value: 'participants', label: 'Most Participants' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['value']

export function isSortKey(v: unknown): v is SortKey {
  return SORT_OPTIONS.some((o) => o.value === v)
}

export type FeeKey = 'free' | 'paid'

export function isFeeKey(v: unknown): v is FeeKey {
  return v === 'free' || v === 'paid'
}

export type CompetitionFilters = {
  q?: string
  category?: string
  status?: StatusKey
  fee?: FeeKey
  sort?: SortKey
}

/** The published, undeleted competitions matching the filter bar. */
function whereFor(f: CompetitionFilters, now: Date): Prisma.PostWhereInput {
  return {
    type: 'DESIGN_COMPETITION',
    status: 'PUBLISHED',
    deletedAt: null,
    ...(f.category ? { category: f.category } : {}),
    ...(f.fee === 'free' ? { isPaidCategory: false } : {}),
    ...(f.fee === 'paid' ? { isPaidCategory: true } : {}),
    ...statusWhere(f.status, now),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: 'insensitive' as const } },
            { description: { contains: f.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }
}

function orderFor(sort: SortKey | undefined): Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ publishedAt: 'desc' }, { id: 'asc' }]
    case 'prize':
      return [{ prizeMoney: 'desc' }, { id: 'asc' }]
    case 'participants':
      return [{ entries: { _count: 'desc' } }, { id: 'asc' }]
    case 'ending-soon':
    default:
      // Soonest registration deadline first. A row with no deadline sorts
      // last rather than first — `nulls: 'last'` is the whole point here.
      return [{ eventDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]
  }
}

export async function listCompetitions(
  filters: CompetitionFilters = {},
  { take = 12, skip = 0, now = new Date() }: { take?: number; skip?: number; now?: Date } = {}
): Promise<CompetitionCard[]> {
  const rows = await prisma.post.findMany({
    where: whereFor(filters, now),
    select: CARD_SELECT,
    orderBy: orderFor(filters.sort),
    take,
    skip,
  })

  return rows.map(toCard)
}

export async function countCompetitions(
  filters: CompetitionFilters = {},
  now: Date = new Date()
): Promise<number> {
  return prisma.post.count({ where: whereFor(filters, now) })
}

/** Every published competition, regardless of filter — the hero's real total. */
export async function totalCompetitions(): Promise<number> {
  return prisma.post.count({
    where: { type: 'DESIGN_COMPETITION', status: 'PUBLISHED', deletedAt: null },
  })
}

/** Competition counts per category slug, for the sidebar list. */
export async function competitionCounts(): Promise<Record<string, number>> {
  const rows = await prisma.post.groupBy({
    by: ['category'],
    where: { type: 'DESIGN_COMPETITION', status: 'PUBLISHED', deletedAt: null },
    _count: { _all: true },
  })

  const out: Record<string, number> = {}
  for (const r of rows) out[r.category] = r._count._all
  return out
}

export type CompetitionDetail = CompetitionCard & {
  images: string[]
}

export async function getCompetition(slug: string): Promise<CompetitionDetail | null> {
  const row = await prisma.post.findFirst({
    where: { slug, type: 'DESIGN_COMPETITION', status: 'PUBLISHED', deletedAt: null },
    select: {
      ...CARD_SELECT,
      media: {
        where: { type: 'IMAGE' },
        orderBy: { sortOrder: 'asc' },
        select: { url: true },
      },
    },
  })

  if (!row) return null

  return {
    ...toCard(row),
    images: row.media.map((m) => m.url),
  }
}

// ═══════════════════════════════════════════════════════════
//  Jury — meta references a real User row by email
// ═══════════════════════════════════════════════════════════

export type JuryMember = {
  name: string
  role: string
  photo: string
  /** the firm from the professional profile, when there is one */
  firm: string
}

/**
 * Turns the jury references in `meta` into people.
 *
 * The User row is the authority for the name and the portrait; the meta entry
 * supplies the role on this particular panel, and stands in on its own if the
 * user record has been removed. A missing row loses the panellist a firm
 * name, never the whole section.
 */
export async function competitionJury(refs: JuryRef[]): Promise<JuryMember[]> {
  if (refs.length === 0) return []

  const emails = refs.map((r) => r.email).filter(Boolean)
  const users = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails }, deletedAt: null },
        select: {
          email: true,
          name: true,
          profilePhoto: true,
          professionalProfile: { select: { firmName: true } },
        },
      })
    : []

  const byEmail = new Map(users.map((u) => [u.email, u]))

  return refs.map((r) => {
    const u = byEmail.get(r.email)
    return {
      name: u?.name ?? r.name,
      role: r.role,
      photo: u?.profilePhoto ?? r.photo,
      firm: u?.professionalProfile?.firmName ?? '',
    }
  })
}

// ═══════════════════════════════════════════════════════════
//  "My Competition Status"
// ═══════════════════════════════════════════════════════════

export type MyStatus = {
  /** competitions this user has paid an entry fee for */
  participating: number
  /**
   * ★ null, not 0.
   *
   * Submissions and shortlists have no table yet — entry submission is not
   * built. `null` renders as an em dash with a line saying so, which is the
   * honest answer. Returning 0 would read as "you have submitted nothing",
   * which is a different and unearned claim.
   */
  submissions: number | null
  shortlisted: number | null
}

/**
 * Real numbers for a signed-in user.
 *
 * `participating` counts paid `COMPETITION_ENTRY` payments — the only record
 * of a competition entry that exists in the schema today.
 */
export async function myCompetitionStatus(userId: string): Promise<MyStatus> {
  const participating = await prisma.payment.count({
    where: { userId, purpose: 'COMPETITION_ENTRY', status: 'PAID' },
  })

  return { participating, submissions: null, shortlisted: null }
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

/** "15 May 2027" */
export function compDate(d: Date | null): string {
  if (!d) return 'To be announced'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** "15 May" — the sidebar timeline, where the year is stated once above */
export function compDateShort(d: Date | null): string {
  if (!d) return 'TBA'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/** "120+" — the design prints the participant count as a floor, never exact. */
export function participantsLabel(n: number): string {
  return n > 0 ? `${n}+` : '—'
}

/** Figures for the "Competition Highlights" band — every one a real count. */
export async function competitionHighlights(now = new Date()) {
  const live = { type: 'DESIGN_COMPETITION' as const, status: 'PUBLISHED' as const, deletedAt: null }
  const open = { ...live, OR: [{ submissionDeadline: null }, { submissionDeadline: { gte: now } }] }
  const [active, prize, entries, designers, hosted] = await Promise.all([
    prisma.post.count({ where: open }),
    prisma.post.aggregate({ where: open, _sum: { prizeMoney: true } }),
    prisma.competitionEntry.count({ where: { competition: live } }),
    prisma.competitionEntry.groupBy({ by: ['designerId'], where: { competition: live } }).then((r) => r.length),
    prisma.post.count({ where: live }),
  ])
  return { active, prizePool: Number(prize._sum.prizeMoney ?? 0), entries, designers, hosted }
}
