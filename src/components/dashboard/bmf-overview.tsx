import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { getActiveMembership } from '@/lib/club'
import {
  Panel, StatTile, Donut, DonutLegend, RailCard, type Slice,
  pretty, label, ago, formatHours, monthNote, BannerMeta, EmptyRow,
} from './overview-parts'
import { LineChart, ChartTotals, type Point } from './line-chart'

/**
 * The BMF dashboard home, laid out as the blueprint draws it: a welcome
 * banner, six stat tiles, a leads list beside a performance chart, top
 * products beside a donut, and a right rail.
 *
 * A BMF — Building Materials Facilitator — is a lead business, not a posting
 * one. Everything here is counted from the enquiries routed to their PACT.
 *
 * ⚠️ Three things the blueprint shows have nothing behind them yet, and are
 *    drawn as the empty states they honestly are rather than filled with
 *    invented figures — the same call already made on the Professional
 *    dashboard:
 *
 *    · Profile Views — there is no view-tracking model, and no public BMF
 *      profile page to count views on. `Post.viewCount` is incremented in
 *      exactly one route (Around Us), never for a PRODUCT, so summing it
 *      would return the seed literal forever.
 *    · Rating — there is no review model anywhere in the schema. The 4.x
 *      figures in `seed-products.ts` are hardcoded constants in a JSON blob;
 *      showing one would be displaying a seed literal as if it were earned.
 *    · "Order Requests" — no per-product order or quote record exists; the
 *      Order model is the admin-seller merchandise store. What a BMF does
 *      record is an enquiry marked won, so that tile counts CONVERTED
 *      enquiries and says so.
 *
 *    The blueprint also labels the donut "Top Enquiry Categories". An
 *    Enquiry carries `serviceType` and `subCategory`, and for a PACT-routed
 *    BMF lead the first is always 'BMF' and the second always null — the
 *    public form offers a BMF no sub-category to pick. Grouping by either
 *    would draw a single slice labelled "BMF". The panel keeps its place and
 *    shows the enquiry pipeline, which is real.
 */

const PIPELINE: { status: string; label: string; color: string }[] = [
  { status: 'NEW', label: 'New', color: '#F97316' },
  { status: 'IN_PROGRESS', label: 'In progress', color: '#3B82F6' },
  { status: 'RESPONDED', label: 'Responded', color: '#6366F1' },
  { status: 'CONVERTED', label: 'Won', color: '#16A34A' },
  { status: 'CLOSED', label: 'Closed', color: '#94A3B8' },
]

const ENQUIRY_TONE: Record<string, string> = {
  NEW: 'pill-brand',
  IN_PROGRESS: 'pill-warn',
  RESPONDED: 'pill-info',
  CONVERTED: 'pill-ok',
  CLOSED: 'pill-muted',
}

