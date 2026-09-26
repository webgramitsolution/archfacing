import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn, formatINR } from '@/lib/utils'
import {
  CalendarIcon,
  SaveButton,
  TrophyIcon,
  WHY_PARTICIPATE,
} from '@/components/competition'
import {
  competitionStatus,
  compDate,
  SORT_OPTIONS,
  type CompetitionCard,
  type MyStatus,
} from '@/lib/competition'
import type { HighlightFigures } from '@/components/competition'
import { CompetitionSortSelect } from './competition-phone-client'

/**
 * The Design Competition page on a phone — the "Design Comptition phone
 * device" reference, rendered below `md` only. Tablet and desktop keep the
 * existing page untouched.
 *
 * Every figure is counted: the hero's totals, the participants on each card
 * (competition entries), the category counts, "My Competition Status" and
 * the highlights band. Nothing is copied from the reference's placeholders.
 */

const HERO_IMAGE = 'https://ik.imagekit.io/archfacing/building.png?updatedAt=1784733487852'

const BENEFITS: { icon: IconName; label: string }[] = [
  { icon: 'globe', label: 'Global Exposure' },
  { icon: 'rupee', label: 'Cash Prizes' },
  { icon: 'award', label: 'Certificates' },
  { icon: 'shield', label: 'Expert Jury' },
  { icon: 'users', label: 'Networking' },
]

