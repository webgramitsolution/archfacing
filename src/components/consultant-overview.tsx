import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from './ui'
import { cn } from '@/lib/utils'
import type { ConsultantOverviewData } from '@/lib/consultant-overview'

/** What a consultant plan includes — published copy, not per-user data. */
const PLAN_PERKS = [
  'Lead Access in PACT Area',
  'Unlimited Consultations',
  'Priority Listing in Search',
  'Profile Highlight',
  'Verified Badge',
]

/**
 * The Consultant dashboard home — an exact replica of the supplied reference.
 *
 * ★ Server Component, no client JavaScript. The two charts (the Leads donut
 *   and the Earnings line) are plain inline SVG, so nothing hydrates.
 *
 * ★ The reader's real name drives the welcome; every figure below it
 *   (enquiry counts, earnings, the visitor list) is STATIC design content,
 *   marked so, standing in until each is wired to its own model. None of it
 *   is read from the database — it is the reference's content, reproduced.
 */

// ─────────────────────────────────────────────────────────────
//  Static design content — the reference's figures, verbatim.
// ─────────────────────────────────────────────────────────────

/** The shape a stat tile takes. Values come from . */
export type StatTileProps = {
  icon: IconName
  label: string
  value: string
  delta: string
  tint: string
  fg: string
  rating?: boolean
}

// The right-rail welcome banner photograph — a real, allowed ImageKit image.
const BANNER =
  'https://ik.imagekit.io/archfacing/membership%20banner%20002.png?updatedAt=1784623300050'

// ─────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────

export function ConsultantOverview({
  user,
  d,
}: {
  user: { name?: string | null }
  /** Real figures for THIS consultant — see `lib/consultant-overview.ts`. */
  d: ConsultantOverviewData
}) {
  const firstName = (user.name ?? 'Consultant').trim()

  // Built from the consultant's own rows. A figure the platform cannot yet
  // measure prints "—" rather than a number nobody produced.
  const stats: StatTileProps[] = [
    { icon: 'inbox', label: 'Total Enquiries', value: String(d.stats.enquiries), delta: '', tint: 'bg-info/10', fg: 'text-info' },
    { icon: 'phone', label: 'Consultation Requests', value: String(d.stats.consultations), delta: '', tint: 'bg-[#7C3AED]/10', fg: 'text-[#7C3AED]' },
    { icon: 'map', label: 'Active Leads (PACT)', value: String(d.stats.pactLeads), delta: '', tint: 'bg-ok/10', fg: 'text-ok' },
    { icon: 'building', label: 'Projects Associated', value: String(d.stats.projects), delta: '', tint: 'bg-brand/10', fg: 'text-brand' },
    { icon: 'tag', label: 'Services Listed', value: String(d.stats.services), delta: '', tint: 'bg-pact/10', fg: 'text-pact' },
    {
      icon: 'star', label: 'Profile Rating',
      value: d.stats.rating == null ? '—' : d.stats.rating.toFixed(1),
      delta: d.stats.reviewCount > 0 ? `${d.stats.reviewCount} reviews` : 'no reviews yet',
      tint: 'bg-gold/10', fg: 'text-gold', rating: d.stats.rating != null,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_336px]">
      {/* ═══════════ main column ═══════════ */}
      <div className="flex min-w-0 flex-col gap-5">
        <WelcomeBanner name={firstName} d={d} />

        {/* stat cards */}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <StatTile key={s.label} {...s} />
          ))}
        </ul>

        {/* Recent Enquiries + My Services */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.35fr_1fr]">
          <RecentEnquiries rows={d.enquiries} />
          <MyServices rows={d.services} />
        </div>

        {/* Leads by Source */}
        <LeadsBySource rows={d.leadSources} />

        {/*
          Earnings, appointments, profile visitors and per-service revenue used
          to be drawn here from hardcoded arrays. The platform records none of
          those yet — there is no booking, payout or visitor-tracking model —
          so rather than showing invented figures the sections are left out
          until the data behind them exists.
        */}
      </div>

      {/* ═══════════ right rail ═══════════ */}
      <aside className="flex min-w-0 flex-col gap-5">
        <ConsultantPlan plan={d.plan} />
        <MyPactArea pact={d.pact} />
        <ProfileStrength value={d.profileStrength} />
      </aside>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Shared card shell
// ─────────────────────────────────────────────────────────────

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-white shadow-card', className)}>
      {children}
    </section>
  )
}

