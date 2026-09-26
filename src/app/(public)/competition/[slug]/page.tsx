import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { isSaved } from '@/lib/visitor'
import { SaveToggle } from '@/components/save-button'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'
import { formatINR } from '@/lib/utils'
import { COMPETITION_CATEGORIES } from '@/config/taxonomy'
import {
  getCompetition,
  competitionJury,
  competitionStatus,
  compDate,
  compDateShort,
  participantsLabel,
  prizeTotal,
  type CompetitionDetail,
  type CompetitionMeta,
  type JuryMember,
} from '@/lib/competition'
import {
  publicEntryInfo,
  entryGate,
  ENTRY_STATUS_LABEL,
} from '@/lib/competition-entries'
import type { Role } from '@prisma/client'

import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Icon, type IconName } from '@/components/ui'
import {
  BookmarkIcon,
  CalendarIcon,
  ChevronDownIcon,
  CompetitionMeta as MetaRow,
  FeePill,
  GalleryIcon,
  SECTION_TITLE,
  ShareIcon,
  ShowcaseBand,
  NeedHelp,
  TrophyIcon,
} from '@/components/competition'

/**
 * A single design competition.
 *
 * Server-rendered end to end. The tab bar is seven anchors, the FAQs are
 * `<details>`, and the jury strip scrolls itself — there is no client bundle
 * behind any of it.
 *
 * ★ Register Now is honest. Registration is not built, so signed out it sends
 *   you to login (a real next step) and signed in it is a disabled button with
 *   a line saying why — never a live-looking control that swallows the click.
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
  const competition = await getCompetition(slug)
  if (!competition) return { title: 'Competition Not Found' }

  const cover = competition.meta.heroImage

  return {
    title: competition.title,
    description: competition.description,
    openGraph: {
      title: competition.title,
      description: competition.description,
      type: 'article',
      images: [{ url: cover, alt: competition.title }],
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
  const [competition, session] = await Promise.all([getCompetition(slug), auth()])

  if (!competition) notFound()

  const meta = competition.meta
  const [jury, entryInfo] = await Promise.all([
    competitionJury(meta.jury),
    publicEntryInfo(competition.id),
  ])

  // Whether the reader may answer this brief right now. The card below prints
  // the reason when they may not, rather than a button that does nothing.
  const gate = entryInfo.competition
    ? entryGate(
        entryInfo.competition,
        session?.user?.id,
        session?.user?.role as Role | undefined
      )
    : ({ open: false, reason: 'This competition is not open.' } as const)

  const status = competitionStatus(competition)
  const saved = session?.user?.id ? await isSaved(session.user.id, competition.id) : false
  const signedIn = Boolean(session?.user)
  const path = `/competition/${competition.slug}`
  const url = `${BASE_URL}${path}`
  const loginHref = `/login?next=${encodeURIComponent(path)}`
  const submitHref = `/dashboard/competitions/${competition.id}/submit`

  const categoryName =
    COMPETITION_CATEGORIES.find((c) => c.slug === competition.category)?.name ??
    meta.categoryLabel

  const hasOverview =
    meta.about.length > 0 ||
    meta.focus.length > 0 ||
    meta.eligibility.length > 0 ||
    meta.deliverables.length > 0 ||
    jury.length > 0

  // ★ A tab whose section has nothing behind it is not rendered — the
  //   competitions without a detail payload get a short tab bar rather than
  //   six anchors that jump to empty cards.
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'file' as IconName, show: hasOverview },
    { id: 'guidelines', label: 'Guidelines', icon: 'check' as IconName, show: meta.guidelines.length > 0 },
    { id: 'prizes', label: 'Prizes', icon: 'star' as IconName, show: competition.prize > 0 },
    { id: 'evaluation', label: 'Evaluation', icon: 'chart' as IconName, show: meta.evaluation.length > 0 },
    { id: 'timeline', label: 'Timeline', icon: 'clock' as IconName, show: meta.timeline.length > 0 },
    { id: 'faqs', label: 'FAQs', icon: 'help' as IconName, show: meta.faqs.length > 0 },
    { id: 'participants', label: 'Participants', icon: 'users' as IconName, show: competition.participants > 0 },
  ].filter((t) => t.show)

  const gallery = competition.images.slice(1)

  return (
    <>
      <SiteHeader />

      <main>
        {/* ══════════════ hero ══════════════ */}
        <section className="border-b border-line bg-paper-2">
          <div className="container-af py-10">
            <Breadcrumb
              items={[
                homeCrumb(),
                { label: 'Design Competition', href: '/competition' },
                { label: competition.title },
              ]}
            />

            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* ─── photograph ─── */}
              <div className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-card bg-paper-3">
                <Image
                  src={meta.heroImage}
                  alt={competition.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />

                {meta.featured && (
                  <span className="pill absolute left-4 top-4 bg-brand text-[10px] uppercase tracking-[0.09em] text-white">
                    Featured
                  </span>
                )}

                {gallery.length > 0 && (
                  <a
                    href="#gallery"
                    className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg
                               bg-navy/85 px-3.5 py-2 text-[12.5px] font-semibold text-white
                               transition-colors hover:bg-navy"
                  >
                    <GalleryIcon className="h-4 w-4" />
                    View Gallery
                  </a>
                )}
              </div>

              {/* ─── the facts ─── */}
              <div className="flex min-w-0 flex-col">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand">
                  <Icon name="grid" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{categoryName}</span>
                </p>

                <h1 className="mt-2.5 font-display text-[26px] font-bold leading-[1.15] tracking-tight text-ink md:text-[32px]">
                  {competition.title}
                </h1>

                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
                  {competition.description}
                </p>

                <MetaRow competition={competition} className="mt-5" tone="plain" />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`pill ${status.pill}`}>{status.label}</span>
                  <FeePill isPaid={competition.isPaid} fee={competition.fee} />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <RegisterButton
                    closed={status.key === 'CLOSED'}
                    signedIn={signedIn}
                    loginHref={loginHref}
                    gate={gate}
                    submitHref={submitHref}
                  />

                  <a href="#share" className="btn-outline">
                    <ShareIcon className="h-4 w-4" />
                    Share
                  </a>

                  <SaveControl signedIn={signedIn} loginHref={loginHref} postId={competition.id} saved={saved} path={path} />
                </div>

                {signedIn && status.key !== 'CLOSED' && !gate.open && (
                  <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
                    <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                    {gate.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="container-af py-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
            {/* ══════════════ left column ══════════════ */}
            <div className="min-w-0">
              {/* ─── tab bar ─── */}
              {tabs.length > 1 && (
                <nav
                  aria-label="Sections of this competition"
                  className="mb-6 overflow-x-auto border-b border-line"
                >
                  <ul className="flex w-max gap-0.5">
                    {tabs.map((t, i) => (
                      <li key={t.id}>
                        <a
                          href={`#${t.id}`}
                          className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3
                                      text-[13px] font-semibold transition-colors
                                      ${
                                        i === 0
                                          ? 'border-brand text-brand'
                                          : 'border-transparent text-ink-2 hover:border-brand/40 hover:text-brand'
                                      }`}
                        >
                          <Icon name={t.icon} className="h-4 w-4" />
                          {t.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className="flex min-w-0 flex-col gap-6">
                {hasOverview && <Overview meta={meta} jury={jury} />}

                {meta.guidelines.length > 0 && <Guidelines meta={meta} />}

                {competition.prize > 0 && <Prizes competition={competition} />}

                {meta.evaluation.length > 0 && <Evaluation meta={meta} />}

                {meta.timeline.length > 0 && (
                  <Timeline competition={competition} meta={meta} />
                )}

                {meta.faqs.length > 0 && <Faqs meta={meta} />}

                {competition.participants > 0 && (
                  <Participants competition={competition} meta={meta} />
                )}

                {gallery.length > 0 && (
                  <Gallery title={competition.title} photos={gallery} />
                )}

                <ShareCard url={url} title={competition.title} />
              </div>
            </div>

            {/* ══════════════ right column ══════════════ */}
            <aside className="flex min-w-0 flex-col gap-5 self-start lg:sticky lg:top-4">
              <EntryCard
                competitionId={competition.id}
                count={entryInfo.count}
                winner={entryInfo.winner}
                gate={gate}
                signedIn={signedIn}
                loginHref={loginHref}
              />
              <StatusCard
                competition={competition}
                signedIn={signedIn}
                loginHref={loginHref}
                gate={gate}
                submitHref={submitHref}
              />
              <ImportantDates competition={competition} meta={meta} />
              {competition.prize > 0 && <PrizePool competition={competition} />}
              <NeedHelp
                guidelinesHref={meta.guidelines.length > 0 ? '#guidelines' : '/competition#how-it-works'}
                howToHref="/competition#how-it-works"
                faqsHref={meta.faqs.length > 0 ? '#faqs' : '/legal/need-help#start'}
              />
            </aside>
          </div>

          <div className="mt-10">
            <ShowcaseBand />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════
//  Register / save
// ═══════════════════════════════════════════════════════════

/**
 * ★ The one control on this page that must not lie.
 *
 *   closed   → a disabled button saying so
 *   signed out → a real link to login, which is a genuine next step
 *   signed in  → disabled, with the note beside it explaining why
 */
function RegisterButton({
  closed,
  signedIn,
  loginHref,
  gate,
  submitHref,
  className = '',
}: {
  closed: boolean
  signedIn: boolean
  loginHref: string
  /** The same rule the Entries card uses — one answer to "may I enter?". */
  gate: { open: true } | { open: false; reason: string }
  submitHref: string
  className?: string
}) {
  if (closed) {
    return (
      <span
        className={`btn cursor-not-allowed border border-line bg-paper-3 text-ink-3 ${className}`}
        aria-disabled
      >
        Registration Closed
      </span>
    )
  }

  if (!signedIn) {
    return (
      <Link href={loginHref} className={`btn-primary ${className}`}>
        Register Now
      </Link>
    )
  }

  if (gate.open) {
    return (
      <Link href={submitHref} className={`btn-primary ${className}`}>
        Register Now
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled
      title={gate.reason}
      className={`btn-primary ${className}`}
    >
      Register Now
    </button>
  )
}

/** The same real save as the heart on the listing card. */
function SaveControl({
  signedIn,
  loginHref,
  postId,
  saved,
  path,
}: {
  signedIn: boolean
  loginHref: string
  postId: string
  saved: boolean
  path: string
}) {
  const shell =
    'flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-paper-2 ' +
    'text-ink-3 transition-colors'

  return signedIn ? (
    <SaveToggle
      postId={postId}
      initialSaved={saved}
      path={path}
      noun="competition"
      className={`${shell} hover:border-brand hover:bg-brand-soft hover:text-brand`}
      savedClassName="border-brand bg-brand-soft text-brand [&_svg]:fill-current"
      icon={<BookmarkIcon />}
    />
  ) : (
    <Link
      href={loginHref}
      aria-label="Sign in to save this competition"
      title="Sign in to save this competition"
      className={`${shell} hover:border-brand hover:bg-brand-soft hover:text-brand`}
    >
      <BookmarkIcon />
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  Overview
// ═══════════════════════════════════════════════════════════

function Overview({ meta, jury }: { meta: CompetitionMeta; jury: JuryMember[] }) {
  return (
    <section id="overview" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-4`}>About the Competition</h2>

      <div className="flex flex-col gap-3.5 text-[14.5px] leading-[1.75] text-ink-2">
        {meta.about.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {meta.focus.length > 0 && (
        <>
          <h3 className="mb-3 mt-6 font-display text-[15px] font-bold text-ink">
            {meta.focusTitle}
          </h3>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {meta.focus.map((f) => (
              <li key={f} className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" className="h-3 w-3" />
                </span>
                <span className="min-w-0 text-[13.5px] leading-snug text-ink-2">{f}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {meta.eligibility.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 font-display text-[15px] font-bold text-ink">
            Who Can Participate?
          </h3>
          <ul className="grid gap-4 sm:grid-cols-3">
            {meta.eligibility.map((e) => (
              <li
                key={e.title}
                className="min-w-0 rounded-card border border-line bg-paper-3 p-4"
              >
                <span className="chip-icon mb-3 h-10 w-10 rounded-full border border-brand-border bg-brand-soft text-brand">
                  <Icon name={e.icon} />
                </span>
                <p className="font-display text-[14px] font-bold text-ink">{e.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{e.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {meta.deliverables.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 font-display text-[15px] font-bold text-ink">
            Key Deliverables
          </h3>
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {meta.deliverables.map((d) => (
              <li
                key={d.title}
                className="flex min-w-0 flex-col items-center rounded-card border border-line
                           bg-paper-2 p-4 text-center"
              >
                <span className="chip-icon mb-2.5 h-10 w-10 rounded-full bg-brand-soft text-brand">
                  <Icon name={d.icon} />
                </span>
                <p className="font-display text-[13px] font-bold leading-snug text-ink">
                  {d.title}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{d.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {meta.warning && (
        <div className="mt-6 flex min-w-0 items-start gap-3 rounded-card border border-danger/25 bg-danger-soft p-4">
          <Icon name="alert" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger" />
          <p className="min-w-0 text-[13px] leading-relaxed text-ink-2">{meta.warning}</p>
        </div>
      )}

      {jury.length > 0 && <Jury jury={jury} />}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Expert jury
// ═══════════════════════════════════════════════════════════

function Jury({ jury }: { jury: JuryMember[] }) {
  const first = 'jury-0'
  const last = `jury-${jury.length - 1}`

  return (
    <div id="jury" className="mt-8 scroll-mt-24 border-t border-line-soft pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-[15px] font-bold text-ink">Expert Jury</h3>

        <div className="flex shrink-0 items-center gap-2">
          {/* Plain anchors — the browser scrolls the strip to bring a card into
              view, so the arrows work with no client JS at all. */}
          {jury.length > 3 && (
            <>
              <ScrollArrow href={`#${first}`} side="left" />
              <ScrollArrow href={`#${last}`} side="right" />
            </>
          )}
          <Link
            href="/designers-associates"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:text-brand-hover"
          >
            View All Jury
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <ul className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2 scroll-smooth">
        {jury.map((j, i) => (
          <li
            key={`${j.name}-${i}`}
            id={`jury-${i}`}
            className="w-[150px] shrink-0 snap-start scroll-mt-24 text-center"
          >
            <div className="relative mx-auto h-[110px] w-[110px] overflow-hidden rounded-full bg-paper-3">
              {j.photo && (
                <Image src={j.photo} alt={j.name} fill sizes="110px" className="object-cover" />
              )}
            </div>
            <p className="mt-3 font-display text-[13.5px] font-bold leading-snug text-ink">
              {j.name}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-ink-3">{j.role}</p>
            {j.firm && <p className="mt-0.5 text-[11.5px] text-ink-4">{j.firm}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScrollArrow({ href, side }: { href: string; side: 'left' | 'right' }) {
  return (
    <a
      href={href}
      aria-label={side === 'left' ? 'Back to the first jury member' : 'Jump to the last jury member'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line
                 bg-paper-2 text-ink-3 transition-colors hover:border-brand hover:text-brand"
    >
      <Icon name="arrow" className={`h-4 w-4 ${side === 'left' ? 'rotate-180' : ''}`} />
    </a>
  )
}

// ═══════════════════════════════════════════════════════════
//  Guidelines · Prizes · Evaluation · Timeline · FAQs
// ═══════════════════════════════════════════════════════════

function Guidelines({ meta }: { meta: CompetitionMeta }) {
  return (
    <section id="guidelines" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-5`}>Competition Guidelines</h2>

      <div className="flex flex-col gap-6">
        {meta.guidelines.map((g) => (
          <div key={g.title} className="min-w-0">
            <h3 className="mb-2.5 font-display text-[14.5px] font-bold text-ink">{g.title}</h3>
            <ul className="flex flex-col gap-2">
              {g.points.map((p, i) => (
                <li key={i} className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0 text-[13.5px] leading-relaxed text-ink-2">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function Prizes({ competition }: { competition: CompetitionDetail }) {
  const prizes = competition.meta.prizes
  const split = prizeTotal(prizes)

  return (
    <section id="prizes" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-5`}>Prize Pool</h2>

      <div className="rounded-card border border-brand-border bg-brand-soft p-5 text-center">
        <TrophyIcon className="mx-auto h-7 w-7 text-brand" />
        <p className="tabular mt-2.5 font-display text-[30px] font-bold leading-none text-ink">
          {formatINR(competition.prize)}
        </p>
        <p className="mt-1.5 text-[12.5px] text-ink-3">Total prize money</p>
      </div>

      {prizes.length > 0 && (
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {prizes.map((p, i) => (
            <li
              key={p.place}
              className={`min-w-0 rounded-card border p-4 text-center
                          ${i === 0 ? 'border-brand-border bg-paper-2' : 'border-line bg-paper-3'}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-4">
                {p.label}
              </p>
              <p className="mt-1.5 font-display text-[14px] font-bold text-ink">{p.place}</p>
              <p className="tabular mt-1 font-display text-[19px] font-bold text-brand">
                {formatINR(p.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* A quiet consistency check — if the seed and the column ever drift, the
          page says so rather than quietly printing two different totals. */}
      {prizes.length > 0 && split !== competition.prize && (
        <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-3">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          The places listed add up to {formatINR(split)}; the remainder of the pool is
          awarded at the jury&apos;s discretion.
        </p>
      )}

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
        Every entrant who submits a complete, compliant entry receives a certificate of
        participation.
      </p>
    </section>
  )
}

function Evaluation({ meta }: { meta: CompetitionMeta }) {
  const total = meta.evaluation.reduce((sum, c) => sum + c.weight, 0)

  return (
    <section id="evaluation" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-2`}>Evaluation Criteria</h2>
      <p className="mb-5 text-[13px] text-ink-3">
        Entries are judged anonymously. Each criterion is scored out of its weight, and the
        weights add up to {total}.
      </p>

      <ul className="flex flex-col divide-y divide-line-soft">
        {meta.evaluation.map((c) => (
          <li key={c.label} className="min-w-0 py-3.5 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <p className="min-w-0 font-display text-[14px] font-bold text-ink">{c.label}</p>
              <p className="tabular shrink-0 text-[13px] font-bold text-brand">{c.weight}%</p>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{c.body}</p>

            {/* A plain bar — width is a style, not a chart library. */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-pill bg-paper-3">
              <div className="h-full rounded-pill bg-brand" style={{ width: `${c.weight}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The timeline section.
 *
 * `dateKey` in the seed points at either a real column or a meta date, so the
 * two dates the reader acts on are never duplicated into the Json blob where
 * they could drift out of step with what the listing filters on.
 */
function resolveDate(
  key: string,
  competition: CompetitionDetail,
  meta: CompetitionMeta
): Date | null {
  switch (key) {
    case 'registrationEnds':
      return competition.registrationEnds
    case 'submissionEnds':
      return competition.submissionEnds
    case 'registrationStartsAt':
      return meta.registrationStartsAt
    case 'queryDeadlineAt':
      return meta.queryDeadlineAt
    case 'resultsAt':
      return meta.resultsAt
    default:
      return null
  }
}

function Timeline({
  competition,
  meta,
}: {
  competition: CompetitionDetail
  meta: CompetitionMeta
}) {
  const now = new Date()
  const steps = meta.timeline.map((t) => {
    const date = resolveDate(t.dateKey, competition, meta)
    return { ...t, date, done: date !== null && date < now }
  })
  const nextIndex = steps.findIndex((s) => !s.done)

  return (
    <section id="timeline" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-5`}>Competition Timeline</h2>

      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const current = i === nextIndex
          const dot = s.done ? 'border-ok bg-ok' : current ? 'border-brand bg-brand' : 'border-line bg-paper-2'

          return (
            <li key={s.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
              <div className="relative flex w-4 justify-center">
                <span className={`z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${dot}`} />
                {i < steps.length - 1 && (
                  <span className="absolute left-1/2 top-1.5 h-full w-px -translate-x-1/2 bg-line" />
                )}
              </div>

              <div className="min-w-0 pb-6 last:pb-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display text-[14.5px] font-bold leading-snug text-ink">
                    {s.label}
                  </p>
                  <p
                    className={`tabular text-[12.5px] font-semibold ${
                      current ? 'text-brand' : 'text-ink-3'
                    }`}
                  >
                    {compDate(s.date)}
                  </p>
                </div>
                {s.body && (
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{s.body}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Faqs({ meta }: { meta: CompetitionMeta }) {
  return (
    <section id="faqs" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-3`}>Frequently Asked Questions</h2>

      <div className="flex flex-col">
        {meta.faqs.map((f) => (
          <details key={f.question} className="group border-b border-line-soft last:border-b-0">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 py-4
                         text-[14px] font-semibold text-ink marker:hidden
                         hover:text-brand [&::-webkit-details-marker]:hidden"
            >
              <span className="min-w-0">{f.question}</span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-brand transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-4 pr-6 text-[13.5px] leading-relaxed text-ink-2">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Participants({
  competition,
  meta,
}: {
  competition: CompetitionDetail
  meta: CompetitionMeta
}) {
  return (
    <section id="participants" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-5`}>Participants</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-card border border-line bg-paper-3 p-5 text-center">
          <span className="chip-icon mx-auto mb-3 h-11 w-11 rounded-full bg-brand-soft text-brand">
            <Icon name="users" className="h-5 w-5" />
          </span>
          <p className="tabular font-display text-[26px] font-bold leading-none text-ink">
            {participantsLabel(competition.participants)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-3">Registered so far</p>
        </div>

        <div className="min-w-0 rounded-card border border-line bg-paper-3 p-5 text-center">
          <span className="chip-icon mx-auto mb-3 h-11 w-11 rounded-full bg-brand-soft text-brand">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <p className="tabular font-display text-[26px] font-bold leading-none text-ink">
            {competition.juryCount > 0 ? competition.juryCount : '—'}
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-3">Jury seats on the panel</p>
        </div>
      </div>

      {meta.eligibility.length > 0 && (
        <p className="mt-5 text-[13px] leading-relaxed text-ink-3">
          Open to {meta.eligibility.map((e) => e.title.toLowerCase()).join(', ')}. Individual
          names are not published — every entry is judged anonymously, and only the winning
          entries are credited once the results are out.
        </p>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Gallery and share
// ═══════════════════════════════════════════════════════════

function Gallery({ title, photos }: { title: string; photos: string[] }) {
  return (
    <section id="gallery" className="card scroll-mt-24 p-5 lg:p-6">
      <h2 className={`${SECTION_TITLE} mb-2`}>Gallery</h2>
      {/* Said plainly, because a gallery on a competition page reads as
          winning entries and these are not that. */}
      <p className="mb-5 text-[13px] text-ink-3">
        Context photographs issued with the brief. Winning entries are published here once
        the results are announced.
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((src, i) => (
          <li
            key={src}
            className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg bg-paper-3"
          >
            <Image
              src={src}
              alt={`${title} — photograph ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ShareCard({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} — ${url}`)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'Email', href: `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${url}`)}` },
  ]

  return (
    <section id="share" className="card scroll-mt-24 p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Share this Competition</h2>

      <ul className="flex flex-wrap gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper-2
                         px-3.5 py-2 text-[12.5px] font-semibold text-ink-2
                         transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Sidebar
// ═══════════════════════════════════════════════════════════

/**
 * Entries and the result.
 *
 * This is the half of a competition the PDF never specified: how many
 * designers have answered the brief, who won, and the way in for a designer
 * who wants to answer it too. It sits above the status card because it is the
 * only thing on the page a designer can act on.
 */
function EntryCard({
  competitionId,
  count,
  winner,
  gate,
  signedIn,
  loginHref,
}: {
  competitionId: string
  count: number
  winner: Awaited<ReturnType<typeof publicEntryInfo>>['winner']
  gate: { open: true } | { open: false; reason: string }
  signedIn: boolean
  loginHref: string
}) {
  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Entries</h2>

      <div className="flex items-baseline gap-2">
        <span className="tabular font-display text-[28px] font-bold leading-none text-ink">
          {count}
        </span>
        <span className="text-[13px] text-ink-3">
          design{count === 1 ? '' : 's'} submitted
        </span>
      </div>

      {winner && (
        <div className="mt-4 rounded-lg border border-ok/25 bg-ok-soft px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ok">
            <Icon name="star" className="h-3.5 w-3.5" />
            {ENTRY_STATUS_LABEL.WINNER}
          </p>
          <p className="mt-1.5 font-display text-[14.5px] font-bold text-ink">
            {winner.title}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            by {winner.designer.name ?? 'a designer'}
            {winner.designer.city ? ` · ${winner.designer.city}` : ''}
          </p>
        </div>
      )}

      <div className="mt-4">
        {gate.open ? (
          <Link
            href={`/dashboard/competitions/${competitionId}/submit`}
            className="btn-primary w-full"
          >
            Submit your design
          </Link>
        ) : !signedIn ? (
          <>
            <Link href={loginHref} className="btn-primary w-full">
              Sign in to submit
            </Link>
            <p className="mt-2.5 text-center text-[12px] leading-relaxed text-ink-3">
              {gate.reason}
            </p>
          </>
        ) : (
          <p className="rounded-lg border border-line bg-paper-3 px-3.5 py-3 text-center text-[12.5px] leading-relaxed text-ink-3">
            {gate.reason}
          </p>
        )}
      </div>
    </section>
  )
}

function StatusCard({
  competition,
  signedIn,
  loginHref,
  gate,
  submitHref,
}: {
  competition: CompetitionDetail
  signedIn: boolean
  loginHref: string
  gate: { open: true } | { open: false; reason: string }
  submitHref: string
}) {
  const status = competitionStatus(competition)

  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4`}>Competition Status</h2>

      <div className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-3 ${status.band}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
        <span className="min-w-0 text-[13.5px] font-semibold">{status.label}</span>
      </div>

      {status.key !== 'CLOSED' && status.daysLeft > 0 && (
        <p className="mt-2.5 text-[12.5px] text-ink-3">
          {status.daysLeft} {status.daysLeft === 1 ? 'day' : 'days'} left to register.
        </p>
      )}

      <dl className="mt-4 flex flex-col divide-y divide-line-soft border-t border-line-soft pt-1">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="min-w-0 text-[13px] text-ink-3">Registration Fee</dt>
          <dd className="tabular shrink-0 font-display text-[15px] font-bold text-ink">
            {competition.isPaid && competition.fee > 0 ? formatINR(competition.fee) : 'Free'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="min-w-0 text-[13px] text-ink-3">Prize Pool</dt>
          <dd className="tabular shrink-0 font-display text-[15px] font-bold text-ink">
            {competition.prize > 0 ? formatINR(competition.prize) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <RegisterButton
          closed={status.key === 'CLOSED'}
          signedIn={signedIn}
          loginHref={loginHref}
          gate={gate}
          submitHref={submitHref}
          className="w-full"
        />
      </div>

      {!signedIn ? (
        <p className="mt-3 text-center text-[12.5px] text-ink-3">
          Already registered?{' '}
          <Link href={loginHref} className="font-semibold text-brand hover:text-brand-hover">
            Login Here
          </Link>
        </p>
      ) : (
        status.key !== 'CLOSED' && !gate.open && (
          <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-3">{gate.reason}</p>
        )
      )}
    </section>
  )
}

function ImportantDates({
  competition,
  meta,
}: {
  competition: CompetitionDetail
  meta: CompetitionMeta
}) {
  const now = new Date()

  const rows: { label: string; date: Date | null }[] = [
    { label: 'Registration Starts', date: meta.registrationStartsAt },
    { label: 'Registration Ends', date: competition.registrationEnds },
    { label: 'Query Deadline', date: meta.queryDeadlineAt },
    { label: 'Submission Ends', date: competition.submissionEnds },
    { label: 'Winners Announced', date: meta.resultsAt },
  ].filter((r) => r.date !== null)

  if (rows.length === 0) return null

  const nextIndex = rows.findIndex((r) => r.date !== null && r.date >= now)

  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4 flex items-center gap-2`}>
        <CalendarIcon className="h-[18px] w-[18px] text-brand" />
        Important Dates
      </h2>

      <ol className="flex flex-col">
        {rows.map((r, i) => {
          const past = r.date !== null && r.date < now
          const current = i === nextIndex
          const dot = past ? 'bg-ok' : current ? 'bg-brand' : 'bg-line'

          return (
            <li key={r.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
              <div className="relative flex w-3 justify-center">
                <span className={`z-10 mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                {i < rows.length - 1 && (
                  <span className="absolute left-1/2 top-2 h-full w-px -translate-x-1/2 bg-line" />
                )}
              </div>

              <div className="flex min-w-0 items-baseline justify-between gap-3 pb-4 last:pb-0">
                <span
                  className={`min-w-0 truncate text-[13px] ${
                    current ? 'font-semibold text-ink' : 'text-ink-2'
                  }`}
                >
                  {r.label}
                </span>
                <span className="tabular shrink-0 text-[12.5px] font-semibold text-ink-3">
                  {compDateShort(r.date)}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-1 text-[11.5px] text-ink-4">
        All dates are {competition.registrationEnds?.getFullYear() ?? new Date().getFullYear()},
        Indian Standard Time.
      </p>
    </section>
  )
}

function PrizePool({ competition }: { competition: CompetitionDetail }) {
  const prizes = competition.meta.prizes

  return (
    <section className="card p-5">
      <h2 className={`${SECTION_TITLE} mb-4 flex items-center gap-2`}>
        <TrophyIcon className="h-[18px] w-[18px] text-brand" />
        Prize Pool
      </h2>

      <div className="rounded-card border border-brand-border bg-brand-soft p-4 text-center">
        <p className="tabular font-display text-[26px] font-bold leading-none text-ink">
          {formatINR(competition.prize)}
        </p>
        <p className="mt-1.5 text-[12px] text-ink-3">Total prize money</p>
      </div>

      {prizes.length > 0 && (
        <dl className="mt-4 flex flex-col divide-y divide-line-soft">
          {prizes.map((p) => (
            <div key={p.place} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="min-w-0 truncate text-[13px] text-ink-2">{p.place}</dt>
              <dd className="tabular shrink-0 text-[13.5px] font-bold text-ink">
                {formatINR(p.amount)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
