import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LOGO_URL } from '@/components/logo'
import { photoSrc } from '@/components/projects'
import { VerifiedTick } from '@/components/verified-badge'
import { SaveToggle } from '@/components/save-button'
import { INDUSTRIES, PRODUCT_CARDS, ARTISTRY_CARDS } from '@/components/home'
import { unsplash } from '@/config/content-media'
import { PROJECT_CATEGORIES } from '@/config/taxonomy'
import { placeLine, projectMeta, type ProjectRow } from '@/lib/projects'
import type { HomeDesigner } from '@/lib/home'
import { shortCount } from '@/lib/mobile-home'
import { MobileHero } from './mobile-hero'
import { MobileNavDrawer, type DrawerNavItem, type DrawerUser } from './mobile-nav-drawer'
import { SnapRail } from './snap-rail'

/**
 * The home page on a phone — the PWA layout from the "Home phone 1" and
 * "Home phone 01" references. Rendered below `md` only; tablet and desktop
 * keep the existing home page untouched.
 *
 * Every number on it is counted: projects per industry, products per
 * category group, designer ratings from real reviews. The Marketplace
 * Intelligence tiles carry no figures in the reference, so they are links.
 */
export function MobileHome({
  heroImages,
  featuredImages,
  industryImages,
  projects,
  designers,
  industryCount,
  categoryCount,
  rating,
  saved,
  prizePool,
  nav,
  user,
  unread,
}: {
  heroImages: string[]
  featuredImages: string[]
  /** Supplied photographs for the industry cards, keyed by category slug. */
  industryImages: Record<string, string>
  projects: ProjectRow[]
  designers: HomeDesigner[]
  industryCount: Record<string, number>
  categoryCount: (group?: string) => number
  rating: Record<string, { avg: number; count: number }>
  saved: Set<string>
  /** Live competition prize pool for the Design Challenge banner (null = none). */
  prizePool: number | null
  nav: DrawerNavItem[]
  user: DrawerUser
  unread: number
}) {
  const signedIn = Boolean(user)
  const cards = CATEGORY_ORDER.map((label) => PRODUCT_CARDS.find((c) => c.label === label)).filter(
    (c): c is (typeof PRODUCT_CARDS)[number] => Boolean(c)
  )

  return (
    <div className="bg-white md:hidden">
      {/* ═══════════ hero ═══════════ */}
      <MobileHero images={heroImages}>
        <div className="flex min-h-[430px] flex-col px-4 pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
          {/* header row — logo · inline search · bell · menu */}
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="ArchFacing — home" className="shrink-0">
              <Image src={LOGO_URL} alt="ArchFacing" width={58} height={33} priority className="object-contain" />
            </Link>

            <Link
              href="/projects"
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/15 px-3 text-white/85 ring-1 ring-white/25 backdrop-blur-sm"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span className="truncate text-[12.5px]">Search projects, products…</span>
            </Link>

            <Link
              href={signedIn ? '/dashboard/notifications' : '/login?next=%2Fdashboard%2Fnotifications'}
              aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
              {unread > 0 && (
                <span className="tabular absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            <MobileNavDrawer items={nav} user={user} tone="light" className="shrink-0 -mr-1" />
          </div>

          {/* copy — vertically centred in the space below the header */}
          <div className="my-auto">
            <p className="text-[11px] font-medium uppercase leading-[1.55] tracking-[0.06em] text-white/90">
              <span className="text-brand">India’s</span> most trusted
              <br />
              architecture <span className="text-brand">ecosystem</span>
            </p>
            <h1 className="mt-3 font-display text-[29px] font-light leading-[1.16] tracking-[-0.01em] text-white">
              Where ideas
              <br />
              take shape.
              <br />
              <span className="text-brand">Build</span> better.
              <br />
              Together.
            </h1>
            <Link href="/projects" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white bg-transparent px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/10">
              Explore Projects
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </MobileHero>

      {/* ═══════════ the white sheet ═══════════ */}
      <div className="relative z-10 -mt-5 rounded-t-[22px] bg-white px-4 pt-5">
        {/* quick links */}
        <ul className="grid grid-cols-5 gap-2">
          {QUICK.map((q) => (
            <li key={q.label}>
              <Link href={q.href} className="flex flex-col items-center gap-2">
                <span className="flex aspect-square w-full max-w-[56px] items-center justify-center rounded-2xl bg-paper-3 shadow-[inset_0_0_0_1px_rgba(17,24,39,.04)]">
                  {q.icon}
                </span>
                <span className="text-center text-[11.5px] font-medium leading-tight text-ink">{q.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* explore by industry */}
        <section className="mt-6">
          <SectionHead title="Explore by Industry" href="/projects" />
          <SnapRail label="Industries" itemClassName="w-[30%]" dots={false} className="mt-3">
            {INDUSTRIES.map((ind) => (
              <Link key={ind.slug} href={`/projects?category=${ind.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-navy shadow-card">
                <Image
                  src={industryImages[ind.slug] ?? unsplash(ind.photo, { w: 320, h: 340, q: 70 })}
                  alt=""
                  fill
                  sizes="25vw"
                  unoptimized={Boolean(industryImages[ind.slug])}
                  className="object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-transparent" />
                <span className="absolute inset-x-2 bottom-2">
                  <span className="block truncate text-[11px] font-bold text-white">{ind.label}</span>
                  <span className="block text-[10px] text-white/80">{shortCount(industryCount[ind.slug] ?? 0)} Projects</span>
                </span>
              </Link>
            ))}
          </SnapRail>
        </section>

        {/* browse categories */}
        <section className="mt-6">
          <SectionHead title="Browse Categories" href="/products" />
          <SnapRail label="Product categories" itemClassName="w-[23.5%]" dots={false} className="mt-3">
            {cards.map((c) => (
              <Link
                key={c.label}
                href={c.group ? `/products?group=${c.group}` : '/products'}
                className="block h-full overflow-hidden rounded-[14px] border border-line bg-white shadow-card"
              >
                <span className="relative block aspect-[4/3] bg-paper-3">
                  <Image src={c.image ?? unsplash(c.photo, { w: 320, h: 240, q: 70 })} alt="" fill sizes="25vw" unoptimized={Boolean(c.image)} className="object-cover" />
                </span>
                <span className="block px-1.5 pb-2 pt-1.5">
                  <span className="line-clamp-2 min-h-[2.5em] text-[11px] font-semibold leading-[1.25] text-ink">{c.label}</span>
                  <span className="mt-0.5 block text-[10px] text-ink-3">{shortCount(categoryCount(c.group))} Products</span>
                </span>
              </Link>
            ))}
          </SnapRail>
        </section>

        {/* featured projects */}
        {projects.length > 0 && (
          <section className="mt-6">
            <SectionHead title="Featured Projects" href="/projects" />
            <SnapRail label="Featured projects" itemClassName="w-[43%]" className="mt-3">
              {projects.map((p, i) => {
                const m = projectMeta(p.meta)
                const place = p.city ?? placeLine(p.city, p.state)
                return (
                  <div key={p.id} className="relative h-full overflow-hidden rounded-[16px] border border-line bg-white shadow-card">
                    <Link href={`/projects/${p.slug}`} className="block">
                      <span className="relative block aspect-square bg-paper-3">
                        <Image
                          src={featuredImages[i] ?? photoSrc(m.coverImage, { w: 400, h: 500 })}
                          alt=""
                          fill
                          sizes="43vw"
                          unoptimized={Boolean(featuredImages[i])}
                          className="object-cover"
                        />
                        <span className={cn('absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold', TAG_TONE[p.category] ?? 'bg-navy text-white')}>
                          {tagFor(p.category, m.categoryLabel)}
                        </span>
                      </span>
                      <span className="block px-2.5 pb-2.5 pt-2">
                        <span className="block truncate text-[12px] font-bold text-ink">{p.title}</span>
                        {place && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] text-ink-3">
                            <PinIcon />
                            <span className="truncate">{place}</span>
                          </span>
                        )}
                      </span>
                    </Link>
                    <SaveToggle
                      postId={p.id}
                      initialSaved={saved.has(p.id)}
                      path="/"
                      noun="project"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-2 shadow-card"
                      savedClassName="!text-brand [&_svg]:fill-current"
                      icon={<HeartIcon />}
                    />
                  </div>
                )
              })}
            </SnapRail>
          </section>
        )}

        {/* top designers */}
        {designers.length > 0 && (
          <section className="mt-6">
            <SectionHead title="Top Designers & Associates" href="/designers-associates" />
            <SnapRail label="Top designers and associates" itemClassName="w-[23.5%]" className="mt-3">
              {designers.map((d) => {
                const r = rating[d.id]
                const secondary = d.firmName && d.firmName !== d.name ? d.firmName : d.specialty
                return (
                  <Link
                    key={d.id}
                    href={d.slug ? `/${d.slug}` : '/designers-associates'}
                    className="flex h-full flex-col items-center rounded-[14px] border border-line bg-white px-1.5 pb-2.5 pt-3 text-center shadow-card"
                  >
                    <span className="relative">
                      <span className="relative flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-navy text-[15px] font-bold text-white">
                        {d.photo ? <Image src={photoSrc(d.photo, { w: 120, h: 120 })} alt="" fill sizes="52px" className="object-cover" /> : d.initials}
                      </span>
                      {d.verified && (
                        <span className="absolute -bottom-0.5 -right-1 flex rounded-full bg-white p-px">
                          <VerifiedTick className="h-[18px] w-[18px]" tone={d.badgeTone} />
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block w-full truncate text-[10.5px] font-semibold text-ink">{d.name}</span>
                    <span className="block w-full truncate text-[9px] text-ink-3">{secondary}</span>
                    <span className="mt-1 flex items-center gap-0.5 text-[10px] text-ink-2">
                      <StarIcon />
                      {r ? (
                        <>
                          <span className="font-semibold">{r.avg.toFixed(1)}</span>
                          <span className="text-ink-3">({r.count})</span>
                        </>
                      ) : (
                        <span className="text-ink-3">New</span>
                      )}
                    </span>
                    {d.location && (
                      <span className="mt-0.5 flex w-full items-center justify-center gap-0.5 text-[9.5px] text-ink-3">
                        <PinIcon />
                        <span className="truncate">{d.location.split(',')[0]}</span>
                      </span>
                    )}
                  </Link>
                )
              })}
            </SnapRail>
          </section>
        )}

        {/* showcase your talent — design challenge (per reference) */}
        <section className="relative isolate mt-6 overflow-hidden rounded-[16px] bg-navy p-4 text-white">
          <Image
            src="https://ik.imagekit.io/archfacingb2b/comptetion.png"
            alt=""
            fill
            sizes="100vw"
            unoptimized
            className="-z-10 object-cover object-center"
          />
          {/* Dark only behind the copy on the left; clears by ~62% so the
              building on the right stays visible. */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(9,20,45,0.92) 0%, rgba(9,20,45,0.7) 34%, rgba(9,20,45,0.25) 52%, rgba(9,20,45,0) 64%)',
            }}
          />
          {/* a soft wash in the top-right corner, behind the prize chip */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{ backgroundImage: 'radial-gradient(ellipse 60% 55% at top right, rgba(9,20,45,0.7) 0%, rgba(9,20,45,0) 60%)' }}
          />
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-brand">ArchFacing Design Challenge 2026</p>

          {/* prize pool chip — trophy + figure, top-right */}
          <div className="mt-2.5 flex items-start justify-between gap-3">
            <h2 className="font-display text-[16px] font-medium leading-[1.25] tracking-[-0.01em] text-white [&>span]:block [&>span]:whitespace-nowrap">
              <span>Showcase Your Talent.</span>
              <span>Win Recognition.</span>
            </h2>
            <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-white/12 bg-navy/70 px-2 py-1.5 backdrop-blur-sm">
              <span aria-hidden className="text-[16px] leading-none">🏆</span>
              <span className="text-left">
                <span className="block text-[7px] uppercase tracking-wide text-white/55">Prize Pool</span>
                <span className="tabular block font-display text-[12px] font-bold leading-tight text-white">
                  {prizePool ? `₹${prizePool.toLocaleString('en-IN')}` : 'TBA'}
                </span>
                <span className="block text-[7px] text-white/55">+ More Rewards</span>
              </span>
            </div>
          </div>

          <ul className="mt-3 flex max-w-[66%] flex-col gap-1.5">
            {['Open for Architects, Designers & Students', 'Exciting Prizes & Global Exposure'].map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[10px] leading-tight text-white/85">
                <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>

          <Link href="/competition" className="mt-3.5 inline-flex rounded-lg bg-brand px-4 py-2 text-[11.5px] font-semibold text-white">
            Participate Now
          </Link>
        </section>

        {/* artistry, culture & heritage */}
        <section className="mt-6">
          <SectionHead title="Artistry, Culture & Heritage" href="/artistry" />
          <SnapRail label="Artistry, culture and heritage" itemClassName="w-[31%]" dots={false} className="mt-3">
            {ARTISTRY_CARDS.slice(0, 3).map((a) => (
              <Link
                key={a.label}
                href={a.sub ? `/artistry?category=${a.category}&sub=${a.sub}` : `/artistry?category=${a.category}`}
                className="block h-full overflow-hidden rounded-[14px] border border-line bg-white shadow-card"
              >
                <span className="relative block aspect-[4/3] bg-paper-3">
                  <Image src={unsplash(a.photo, { w: 360, h: 270, q: 70 })} alt="" fill sizes="31vw" className="object-cover" />
                </span>
                <span className="block px-1.5 py-2 text-center">
                  <span className="line-clamp-2 text-[10.5px] font-semibold leading-[1.25] text-ink">{a.label}</span>
                </span>
              </Link>
            ))}
          </SnapRail>
        </section>

        {/* marketplace intelligence — moved below artistry (client request) */}
        <section className="-mx-1 mt-6 rounded-[18px] bg-admin-bg px-2.5 pb-4 pt-3.5 text-white">
          <div className="px-1"><SectionHead title="Marketplace Intelligence" href="/projects" dark /></div>
          <ul lang="en" className="mt-3 grid grid-cols-6 gap-1">
            {INTEL.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex flex-col items-center gap-1.5">
                  <span className="flex h-10 w-full items-center justify-center rounded-xl bg-white/[0.06]">{t.icon}</span>
                  <span className="w-full text-center text-[9px] font-medium leading-[1.25] text-white/90 [hyphens:auto]">{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* join */}
        <section className="mt-6 flex items-center gap-2 overflow-hidden rounded-[16px] bg-navy-soft px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-bold text-ink">Join Our Growing Community</h2>
            <p className="mt-0.5 text-[11px] text-ink-2">Connect. Collaborate. Grow Together</p>
            <ul className="mt-2 flex flex-col gap-1">
              {['Access exclusive leads & projects', 'Showcase your products & services', 'Build strong business relationships'].map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-[10.5px] text-ink-2">
                  <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {t}
                </li>
              ))}
            </ul>
            <Link href={signedIn ? '/dashboard/membership' : '/register'} className="mt-3 inline-flex rounded-lg bg-navy px-4 py-2 text-[12px] font-semibold text-white">
              {signedIn ? 'See Plans' : 'Join Now'}
            </Link>
          </div>
          <CommunityArt />
        </section>
      </div>
    </div>
  )
}

// ─── pieces ───

/** The card tag: the taxonomy name, or the category as the member typed it. */
function tagFor(category: string, metaLabel: string): string {
  // Any level of the project tree — some posts file under a sub-category slug.
  const find = (nodes: typeof PROJECT_CATEGORIES): string | undefined => {
    for (const n of nodes) {
      if (n.slug === category) return n.name
      const hit = n.children ? find(n.children) : undefined
      if (hit) return hit
    }
    return undefined
  }
  const name = find(PROJECT_CATEGORIES)
  if (name) return name
  if (metaLabel && metaLabel !== 'Project') return metaLabel
  return /^[a-z0-9-]+$/.test(category)
    ? category.replace(/^int-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : category
}

function SectionHead({ title, href, dark }: { title: string; href: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={cn('text-[15px] font-semibold', dark ? 'text-white' : 'text-ink')}>{title}</h2>
      <Link href={href} className={cn('flex shrink-0 items-center gap-1 text-[12px] font-medium', dark ? 'text-white' : 'text-ink')}>
        View All
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-brand" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </Link>
    </div>
  )
}

const CATEGORY_ORDER = ['Building Materials', 'Interior Products', 'Sanitaryware', 'Lighting Solutions', 'Hardware & Fittings', 'Furniture & Decor']

const TAG_TONE: Record<string, string> = {
  residential: 'bg-ok text-white',
  'commercial-offices': 'bg-info text-white',
  hospitality: 'bg-pact text-white',
  landscaped: 'bg-ok text-white',
  'education-sports': 'bg-warn text-white',
}

const sv = { viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

const QUICK: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: 'Projects',
    href: '/projects',
    icon: <svg {...sv} className="h-7 w-7 stroke-rose-500"><path d="M4 21V8l6-3v16M10 21V3l10 4v14M3 21h18" /><path d="M13 9h1M16 9h1M13 12h1M16 12h1M13 15h1M16 15h1M6.5 11h1M6.5 14h1" /></svg>,
  },
  {
    label: 'Products',
    href: '/products',
    icon: <svg {...sv} className="h-7 w-7 stroke-teal-500"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></svg>,
  },
  {
    label: 'Professionals',
    href: '/designers-associates',
    icon: <svg {...sv} className="h-7 w-7 stroke-violet-500"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" /></svg>,
  },
  {
    label: 'Artistry',
    href: '/artistry',
    icon: <svg {...sv} className="h-7 w-7 stroke-rose-500"><path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.6-2-.5-1.3.4-2.5 1.8-2.5H18a3 3 0 003-3C21 7.5 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></svg>,
  },
  {
    label: 'Competition',
    href: '/competition',
    icon: <svg {...sv} className="h-7 w-7 stroke-amber-500"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4" /></svg>,
  },
]

const ic = 'h-[22px] w-[22px] stroke-brand'
const INTEL: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: 'Trending Products', href: '/products?sort=popular', icon: <svg {...sv} className={ic}><path d="M12 22c4 0 7-2.8 7-6.8 0-3.4-2.4-5.8-4-7.7-.4 1.6-1.3 2.6-2.3 3C13.4 7.6 12 4.5 9.5 2.5 9.8 6 5 8.6 5 14.8 5 18.9 8 22 12 22z" /></svg> },
  { label: 'Trending Projects', href: '/projects?sort=likes', icon: <svg {...sv} className={ic}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2.5h6V4M8.5 10h7M8.5 14h4M14 16l2-2.5 2 2.5" /></svg> },
  { label: 'Top Designers', href: '/designers-associates', icon: <svg {...sv} className={ic}><circle cx="11" cy="7" r="4" /><path d="M3 21c0-4.4 3.6-7 8-7M15.5 18.5l2 2 4-4" /></svg> },
  { label: 'Growing Categories', href: '/products', icon: <svg {...sv} className={ic}><path d="M4 20V14M9 20V10M14 20V12M19 20V7M3 10l6-5 5 3 7-5" /></svg> },
  { label: 'Govt. Opportunities', href: '/around-us?category=new-development&sub=e-tender', icon: <svg {...sv} className={ic}><path d="M3 21h18M4 10h16M12 3l8 4H4zM6 10v8M10 10v8M14 10v8M18 10v8" /></svg> },
  { label: 'Most Viewed', href: '/projects?sort=views', icon: <svg {...sv} className={ic}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg> },
]

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="2.5" /></svg>
}
function StarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 text-brand" fill="currentColor"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" /></svg>
}
function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>
}

/** The four-people network on the right of the Join card. */
function CommunityArt() {
  const person = (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-navy" fill="currentColor">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
    </svg>
  )
  return (
    <div aria-hidden className="relative h-[104px] w-[104px] shrink-0">
      <span className="absolute inset-[10px] rounded-full border border-dashed border-navy/30" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy/40" />
      {[
        'left-1/2 top-0 -translate-x-1/2',
        'left-0 top-1/2 -translate-y-1/2',
        'right-0 top-1/2 -translate-y-1/2',
        'bottom-0 left-1/2 -translate-x-1/2',
      ].map((pos) => (
        <span key={pos} className={cn('absolute flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card', pos)}>
          {person}
        </span>
      ))}
      {['left-[16px] top-[16px] bg-brand', 'right-[16px] top-[16px] bg-navy', 'bottom-[16px] left-[16px] bg-navy', 'bottom-[16px] right-[16px] bg-brand'].map((pos) => (
        <span key={pos} className={cn('absolute h-1.5 w-1.5 rounded-full', pos)} />
      ))}
    </div>
  )
}
