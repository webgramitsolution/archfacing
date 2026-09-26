import Image from 'next/image'
import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { Panel, RailCard, ago } from '@/components/dashboard/overview-parts'
import { listAssociates } from '@/lib/design-associates'
import { recommendedFor, visitorCounts } from '@/lib/visitor'
import { unsplash, PROJECT_PHOTOS } from '@/config/content-media'

/**
 * The Visitor (CLIENT) dashboard.
 *
 * ★ Every figure is a live row count. There is no seeded or illustrative
 *   number anywhere on this page — where a reader has done nothing yet the
 *   tile reads 0 and the panel says so in words.
 *
 * ★ "Messages" is not a table on this platform: a conversation IS an enquiry
 *   thread, so the figure counts the reader's enquiries a professional has
 *   replied to, and the link goes to those threads.
 *
 * ★ "Find Professionals Near You" counts ACTIVE PACT holders in the reader's
 *   own PIN code, one row per real seat in the taxonomy — not an estimate.
 */

/** The banner photograph — exterior architecture, matching the design. */
const BANNER = unsplash(PROJECT_PHOTOS.modernHouse, { w: 1200, h: 520, q: 70 })

type Tile = {
  icon: IconName
  label: string
  value: number
  href: string
  tone: string
}

/**
 * The nine seats a reader is most likely to want, each a REAL key in the PACT
 * taxonomy so the count beside it is a genuine `Pact` row count.
 */
const PACT_TILES: { label: string; serviceType: string; subCategory: string; icon: IconName }[] = [
  { label: 'Architects', serviceType: 'DESIGNA', subCategory: '-', icon: 'building' },
  { label: 'Interior Designers', serviceType: 'DESIGNI', subCategory: '-', icon: 'sofa' },
  { label: 'Civil Engineers', serviceType: 'CONSULTANT', subCategory: 'civil-engineers', icon: 'wrench' },
  { label: 'Structure Engineers', serviceType: 'CONSULTANT', subCategory: 'structure-engineers', icon: 'grid' },
  { label: 'MEP Consultants', serviceType: 'CONSULTANT', subCategory: 'mep-consultants', icon: 'settings' },
  { label: 'Lighting Consultants', serviceType: 'CONSULTANT', subCategory: 'lighting-consultants', icon: 'lamp' },
  { label: 'Electrical Engineers', serviceType: 'CONSULTANT', subCategory: 'electrical-engineers', icon: 'bolt' },
  { label: 'Property Valuers', serviceType: 'CONSULTANT', subCategory: 'property-valuers', icon: 'rupee' },
  { label: 'Building Materials', serviceType: 'BMF', subCategory: '-', icon: 'box' },
]

const QUICK_ACTIONS: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: 'inbox', title: 'Post a New Enquiry', body: 'Get best responses', href: '/consult-nearby' },
  { icon: 'globe', title: 'Browse Around Us', body: 'Events, news & updates', href: '/around-us' },
  { icon: 'image', title: 'Upload Art in Artistry', body: 'Showcase your creativity', href: '/dashboard/artistry/new' },
  { icon: 'trophy', title: 'Enter a Competition', body: 'Show what you can do', href: '/dashboard/competitions' },
]

/** Enquiry status → the pill class the rest of the dashboard already uses. */
const ENQUIRY_TONE: Record<string, string> = {
  NEW: 'pill-info',
  ASSIGNED: 'pill-info',
  IN_PROGRESS: 'pill-warn',
  RESPONDED: 'pill-ok',
  CONVERTED: 'pill-ok',
  CLOSED: 'pill-muted',
  UNROUTED: 'pill-warn',
}

const ENQUIRY_LABEL: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESPONDED: 'Responded',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
  UNROUTED: 'Finding a pro',
}