function CardHead({
  title,
  action,
}: {
  title: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">{title}</h2>
      {action && (
        <Link href={action.href} className="text-[12px] font-semibold text-brand hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  )
}

function CardFoot({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-1.5 border-t border-line-soft py-3 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand-soft"
    >
      {label}
      <Icon name="arrow" className="h-3.5 w-3.5" />
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
//  Welcome banner
// ─────────────────────────────────────────────────────────────

function WelcomeBanner({ name, d }: { name: string; d: ConsultantOverviewData }) {
  const chips: { icon: IconName; label: string; value: string }[] = [
    { icon: 'users', label: 'Your Plan', value: d.plan?.name ?? 'No active plan' },
    { icon: 'calendar', label: 'Member Since', value: d.plan?.memberSince ?? '—' },
    { icon: 'bell', label: 'Your PACT Area', value: d.pact ? `${d.pact.pincode} (${d.pact.label})` : 'No PACT yet' },
    { icon: 'eye', label: 'Profile Views', value: (d.plan?.profileViews ?? 0).toLocaleString('en-IN') },
  ]

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-line bg-[#FDF1E7] shadow-card">
      {/*
        Banner photo on the right, shown CLEAR — the fade lives only on the
        photo's left edge and its leftmost colour is exactly the section's
        `#FDF1E7`, so the photo dissolves into the peach with no seam and the
        right half of the image stays fully sharp.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[56%] max-w-[620px]">
        <Image src={BANNER} alt="" fill unoptimized className="object-cover object-center" />
        <span className="absolute inset-0 bg-[linear-gradient(90deg,#FDF1E7_0%,rgba(253,241,231,0.85)_26%,rgba(253,241,231,0)_64%)]" />
      </div>

      <div className="px-6 py-6">
        <p className="text-[13px] text-ink-3">Welcome back,</p>
        <h1 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
          {name}! <span className="align-middle">👋</span>
        </h1>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-ink-2">
          Manage your consulting services, leads and grow your business with ArchFacing.
        </p>

        <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          {chips.map((c) => (
            <li key={c.label} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-brand ring-1 ring-brand-border">
                <Icon name={c.icon} className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] text-ink-3">{c.label}</span>
                <span className="block text-[13px] font-bold text-ink">{c.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  Stat tiles
// ─────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  delta,
  tint,
  fg,
  rating,
}: StatTileProps) {
  return (
    <li className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint, fg)}>
          <Icon name={icon} className="h-[17px] w-[17px]" />
        </span>
        <p className="min-w-0 truncate text-[11.5px] font-medium text-ink-3">{label}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="tabular font-display text-[26px] font-bold leading-none text-ink">{value}</span>
        {rating && <Stars value={4.8} />}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-ok">
        <Icon name="trending" className="h-3.5 w-3.5" />
        {delta}
      </p>
    </li>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          className={cn('h-3.5 w-3.5', i <= Math.round(value) ? 'text-gold' : 'text-line')}
        />
      ))}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
//  Recent Enquiries
// ─────────────────────────────────────────────────────────────

function RecentEnquiries({ rows }: { rows: ConsultantOverviewData['enquiries'] }) {
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHead title="Recent Enquiries" action={{ label: 'View All', href: '/dashboard/consultant/enquiries' }} />
        <p className="flex-1 px-5 py-10 text-center text-[12.5px] text-ink-3">
          No enquiries yet. They arrive here once you hold a PACT for your area.
        </p>
      </Card>
    )
  }
  return (
    <Card className="flex flex-col">
      <CardHead title="Recent Enquiries" action={{ label: 'View All', href: '/dashboard/consultant/enquiries' }} />
      <ul className="mt-3 flex-1 divide-y divide-line-soft">
        {rows.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-paper-3 text-ink-3">
              <Icon name="building" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{e.title}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                {e.cat} <span className="text-line">•</span> {e.place}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="whitespace-nowrap text-[11px] text-ink-4">{e.ago}</span>
              <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-semibold', e.tone)}>
                {e.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <CardFoot label="View All Enquiries" href="/dashboard/consultant/enquiries" />
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
//  My Services
// ─────────────────────────────────────────────────────────────

function MyServices({ rows }: { rows: ConsultantOverviewData['services'] }) {
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHead title="My Services" />
        <p className="flex-1 px-5 py-10 text-center text-[12.5px] text-ink-3">
          You have not listed a service yet.
        </p>
      </Card>
    )
  }
  return (
    <Card className="flex flex-col">
      <CardHead title="My Services" />
      <ul className="mt-3 flex-1 divide-y divide-line-soft">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Icon name="file" className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{s.title}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{s.price}</p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-pill px-2.5 py-0.5 text-[10.5px] font-semibold',
                s.active ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3'
              )}
            >
              {s.active ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
      {/* No "View All Services" link — /dashboard/consultant/services is not
          built yet (it carries `soon` in the nav), so linking here 404s. */}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
//  Leads by Source (donut)
// ─────────────────────────────────────────────────────────────

function LeadsBySource({ rows }: { rows: ConsultantOverviewData["leadSources"] }) {
  const total = rows.reduce((n, s) => n + s.value, 0)
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">Leads by Source</h2>
        <span className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-3">
          This Month
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 px-5 py-5 sm:flex-row sm:items-center">
        <Donut segments={rows} centerTop={String(total)} centerBottom="Total Leads" />
        <ul className="min-w-0 flex-1 space-y-2.5">
          {rows.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-2">{s.label}</span>
              <span className="tabular shrink-0 font-semibold text-ink">{s.value}</span>
              <span className="tabular w-10 shrink-0 text-right text-ink-3">({s.pct}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function Donut({
  segments,
  centerTop,
  centerBottom,
}: {
  segments: { pct: number; color: string }[]
  centerTop: string
  centerBottom: string
}) {
  const r = 54
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative h-[140px] w-[140px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F1F5F9" strokeWidth="16" />
        {segments.map((s, i) => {
          const len = (s.pct / 100) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-display text-[26px] font-bold leading-none text-ink">{centerTop}</span>
        <span className="mt-1 text-[10.5px] text-ink-3">{centerBottom}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Consultation Requests
// ─────────────────────────────────────────────────────────────

function ConsultantPlan({ plan }: { plan: ConsultantOverviewData['plan'] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-dark p-5 text-white shadow-card">
      <p className="text-[13px] font-semibold text-white/80">Consultant Plan</p>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C3AED] text-white">
          <Icon name="award" className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-[15px] font-bold">{plan?.name ?? 'No active plan'}</span>
          <span className="block text-[11px] text-white/60">{plan?.validTill ? `Valid till ${plan.validTill}` : 'Buy a plan to unlock more'}</span>
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {PLAN_PERKS.map((p) => (
          <li key={p} className="flex items-center gap-2 text-[12.5px] text-white/85">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ok/20 text-ok">
              <Icon name="check" className="h-3 w-3" />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/club"
        className="mt-5 flex items-center justify-center rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Upgrade / Renew Plan
      </Link>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  My PACT Area
// ─────────────────────────────────────────────────────────────

function MyPactArea({ pact }: { pact: ConsultantOverviewData['pact'] }) {
  /*
   * The reference draws a Professionals / BMFs / Clients breakdown of the
   * territory here. Those counts are not derivable yet — the platform does not
   * index members by PACT area — so the panel shows the territory itself
   * rather than three invented numbers.
   */
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-ink-3">My PACT Area</p>
          <p className="mt-0.5 truncate font-display text-[15px] font-bold text-ink">
            {pact ? `${pact.pincode} (${pact.label})` : 'No PACT territory yet'}
          </p>
        </div>
        <Link
          href="/dashboard/consultant/pact"
          className="shrink-0 rounded-lg border border-brand-border px-2.5 py-1 text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          {pact ? 'Change Area' : 'Buy PACT'}
        </Link>
      </div>
      {!pact && (
        <p className="mt-3 text-[12px] leading-snug text-ink-3">
          A PACT gives you exclusive rights over a PIN code — every enquiry from that area is routed to you.
        </p>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
//  Profile Strength
// ─────────────────────────────────────────────────────────────

function ProfileStrength({ value }: { value: number }) {
  const pct = value
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <Card className="p-5">
      <p className="font-display text-[14px] font-bold text-ink">Profile Strength</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#16A34A"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * c} ${c}`}
            />
          </svg>
          <span className="tabular absolute inset-0 flex items-center justify-center font-display text-[16px] font-bold text-ink">
            {pct}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] leading-relaxed text-ink-2">
            Great job! Your profile is almost complete.
          </p>
          <Link
            href="/dashboard/consultant/profile"
            className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
          >
            Improve Profile
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
//  Recent Profile Visitors
