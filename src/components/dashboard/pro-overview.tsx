import Link from 'next/link'
import Image from 'next/image'
import type { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { getActiveMembership } from '@/lib/club'
import {
  PROFILE_STRENGTH_SELECT, strengthOf, strengthNote,
} from '@/lib/profile-strength'
import {
  Panel, StatTile, Donut, DonutLegend, RailCard, Gauge, type Slice,
  pretty, label, ago, formatHours, monthNote, BannerMeta, EmptyRow,
} from './overview-parts'

/**
 * The Professional dashboard home, laid out as the blueprint draws it:
 * a welcome banner, a row of stat tiles, two panel pairs, and a right rail.
 *
 * ⚠️ The blueprint also shows Profile Rating, Search Appearances, Profile
 *    Views and Recent Profile Visitors, and puts a month-on-month delta under
 *    every number. None of those have anything behind them yet — there is no
 *    review model, no impression tracking and no historical snapshots — so
 *    they are not drawn rather than filled with invented figures. Each is a
 *    real feature to build, not a styling gap.
 */

const STATUS_COLOR = {
  PUBLISHED: '#16A34A',
  PENDING_REVIEW: '#F59E0B',
  DRAFT: '#3B82F6',
  REJECTED: '#DC2626',
} as const

/** The tile beside an enquiry, coloured by the service it asks for. */
const SERVICE_TILE: Record<string, string> = {
  DESIGNA: 'bg-brand-soft text-brand',
  DESIGNI: 'bg-info-soft text-info',
  CONSULTANT: 'bg-ok-soft text-ok',
  BMF: 'bg-warn-soft text-warn',
  CORPORATE: 'bg-paper-3 text-ink-3',
}

const SERVICE_ICON: Record<string, IconName> = {
  DESIGNA: 'grid',
  DESIGNI: 'star',
  CONSULTANT: 'phone',
  BMF: 'box',
  CORPORATE: 'users',
}

const ENQUIRY_TONE: Record<string, string> = {
  NEW: 'pill-brand',
  IN_PROGRESS: 'pill-warn',
  RESPONDED: 'pill-info',
  CLOSED: 'pill-muted',
}

/**
 * A slug or an enum value as a person would read it.
 *
 * Hyphens count as well as underscores — a sub-category comes off
 * `taxonomy.ts` as `commercial-offices`, and leaving the hyphen in printed
 * "Commercial-offices" under every enquiry.
 */
export async function ProOverview({
  userId,
  role,
}: {
  userId: string
  role: Role
}) {
  const [user, byStatus, views, enquiries, topPosts, recent, pact, membership, notes] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...PROFILE_STRENGTH_SELECT,
          createdAt: true,
          _count: { select: { posts: true, enquiriesRecvd: true } },
        },
      }),
      prisma.post.groupBy({
        by: ['type', 'status'],
        where: { authorId: userId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.post.aggregate({
        where: { authorId: userId, deletedAt: null },
        _sum: { viewCount: true },
      }),
      prisma.enquiry.findMany({
        where: { holderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, subject: true, serviceType: true, subCategory: true,
          pincode: true, status: true, createdAt: true,
        },
      }),
      prisma.post.findMany({
        where: { authorId: userId, deletedAt: null, status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: {
          id: true, slug: true, title: true, type: true, city: true,
          state: true, viewCount: true,
          media: { where: { type: 'IMAGE' }, take: 1, select: { url: true } },
        },
      }),
      // the three most recent of each type, for the strips under the donuts
      prisma.post.findMany({
        where: { authorId: userId, deletedAt: null, type: { in: ['PROJECT', 'PRODUCT'] } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true, slug: true, title: true, type: true, status: true,
          city: true, state: true,
          media: { where: { type: 'IMAGE' }, take: 1, select: { url: true } },
        },
      }),
      prisma.pact.findFirst({
        where: { holderId: userId, status: { in: ['ACTIVE', 'RESERVED'] } },
        orderBy: { createdAt: 'desc' },
        select: { pincode: true, serviceType: true, status: true, expiresAt: true },
      }),
      getActiveMembership(userId).catch(() => null),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, title: true, body: true, createdAt: true, isRead: true },
      }),
    ])

  if (!user) return null

  const countFor = (type: string, status?: string) =>
    byStatus
      .filter((r) => r.type === type && (!status || r.status === status))
      .reduce((s, r) => s + r._count._all, 0)

  /*
   * Statuses with nothing in them are dropped rather than listed at zero.
   * "Rejected · 0 · 0%" is a row that says nothing, and four of them under a
   * new account's empty ring said nothing four times over.
   */
  const slicesFor = (type: string): Slice[] =>
    [
      { label: 'Published', value: countFor(type, 'PUBLISHED'), color: STATUS_COLOR.PUBLISHED },
      { label: 'In Review', value: countFor(type, 'PENDING_REVIEW'), color: STATUS_COLOR.PENDING_REVIEW },
      { label: 'Draft', value: countFor(type, 'DRAFT'), color: STATUS_COLOR.DRAFT },
      { label: 'Rejected', value: countFor(type, 'REJECTED'), color: STATUS_COLOR.REJECTED },
    ].filter((s) => s.value > 0)

  const projectSlices = slicesFor('PROJECT')
  const productSlices = slicesFor('PRODUCT')
  const projectTotal = countFor('PROJECT')
  const productTotal = countFor('PRODUCT')

  /*
   * The same figure the sidebar shows, from the same field list.
   *
   * It used to be counted here from its own mix — name, city, state, pincode,
   * the PACT and the Club plan — so the rail and the sidebar could print two
   * different percentages against almost the same label on one screen.
   */
  const strength = strengthOf(user)

  const base = `/dashboard/${role.toLowerCase()}`

  const recentProjects = recent.filter((p) => p.type === 'PROJECT').slice(0, 3)
  const recentProducts = recent.filter((p) => p.type === 'PRODUCT').slice(0, 3)

  /*
   * Who else is registered in the PACT's PIN code. The blueprint shows three
   * numbers here; these are real counts against that PIN, so they are zero on
   * a quiet area rather than an invented 128/45/312.
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
    <div className="flex flex-col gap-5">
      {/* ─── welcome banner (full width) ─── */}
        <section className="relative overflow-hidden rounded-xl border border-line bg-paper-2">
          {/* The text runs a little into the picture's left edge, where the
              fade is still all but opaque — the same overlap the reference
              uses to fit three facts on one line. z-10 keeps it on top. */}
          {/*
            Kept tight, to the same measurements as the BMF card. The banner
            is a greeting — every pixel it takes is a pixel the six tiles
            under it lose, and those carry the numbers. At 24px a long name
            like "Ar. Ritu Sharma" pushed the 👋 onto a line of its own.
          */}
          <div className="relative z-10 w-full px-6 py-3.5 md:w-[52%] lg:px-7 lg:py-4">
            <p className="text-[13px] font-medium text-ink">Welcome back,</p>
            <h1 className="mt-0.5 font-display text-[21px] font-bold leading-tight tracking-tight text-ink">
              {user.name ?? 'there'} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
              Here&rsquo;s what&rsquo;s happening with your business today.
            </p>

            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 lg:mt-3.5">
              <BannerMeta
                icon="users"
                tone="text-brand"
                label="Your Plan"
                value={membership?.planName ?? 'No plan yet'}
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
                icon="map"
                tone="text-info"
                label="Your PACT Area"
                value={
                  pact
                    ? `${pact.pincode}${user.city ? ` (${user.city})` : ''}`
                    : 'None yet'
                }
              />
            </dl>
          </div>

          {/*
            The photograph and its fade are ONE background on ONE element,
            layered — gradient first, picture behind it.

            Two elements is what put a vertical line down the middle of this
            card twice: whichever box carried the fade, its left edge was a
            place where the paint began, and that edge showed. Composited in a
            single background there is no edge anywhere to see. The ramp is
            long and gentle, 38% to 68%, so the house emerges rather than
            appearing.

            Not `next/image`: this is a decorative background, and a
            background is the only way to composite the two into one paint.

            `f_auto,q_auto,w_1600` is Cloudinary's own transform — it takes
            the 1.8 MB source PNG down to about 88 KB and serves whatever
            format the browser accepts. Without it the dashboard would ship
            nearly two megabytes for a decoration.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{
              backgroundImage:
                'linear-gradient(to right, #FFFFFF 0%, #FFFFFF 38%, rgba(255,255,255,0.55) 52%, rgba(255,255,255,0) 68%), ' +
                'url("https://res.cloudinary.com/c7h30ayk/image/upload/f_auto,q_auto,w_1600/v1789076060/profetional_dashboard.png")',
              backgroundSize: 'cover, cover',
              /*
                The banner is 4.97 wide to 1 tall; the picture is 2.96. Under
                `cover` that leaves about 130px of the image hidden, and where
                that 130px is taken from is what this second value decides.
                35% slides the picture up off its top edge without reaching
                the middle — the house sits high in the frame, ground showing.
              */
              backgroundPosition: 'center, center 35%',
              backgroundRepeat: 'no-repeat, no-repeat',
            }}
          />
        </section>

        {/* ─── stat tiles ─── */}
        {/* All six in one row from tablet up; two up only on a phone. */}
        <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-6">
          <li>
            <StatTile icon="chart" label="Total Views" value={String(views._sum.viewCount ?? 0)}
              note="Across all your published postings" />
          </li>
          <li>
            <StatTile icon="inbox" tone="info" label="Total Enquiries"
              value={String(user._count.enquiriesRecvd)}
              note={pact ? 'Routed through your PACT' : 'Buy a PACT to receive leads'} />
          </li>
          <li>
            <StatTile icon="file" tone="ok" label="Total Projects" value={String(projectTotal)}
              note={`${countFor('PROJECT', 'PUBLISHED')} published`} />
          </li>
          <li>
            <StatTile icon="box" tone="warn" label="Total Products" value={String(productTotal)}
              note={`${countFor('PRODUCT', 'PUBLISHED')} published`} />
          </li>
          {/*
            The blueprint's last two tiles. There is no review model and no
            impression tracking on this platform yet, so both are drawn as the
            empty states they honestly are rather than filled with a number
            nothing produced. Each is a feature to build, not a style to fix.
          */}
          <li>
            <StatTile icon="star" label="Profile Rating" value="—"
              note="Ratings open once reviews are built" />
          </li>
          <li>
            <StatTile icon="search" label="Search Appearances" value="—"
              note="Impressions are not tracked yet" />
          </li>
        </ul>

        {/* ═══════════ content + right rail split ═══════════ */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* ─── enquiries + projects ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Recent Enquiries"
            action={{ label: 'View All', href: `${base}/enquiries` }}
          >
            {enquiries.length === 0 ? (
              <EmptyRow>
                No enquiries yet. Leads arrive here once you hold a PACT for
                your area.
              </EmptyRow>
            ) : (
              <ul className="divide-y divide-line-soft">
                {enquiries.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                    {/*
                      The reference puts a photograph here. An Enquiry carries
                      no image — it is a name, a PIN code and a requirement —
                      so rather than invent one, the tile takes its colour and
                      its glyph from the service being asked for. That is a
                      real fact about the row, and it stops five identical
                      grey squares running down the panel.
                    */}
                    <span className={`chip-icon mt-0.5 h-9 w-9 shrink-0 ${SERVICE_TILE[e.serviceType] ?? 'bg-paper-3 text-ink-3'}`}>
                      <Icon name={SERVICE_ICON[e.serviceType] ?? 'inbox'} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {e.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                        {label(e.serviceType)}
                        {e.subCategory ? ` · ${pretty(e.subCategory)}` : ''} · {e.pincode}
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
                          {pretty(e.status)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="My Projects Overview"
            action={{ label: 'View All Projects', href: `${base}/projects` }}
          >
            <div className="flex items-center gap-5 px-5 py-5">
              <Donut slices={projectSlices} total={projectTotal} caption="Total Projects" />
              <DonutLegend slices={projectSlices} total={projectTotal} />
            </div>
            <PostStrip posts={recentProjects} href="/projects" />
          </Panel>
        </div>

        {/* ─── top performing + products ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="My Top Performing Postings"
            action={{ label: 'View All', href: `${base}/projects` }}
          >
            {topPosts.length === 0 ? (
              <EmptyRow>
                Nothing published yet. Your best-performing postings show up
                here once they are live.
              </EmptyRow>
            ) : (
              /* the blueprint's card row: image, title, place, then the count */
              <ul className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 wide:grid-cols-5">
                {topPosts.map((p) => (
                  <li key={p.id} className="min-w-0">
                    <Link href={`/projects/${p.slug}`} className="group block">
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
                        {[p.city, p.state].filter(Boolean).join(', ') || pretty(p.type)}
                      </span>
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

          <Panel
            title="My Products Overview"
            action={{ label: 'View All Products', href: `${base}/products` }}
          >
            <div className="flex items-center gap-5 px-5 py-5">
              <Donut slices={productSlices} total={productTotal} caption="Total Products" />
              <DonutLegend slices={productSlices} total={productTotal} />
            </div>
            <PostStrip posts={recentProducts} href="/products" />
            <div className="hidden">
            </div>
          </Panel>
        </div>
      </div>

      {/* ═══════════ right rail ═══════════ */}
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[264px] xl:w-[300px]">
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

          {/*
            The benefit list from the blueprint. These are what Club
            Membership carries on every plan (§5.2.10) rather than anything
            per-plan — ClubMembership records the name, price and term, and
            the per-plan benefit list lives on ClubPlan, which this card does
            not read.
          */}
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
          title="Your PACT Area"
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
                {user.city ? <span className="text-ink-3"> · {user.city}</span> : null}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-3">
                {label(pact.serviceType)} ·{' '}
                <span className={pact.status === 'ACTIVE' ? 'text-ok' : 'text-warn'}>
                  {pretty(pact.status)}
                </span>
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
            </>
          ) : (
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              You do not hold a PACT yet. Enquiries in an area are routed to the
              professional who holds it.
            </p>
          )}
        </RailCard>

        {/* profile strength */}
        {/* `info` only while there is something left to do — a finished
            profile is a report, not a prompt, so it loses the blue ground */}
        <RailCard title="Profile Strength" tone={strength >= 100 ? 'plain' : 'info'}>
          <div className="flex items-center gap-3.5">
            <Gauge percent={strength} />
            <div className="min-w-0">
              <p className="text-[12.5px] leading-snug text-ink-2">
                {strengthNote(strength)}
              </p>
              {/* No "Complete now" at 100%. It used to show regardless, so a
                  finished profile still read "almost complete" and still
                  offered a link to finish it. */}
              <Link
                href={`${base}/profile`}
                className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:gap-1.5"
              >
                {strength >= 100 ? 'Edit profile' : 'Complete now'}
                <Icon name="arrow" className="h-3 w-3 transition-all" />
              </Link>
            </div>
          </div>
        </RailCard>

        {/* notifications */}
        <RailCard
          title="Notifications"
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

/**
 * The row of recent postings under a donut, as the blueprint draws it — the
 * picture, its status, and where it is. Renders nothing when there is nothing
 * posted yet; the donut above already says zero, and an empty strip under it
 * would only repeat that.
 */
function PostStrip({
  posts,
  href,
}: {
  posts: {
    id: string
    slug: string
    title: string
    status: string
    city: string | null
    state: string | null
    media: { url: string }[]
  }[]
  href: string
}) {
  if (posts.length === 0) return null

  return (
    <ul className="grid grid-cols-3 gap-3 border-t border-line-soft px-5 py-4">
      {posts.map((p) => (
        <li key={p.id} className="min-w-0">
          <Link href={`${href}/${p.slug}`} className="group block">
            <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-paper-3">
              {p.media[0] && (
                <Image
                  src={p.media[0].url}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 30vw, 140px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span
                className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ${
                  p.status === 'PUBLISHED'
                    ? 'bg-ok'
                    : p.status === 'PENDING_REVIEW'
                      ? 'bg-warn'
                      : p.status === 'REJECTED'
                        ? 'bg-danger'
                        : 'bg-info'
                }`}
              >
                {p.status === 'PENDING_REVIEW' ? 'In review' : pretty(p.status)}
              </span>
            </span>
            <span className="mt-1.5 block truncate text-[11.5px] font-semibold text-ink group-hover:text-brand">
              {p.title}
            </span>
            <span className="block truncate text-[10.5px] text-ink-3">
              {[p.city, p.state].filter(Boolean).join(', ') || '—'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}


