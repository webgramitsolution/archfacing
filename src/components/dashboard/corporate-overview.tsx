import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { getActiveMembership } from '@/lib/club'
import {
  PROFILE_STRENGTH_SELECT, corporateStrengthOf, strengthNote,
} from '@/lib/profile-strength'
import {
  Panel, StatTile, Donut, DonutLegend, RailCard, type Slice,
  pretty, label, ago, formatHours, monthNote, BannerMeta, EmptyRow,
} from './overview-parts'
import { LineChart, ChartTotals, type Point } from './line-chart'

/**
 * The Corporate dashboard home, laid out as the reference draws it: a welcome
 * banner with four facts, six stat tiles, recent enquiries beside a products
 * donut, a projects breakdown beside a six-month leads trend, and a right rail
 * carrying the plan, the PACT area, activity and notifications.
 *
 * A Corporate account is a catalogue business — it lists products and projects
 * and takes leads against them — so everything here is counted from its own
 * postings and the enquiries routed to it. Nothing on this page reads another
 * company's rows: every query is scoped by `authorId` or `holderId`.
 *
 * ⚠️ Two figures the reference shows have nothing behind them yet, and are
 *    drawn as the empty states they honestly are rather than filled with
 *    invented numbers — the same call already made on the Professional and
 *    BMF dashboards:
 *
 *    · Brand Impressions — there is no impression or view-tracking model.
 *      `Post.viewCount` is incremented in exactly one route (Around Us) and
 *      never for a PRODUCT, so summing it would return the seed literal
 *      forever.
 *    · Profile Rating — there is no review model anywhere in the schema. The
 *      4.x figures in the product seed are constants in a JSON blob; showing
 *      one would be displaying a seed literal as if it were earned.
 */

/** The posting pipeline, in the order the reference's legends read. */
const POST_PIPELINE: { status: string; legend: string; color: string }[] = [
  { status: 'PUBLISHED', legend: 'Published', color: '#16A34A' },
  { status: 'PENDING_REVIEW', legend: 'In Review', color: '#3B82F6' },
  { status: 'DRAFT', legend: 'Draft', color: '#F59E0B' },
  { status: 'REJECTED', legend: 'Rejected', color: '#DC2626' },
]

const ENQUIRY_TONE: Record<string, string> = {
  NEW: 'pill-brand',
  IN_PROGRESS: 'pill-warn',
  RESPONDED: 'pill-info',
  CONVERTED: 'pill-ok',
  CLOSED: 'pill-muted',
}

/** The plan lines the reference lists under the plan name. */
const PLAN_FEATURES = [
  'Unlimited Products',
  'Unlimited Projects',
  'Priority Listing in Search',
  'Bulk Upload & Management',
  'Corporate Branding',
  'Verified Corporate Badge',
]

