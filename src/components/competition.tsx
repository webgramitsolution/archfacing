import Image from 'next/image'
import Link from 'next/link'

import { formatINR } from '@/lib/utils'
import {
  competitionStatus,
  compDate,
  participantsLabel,
  type CompetitionCard as Competition,
  type MyStatus,
} from '@/lib/competition'
import { Icon, type IconName } from './ui'
import { SaveToggle } from './save-button'

/**
 * Pieces shared by the competition listing and a single competition page.
 *
 * Everything here is a server component. The only interactive controls are
 * real links, real `<form>` elements and `<details>` — there is no client
 * bundle behind any of it.
 *
 * ★ Palette: brand orange for action, navy for the dark bands, and the status
 *   tokens (ok / warn) for the pills. No hex anywhere.
 */

/**
 * The uppercase card heading the design uses throughout.
 *
 * Deliberately a constant rather than a new `@layer components` class:
 * `globals.css` is shared with every other page in the app, and adding a
 * one-page utility to it is how a stylesheet turns into a junk drawer.
 */
export const SECTION_TITLE =
  'font-display text-[15px] font-bold uppercase tracking-[0.09em] text-ink'

// ═══════════════════════════════════════════════════════════
//  Glyphs the shared Icon set does not carry
// ═══════════════════════════════════════════════════════════

type GlyphProps = { className?: string }

function glyph(children: React.ReactNode) {
  return function Glyph({ className = 'h-[18px] w-[18px]' }: GlyphProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    )
  }
}

export const CalendarIcon = glyph(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
)

export const HeartIcon = glyph(
  <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 00-7.1 7.1l1.7 1.7L12 21.5l7.1-7.1 1.7-1.7a5 5 0 000-7.1z" />
)

export const BookmarkIcon = glyph(<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />)

export const ShareIcon = glyph(
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </>
)

export const ChevronDownIcon = glyph(<path d="M6 9l6 6 6-6" />)

export const TrophyIcon = glyph(
  <>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" />
    <path d="M7 6H4.5A1.5 1.5 0 003 7.5C3 9.4 4.6 11 6.5 11H7M17 6h2.5A1.5 1.5 0 0121 7.5c0 1.9-1.6 3.5-3.5 3.5H17" />
  </>
)

export const GalleryIcon = glyph(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-6.5 6.5" />
  </>
)

// ═══════════════════════════════════════════════════════════
//  Pills
// ═══════════════════════════════════════════════════════════

export function StatusPill({
  competition,
  className = '',
}: {
  competition: Pick<Competition, 'registrationEnds' | 'submissionEnds'>
  className?: string
}) {
  const status = competitionStatus(competition)
  return <span className={`pill ${status.pill} ${className}`}>{status.label}</span>
}

export function FeePill({ isPaid, fee }: { isPaid: boolean; fee: number }) {
  return isPaid ? (
    <span className="pill bg-brand-soft text-brand">
      Paid{fee > 0 ? ` · ${formatINR(fee)}` : ''}
    </span>
  ) : (
    <span className="pill bg-info-soft text-info">Free Entry</span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Save (the heart)
// ═══════════════════════════════════════════════════════════

/**
 * Signed out the heart is a real link to the sign-in page. Signed in it
 * writes a SavedItem row — the competition then shows in Saved Items.
 */
export function SaveButton({
  signedIn,
  next,
  postId,
  saved = false,
  className = '',
}: {
  signedIn: boolean
  next: string
  postId: string
  saved?: boolean
  className?: string
}) {
  const shell =
    'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-2 ' +
    'text-ink-4 transition-colors'

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        aria-label="Sign in to save this competition"
        title="Sign in to save this competition"
        className={`${shell} hover:border-brand hover:bg-brand-soft hover:text-brand ${className}`}
      >
        <HeartIcon className="h-[17px] w-[17px]" />
      </Link>
    )
  }

  return (
    <SaveToggle
      postId={postId}
      initialSaved={saved}
      path={next}
      noun="competition"
      className={`${shell} hover:border-brand hover:bg-brand-soft hover:text-brand ${className}`}
      savedClassName="border-brand bg-brand-soft text-brand [&_svg]:fill-current"
      icon={<HeartIcon className="h-[17px] w-[17px]" />}
    />
  )
}

