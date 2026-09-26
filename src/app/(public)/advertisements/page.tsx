import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { AD_ROLES } from '@/lib/ads'
import {
  featuredAds,
  popularAdvertisers,
  adCategoriesWithCounts,
  listAdPackages,
  publicPlacements,
  adMarketplaceStats,
} from '@/lib/ad-marketplace'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import { Icon, type IconName } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import {
  AD_BANNER,
  AD_HERO_FEATURES,
  WHY_ADVERTISE,
  AD_TRUST,
} from '@/config/advertising'
import { FeaturedRail } from './featured-rail'
import { AdvertisementsPhone } from '@/components/mobile/pages/advertisements-phone'

export const metadata: Metadata = {
  title: 'Advertisements',
  description:
    "Promote your brand, products and services to India's most trusted " +
    'Architecture & Design community.',
}

/**
 * The public advertisement marketplace.
 *
 * ★ Nothing on this page names an advertiser, a price, a category or a count.
 *   Every one of those comes out of the database through `ad-marketplace.ts`,
 *   which is what makes the admin's Featured panel actually control the page:
 *   swap a campaign into slot 1 and this page shows it on the next request,
 *   with no deployment.
 *
 *   What IS written here is the sales copy — the four promises in the hero,
 *   the reasons to advertise, the trust strip — which describes ArchFacing
 *   rather than any campaign.
 */

// Read on every request. A featured slot an admin changes has to show up
// immediately (§31), and a cached page would keep serving yesterday's rail.
export const dynamic = 'force-dynamic'

/** "120" → "120+", because the shelf counts a floor, not an exact figure. */
function plus(n: number): string {
  return n > 0 ? `${n}+ Ads` : 'No ads yet'
}