export async function VisitorOverview({ userId }: { userId: string }) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, pincode: true, city: true, state: true },
  })

  const areaPin = me?.pincode ?? null

  const [counts, enquiries, notifications, seats, recommended, associates] = await Promise.all([
    visitorCounts(userId),

    prisma.enquiry.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        subject: true,
        serviceType: true,
        subCategory: true,
        pincode: true,
        status: true,
        createdAt: true,
      },
    }),

    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, body: true, createdAt: true, link: true, isRead: true },
    }),

    areaPin
      ? prisma.pact.groupBy({
          by: ['serviceType', 'subCategory'],
          where: { pincode: areaPin, status: 'ACTIVE' },
          _count: { _all: true },
        })
      : Promise.resolve([] as { serviceType: string; subCategory: string; _count: { _all: number } }[]),

    recommendedFor(userId, { state: me?.state }, 6),

    // Verified professionals in the reader's own area, most relevant first.
    areaPin
      ? listAssociates({ pincode: areaPin, take: 3 })
      : listAssociates({ state: me?.state ?? undefined, take: 3 }),
  ])

  const seatCount = new Map(
    seats.map((s) => [`${s.serviceType}|${s.subCategory}`, s._count._all])
  )

  const tiles: Tile[] = [
    { icon: 'inbox', label: 'My Enquiries', value: counts.enquiries, href: '/dashboard/client/consultations', tone: 'bg-brand-soft text-brand' },
    { icon: 'heart', label: 'Saved Items', value: counts.saved, href: '/dashboard/client/saved', tone: 'bg-[#F5ECFF] text-[#7C3AED]' },
    { icon: 'eye', label: 'Recently Viewed', value: counts.viewed, href: '/dashboard/client/recently-viewed', tone: 'bg-info-soft text-info' },
    { icon: 'file', label: 'My Posts', value: counts.posts, href: '/dashboard/client/posts', tone: 'bg-ok-soft text-ok' },
    { icon: 'mail', label: 'Messages', value: counts.messages, href: '/dashboard/client/consultations', tone: 'bg-warn-soft text-warn' },
    { icon: 'star', label: 'My Reviews', value: counts.reviews, href: '/dashboard/client/reviews', tone: 'bg-[#E8F7F2] text-[#0D9488]' },
  ]

  const area = [me?.city, me?.state].filter(Boolean).join(', ')

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_336px]">
      {/* ══════════════ main column ══════════════ */}
      <div className="flex min-w-0 flex-col gap-5">
        {/* ─── welcome banner ─── */}
        <section className="relative isolate overflow-hidden rounded-card border border-line bg-[#FDF1E7] shadow-card">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[52%] max-w-[560px]">
            <Image src={BANNER} alt="" fill sizes="52vw" className="object-cover object-center" />
            {/* The photo's left edge is exactly the panel's peach, so it
                dissolves into the card with no seam and stays sharp on the right. */}
            <span className="absolute inset-0 bg-[linear-gradient(90deg,#FDF1E7_0%,rgba(253,241,231,0.85)_26%,rgba(253,241,231,0)_64%)]" />
          </div>

          <div className="relative px-5 py-6 md:px-6">
            <p className="text-[13px] text-ink-2">Welcome back,</p>
            <h1 className="mt-0.5 font-display text-[22px] font-bold tracking-tight text-ink md:text-[26px]">
              {me?.name ?? 'there'}! <span aria-hidden>👋</span>
            </h1>
            <p className="mt-2.5 max-w-[42ch] text-[12.5px] leading-relaxed text-ink-2">
              India&rsquo;s most trusted platform for Architecture, Interior Design, Building
              Materials, Projects, Professionals &amp; more.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link href="/consult-nearby" className="btn-primary px-4 py-2 text-[13px]">
                Post an Enquiry
              </Link>
              <Link
                href="/projects"
                className="btn-outline px-4 py-2 text-[13px]"
              >
                Explore Projects
              </Link>
            </div>
          </div>
        </section>

        {/* ─── the six counts ─── */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 wide:grid-cols-6">
          {tiles.map((t) => (
            <li key={t.label} className="min-w-0">
              <Link
                href={t.href}
                className="card-hover flex h-full min-w-0 flex-col items-center px-3 py-4 text-center"
              >
                <span className={`chip-icon ${t.tone}`}>
                  <Icon name={t.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="tabular mt-2.5 block font-display text-[22px] font-bold leading-none text-ink">
                  {t.value.toString().padStart(2, '0')}
                </span>
                <span className="mt-1.5 block truncate text-[11.5px] text-ink-3">{t.label}</span>
                <span className="mt-1.5 block text-[11px] font-semibold text-brand">View all →</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* ─── enquiries + professionals near you ─── */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <Panel
            title="My Enquiries"
            action={{ label: 'View All', href: '/dashboard/client/consultations' }}
          >
            {enquiries.length === 0 ? (
              <div className="px-1 py-6 text-center">
                <p className="text-[13px] text-ink-2">You have not sent an enquiry yet.</p>
                <Link href="/consult-nearby" className="btn-primary mt-3 px-4 py-2 text-[13px]">
                  Post your first enquiry
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft">
                {enquiries.map((e) => (
                  <li key={e.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="chip-icon shrink-0 bg-paper-3 text-ink-3">
                      <Icon name="inbox" className="h-[18px] w-[18px]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{e.subject}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                        {serviceLabel(e.serviceType, e.subCategory)} · PIN {e.pincode}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-ink-4">{ago(e.createdAt)}</p>
                      <span className={`${ENQUIRY_TONE[e.status] ?? 'pill-muted'} mt-1`}>
                        {ENQUIRY_LABEL[e.status] ?? e.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Find Professionals Near You (PACT)"
            action={{ label: 'All professionals', href: '/designers-associates' }}
          >
            <p className="-mt-1 mb-3 text-[11.5px] text-ink-3">
              {areaPin
                ? 'Verified professionals holding a PACT seat in your PIN code.'
                : 'Add a PIN code to your profile to see who holds a seat in your area.'}
            </p>

            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PACT_TILES.map((t) => {
                const n = seatCount.get(`${t.serviceType}|${t.subCategory}`) ?? 0
                return (
                  <li key={t.label} className="min-w-0">
                    <Link
                      href={
                        areaPin
                          ? `/designers-associates?pin=${areaPin}`
                          : '/designers-associates'
                      }
                      className="flex h-full min-w-0 flex-col items-center rounded-lg border border-line bg-paper-2 px-2 py-3 text-center transition-colors hover:border-brand-border hover:bg-brand-soft"
                    >
                      <Icon name={t.icon} className="h-5 w-5 text-brand" />
                      <span className="mt-1.5 block w-full truncate text-[11px] font-semibold text-ink">
                        {t.label}
                      </span>
                      <span className="tabular mt-0.5 block text-[10.5px] text-ink-3">
                        {n} available
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {areaPin && (
              <p className="mt-3 flex min-w-0 items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-[11.5px] text-ink-2">
                <Icon name="map" className="h-4 w-4 shrink-0 text-ok" />
                <span className="min-w-0 flex-1 truncate">
                  Your PACT area: <strong className="font-semibold text-ink">{areaPin}</strong>
                  {area ? ` (${area})` : ''}
                </span>
                <Link href="/dashboard/client/profile" className="shrink-0 font-semibold text-brand hover:underline">
                  Change
                </Link>
              </p>
            )}
          </Panel>
        </div>

        {/* ─── recommended ─── */}
        <Panel
          title="Recommended For You"
          action={{ label: 'Browse projects', href: '/projects' }}
        >
          {recommended.length === 0 ? (
            <p className="py-5 text-center text-[13px] text-ink-2">
              Nothing published in your area yet — try{' '}
              <Link href="/projects" className="font-semibold text-brand hover:underline">
                all projects
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="-mt-1 mb-3 text-[11.5px] text-ink-3">
                {me?.state
                  ? `Most viewed in ${me.state} right now.`
                  : 'Most viewed on ArchFacing right now.'}
              </p>
              <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                {recommended.map((r) => (
                  <li
                    key={r.id}
                    className="w-[62%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-1.5rem)/3)]"
                  >
                    <Link
                      href={r.href}
                      className="card-hover group flex h-full min-w-0 flex-col overflow-hidden"
                    >
                      <span className="relative block aspect-[16/10] overflow-hidden bg-paper-3">
                        {r.image ? (
                          <Image
                            src={r.image}
                            alt=""
                            fill
                            sizes="(min-width:1024px) 20vw, 60vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-ink-4">
                            <Icon name="image" className="h-6 w-6" />
                          </span>
                        )}
                      </span>
                      <span className="block min-w-0 p-3">
                        <span className="block truncate text-[12.5px] font-semibold text-ink transition-colors group-hover:text-brand">
                          {r.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                          By {r.author}
                        </span>
                        {r.place && (
                          <span className="mt-0.5 block truncate text-[11px] text-ink-4">{r.place}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* ══════════════ right rail ══════════════ */}
      <div className="flex min-w-0 flex-col gap-5">
        <RailCard title="Quick Actions">
          <ul className="flex flex-col gap-1">
            {QUICK_ACTIONS.map((a) => (
              <li key={a.title}>
                <Link
                  href={a.href}
                  className="flex min-w-0 items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-brand-soft"
                >
                  <span className="chip-icon shrink-0 bg-brand-soft text-brand">
                    <Icon name={a.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">
                      {a.title}
                    </span>
                    <span className="block truncate text-[11px] text-ink-3">{a.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/projects" className="btn-primary mt-3 w-full px-4 py-2.5 text-[13px]">
            Explore All Features
          </Link>
        </RailCard>

        <RailCard
          title="Recent Activity"
          action={
            <Link href="/dashboard/notifications" className="text-[11.5px] font-semibold text-brand hover:underline">
              View All →
            </Link>
          }
        >
          {notifications.length === 0 ? (
            <p className="py-3 text-[12.5px] text-ink-3">
              Nothing yet. Your enquiry replies and approvals will appear here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft">
              {notifications.map((n) => (
                <li key={n.id} className="flex min-w-0 items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-line' : 'bg-brand'}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link href={n.link} className="block truncate text-[12px] font-semibold text-ink hover:text-brand">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="truncate text-[12px] font-semibold text-ink">{n.title}</p>
                    )}
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-3">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[10.5px] text-ink-4">{ago(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </RailCard>

        <RailCard
          title="Professionals For You"
          action={
            <Link href="/designers-associates" className="text-[11.5px] font-semibold text-brand hover:underline">
              View All →
            </Link>
          }
        >
          {associates.rows.length === 0 ? (
            <p className="py-3 text-[12.5px] text-ink-3">
              No verified professional has claimed a seat in your area yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {associates.rows.map((a) => (
                <li key={a.slug} className="flex min-w-0 items-center gap-2.5">
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-soft ring-1 ring-brand-border">
                    {a.photo || a.logo ? (
                      <Image
                        src={(a.photo || a.logo) as string}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-brand">
                        {a.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-ink">{a.name}</span>
                    <span className="block truncate text-[10.5px] text-ink-3">{a.discipline}</span>
                  </span>

                  <Link
                    href={`/${a.slug}`}
                    className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </RailCard>
      </div>
    </div>
  )
}

/** "CONSULTANT / mep-consultants" → "MEP Consultants". */
function serviceLabel(serviceType: string, subCategory: string | null): string {
  if (subCategory && subCategory !== '-') {
    return subCategory
      .split('-')
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
      .join(' ')
  }
  const named: Record<string, string> = {
    DESIGNA: 'Architecture',
    DESIGNI: 'Interior Design',
    BMF: 'Building Materials',
    CONSULTANT: 'Consultancy',
    CORPORATE: 'Corporate',
  }
  return named[serviceType] ?? serviceType
}