export async function BmfOverview({ userId }: { userId: string }) {
  const base = '/dashboard/bmf'

  /*
   * The window the chart covers: the first day of the month five months back,
   * so the series is six months ending with the current one.
   */
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    user, pipeline, pactLeads, productByStatus, topProducts,
    leads, trend, responded, pact, membership, notes,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, createdAt: true, city: true, state: true, pincode: true,
        bmfProfile: { select: { businessName: true, isVerified: true, designaType: true } },
        _count: { select: { enquiriesRecvd: true } },
      },
    }),

    // every tile that counts enquiries comes out of this one grouping
    prisma.enquiry.groupBy({
      by: ['status'],
      where: { holderId: userId },
      _count: { _all: true },
    }),

    // leads that arrived through the PACT, rather than assigned by an RM
    prisma.enquiry.count({ where: { holderId: userId, pactId: { not: null } } }),

    prisma.post.groupBy({
      by: ['status'],
      where: { authorId: userId, type: 'PRODUCT', deletedAt: null },
      _count: { _all: true },
    }),

    prisma.post.findMany({
      where: { authorId: userId, type: 'PRODUCT', deletedAt: null },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true, slug: true, title: true, category: true, status: true,
        city: true, state: true, viewCount: true,
        media: { where: { type: 'IMAGE' }, take: 1, select: { url: true } },
      },
    }),

    prisma.enquiry.findMany({
      where: { holderId: userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, subject: true, contactName: true, pincode: true,
        budget: true, status: true, createdAt: true, pactId: true,
      },
    }),

    /*
     * The series behind the chart. Bucketed in JS rather than in SQL:
     * `groupBy: ['createdAt']` groups by exact timestamp and is useless here,
     * and a raw `date_trunc` returns nothing at all for a month with no
     * leads — which is exactly the month worth drawing.
     */
    prisma.enquiry.findMany({
      where: { holderId: userId, createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),

    // first-response latency, for the boxes under the chart
    prisma.enquiry.findMany({
      where: { holderId: userId, respondedAt: { not: null } },
      select: { createdAt: true, respondedAt: true },
    }),

    prisma.pact.findFirst({
      where: { holderId: userId, status: { in: ['ACTIVE', 'RESERVED'] } },
      orderBy: { createdAt: 'desc' },
      select: { pincode: true, city: true, serviceType: true, status: true, expiresAt: true },
    }),

    getActiveMembership(userId).catch(() => null),

    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, body: true, createdAt: true, isRead: true },
    }),
  ])

  if (!user) return null

  const enqBy = (status: string) =>
    pipeline.find((r) => r.status === status)?._count._all ?? 0

  const totalEnquiries = pipeline.reduce((s, r) => s + r._count._all, 0)
  const won = enqBy('CONVERTED')

  const slices: Slice[] = PIPELINE.map((p) => ({
    label: p.label,
    value: enqBy(p.status),
    color: p.color,
  })).filter((s) => s.value > 0)

  const productTotal = productByStatus.reduce((s, r) => s + r._count._all, 0)
  const published = productByStatus.find((r) => r.status === 'PUBLISHED')?._count._all ?? 0

  // ─── the six months, zero-filled ───
  const points: Point[] = []
  for (let i = 5; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    points.push({
      label: from.toLocaleDateString('en-IN', { month: 'short' }),
      value: trend.filter((e) => e.createdAt >= from && e.createdAt < to).length,
    })
  }

  const thisMonth = trend.filter((e) => e.createdAt >= monthStart).length
  const lastMonth = trend.filter(
    (e) => e.createdAt >= lastMonthStart && e.createdAt < monthStart
  ).length

  const responseRate =
    totalEnquiries > 0 ? Math.round((responded.length / totalEnquiries) * 100) : null

  /* Average hours from a lead arriving to the first reply on it. */
  const avgResponseHrs =
    responded.length > 0
      ? responded.reduce(
          (s, e) => s + (e.respondedAt!.getTime() - e.createdAt.getTime()),
          0
        ) /
        responded.length /
        3_600_000
      : null

  const activeDays = Math.max(
    1,
    Math.round((now.getTime() - user.createdAt.getTime()) / 86_400_000)
  )

  /*
   * Who else is registered in the PACT's PIN code — real counts against that
   * PIN, so a quiet area reads zero rather than the blueprint's 128/45/312.
   */
  const areaPin = pact?.pincode ?? user.pincode
  const areaCounts = areaPin
    ? await prisma.user.groupBy({
        by: ['role'],
        where: { pincode: areaPin, status: 'ACTIVE' },
        _count: { _all: true },
      })
    : []

  const inArea = (roles: string[]) =>
    areaCounts
      .filter((r) => roles.includes(r.role))
      .reduce((s, r) => s + r._count._all, 0)

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* ═══════════ main column ═══════════ */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* ─── welcome banner ─── */}
        <section className="relative overflow-hidden rounded-xl border border-line bg-paper-2">
          {/*
            Kept deliberately tight. The banner is a greeting, not a panel —
            every pixel it takes is a pixel the six tiles under it lose, and
            those carry the numbers. The type is a step down from the
            Professional card's for the same reason: this one carries four
            facts under the greeting rather than three.
          */}
          <div className="relative z-10 w-full px-6 py-3.5 md:w-[56%] lg:px-7 lg:py-4">
            <p className="text-[13px] font-medium text-ink">Welcome back,</p>
            <h1 className="mt-0.5 font-display text-[21px] font-bold leading-tight tracking-tight text-ink">
              {user.name ?? 'there'} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
              {user.bmfProfile?.businessName
                ? `${user.bmfProfile.businessName} — here's what's happening in your area today.`
                : "Here's what's happening in your area today."}
            </p>

            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 lg:mt-3.5">
              <BannerMeta
                icon="star"
                tone="text-brand"
                label="Your Plan"
                value={membership?.planName ?? 'No plan yet'}
              />
              <BannerMeta
                icon="map"
                tone="text-info"
                label="Your PACT Area"
                /*
                 * PIN only, no city. With "(New Delhi)" on the end this item
                 * was 142px wide and the four facts needed 479px in a 463px
                 * row — sixteen pixels short, so they wrapped to two lines
                 * and the banner grew by a third of its height for it. The
                 * city is on the PACT card in the rail either way.
                 */
                value={pact ? pact.pincode : 'None yet'}
              />
              <BannerMeta
                icon="calendar"
                tone="text-brand"
                label="Member Since"
                value={user.createdAt.toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
              <BannerMeta
                icon="clock"
                tone="text-ok"
                label="Active Since"
                value={`${activeDays} ${activeDays === 1 ? 'Day' : 'Days'}`}
              />
            </dl>
          </div>

          {/*
            The photograph and its fade are ONE background on ONE element,
            layered — gradient first, picture behind it. Two elements is what
            put a vertical line down the middle of the Professional banner:
            whichever box carried the fade, its left edge was a place where
            the paint began, and that edge showed.

            The ramp runs to 76% rather than the Professional card's 68%,
            because this banner's text block is four percentage points wider —
            it has to stay near-opaque past 56%, where the last word of the
            description sits, or the text reads over the house.
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
          be most of a screen-height each before anything else appeared.
          3 x 2 on a tablet; six across only on a full desktop, which is
          `wide` (1440) and never `2xl` — a 1536 monitor reports about 1520 of
          viewport once the scrollbar is off, so a 2xl rule never fires on it.
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
              icon="bag" tone="ok" label="Leads Won" value={String(won)}
              note={
                totalEnquiries > 0
                  ? `${Math.round((won / totalEnquiries) * 100)}% of all enquiries`
                  : 'Marked won when you close a deal'
              }
            />
          </li>
          <li>
            <StatTile
              icon="box" tone="warn" label="Products Listed" value={String(productTotal)}
              note={`${published} published`}
            />
          </li>
          {/* The blueprint's last two. Nothing produces either number yet. */}
          <li>
            <StatTile icon="search" label="Profile Views" value="—"
              note="Profile views are not tracked yet" />
          </li>
          <li>
            <StatTile icon="star" label="Rating" value="—"
              note="Ratings open once reviews are built" />
          </li>
        </ul>

        {/* ─── recent leads + performance ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Recent Leads (PACT)" action={{ label: 'View All', href: `${base}/enquiries` }}>
            {leads.length === 0 ? (
              <EmptyRow>
                No leads yet. Enquiries for building materials in your PIN code
                land here once you hold the PACT for that area.
              </EmptyRow>
            ) : (
              <ul className="divide-y divide-line-soft">
                {leads.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                    {/*
                      An enquiry carries no picture — it is a name, a PIN code
                      and a requirement. The tile marks how the lead arrived
                      instead: through the PACT, or handed over by an RM.
                    */}
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

          <Panel title="Leads Performance" action={{ label: 'All Enquiries', href: `${base}/enquiries` }}>
            <div className="px-5 py-5">
              <LineChart points={points} height={148} />
              <div className="mt-5">
                <ChartTotals
                  items={[
                    { label: 'This Month', value: String(thisMonth), note: monthNote(thisMonth, lastMonth) },
                    { label: 'Last Month', value: String(lastMonth) },
                    {
                      label: 'Response Rate',
                      value: responseRate === null ? '—' : `${responseRate}%`,
                      note: responseRate === null ? 'No leads yet' : `${responded.length} replied to`,
                    },
                    {
                      label: 'Avg. Response',
                      value: avgResponseHrs === null ? '—' : formatHours(avgResponseHrs),
                      note: avgResponseHrs === null ? 'No replies yet' : 'To your first reply',
                    },
                  ]}
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* ─── top products + pipeline ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* No "View All": a BMF has no products page (`post:product` is not
              a BMF permission), so that link was a 404. */}
          <Panel title="My Top Products">
            {topProducts.length === 0 ? (
              <EmptyRow>
                Nothing listed yet. The materials you list show up here, ordered
                by how much interest each one draws.
              </EmptyRow>
            ) : (
              <ul className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 wide:grid-cols-5">
                {topProducts.map((p) => (
                  <li key={p.id} className="min-w-0">
                    <Link href={`/products/${p.slug}`} className="group block">
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-paper-3">
                        {p.media[0] && (
                          <Image
                            src={p.media[0].url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 45vw, 160px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </span>
                      <span className="mt-2 block truncate text-[12px] font-semibold text-ink group-hover:text-brand">
                        {p.title}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-3">
                        {[p.city, p.state].filter(Boolean).join(', ') ||
                          p.category.replace(/-/g, ' ')}
                      </span>
                      {/*
                        The blueprint prints a lead count on each card. An
                        Enquiry has no `postId` — nothing ties a lead to the
                        product that prompted it — so the card carries views,
                        which is a real number for this posting.
                      */}
                      <span className="mt-1.5 flex items-center justify-between border-t border-line-soft pt-1.5 text-[10.5px] text-ink-4">
                        Views
                        <span className="tabular font-bold text-ink">{p.viewCount}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Enquiry Pipeline" action={{ label: 'View All', href: `${base}/enquiries` }}>
            {totalEnquiries === 0 ? (
              <EmptyRow>
                Your pipeline fills up as leads arrive — new, in progress,
                responded, won or closed.
              </EmptyRow>
            ) : (
              <div className="flex items-center gap-5 px-5 py-5">
                <Donut slices={slices} total={totalEnquiries} caption="Total Enquiries" />
                <DonutLegend slices={slices} total={totalEnquiries} />
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ═══════════ right rail ═══════════ */}
      <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
        {/* plan */}
        <section className="rounded-xl bg-admin-bg p-4 text-white">
          <h2 className="text-[13px] font-semibold text-white/70">Your Plan</h2>
          <p className="mt-2.5 flex items-center gap-2 font-display text-[16px] font-bold">
            <span className="chip-icon h-8 w-8 bg-brand/20 text-brand-hover">
              <Icon name="star" className="h-4 w-4" />
            </span>
            {membership?.planName ?? 'No active plan'}
          </p>
          <p className="mt-1 text-[11.5px] text-white/60">
            {membership
              ? `Valid till ${membership.expiresAt.toLocaleDateString('en-IN')}`
              : 'Club Membership lifts you above non-members in Consult Nearby.'}
          </p>

          <ul className="mt-3.5 flex flex-col gap-1.5">
            {[
              'Priority placement in Consult Nearby',
              'A member badge on every posting',
              'Discounts on Merchandise',
              'Early access to Club events',
            ].map((b) => (
              <li key={b} className="flex items-start gap-2 text-[11.5px] text-white/80">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                {b}
              </li>
            ))}
          </ul>

          <Link href="/dashboard/club" className="btn-primary mt-4 w-full">
            {membership ? 'Upgrade / Renew Plan' : 'See the plans'}
          </Link>
        </section>

        {/* PACT */}
        <RailCard
          title="My PACT Area"
          action={
            <Link href={`${base}/pact`} className="text-[11.5px] font-semibold text-brand hover:underline">
              {pact ? 'Manage' : 'Buy'}
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
                ].map(([label, n]) => (
                  <li key={String(label)} className="bg-paper-2 px-1 py-2">
                    <span className="tabular block font-display text-[15px] font-bold text-ink">
                      {n}
                    </span>
                    <span className="block text-[9.5px] text-ink-4">{label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`${base}/professionals`}
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:gap-1.5"
              >
                Professionals in your area
                <Icon name="arrow" className="h-3 w-3 transition-all" />
              </Link>
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              You do not hold a PACT yet. Every materials enquiry from a PIN
              code is routed to the BMF who holds it.
            </p>
          )}
        </RailCard>

        {/* verification — the blueprint's "Verified BMF" badge */}
        <RailCard
          title="Business Verification"
          tone={user.bmfProfile?.isVerified ? 'plain' : 'info'}
        >
          {user.bmfProfile?.isVerified ? (
            <p className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <Icon name="shield" className="h-4 w-4 shrink-0 text-ok" />
              Verified BMF
              {user.bmfProfile.designaType ? ` · ${label(user.bmfProfile.designaType)}` : ''}
            </p>
          ) : (
            <>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                Your business is not verified yet. A verified badge shows on
                every listing and every lead you reply to.
              </p>
              <Link
                href={`${base}/profile`}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:gap-1.5"
              >
                Complete your profile
                <Icon name="arrow" className="h-3 w-3 transition-all" />
              </Link>
            </>
          )}
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
              {notes.map((n) => (
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
      </aside>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