/** 18400 → "18.4K", 2_100_000 → "2.1M" */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`
  return n > 0 ? String(n) : '—'
}

export default async function AdvertisementsPage() {
  const session = await auth()
  const role = session?.user?.role
  const canAdvertise = Boolean(role && AD_ROLES.includes(role))

  const [featured, advertisers, categories, packages, placements, stats] = await Promise.all([
    featuredAds(),
    popularAdvertisers(),
    adCategoriesWithCounts(),
    listAdPackages(),
    publicPlacements(),
    adMarketplaceStats(),
  ])

  // Where "Advertise Now" goes depends on who is reading: an eligible account
  // lands on the booking form, everyone else on the door.
  const advertiseHref = !session?.user
    ? '/login?next=/advertisements'
    : canAdvertise
      ? '/dashboard/advertisements'
      : '/register'

  // The phone page's campaign button opens the wizard itself.
  const createHref = !session?.user
    ? `/login?next=${encodeURIComponent('/dashboard/advertisements/create')}`
    : canAdvertise
      ? '/dashboard/advertisements/create'
      : '/register'

  return (
    <>
      <SiteHeader
        phone={{
          search: { placeholder: 'Enter product / service to search', action: '/products', param: 'q', variant: 'filter' },
          tone: 'light',
        }}
      />

      {/* ─── phones: the PWA layout (below md only) ─── */}
      <div className="md:hidden">
        <AdvertisementsPhone
          featured={featured}
          advertisers={advertisers}
          categories={categories}
          packages={packages}
          placements={placements}
          stats={stats}
          advertiseHref={advertiseHref}
          createHref={createHref}
        />
      </div>

      <main className="hidden bg-paper md:block">
        <div className="container-af">
          {/* Kept for search engines, clipped from sight — see breadcrumb.tsx */}
          <Breadcrumb items={[homeCrumb(), { label: 'Advertisements' }]} />

          {/* ═══════════ hero ═══════════ */}
          <section className="grid gap-6 pb-6 pt-5 md:grid-cols-[1fr_520px] lg:items-center">
            <div className="min-w-0">
              <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink md:text-[34px]">
                Advertisements
              </h1>
              {/*
                Balanced rather than broken by hand. The hard line break that
                used to sit here chose one width and looked wrong at every
                other; `text-balance` gives lines of about equal length at any.
              */}
              <p className="mt-3 max-w-[34rem] text-balance text-[13.5px] leading-[1.7] text-ink-2">
                Promote your brand, products and services to India&apos;s most trusted
                Architecture &amp; Design Community
              </p>

              {/*
                Four promises, divided rather than boxed — the rule between
                them is what the design uses instead of four cards, and it is
                dropped below `sm` where the columns stack.
              */}
              <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 divide-line sm:grid-cols-4 sm:divide-x">
                {AD_HERO_FEATURES.map((f) => (
                  <li key={f.title} className="min-w-0 px-1 sm:px-3 sm:first:pl-0">
                    <Icon name={f.icon} className="h-6 w-6 text-brand" />
                    <p className="mt-2.5 text-[12px] font-bold leading-tight text-ink">
                      {f.title}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[10.5px] leading-[1.5] text-ink-3">
                      {f.sub}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative isolate min-w-0 overflow-hidden rounded-card bg-navy">
              <Image
                src={AD_BANNER}
                alt=""
                fill
                priority
                sizes="(min-width:1024px) 520px, 100vw"
                className="-z-10 object-cover"
              />
              {/*
                No overlay. Legibility comes from keeping the copy on the dark
                left of the photograph rather than dimming the picture — the
                same rule the dashboard hero follows, and the reason the right
                40% below is deliberately left empty.
              */}
              <div className="w-[60%] px-7 py-12 md:px-8 md:py-14">
                <p className="text-balance font-display text-[21px] font-bold leading-[1.25] text-white">
                  Grow Your Business with Premium Advertisements
                </p>
                <Link
                  href={advertiseHref}
                  className="btn-primary mt-6 gap-2 px-6 text-[13.5px]"
                >
                  Advertise Now
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ═══════════ the two columns ═══════════ */}
          <div className="grid gap-5 pb-8 xl:grid-cols-[1fr_252px]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* ─── placements ─── */}
              <section className="card p-5">
                <CardHead title="Premium Advertisement Locations" href={advertiseHref} cta="View All" />

                <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
                  {placements.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={advertiseHref}
                        title={`${p.name} — ${p.size} px`}
                        className="flex h-full flex-col items-center justify-start gap-2 rounded-card border border-line px-1.5 py-3.5 text-center transition-all hover:border-brand hover:shadow-card"
                      >
                        <Icon name={iconOf(p.icon)} className="h-6 w-6 shrink-0 text-ink-2" />
                        <span className="text-[10.5px] font-semibold leading-[1.3] text-ink">
                          {p.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* ─── featured ─── */}
              <section className="card p-5">
                <CardHead title="Featured Advertisements" href={advertiseHref} cta="View All" />

                {featured.length === 0 ? (
                  <Empty>
                    No advertisement is featured right now. Featured slots are filled
                    from the advertisement panel.
                  </Empty>
                ) : (
                  <div className="mt-4">
                    <FeaturedRail>
                      {featured.map((ad) => {
                        const c = ad.advertiser.corporateProfile
                        const brand = ad.brandName ?? c?.companyName ?? ad.advertiser.name
                        const logo = ad.logoUrl ?? c?.companyLogo ?? ad.advertiser.logo

                        return (
                          <li
                            key={ad.id}
                            className="w-[210px] shrink-0 snap-start sm:w-[230px] xl:w-[calc((100%-48px)/4)]"
                          >
                            <a
                              href={ad.targetUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="card-hover group flex h-full flex-col overflow-hidden"
                            >
                              <span className="relative block aspect-square w-full overflow-hidden bg-paper-3">
                                <Image
                                  src={ad.imageUrl}
                                  alt={ad.headline ?? brand}
                                  fill
                                  sizes="240px"
                                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </span>

                              <span className="flex min-w-0 flex-1 items-start gap-2.5 p-3">
                                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-paper text-[10px] font-bold text-ink-3">
                                  {logo ? (
                                    <Image src={logo} alt="" fill sizes="28px" className="object-contain p-0.5" />
                                  ) : (
                                    brand.slice(0, 2).toUpperCase()
                                  )}
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12px] font-bold text-ink">
                                    {brand}
                                  </span>
                                  {ad.tagline && (
                                    <span className="mt-0.5 block truncate text-[10.5px] text-ink-3">
                                      {ad.tagline}
                                    </span>
                                  )}
                                  <span className="mt-2 inline-flex rounded-card border border-brand-border bg-brand-soft px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.05em] text-brand">
                                    Premium
                                  </span>
                                </span>
                              </span>
                            </a>
                          </li>
                        )
                      })}
                    </FeaturedRail>
                  </div>
                )}
              </section>

              {/* ─── packages ─── */}
              <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-bold text-ink">
                      Advertisement Packages
                    </h2>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Choose the best plan that suits your marketing goals
                    </p>
                  </div>
                  <Link
                    href={advertiseHref}
                    className="shrink-0 rounded-card border border-brand-border bg-paper px-3.5 py-2 text-[12px] font-semibold text-brand transition-colors hover:bg-brand-soft"
                  >
                    Compare Plans
                  </Link>
                </div>

                {packages.length === 0 ? (
                  <Empty>The rate card is not published yet.</Empty>
                ) : (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {packages.map((p) => (
                      <li
                        key={p.id}
                        className={`relative flex flex-col rounded-card border p-4 pt-5 ${
                          p.isPopular
                            ? 'border-brand bg-brand-soft/40'
                            : 'border-line bg-paper'
                        }`}
                      >
                        {p.isPopular && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-card bg-brand px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.05em] text-white">
                            Popular
                          </span>
                        )}

                        <p className="text-center text-[13px] font-bold text-ink">{p.name}</p>
                        <p className="mt-0.5 text-center text-[11px] text-ink-3">
                          {p.durationLabel}
                        </p>

                        <p className="tabular mt-3 text-center font-display text-[22px] font-bold leading-none text-ink">
                          {formatINR(Number(p.price))}
                        </p>
                        <p className="mt-1 text-center text-[10.5px] text-ink-3">{p.perLabel}</p>

                        <ul className="mt-4 flex flex-1 flex-col gap-1.5">
                          {p.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <Icon name="check" className="mt-[3px] h-3 w-3 shrink-0 text-ok" />
                              <span className="text-[10.5px] leading-[1.45] text-ink-2">{f}</span>
                            </li>
                          ))}
                        </ul>

                        <Link
                          href={advertiseHref}
                          className={`mt-4 flex h-9 items-center justify-center rounded-card text-[12px] font-semibold transition-colors ${
                            p.isPopular
                              ? 'bg-brand text-white hover:bg-brand-hover'
                              : 'border border-line text-ink hover:border-brand hover:text-brand'
                          }`}
                        >
                          Choose Plan
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ─── categories ─── */}
              <section className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-bold text-ink">
                      Advertisement Categories
                    </h2>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Promote in the right category and reach the right audience
                    </p>
                  </div>
                  <Link
                    href={advertiseHref}
                    className="shrink-0 text-[12px] font-semibold text-brand hover:underline"
                  >
                    View All Categories →
                  </Link>
                </div>

                <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={advertiseHref}
                        className="flex h-full flex-col items-center justify-start gap-2 rounded-card border border-line px-1.5 py-4 text-center transition-all hover:border-brand hover:shadow-card"
                      >
                        <Icon name={iconOf(c.icon)} className="h-6 w-6 shrink-0 text-ink-2" />
                        <span className="text-[10.5px] font-semibold leading-[1.3] text-ink">
                          {c.name}
                        </span>
                        <span className="tabular text-[10px] text-ink-3">{plus(c.adCount)}</span>
                      </Link>
                    </li>
                  ))}

                  {/* The shelf's last tile is a door, not a category. */}
                  <li>
                    <Link
                      href={advertiseHref}
                      className="flex h-full flex-col items-center justify-start gap-2 rounded-card border border-line px-1.5 py-4 text-center transition-all hover:border-brand hover:shadow-card"
                    >
                      <Icon name="list" className="h-6 w-6 shrink-0 text-ink-2" />
                      <span className="text-[10.5px] font-semibold leading-[1.3] text-ink">
                        More Categories
                      </span>
                      <span className="text-[10px] text-ink-3">View All</span>
                    </Link>
                  </li>
                </ul>
              </section>
            </div>

            {/* ═══════════ the rail ═══════════ */}
            <aside className="flex min-w-0 flex-col gap-4">
              {/* ─── stats ─── */}
              <section className="card p-4">
                <h2 className="font-display text-[14px] font-bold text-ink">
                  Advertisement Stats
                </h2>

                <ul className="mt-4 flex flex-col gap-3.5">
                  <StatRow icon="users" value={compact(stats.activeAdvertisers)} label="Active Advertisers" />
                  <StatRow icon="eye" value={compact(stats.impressionsPerDay)} label="Ad Impressions / Day" />
                  <StatRow icon="trending" value={compact(stats.leadsPerMonth)} label="Leads Generated / Month" />
                  <StatRow icon="chart" value={compact(stats.totalReach)} label="Total Reach" />
                </ul>

                <Link href={advertiseHref} className="btn-primary mt-5 w-full text-[13px]">
                  Advertise Now
                </Link>
              </section>

              {/* ─── popular advertisers ─── */}
              <section className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-[14px] font-bold text-ink">
                    Popular Advertisers
                  </h2>
                  <Link href={advertiseHref} className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">
                    View All
                  </Link>
                </div>

                {advertisers.length === 0 ? (
                  <Empty>No campaign is running at the moment.</Empty>
                ) : (
                  <ul className="mt-3.5 flex flex-col">
                    {advertisers.map((a) => (
                      <li key={a.id} className="border-b border-line-soft last:border-0">
                        <a
                          href={a.href}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="group flex items-center gap-2.5 py-2.5"
                        >
                          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-paper text-[10px] font-bold text-ink-3">
                            {a.logo ? (
                              <Image src={a.logo} alt="" fill sizes="32px" className="object-contain p-0.5" />
                            ) : (
                              a.name.slice(0, 2).toUpperCase()
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-ink transition-colors group-hover:text-brand">
                              {a.name}
                            </span>
                            {a.tagline && (
                              <span className="block truncate text-[10.5px] text-ink-3">
                                {a.tagline}
                              </span>
                            )}
                          </span>

                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ink-4"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ─── why us ─── */}
              <section className="card p-4">
                <h2 className="font-display text-[14px] font-bold text-ink">
                  Why Advertise with Us?
                </h2>

                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {WHY_ADVERTISE.map((w) => (
                    <li key={w} className="flex items-start gap-2">
                      <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none"
                          stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
                          strokeLinejoin="round" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="text-[11.5px] leading-[1.45] text-ink-2">{w}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/legal/contact" className="btn-primary mt-5 w-full gap-2 text-[12.5px]">
                  <Icon name="download" className="h-4 w-4" />
                  Download Media Kit
                </Link>
              </section>
            </aside>
          </div>

          {/* ═══════════ closing call to action ═══════════ */}
          <section className="relative isolate mb-5 overflow-hidden rounded-card bg-navy">
            <Image
              src={AD_BANNER}
              alt=""
              fill
              sizes="100vw"
              className="-z-10 object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.85) 40%, ' +
                  'rgba(17,24,39,0.45) 70%, rgba(17,24,39,0.12) 100%)',
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-9 md:px-10">
              <div className="min-w-0">
                <p className="font-display text-[20px] font-bold text-white md:text-[23px]">
                  Ready to Grow Your Business?
                </p>
                <p className="mt-1.5 text-[12.5px] text-white/70">
                  Join the leading brands already growing with ArchFacing
                </p>
              </div>

              <Link href={advertiseHref} className="btn-primary shrink-0 gap-2 px-6">
                Advertise Now
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* ═══════════ trust strip ═══════════ */}
          <section className="mb-8 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-5">
            {AD_TRUST.map((t) => (
              <div key={t.title} className="flex items-center gap-2.5">
                <Icon name={t.icon} className="h-[18px] w-[18px] shrink-0 text-ink-3" />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold text-ink">
                    {t.title}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-3">{t.sub}</span>
                </span>
              </div>
            ))}
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════
//  Small pieces
// ═══════════════════════════════════════════════════════════

/**
 * Placement and category icons are stored as plain strings so an admin can
 * change one without a deployment. An unrecognised name falls back rather
 * than throwing — a typo in the panel must not take the page down.
 */
const KNOWN_ICONS = new Set<string>([
  'monitor', 'building', 'box', 'globe', 'image', 'file', 'map', 'trophy',
  'mobile', 'cart', 'sofa', 'home', 'lamp', 'chair', 'tap', 'list', 'star',
  'grid', 'tag', 'eye', 'target', 'chart',
])

function iconOf(name: string): IconName {
  return (KNOWN_ICONS.has(name) ? name : 'grid') as IconName
}

function CardHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="min-w-0 font-display text-[15px] font-bold text-ink">{title}</h2>
      <Link href={href} className="shrink-0 text-[12px] font-semibold text-brand hover:underline">
        {cta} →
      </Link>
    </div>
  )
}

function StatRow({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon name={icon} className="h-[22px] w-[22px] shrink-0 text-ink-3" />
      <span className="min-w-0">
        <span className="tabular block font-display text-[16px] font-bold leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 block truncate text-[11px] text-ink-3">{label}</span>
      </span>
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-card border border-dashed border-line bg-paper-2 px-4 py-6 text-center text-[12.5px] text-ink-3">
      {children}
    </p>
  )
}