// ═══════════════════════════════════════════════════════════
//  The wide listing card
// ═══════════════════════════════════════════════════════════

export function CompetitionRow({
  competition: c,
  signedIn,
  saved = false,
}: {
  competition: Competition
  signedIn: boolean
  /** Whether this reader has already saved it. */
  saved?: boolean
}) {
  const href = `/competition/${c.slug}`

  return (
    <article className="card overflow-hidden">
      <div className="grid sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        {/* ─── photograph ─── */}
        <div className="relative aspect-[4/3] w-full min-w-0 bg-paper-3 sm:aspect-auto sm:min-h-[236px]">
          <Image
            src={c.meta.cardImage}
            alt={c.title}
            fill
            sizes="(max-width: 640px) 100vw, 240px"
            className="object-cover"
          />
          {c.meta.featured && (
            <span className="pill absolute left-3 top-3 bg-brand text-[10px] uppercase tracking-[0.09em] text-white">
              Featured
            </span>
          )}
        </div>

        {/* ─── body ─── */}
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[17px] font-bold leading-snug tracking-tight text-ink">
                <Link href={href} className="transition-colors hover:text-brand">
                  {c.title}
                </Link>
              </h3>

              <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand">
                <Icon name="grid" className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{c.meta.categoryLabel}</span>
              </p>
            </div>

            <SaveButton signedIn={signedIn} next={href} postId={c.id} saved={saved} className="shrink-0" />
          </div>

          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{c.description}</p>

          <CompetitionMeta competition={c} className="mt-4" />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusPill competition={c} />
            <FeePill isPaid={c.isPaid} fee={c.fee} />
            <Link href={href} className="btn-dark ml-auto px-4 py-2 text-[13px]">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  The four-cell meta row — used on the card and in the hero
// ═══════════════════════════════════════════════════════════

export function CompetitionMeta({
  competition: c,
  className = '',
  tone = 'light',
}: {
  competition: Competition
  className?: string
  tone?: 'light' | 'plain'
}) {
  const label = tone === 'light' ? 'text-ink-4' : 'text-ink-3'

  const cells: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Icon name="rupee" className="h-4 w-4" />,
      label: 'Prize Pool',
      value: c.prize > 0 ? formatINR(c.prize) : 'To be announced',
    },
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      label: 'Registration Ends',
      value: compDate(c.registrationEnds),
    },
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      label: 'Submission Ends',
      value: compDate(c.submissionEnds),
    },
    {
      icon: <Icon name="users" className="h-4 w-4" />,
      label: 'Participants',
      value: participantsLabel(c.participants),
    },
  ]

  return (
    <dl
      className={`grid grid-cols-2 gap-x-4 gap-y-3.5 border-y border-line-soft py-3.5
                  lg:grid-cols-4 ${className}`}
    >
      {cells.map((cell) => (
        <div key={cell.label} className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0 text-brand">{cell.icon}</span>
          <div className="min-w-0">
            <dt className={`text-[10.5px] font-semibold uppercase tracking-[0.06em] ${label}`}>
              {cell.label}
            </dt>
            <dd className="tabular mt-0.5 truncate text-[13px] font-bold text-ink">
              {cell.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

// ═══════════════════════════════════════════════════════════
//  Sidebar cards
// ═══════════════════════════════════════════════════════════

export const WHY_PARTICIPATE: { icon: IconName; title: string; body: string }[] = [
  { icon: 'star', title: 'Win Exciting Prizes', body: 'Cash prizes and certificates for every winning entry.' },
  { icon: 'shield', title: 'Get Recognized', body: 'Winning work is published across the ArchFacing platform.' },
  { icon: 'grid', title: 'Build Your Portfolio', body: 'A judged brief is worth more than a self-set one.' },
  { icon: 'users', title: 'Learn & Network', body: 'Meet the jury, and the people entering alongside you.' },
]

export function WhyParticipate() {
  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Why Participate?</h2>

      <ul className="flex flex-col gap-4">
        {WHY_PARTICIPATE.map((w) => (
          <li key={w.title} className="flex min-w-0 items-start gap-3">
            <span className="chip-icon h-9 w-9 rounded-full border border-brand-border bg-brand-soft text-brand">
              <Icon name={w.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[13.5px] font-bold text-ink">{w.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{w.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * ★ Real numbers only.
 *
 * Signed out this is a sign-in prompt, not three zeroes dressed up as a
 * dashboard. Signed in, `participating` is a genuine count of paid entries;
 * submissions and shortlists have no table behind them yet, so they read as
 * an em dash with a line saying why rather than as a fabricated figure.
 */
export function MyCompetitionStatus({ status }: { status: MyStatus | null }) {
  return (
    <section className="rounded-card bg-navy p-5 text-white shadow-card">
      <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.09em] text-white">
        My Competition Status
      </h2>

      {status === null ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-white/65">
            Sign in to see the competitions you have entered, what you have submitted and
            where you have been shortlisted.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent('/competition')}`}
            className="btn-primary mt-4 w-full"
          >
            Sign In
          </Link>
        </>
      ) : (
        <>
          <dl className="mt-4 flex flex-col divide-y divide-white/10">
            <StatusRow label="Participating" value={status.participating} />
            <StatusRow label="Submissions" value={status.submissions} />
            <StatusRow label="Shortlisted" value={status.shortlisted} />
          </dl>

          {(status.submissions === null || status.shortlisted === null) && (
            <p className="mt-3 text-[11.5px] leading-relaxed text-white/45">
              Submissions and shortlists appear here once entry submission goes live.
            </p>
          )}

          <Link href="/dashboard" className="btn-primary mt-4 w-full">
            Go to My Dashboard
          </Link>
        </>
      )}
    </section>
  )
}

function StatusRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="min-w-0 truncate text-[13px] text-white/70">{label}</dt>
      <dd className="tabular shrink-0 font-display text-[16px] font-bold text-white">
        {value === null ? <span className="text-white/40">—</span> : value}
      </dd>
    </div>
  )
}

export function CategoriesCard({
  categories,
  counts,
  activeSlug,
}: {
  categories: { slug: string; name: string }[]
  counts: Record<string, number>
  activeSlug?: string
}) {
  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Competition Categories</h2>

      <ul className="flex flex-col divide-y divide-line-soft">
        {categories.map((cat) => {
          const active = cat.slug === activeSlug
          return (
            <li key={cat.slug} className="min-w-0">
              <Link
                href={`/competition?category=${cat.slug}`}
                className={`flex min-w-0 items-center justify-between gap-3 py-2.5 text-[13px]
                            transition-colors first:pt-0 hover:text-brand
                            ${active ? 'font-semibold text-brand' : 'text-ink-2'}`}
              >
                <span className="min-w-0 truncate">{cat.name}</span>
                <span className="tabular shrink-0 rounded-pill bg-paper-3 px-2 py-0.5 text-[11.5px] font-semibold text-ink-3">
                  {counts[cat.slug] ?? 0}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <Link
        href="/competition"
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:text-brand-hover"
      >
        View All Categories
        <Icon name="arrow" className="h-3.5 w-3.5" />
      </Link>
    </section>
  )
}

export function NeedHelp({
  guidelinesHref = '/competition#how-it-works',
  howToHref = '/competition#how-it-works',
  faqsHref = '/legal/need-help#start',
}: {
  guidelinesHref?: string
  howToHref?: string
  faqsHref?: string
} = {}) {
  const links: { label: string; href: string; icon: IconName }[] = [
    { label: 'Competition Guidelines', href: guidelinesHref, icon: 'file' },
    { label: 'How to Participate', href: howToHref, icon: 'help' },
    { label: 'FAQs', href: faqsHref, icon: 'inbox' },
    { label: 'Contact Support', href: '/legal/contact#reach', icon: 'phone' },
  ]

  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Need Help?</h2>

      <ul className="flex flex-col gap-1">
        {links.map((l) => (
          <li key={l.label} className="min-w-0">
            <Link
              href={l.href}
              className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-[13px]
                         text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <Icon name={l.icon} className="h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0 truncate">{l.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/legal/contact" className="btn-outline mt-4 w-full text-[13px]">
        Submit a Query
      </Link>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  How it works
// ═══════════════════════════════════════════════════════════

const STEPS: { n: string; icon: IconName; title: string; body: string }[] = [
  { n: '01', icon: 'user', title: 'Register', body: 'Pick a competition, register, and pay the entry fee where there is one.' },
  { n: '02', icon: 'inbox', title: 'Submit', body: 'Upload your boards, drawings and concept note before the submission deadline.' },
  { n: '03', icon: 'search', title: 'Evaluation', body: 'An expert jury scores every anonymous entry against the published criteria.' },
  { n: '04', icon: 'star', title: 'Results', body: 'Winners are announced on the competition page and receive prizes and certificates.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24">
      <h2 className="mb-6 font-display text-[13px] font-bold uppercase tracking-[0.09em] text-ink">
        How It Works
      </h2>

      {/* A horizontal flow of four steps: circular icon, a dashed connector with
          an arrow to the next, then the numbered title and its note beneath.
          Two-up on a phone, four across from `sm`. */}
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-2">
        {STEPS.map((s, i) => (
          <li key={s.n} className="min-w-0">
            <div className="flex items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-soft text-brand">
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="hidden flex-1 items-center gap-1 pl-2 md:flex">
                  <span className="h-px flex-1 border-t border-dashed border-line" />
                  <span className="-ml-1 text-[12px] leading-none text-ink-4">›</span>
                </span>
              )}
            </div>

            <p className="mt-3.5 font-display text-[13px] font-bold text-ink">
              {s.n}. {s.title}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Highlights — the dark band of figures
// ═══════════════════════════════════════════════════════════

/** The dark band's five figures — all counted from real rows (see competitionHighlights()). */
export type HighlightFigures = { active: number; prizePool: number; entries: number; designers: number; hosted: number }

export function CompetitionHighlights({ figures }: { figures: HighlightFigures }) {
  const all: { value: string; label: string }[] = [
    { value: figures.active.toLocaleString('en-IN'), label: 'Active Competitions' },
    { value: figures.prizePool > 0 ? formatINR(figures.prizePool) : '—', label: 'Prize Pool (open)' },
    { value: figures.entries.toLocaleString('en-IN'), label: 'Entries Submitted' },
    { value: figures.designers.toLocaleString('en-IN'), label: 'Designers Taking Part' },
    { value: figures.hosted.toLocaleString('en-IN'), label: 'Competitions Hosted' },
  ]
  const top = all.slice(0, 3)
  const bottom = all.slice(3)

  return (
    <section className="flex h-full flex-col rounded-card bg-navy p-6 shadow-card">
      <h2 className="mb-6 font-display text-[13px] font-bold uppercase tracking-[0.09em] text-white">
        Competition Highlights
      </h2>

      {/* Three across on top, two below — value over label, no icons — with
          hairline rules ruling the columns and the two rows apart. */}
      <dl className="flex flex-1 flex-col justify-center">
        <div className="grid grid-cols-3 divide-x divide-white/20 border-b border-white/20 pb-5">
          {top.map((h, i) => (
            <HighlightCell key={`t-${i}`} value={h.value} label={h.label} />
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/20 pt-5">
          {bottom.map((h, i) => (
            <HighlightCell key={`b-${i}`} value={h.value} label={h.label} />
          ))}
        </div>
      </dl>
    </section>
  )
}

function HighlightCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 text-center">
      <dt className="tabular font-display text-[22px] font-bold leading-none text-white md:text-[24px]">
        {value}
      </dt>
      <dd className="mt-1.5 text-[11.5px] leading-snug text-white/60">{label}</dd>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  "Ready to Showcase Your Talent?"
// ═══════════════════════════════════════════════════════════

export function ShowcaseBand() {
  return (
    <section className="relative isolate overflow-hidden rounded-card bg-navy px-6 py-10 text-center shadow-card md:px-10 md:py-12">
      <Image
        src="https://ik.imagekit.io/archfacingb2b/desing%20association.png"
        alt=""
        fill
        sizes="100vw"
        unoptimized
        className="-z-10 object-cover"
      />
      <h2 className="font-display text-[24px] font-bold leading-tight tracking-tight text-white md:text-[30px]">
        Ready to Showcase Your Talent?
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/75">
        Every competition is judged blind by a panel of practising architects and
        designers. Enter one, and let the work speak for itself.
      </p>
      <Link href="/competition" className="btn-primary mt-6">
        Browse All Competitions
      </Link>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  The hero line drawing
// ═══════════════════════════════════════════════════════════

/**
 * A drawn building for the listing hero.
 *
 * Inline rather than a file in `public/` so it takes its colours from the
 * palette tokens — `line`, `ink-4` and `brand` — instead of freezing three
 * hex values into an asset the theme can never reach.
 */
export function BuildingLineArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-label="Line drawing of a community building"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* ─── setting-out grid ─── */}
      <g className="stroke-line" strokeWidth="1">
        {[60, 120, 180, 240, 300, 360].map((x) => (
          <line key={`v${x}`} x1={x} y1="18" x2={x} y2="282" />
        ))}
        {[60, 120, 180, 240].map((y) => (
          <line key={`h${y}`} x1="18" y1={y} x2="402" y2={y} />
        ))}
      </g>

      {/* ─── ground ─── */}
      <line x1="18" y1="258" x2="402" y2="258" className="stroke-ink-4" strokeWidth="1.6" />

      {/* ─── the tower ─── */}
      <g className="stroke-ink-4" strokeWidth="1.8">
        <path d="M96 258V96l60-32 60 32v162" />
        <path d="M156 64v194" />
        {[120, 150, 180, 210, 240].map((y) => (
          <line key={`t${y}`} x1="96" y1={y} x2="216" y2={y} />
        ))}
      </g>

      {/* ─── the low wing ─── */}
      <g className="stroke-ink-4" strokeWidth="1.8">
        <path d="M216 258v-96h108v96" />
        <path d="M216 162l54-26 54 26" />
        {[192, 222].map((y) => (
          <line key={`w${y}`} x1="216" y1={y} x2="324" y2={y} />
        ))}
        <line x1="270" y1="136" x2="270" y2="258" />
      </g>

      {/* ─── the canopy ─── */}
      <g className="stroke-ink-4" strokeWidth="1.8">
        <path d="M36 258v-54h60v54" />
        <path d="M30 204h72" />
      </g>

      {/* ─── brand accents: the entrance, the roof line, a plane of glazing ─── */}
      <g className="stroke-brand" strokeWidth="2.4">
        <path d="M138 258v-42a18 18 0 0136 0v42" />
        <path d="M96 96l60-32 60 32" />
        <path d="M234 180h30v30h-30z" />
      </g>

      {/* ─── planting ─── */}
      <g className="stroke-ink-4" strokeWidth="1.6">
        <path d="M360 258v-36" />
        <path d="M360 234c0-14 10-24 22-24 0 14-10 24-22 24z" />
        <path d="M360 246c0-12-9-21-19-21 0 12 9 21 19 21z" />
        <path d="M60 258v-22" />
        <circle cx="60" cy="228" r="12" />
      </g>

      {/* ─── dimension line ─── */}
      <g className="stroke-brand" strokeWidth="1.2" opacity="0.5">
        <path d="M96 276h228M96 270v12M324 270v12" />
      </g>
    </svg>
  )
}