export async function CorporateOverview({ userId }: { userId: string }) {
  const base = '/dashboard/corporate'

  /*
   * The window the chart covers: the first day of the month five months back,
   * so the series is six months ending with the current one.
   */
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const mine = { authorId: userId, deletedAt: null }

  const [
    user, membership, products, projects, enquiries, notes, areaCounts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        // `PROFILE_STRENGTH_SELECT` spread in so the completion figure is
        // read from exactly the fields it is counted over.
        ...PROFILE_STRENGTH_SELECT,
        createdAt: true, profilePhoto: true,
        corporateProfile: {
          select: {
            companyName: true, companyLogo: true, website: true, isVerified: true,
            productCategories: true, gstNumber: true, panNumber: true,
            freePostingsTotal: true, freePostingsUsed: true,
          },
        },
        pacts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { pincode: true, city: true, serviceType: true, status: true, expiresAt: true },
        },
        _count: { select: { enquiriesRecvd: true } },
      },
    }),

    getActiveMembership(userId),

    prisma.post.findMany({
      where: { ...mine, type: 'PRODUCT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, title: true, status: true, meta: true, media: { take: 1, select: { url: true } } },
    }),

    prisma.post.findMany({
      where: { ...mine, type: 'PROJECT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, title: true, status: true, media: { take: 1, select: { url: true } } },
    }),

    prisma.enquiry.findMany({
      where: { holderId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, subject: true, contactName: true, pincode: true, budget: true,
        status: true, createdAt: true, respondedAt: true, pactId: true,
      },
    }),

    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, body: true, isRead: true, createdAt: true },
    }),

    prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null, status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ])

  if (!user) return null

  const company = user.corporateProfile
  const pact = user.pacts[0]

  // ─── postings ───
  const countBy = (rows: { status: string }[], status: string) =>
    rows.filter((r) => r.status === status).length

  const productSlices: Slice[] = POST_PIPELINE.map((p) => ({
    label: p.legend,
    value: countBy(products, p.status),
    color: p.color,
  })).filter((s) => s.value > 0)

  const projectSlices: Slice[] = POST_PIPELINE.map((p) => ({
    label: p.legend,
    value: countBy(projects, p.status),
    color: p.color,
  })).filter((s) => s.value > 0)

  const publishedProjects = countBy(projects, 'PUBLISHED')

  // ─── enquiries ───
  const recent = enquiries.slice(0, 5)
  const pactLeads = enquiries.filter((e) => e.pactId !== null).length
  const converted = enquiries.filter((e) => e.status === 'CONVERTED').length
  const responded = enquiries.filter((e) => e.respondedAt !== null)

  const thisMonth = enquiries.filter((e) => e.createdAt >= monthStart).length
  const lastMonth = enquiries.filter(
    (e) => e.createdAt >= lastMonthStart && e.createdAt < monthStart
  ).length

  const conversionRate =
    enquiries.length > 0 ? Math.round((converted / enquiries.length) * 100) : null

  const avgResponseHrs =
    responded.length > 0
      ? responded.reduce(
          (sum, e) => sum + (e.respondedAt!.getTime() - e.createdAt.getTime()) / 3_600_000,
          0
        ) / responded.length
      : null

  /** Six buckets, oldest first — the trend line under "Leads Trend". */
  const points: Point[] = Array.from({ length: 6 }, (_, i) => {
    const from = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1)
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1)
    return {
      label: from.toLocaleDateString('en-IN', { month: 'short' }),
      value: enquiries.filter((e) => e.createdAt >= from && e.createdAt < to).length,
    }
  })

  // ─── the PACT area counts ───
  const inArea = (roles: string[]) =>
    areaCounts.filter((r) => roles.includes(r.role)).reduce((n, r) => n + r._count._all, 0)

  /*
   * The same figure the sidebar shows, from the same field list — see
   * `corporateStrengthOf`. Computing it here from a list of this card's own
   * was exactly the bug that file was written to end: one screen, two numbers
   * both labelled profile completion, disagreeing with each other.
   */
  const completion = corporateStrengthOf(user, company)

  const activeDays = Math.max(
    1,
    Math.round((Date.now() - user.createdAt.getTime()) / 86_400_000)
  )

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* ═══════════ main column ═══════════ */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* ─── welcome banner ─── */}
        <section className="relative overflow-hidden rounded-xl border border-line bg-paper-2">
          <div className="relative z-10 w-full px-6 py-3.5 md:w-[56%] lg:px-7 lg:py-4">
            <p className="text-[13px] font-medium text-ink">Welcome back,</p>
            <h1 className="mt-0.5 font-display text-[21px] font-bold leading-tight tracking-tight text-ink">
              {company?.companyName ?? user.name ?? 'there'} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
              Manage your catalogue, generate quality leads and grow your brand with ArchFacing.
            </p>

            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 lg:mt-3.5">
              <BannerMeta
                icon="calendar" tone="text-brand" label="Member Since"
                value={user.createdAt.toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
              <BannerMeta
                icon="map" tone="text-info" label="Your PACT Area"
                value={pact ? pact.pincode : 'None yet'}
              />
              <BannerMeta
                icon="star" tone="text-brand" label="Membership Plan"
                value={membership?.planName ?? 'No plan yet'}
              />
              <BannerMeta
                icon="clock" tone="text-ok" label="Active Since"
                value={`${activeDays} ${activeDays === 1 ? 'Day' : 'Days'}`}
              />
            </dl>
          </div>

          {/*
            The photograph and its fade are ONE background on ONE element,
            layered — gradient first, picture behind it. Two elements is what
            put a vertical seam down the middle of an earlier banner: whichever
            box carried the fade, its left edge was a place where the paint
            began, and that edge showed.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{
              backgroundImage:
                'linear-gradient(to right, #FFFFFF 0%, #FFFFFF 44%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0) 76%), ' +
                'url("https://res.cloudinary.com/c7h30ayk/image/upload/f_auto,q_auto,w_1600/v1789076060/profetional_dashboard.png")',
              backgroundSize: 'cover, cover',
              backgroundPosition: 'center, center 35%',
              backgroundRepeat: 'no-repeat, no-repeat',
            }}
          />
        </section>

        {/* ─── stat tiles ─── */}
        {/*
          Two up on a phone — the PWA reading, and six full-width cards would
          be most of a screen each. 3 x 2 on a tablet; six across only on a
          full desktop, which is `wide` (1440) and never `2xl` — a 1536 monitor
          reports about 1520 of viewport once the scrollbar is off.
        */}
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 wide:grid-cols-6">
          <li>
            <StatTile
              icon="map" label="Total Leads (PACT)" value={String(pactLeads)}
              note={pact ? `Routed to ${pact.pincode}` : 'Buy a PACT to receive leads'}
            />
          </li>
          <li>
            <StatTile
              icon="inbox" tone="info" label="Enquiries Received"
              value={String(user._count.enquiriesRecvd)}
              note="PACT leads plus anything assigned to you"
            />
          </li>
          <li>
            <StatTile
              icon="box" tone="warn" label="Products Listed" value={String(products.length)}
              note={`${countBy(products, 'PUBLISHED')} published`}
            />
          </li>
          <li>
            <StatTile
              icon="file" tone="ok" label="Projects Published" value={String(publishedProjects)}
              note={`${projects.length} in total`}
            />
          </li>
          {/* The reference's last two. Nothing produces either number yet. */}
          <li>
            <StatTile icon="chart" label="Brand Impressions" value="—"
              note="Impressions are not tracked yet" />
          </li>
          <li>
            <StatTile icon="star" label="Profile Rating" value="—"
              note="Ratings open once reviews are built" />
          </li>
        </ul>

        {/* ─── recent enquiries + products overview ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Recent Enquiries" action={{ label: 'View All', href: `${base}/enquiries` }}>
            {recent.length === 0 ? (
              <EmptyRow>
                No enquiries yet. Requirements raised against your products and
                projects, and anything routed through your PACT, land here.
              </EmptyRow>
            ) : (
              <ul className="divide-y divide-line-soft">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={`chip-icon mt-0.5 h-9 w-9 shrink-0 ${
                        e.pactId ? 'bg-brand-soft text-brand' : 'bg-paper-3 text-ink-3'
                      }`}
                      title={e.pactId ? 'Routed through your PACT' : 'Assigned to you'}
                    >
                      <Icon name={e.pactId ? 'map' : 'user'} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {e.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                        {e.contactName} · {e.pincode}
                        {e.budget ? ` · ₹${Number(e.budget).toLocaleString('en-IN')}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="whitespace-nowrap text-[11px] text-ink-4">
                        {ago(e.createdAt)}
                      </span>
                      {e.status === 'NEW' ? (
                        <Link
                          href={`${base}/enquiries`}
                          className="rounded-md border border-brand px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                        >
                          Respond
                        </Link>
                      ) : (
                        <span className={ENQUIRY_TONE[e.status] ?? 'pill-muted'}>
                          {e.status === 'CONVERTED' ? 'Won' : pretty(e.status)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Products Overview" action={{ label: 'View All Products', href: `${base}/products` }}>
            {products.length === 0 ? (
              <EmptyRow>
                No products yet. Add your catalogue and it appears on the public
                Products pages once the ArchFacing team approves it.
              </EmptyRow>
            ) : (
              <div className="px-5 py-5">
                <div className="flex flex-wrap items-center gap-5">
                  <Donut slices={productSlices} total={products.length} caption="Total Products" />
                  <div className="min-w-0 flex-1">
                    <DonutLegend slices={productSlices} total={products.length} />
                  </div>
                </div>

                <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {products.slice(0, 5).map((p) => (
                    <li key={p.id} className="min-w-0">
                      <Link href={`${base}/products`} className="group block min-w-0">
                        <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-paper-3">
                          {p.media[0]?.url && (
                            <Image
                              src={p.media[0].url}
                              alt=""
                              fill
                              sizes="90px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                        </span>
                        <span className="mt-1.5 block truncate text-[11.5px] font-semibold text-ink">
                          {p.title}
                        </span>
                        <span className="block truncate text-[10.5px] text-ink-4">
                          {pretty(p.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        {/* ─── projects performance + leads trend ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Projects Performance" action={{ label: 'View All Projects', href: `${base}/projects` }}>
            {projects.length === 0 ? (
              <EmptyRow>
                No projects yet. Publish your completed work and it appears on
                the public Projects pages.
              </EmptyRow>
            ) : (
              <div className="px-5 py-5">
                <div className="flex flex-wrap items-center gap-5">
                  <Donut slices={projectSlices} total={projects.length} caption="Total Projects" />
                  <div className="min-w-0 flex-1">
                    <DonutLegend slices={projectSlices} total={projects.length} />
                  </div>
                </div>

                <p className="mt-5 text-[11.5px] font-semibold text-ink-3">
                  Top Performing Projects
                </p>
                <ul className="mt-2.5 grid grid-cols-3 gap-3">
                  {projects.slice(0, 3).map((p) => (
                    <li key={p.id} className="min-w-0">
                      <Link href={`${base}/projects`} className="group block min-w-0">
                        <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-paper-3">
                          {p.media[0]?.url && (
                            <Image
                              src={p.media[0].url}
                              alt=""
                              fill
                              sizes="120px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                        </span>
                        <span className="mt-1.5 block truncate text-[11.5px] font-semibold text-ink">
                          {p.title}
                        </span>
                        <span className="block truncate text-[10.5px] text-ink-4">
                          {pretty(p.status)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Leads Trend (Last 6 Months)" action={{ label: 'All Enquiries', href: `${base}/enquiries` }}>
            <div className="px-5 py-5">
              <LineChart points={points} height={148} />
              <div className="mt-5">
                <ChartTotals
                  items={[
                    {
                      label: 'Total Leads',
                      value: String(enquiries.length),
                      note: monthNote(thisMonth, lastMonth),
                    },
                    { label: 'This Month', value: String(thisMonth) },
                    { label: 'Converted', value: String(converted) },
                    {
                      label: 'Conversion Rate',
                      value: conversionRate === null ? '—' : `${conversionRate}%`,
                      note:
                        avgResponseHrs === null
                          ? 'No replies yet'
                          : `Avg. reply ${formatHours(avgResponseHrs)}`,
                    },
                  ]}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ═══════════ right rail ═══════════ */}
      <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
        {/* plan */}
        <section className="rounded-xl bg-navy p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">
            Corporate Plan
          </p>

          <div className="mt-3 flex items-start gap-3">
            <span className="chip-icon h-10 w-10 shrink-0 bg-white/10 text-brand">
              <Icon name="award" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[16px] font-bold leading-tight">
                {membership?.planName ?? 'No plan yet'}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-white/55">
                {membership
                  ? `Valid till ${membership.expiresAt.toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}`
                  : 'Choose a plan to unlock the catalogue tools'}
              </span>
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-white/80">
                <Icon
                  name="check"
                  className={`mt-px h-3.5 w-3.5 shrink-0 ${membership ? 'text-ok' : 'text-white/25'}`}
                />
                {f}
              </li>
            ))}
          </ul>

          <Link href="/dashboard/club" className="btn-primary mt-4 w-full">
            {membership ? 'Upgrade / Renew Plan' : 'See the plans'}
          </Link>
        </section>

        {/* PACT */}
        <RailCard
          title="Your PACT Area"
          action={
            <Link href={`${base}/pact`} className="text-[11.5px] font-semibold text-brand hover:underline">
              {pact ? 'Change Area' : 'Buy'}
            </Link>
          }
        >
          {pact ? (
            <>
              <p className="font-display text-[15px] font-bold text-ink">
                {pact.pincode}
                {pact.city ? <span className="text-ink-3"> · {pact.city}</span> : null}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-3">
                {label(pact.serviceType)} ·{' '}
                <span className={pact.status === 'ACTIVE' ? 'text-ok' : 'text-warn'}>
                  {pretty(pact.status)}
                </span>
                {pact.expiresAt
                  ? ` · till ${pact.expiresAt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
                  : ''}
              </p>

              <ul className="mt-3.5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-center">
                {[
                  ['Professionals', inArea(['PROFESSIONAL', 'CONSULTANT'])],
                  ['BMFs', inArea(['BMF'])],
                  ['Clients', inArea(['CLIENT'])],
                ].map(([t, n]) => (
                  <li key={String(t)} className="bg-paper-2 px-1 py-2">
                    <span className="tabular block font-display text-[15px] font-bold text-ink">
                      {n}
                    </span>
                    <span className="block text-[9.5px] text-ink-4">{t}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              You do not hold a PACT yet. Every enquiry from a PIN code is
              routed to the member who holds it.
            </p>
          )}
        </RailCard>

        {/* profile completion — the reference's left-rail meter, kept with the
            other company facts rather than floating above the menu */}
        <RailCard
          title="Profile Completion"
          tone={completion < 100 ? 'info' : 'plain'}
          action={
            <Link href={`${base}/profile`} className="text-[11.5px] font-semibold text-brand hover:underline">
              Edit
            </Link>
          }
        >
          <div className="flex items-center gap-3">
            <span className="tabular font-display text-[20px] font-bold text-ink">
              {completion}%
            </span>
            <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-line">
              <span
                className="block h-full rounded-pill bg-brand"
                style={{ width: `${completion}%` }}
              />
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {strengthNote(completion)}
          </p>
          <Link
            href="/designers-associates"
            className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:gap-1.5"
          >
            <Icon name="search" className="h-3.5 w-3.5" />
            View Public Profile
          </Link>
        </RailCard>

        {/* activity */}
        <RailCard
          title="Recent Activity"
          action={
            <Link href="/dashboard/notifications" className="text-[11.5px] font-semibold text-brand hover:underline">
              View All
            </Link>
          }
        >
          {notes.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">Nothing new right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notes.slice(0, 4).map((n) => (
                <li key={n.id} className="flex gap-2.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      n.isRead ? 'bg-line' : 'bg-brand'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium leading-snug text-ink-2">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-4">
                      {ago(n.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RailCard>

        {/* notifications — the unread ones, which is what "important" means
            here; anything already read is history and lives on the full page */}
        <RailCard
          title="Important Notifications"
          action={
            <Link href="/dashboard/notifications" className="text-[11.5px] font-semibold text-brand hover:underline">
              View All
            </Link>
          }
        >
          {notes.filter((n) => !n.isRead).length === 0 ? (
            <p className="text-[12.5px] text-ink-3">Nothing needs your attention.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notes.filter((n) => !n.isRead).slice(0, 4).map((n) => (
                <li key={n.id} className="flex gap-2.5">
                  <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium leading-snug text-ink-2">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-4">
                      {ago(n.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RailCard>
      </aside>
    </div>
  )
}