export function CompetitionPhone({
  competitions,
  total,
  matched,
  highlights,
  categories,
  counts,
  activeCategory,
  myStatus,
  signedIn,
  savedIds,
  sort,
  keep,
  loadMoreHref,
}: {
  competitions: CompetitionCard[]
  /** every published competition */
  total: number
  /** how many match the current filters */
  matched: number
  highlights: HighlightFigures
  categories: { slug: string; name: string }[]
  counts: Record<string, number>
  activeCategory?: string
  /** null when signed out — the block is then left out */
  myStatus: MyStatus | null
  signedIn: boolean
  savedIds: Set<string>
  sort: string
  /** the filters to carry across a sort change */
  keep: Record<string, string | undefined>
  /** null when every match is already shown */
  loadMoreHref: string | null
}) {
  const guidelinesHref = competitions[0] ? `/competition/${competitions[0].slug}#guidelines` : '/legal/terms'

  return (
    <div className="bg-white px-4 pb-8 pt-1">
      {/* ═══════════ hero ═══════════ */}
      <section className="relative isolate overflow-hidden rounded-card border border-line bg-brand-soft">
        <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[58%]">
          <Image src={HERO_IMAGE} alt="" fill priority sizes="60vw" className="object-cover object-center" />
          <span className="absolute inset-0 bg-gradient-to-r from-brand-soft via-brand-soft/40 to-transparent" />
        </div>

        <div className="relative px-4 pb-5 pt-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink">
            Design Competition
            <span className="h-px w-6 bg-brand" />
          </p>
          <h1 className="mt-2 font-display text-[22px] font-extrabold uppercase leading-[1.15] tracking-tight">
            <span className="block text-ink">Show. Compete.</span>
            <span className="block text-brand">Get Recognized.</span>
          </h1>
          <p className="mt-3 max-w-[62%] text-[12px] leading-[1.6] text-ink-2">
            Participate in architecture &amp; design competitions, showcase your creativity,
            win exciting prizes and get recognized globally.
          </p>

          <div className="mt-4 inline-flex flex-col rounded-card bg-navy px-4 py-3 text-white shadow-card">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white/75">Total Competitions</span>
            <span className="tabular mt-1 font-display text-[28px] font-bold leading-none">{total}</span>
            <span className="mt-2 border-t border-white/15 pt-1.5 text-[11px] text-white/80">
              {highlights.active} Active {highlights.active === 1 ? 'Competition' : 'Competitions'}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════ five benefits ═══════════ */}
      <ul className="mt-5 grid grid-cols-5 gap-1">
        {BENEFITS.map((b) => (
          <li key={b.label} className="flex min-w-0 flex-col items-center text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-soft/50 text-brand">
              <Icon name={b.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="mt-1.5 text-[11px] font-medium leading-[1.25] text-ink">{b.label}</span>
          </li>
        ))}
      </ul>

      {/* ═══════════ active competitions ═══════════ */}
      <section className="mt-7" id="active">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold uppercase tracking-tight text-ink">Active Competitions</h2>
            <Link href="/competition?status=OPEN" className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand">
              View All
              <Icon name="arrow" className="h-3 w-3" />
            </Link>
          </div>
          <CompetitionSortSelect value={sort} options={SORT_OPTIONS} keep={keep} />
        </div>

        {competitions.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-line bg-paper-2 px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-ink">No competitions match that search</p>
            <Link href="/competition" className="mt-3 inline-flex h-9 items-center rounded-card bg-brand px-4 text-[12px] font-semibold text-white">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3.5">
            {competitions.map((c) => (
              <PhoneCompetitionCard key={c.id} c={c} signedIn={signedIn} saved={savedIds.has(c.id)} />
            ))}
          </div>
        )}

        {loadMoreHref && (
          <Link
            href={loadMoreHref}
            scroll={false}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-card border border-line bg-white text-[13px] font-semibold text-brand"
          >
            <Icon name="plus" className="h-4 w-4" />
            Load More Competitions
          </Link>
        )}
        {competitions.length > 0 && (
          <p className="mt-2.5 text-center text-[11.5px] text-ink-4">
            Showing {competitions.length} of {matched} {matched === 1 ? 'competition' : 'competitions'}
          </p>
        )}
      </section>

      {/* ═══════════ topics ═══════════ */}
      {categories.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/competition?category=${cat.slug}`}
                className={cn(
                  'flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border px-1.5 py-3 text-center',
                  cat.slug === activeCategory ? 'border-brand bg-brand-soft/40' : 'border-line bg-white'
                )}
              >
                <Icon name="building" className="h-[22px] w-[22px] text-brand" />
                <span className="text-[11.5px] font-semibold leading-tight text-ink">{cat.name}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/competition" className="flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card border border-line bg-white px-1.5 py-3 text-center">
              <Icon name="grid" className="h-[22px] w-[22px] text-brand" />
              <span className="text-[11.5px] font-semibold leading-tight text-ink">All Topics</span>
            </Link>
          </li>
        </ul>
      )}

      {/* ═══════════ why participate ═══════════ */}
      <section className="mt-6 rounded-card bg-brand-soft/40 p-4">
        <Title>Why Participate?</Title>
        <ul className="mt-3.5 flex flex-col gap-3.5">
          {WHY_PARTICIPATE.map((w) => (
            <li key={w.title} className="flex items-start gap-3">
              <Icon name={w.icon} className="mt-0.5 h-[22px] w-[22px] shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{w.title}</p>
                <p className="mt-0.5 text-[12px] leading-[1.45] text-ink-3">{w.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══════════ my status — signed in only ═══════════ */}
      {myStatus && (
        <section className="mt-4 rounded-card bg-navy p-4 text-white shadow-card">
          <Title dark>My Competition Status</Title>
          <dl className="mt-3 flex flex-col divide-y divide-white/10">
            <StatusRow icon="award" label="Participating" value={myStatus.participating} unit={['Competition', 'Competitions']} />
            <StatusRow icon="calendar" label="Submissions" value={myStatus.submissions} unit={['Submitted', 'Submitted']} />
            <StatusRow icon="star" label="Shortlisted" value={myStatus.shortlisted} unit={['Project', 'Projects']} />
          </dl>
          {(myStatus.submissions === null || myStatus.shortlisted === null) && (
            <p className="mt-2 text-[11px] leading-relaxed text-white/50">
              Submissions and shortlists appear here once entry submission goes live.
            </p>
          )}
          <Link href="/dashboard" className="mt-3.5 flex h-11 w-full items-center justify-center rounded-card bg-brand text-[13px] font-semibold text-white">
            Go to My Dashboard
          </Link>
        </section>
      )}

      {/* ═══════════ categories ═══════════ */}
      <section className="mt-4 rounded-card border border-line bg-white p-4">
        <Title>Competition Categories</Title>
        <ul className="mt-2.5 flex flex-col">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/competition?category=${cat.slug}`}
                className={cn(
                  'flex min-h-[38px] items-center justify-between gap-3 text-[12.5px]',
                  cat.slug === activeCategory ? 'font-semibold text-brand' : 'text-ink-2'
                )}
              >
                <span className="min-w-0 truncate">{cat.name}</span>
                <span className="tabular flex h-6 min-w-[24px] items-center justify-center rounded-full bg-paper-3 px-2 text-[11px] font-semibold text-ink">
                  {counts[cat.slug] ?? 0}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/competition" className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand">
          View All Categories
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ═══════════ need help ═══════════ */}
      <section className="mt-4 rounded-card border border-line bg-white p-4">
        <Title>Need Help?</Title>
        <ul className="mt-2.5 flex flex-col">
          {[
            { icon: 'file' as IconName, label: 'Competition Guidelines', sub: 'Read the rules & guidelines', href: guidelinesHref },
            { icon: 'help' as IconName, label: 'How to Participate', sub: 'Step-by-step process', href: '/legal/need-help#start' },
            { icon: 'inbox' as IconName, label: 'FAQs', sub: 'Frequently asked questions', href: '/legal/need-help' },
            { icon: 'phone' as IconName, label: 'Contact Support', sub: "We're here to help", href: '/legal/contact#reach' },
          ].map((l) => (
            <li key={l.label}>
              <Link href={l.href} className="flex min-h-[48px] items-center gap-3 py-1.5">
                <Icon name={l.icon} className="h-5 w-5 shrink-0 text-ink-2" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-ink">{l.label}</span>
                  <span className="block text-[11.5px] text-ink-3">{l.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/legal/contact" className="mt-3 flex h-10 w-full items-center justify-center rounded-card border border-brand text-[13px] font-semibold text-brand">
          Submit a Query
        </Link>
      </section>

      {/* ═══════════ highlights ═══════════ */}
      <section className="mt-4 rounded-card bg-navy p-4 shadow-card">
        <Title dark>Competition Highlights</Title>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-white/15 border-b border-white/15 pb-3.5">
          <Highlight value={highlights.active.toLocaleString('en-IN')} label="Active Competitions" />
          <Highlight value={highlights.prizePool > 0 ? formatINR(highlights.prizePool) : '—'} label="Prize Pool (open)" />
          <Highlight value={highlights.entries.toLocaleString('en-IN')} label="Entries Submitted" />
        </dl>
        <dl className="grid grid-cols-2 divide-x divide-white/15 pt-3.5">
          <Highlight value={highlights.designers.toLocaleString('en-IN')} label="Designers Taking Part" />
          <Highlight value={highlights.hosted.toLocaleString('en-IN')} label="Competitions Hosted" />
        </dl>
      </section>

      {/* ═══════════ closing call to action ═══════════ */}
      <section className="mt-4 flex items-start gap-3 rounded-card bg-navy p-4 shadow-card">
        <TrophyIcon className="mt-0.5 h-10 w-10 shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-snug text-white">Ready to Showcase Your Talent?</p>
          <p className="mt-1 text-[12px] leading-[1.5] text-white/70">
            Join our design competitions and take your career to the next level.
          </p>
          <Link href="/competition?status=OPEN" className="mt-3 inline-flex h-10 items-center gap-2 rounded-card bg-brand px-4 text-[12.5px] font-semibold text-white">
            Browse All Competitions
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  The phone listing card
// ═══════════════════════════════════════════════════════════

function PhoneCompetitionCard({ c, signedIn, saved }: { c: CompetitionCard; signedIn: boolean; saved: boolean }) {
  const href = `/competition/${c.slug}`
  const status = competitionStatus(c)

  return (
    <article className="rounded-card border border-line bg-white p-3 shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
      <div className="flex gap-3">
        <Link href={href} className="relative block aspect-[1/0.9] w-[42%] shrink-0 overflow-hidden rounded-card bg-paper-3">
          <Image src={c.meta.cardImage} alt={c.title} fill sizes="40vw" className="object-cover" />
          {c.meta.featured && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-white">
              Featured
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="min-w-0 flex-1 font-display text-[14.5px] font-bold leading-snug text-ink">
              <Link href={href}>{c.title}</Link>
            </h3>
            <SaveButton signedIn={signedIn} next={href} postId={c.id} saved={saved} className="!h-9 !w-9 shrink-0 !border-0 !bg-transparent" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Icon name="user" className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="min-w-0 truncate">{c.meta.categoryLabel}</span>
          </p>
          <p className="mt-1.5 line-clamp-4 text-[12px] leading-[1.5] text-ink-2">{c.description}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2.5">
        <Meta icon={<Icon name="rupee" className="h-4 w-4" />} value={c.prize > 0 ? formatINR(c.prize) : 'TBA'} label="Prize Pool" />
        <Meta icon={<CalendarIcon className="h-4 w-4" />} value={compDate(c.registrationEnds)} label="Reg. Ends" />
        <Meta icon={<CalendarIcon className="h-4 w-4" />} value={compDate(c.submissionEnds)} label="Submit Ends" />
        <Meta icon={<Icon name="users" className="h-4 w-4" />} value={c.participants.toLocaleString('en-IN')} label="Participants" />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold', status.pill)}>{status.label}</span>
        <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold', c.isPaid ? 'bg-brand-soft text-brand' : 'bg-info-soft text-info')}>
          {c.isPaid ? 'Paid' : 'Free'}
        </span>
        <Link href={href} className="ml-auto flex h-9 shrink-0 items-center rounded-md bg-navy px-3 text-[11.5px] font-semibold text-white">
          View Details
        </Link>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  Small pieces
// ═══════════════════════════════════════════════════════════

function Title({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2 className={cn('flex items-center gap-2 font-display text-[13.5px] font-bold uppercase tracking-[0.04em]', dark ? 'text-white' : 'text-ink')}>
      {children}
      <span className={cn('h-px w-8', dark ? 'bg-white/40' : 'bg-brand')} />
    </h2>
  )
}

function Meta({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="mt-0.5 shrink-0 text-ink-2">{icon}</span>
      <div className="min-w-0">
        <p className="tabular truncate text-[11.5px] font-semibold text-ink">{value}</p>
        <p className="text-[11px] text-ink-3">{label}</p>
      </div>
    </div>
  )
}

function StatusRow({
  icon,
  label,
  value,
  unit,
}: {
  icon: IconName
  label: string
  value: number | null
  unit: [string, string]
}) {
  return (
    <div className="flex min-h-[40px] items-center gap-3 py-1.5">
      <Icon name={icon} className="h-[18px] w-[18px] shrink-0 text-brand" />
      <dt className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">{label}</dt>
      <dd className="tabular shrink-0 text-[12.5px] text-white">
        {value === null ? <span className="text-white/45">—</span> : `${value} ${value === 1 ? unit[0] : unit[1]}`}
      </dd>
    </div>
  )
}

function Highlight({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <dt className="tabular font-display text-[17px] font-bold leading-none text-white">{value}</dt>
      <dd className="mt-1.5 text-[11px] leading-snug text-white/65">{label}</dd>
    </div>
  )
}
