import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn, formatINR } from '@/lib/utils'
import type { FeaturedAd } from '@/lib/ad-marketplace'
import { AD_BANNER, AD_HERO_FEATURES, AD_TRUST, WHY_ADVERTISE } from '@/config/advertising'

/**
 * The Advertisements page on a phone — the "Advertisment phone device"
 * reference, rendered below `md` only. Tablet and desktop keep the existing
 * page untouched.
 *
 * Every advertiser, placement, package, price, category and count is a
 * database row read by `ad-marketplace.ts` in the page; the only prose written
 * here is the page's own sales copy from `config/advertising.ts`.
 */

type Placement = { id: string; name: string; icon: string; size: string }
type Pkg = {
  id: string
  name: string
  price: unknown
  durationLabel: string
  perLabel: string
  features: string[]
  isPopular: boolean
}
type Category = { id: string; name: string; icon: string; adCount: number }
type Advertiser = { id: string; name: string; tagline: string; logo: string | null; href: string }
type Stats = { activeAdvertisers: number; impressionsPerDay: number; leadsPerMonth: number; totalReach: number }

export function AdvertisementsPhone({
  featured,
  advertisers,
  categories,
  packages,
  placements,
  stats,
  advertiseHref,
  createHref,
}: {
  featured: FeaturedAd[]
  advertisers: Advertiser[]
  categories: Category[]
  packages: Pkg[]
  placements: Placement[]
  stats: Stats
  /** Where "Advertise Now" goes for this reader. */
  advertiseHref: string
  /** The campaign wizard (or the door to it). */
  createHref: string
}) {
  return (
    <div className="bg-white px-4 pb-8 pt-1">
      {/* ═══════════ breadcrumb + title ═══════════ */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/" className="hover:text-brand">Home</Link>
        <Chevron className="h-3 w-3 text-ink-4" />
        <span className="font-medium text-ink-2">Advertisements</span>
      </nav>

      <h1 className="mt-3 font-display text-[25px] font-bold leading-tight tracking-tight text-ink">
        Advertisements
      </h1>
      <p className="mt-2 text-[13px] leading-[1.55] text-ink-2">
        Promote your brand, products and services to India&apos;s most trusted Architecture &amp;
        Design Community
      </p>

      {/* ═══════════ four promises ═══════════ */}
      <ul className="mt-5 grid grid-cols-4 divide-x divide-line">
        {AD_HERO_FEATURES.map((f) => (
          <li key={f.title} className="flex min-w-0 flex-col items-center px-1 text-center">
            <Icon name={f.icon} className="h-[22px] w-[22px] text-brand" />
            <p className="mt-2 text-[11px] font-bold leading-[1.3] text-ink">{f.title}</p>
            <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-3">{f.sub.replace(/\n/g, ' ')}</p>
          </li>
        ))}
      </ul>

      {/* ═══════════ banner ═══════════ */}
      <section className="relative isolate mt-6 overflow-hidden rounded-card bg-navy">
        <Image src={AD_BANNER} alt="" fill sizes="100vw" className="-z-10 object-cover object-right" />
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.9) 0%, rgba(17,24,39,0.6) 45%, rgba(17,24,39,0) 75%)' }}
        />
        <div className="w-[62%] px-4 py-5">
          <p className="font-display text-[17px] font-bold leading-[1.3] text-white">
            Grow Your Business with Premium Ads
          </p>
          <Link href={advertiseHref} className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-card bg-brand px-3.5 text-[12px] font-semibold text-white">
            Advertise Now
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ═══════════ placements ═══════════ */}
      {placements.length > 0 && (
        <section className="mt-7">
          <Head title="Premium Advertisement Locations" href={advertiseHref} />
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {placements.map((p) => (
              <li key={p.id}>
                <Link
                  href={advertiseHref}
                  title={`${p.name} — ${p.size} px`}
                  className="flex h-full min-h-[86px] flex-col items-center justify-center gap-2 rounded-card border border-line bg-white px-1 py-3 text-center shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
                >
                  <Icon name={iconOf(p.icon)} className="h-[22px] w-[22px] shrink-0 text-ink-2" />
                  <span className="text-[11px] font-semibold leading-[1.3] text-ink">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════════ featured ═══════════ */}
      {featured.length > 0 && (
        <section className="mt-7">
          <Head title="Featured Advertisements" href={advertiseHref} />
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {featured.map((ad) => {
              const c = ad.advertiser.corporateProfile
              const brand = ad.brandName ?? c?.companyName ?? ad.advertiser.name
              const logo = ad.logoUrl ?? c?.companyLogo ?? ad.advertiser.logo
              return (
                <li key={ad.id} className="min-w-0">
                  <a
                    href={ad.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white"
                  >
                    <span className="relative block aspect-[2/1] w-full overflow-hidden bg-paper-3">
                      <Image src={ad.imageUrl} alt={ad.headline ?? brand} fill sizes="50vw" className="object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-1 items-start gap-2 p-2.5">
                      <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper text-[10px] font-bold text-ink-3">
                        {logo ? <Image src={logo} alt="" fill sizes="28px" className="object-contain p-0.5" /> : brand.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-ink">{brand}</span>
                        {ad.tagline && <span className="mt-0.5 block truncate text-[11px] text-ink-3">{ad.tagline}</span>}
                        <span className="mt-1.5 inline-flex rounded-md border border-brand-border bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                          Premium
                        </span>
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ═══════════ packages ═══════════ */}
      {packages.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold text-ink">Advertisement Packages</h2>
            <Link href={advertiseHref} className="shrink-0 rounded-md border border-brand-border px-2.5 py-1.5 text-[11px] font-semibold text-brand">
              Compare Plans
            </Link>
          </div>
          <ul className={cn('mt-5 grid gap-1.5', packages.length >= 4 ? 'grid-cols-4' : packages.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {packages.slice(0, 4).map((p) => (
              <li
                key={p.id}
                className={cn(
                  'relative flex min-w-0 flex-col rounded-card border px-1 pb-2 pt-4',
                  p.isPopular ? 'border-brand bg-brand-soft/30' : 'border-line bg-white'
                )}
              >
                {p.isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                    Popular
                  </span>
                )}
                <p className={cn('text-center text-[11.5px] font-bold', p.isPopular ? 'text-brand' : 'text-ink')}>{p.name}</p>
                <p className="mt-0.5 text-center text-[11px] text-ink-3">{p.durationLabel}</p>
                <p className="tabular mt-2.5 text-center font-display text-[14.5px] font-bold leading-none tracking-tight text-ink">
                  {formatINR(Number(p.price))}
                </p>
                <ul className="mt-3 flex flex-1 flex-col gap-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-[3px]">
                      <Icon name="check" className="mt-[2px] h-2.5 w-2.5 shrink-0 text-ok" />
                      <span className="min-w-0 text-[11px] leading-[1.25] tracking-[-0.03em] text-ink-2">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={advertiseHref}
                  className={cn(
                    'mt-3 flex h-9 items-center justify-center rounded-md text-[11px] font-semibold',
                    p.isPopular ? 'bg-brand text-white' : 'border border-line text-ink'
                  )}
                >
                  Choose Plan
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════════ stats ═══════════ */}
      <section className="mt-7 rounded-card border border-line bg-white p-4">
        <h2 className="font-display text-[15px] font-bold text-ink">Advertisement Stats</h2>
        <ul className="mt-3.5 flex flex-col gap-3.5">
          <StatRow icon="users" value={compact(stats.activeAdvertisers)} label="Active Advertisers" />
          <StatRow icon="eye" value={compact(stats.impressionsPerDay)} label="Ad Impressions / Day" />
          <StatRow icon="trending" value={compact(stats.leadsPerMonth)} label="Leads Generated / Month" />
          <StatRow icon="chart" value={compact(stats.totalReach)} label="Total Reach" />
        </ul>
        <Link href={advertiseHref} className="mt-4 flex h-11 w-full items-center justify-center rounded-card bg-brand text-[13px] font-semibold text-white">
          Advertise Now
        </Link>
      </section>

      {/* ═══════════ popular advertisers ═══════════ */}
      {advertisers.length > 0 && (
        <section className="mt-4 rounded-card border border-line bg-white p-4">
          <Head title="Popular Advertisers" href={advertiseHref} />
          <ul className="mt-2 flex flex-col">
            {advertisers.map((a) => (
              <li key={a.id}>
                <a href={a.href} target="_blank" rel="noopener noreferrer sponsored" className="flex min-h-[48px] items-center gap-3 py-2">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper text-[10px] font-bold text-ink-3">
                    {a.logo ? <Image src={a.logo} alt="" fill sizes="36px" className="object-contain p-0.5" /> : a.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">{a.name}</span>
                    {a.tagline && <span className="block truncate text-[11px] text-ink-3">{a.tagline}</span>}
                  </span>
                  <Chevron className="h-4 w-4 shrink-0 text-ink-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════════ why us ═══════════ */}
      <section className="mt-4 rounded-card border border-line bg-white p-4">
        <h2 className="font-display text-[15px] font-bold text-ink">Why Advertise with Us?</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {WHY_ADVERTISE.map((w) => (
            <li key={w} className="flex items-center gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="text-[12px] text-ink-2">{w}</span>
            </li>
          ))}
        </ul>
        {/* No media kit file exists yet, so this opens the campaign wizard. */}
        <Link href={createHref} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-card bg-brand text-[13px] font-semibold text-white">
          <Icon name="plus" className="h-4 w-4" />
          Create Your Campaign
        </Link>
      </section>

      {/* ═══════════ categories ═══════════ */}
      {categories.length > 0 && (
        <section className="mt-4 rounded-card border border-line bg-white p-4">
          <Head title="Advertisement Categories" href={advertiseHref} />
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {categories.slice(0, 7).map((c) => (
              <li key={c.id}>
                <Link href={advertiseHref} className="flex h-full min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-card border border-line px-1 py-2.5 text-center">
                  <Icon name={iconOf(c.icon)} className="h-5 w-5 shrink-0 text-ink-2" />
                  <span className="text-[11px] font-semibold leading-[1.25] text-ink">{c.name}</span>
                  <span className="tabular text-[11px] text-ink-3">{adsLabel(c.adCount)}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={advertiseHref} className="flex h-full min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-card border border-line px-1 py-2.5 text-center">
                <Icon name="list" className="h-5 w-5 shrink-0 text-ink-2" />
                <span className="text-[11px] font-semibold leading-[1.25] text-ink">More Categories</span>
                <span className="text-[11px] text-ink-3">View All</span>
              </Link>
            </li>
          </ul>
        </section>
      )}

      {/* ═══════════ closing call to action ═══════════ */}
      <section className="relative isolate mt-5 overflow-hidden rounded-card bg-navy">
        <Image src={AD_BANNER} alt="" fill sizes="100vw" className="-z-10 object-cover object-right" />
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ backgroundImage: 'linear-gradient(to right, rgba(17,24,39,0.94) 0%, rgba(17,24,39,0.75) 50%, rgba(17,24,39,0.15) 100%)' }}
        />
        <div className="w-[68%] px-4 py-5">
          <p className="font-display text-[18px] font-bold leading-[1.25] text-white">Ready to Grow Your Business?</p>
          <p className="mt-2 text-[12px] leading-[1.5] text-white/75">
            {stats.activeAdvertisers > 0
              ? `Join ${stats.activeAdvertisers} ${stats.activeAdvertisers === 1 ? 'brand' : 'brands'} already advertising with ArchFacing`
              : 'Join the brands growing with ArchFacing'}
          </p>
          <Link href={advertiseHref} className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-card bg-brand px-3.5 text-[12px] font-semibold text-white">
            Advertise Now
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ═══════════ benefit strip ═══════════ */}
      <ul className="mt-5 grid grid-cols-5 divide-x divide-line">
        {AD_TRUST.map((t) => (
          <li key={t.title} className="flex min-w-0 flex-col items-center px-0.5 text-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-2">
              <Icon name={t.icon} className="h-4 w-4" />
            </span>
            <p className="mt-1.5 text-[11px] font-semibold leading-[1.25] text-ink">{t.title}</p>
            <p className="mt-1 text-[10.5px] leading-[1.35] text-ink-3">{t.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Small pieces
// ═══════════════════════════════════════════════════════════

const KNOWN_ICONS = new Set<string>([
  'monitor', 'building', 'box', 'globe', 'image', 'file', 'map', 'trophy',
  'mobile', 'cart', 'sofa', 'home', 'lamp', 'chair', 'tap', 'list', 'star',
  'grid', 'tag', 'eye', 'target', 'chart',
])

function iconOf(name: string): IconName {
  return (KNOWN_ICONS.has(name) ? name : 'grid') as IconName
}

/** 18400 → "18.4K+"; zero reads as a dash rather than a made-up floor. */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K+`
  return n > 0 ? String(n) : '—'
}

function adsLabel(n: number): string {
  if (n <= 0) return 'No ads yet'
  return n === 1 ? '1 Ad' : `${n} Ads`
}

function Head({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="min-w-0 font-display text-[15px] font-bold text-ink">{title}</h2>
      <Link href={href} className="flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-brand">
        View All
        <Icon name="arrow" className="h-3 w-3" />
      </Link>
    </div>
  )
}

function StatRow({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <Icon name={icon} className="h-6 w-6 shrink-0 text-ink-2" />
      <span className="min-w-0">
        <span className="tabular block font-display text-[15px] font-bold leading-none text-ink">{value}</span>
        <span className="mt-1 block truncate text-[11.5px] text-ink-3">{label}</span>
      </span>
    </li>
  )
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
