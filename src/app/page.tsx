import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { EmptyState } from '@/components/ui'
import { Glyph } from '@/components/projects'
import { HeroSlider } from '@/components/hero-slider'
import {
  ARTISTRY_CARDS,
  ArtistryCard,
  CategoryCard,
  DesignerCard,
  FeaturedProjectCard,
  HERO_CARDS,
  HeroCard,
  HomeIcon,
  HomeSectionHead,
  INDUSTRIES,
  IndustryCard,
  IntelligenceTile,
  PRODUCT_CARDS,
  Rail,
  RailArrows,
  TickLine,
} from '@/components/home'
import { getHomeData, inCount, inRupees } from '@/lib/home'
import { cn } from '@/lib/utils'
import { platformStats, statValue } from '@/lib/platform-stats'
import { groupCount, productCounts, PRODUCT_GROUPS } from '@/lib/products'
import { ARTICLE_PHOTOS, PROJECT_PHOTOS, unsplash } from '@/config/content-media'
import { getBrandLogos } from '@/lib/brand-logos'
import { auth } from '@/lib/auth'
import { MobileHome } from '@/components/mobile/mobile-home'
import { mobileHomeExtras } from '@/lib/mobile-home'
import { drawerItems, mobileSession } from '@/lib/mobile-shell'

/**
 * The ArchFacing home page.
 *
 * ★ Server Component, no client JavaScript. The hero, the featured projects
 *   and the designers row are scroll-snap rails moved by `#id` anchors, never
 *   by a slider script — see `Rail` and `RailArrows` in
 *   `src/components/home.tsx`.
 *
 * ★ Wired to the database. Featured Projects come from `listProjects()`, the
 *   designers from real verified `ProfessionalProfile` rows, and the counters
 *   marked LIVE below are read at render time. Every read goes through
 *   `getHomeData()`, which contains its own failures — the Products and
 *   Competition catalogues are seeded by other workstreams and may be empty
 *   or absent, and neither can take this page down.
 *
 * ★ Everything on the page that is NOT live is collected in `MARKETING` in
 *   `src/components/home.tsx`, so no headline figure can be mistaken for a
 *   database count.
 */

/** The hero background slider — the two banners the client supplied. */
const HERO_BANNERS: string[] = [
  'https://ik.imagekit.io/archfacing/Aroud%20bnnner.png?updatedAt=1784750631877',
  'https://ik.imagekit.io/archfacing/around%20us%20banner%201.png?updatedAt=1784753557073',
]

/** Featured Projects card images (ImageKit), used in order over the live rows. */
const FEATURED_IMAGES: string[] = [
  'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Majestic%20Heritage%20Palace.png?updatedAt=1784864243669',
  'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Contemporary%20Villa%20Design.png?updatedAt=1784864243681',
  'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Corporate%20Office%20Building.png?updatedAt=1784864243428',
  'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Luxury%20Resort%20&%20Spa.png?updatedAt=1784864243739',
]

export const metadata: Metadata = {
  title: 'ArchFacing — Design. Build. Connect.',
  description:
    'India’s B2B marketplace for architecture and interior design. Explore ' +
    'projects, source building materials, and connect with verified ' +
    'architects, designers, manufacturers and suppliers in your PIN code.',
}

export default async function HomePage() {
  const { projects, designers, counts, prizePool } = await getHomeData()

  /*
   * Live figures for the hero trust band and the Browse Categories tiles.
   * Both used to carry hand-written numbers that disagreed with the live
   * counts printed on /products and /projects.
   */
  const [stats, productGroupCounts, logos, phone] = await Promise.all([
    platformStats(),
    productCounts(),
    // Managed from Admin → Website Settings → Trusted Brands.
    getBrandLogos(),
    mobileSession(),
  ])
  const cardCount = (group?: string) => {
    const g = PRODUCT_GROUPS.find((x) => x.value === group)
    // A card with no matching group has no honest count — it links to the
    // full catalogue and says so instead of borrowing the total.
    return g ? groupCount(g, productGroupCounts) : 0
  }

  /**
   * §5 — Marketplace Intelligence.
   *
   * LIVE:    Trending Projects · Top Designers · Growing Categories ·
   *          Active Competitions · Most Viewed
   * LIVE:    Govt Opportunities — Around Us posts under Government Policies
   *          and E-Tender. Trending Products — the PRODUCT count, even at 0.
   */
  const intelligence: { icon: Parameters<typeof HomeIcon>[0]['name']; label: string; value: string }[] = [
    {
      icon: 'boxCheck',
      label: 'Trending Products',
      value: `${inCount(counts.products)} New`,
    },
    { icon: 'building', label: 'Trending Projects', value: `${inCount(counts.projects)} New` },
    { icon: 'users', label: 'Top Designers', value: `${inCount(counts.designers)}+` },
    { icon: 'grid', label: 'Growing Categories', value: `${inCount(counts.categories)}+` },
    { icon: 'file', label: 'Govt Opportunities', value: `${inCount(counts.govt)} New` },
    { icon: 'trophy', label: 'Active Competitions', value: `${inCount(counts.competitions)} Live` },
    { icon: 'eye', label: 'Most Viewed', value: inCount(counts.views) },
  ]

  // Phone layout — counted extras (industry counts, ratings, saved hearts).
  const extras = await mobileHomeExtras({
    industrySlugs: INDUSTRIES.map((i) => i.slug),
    designerIds: designers.map((d) => d.id),
    projectIds: projects.map((p) => p.id),
    userId: (await auth())?.user?.id,
  })

  /** The rail only overflows past four cards, so the arrows only exist then. */
  const projectsOverflow = projects.length > 4

  return (
    <>
      {/* Phones get the PWA home below; the site header is drawn inside its hero. */}
      <SiteHeader hideOnPhone />

      <MobileHome
        heroImages={[FEATURED_IMAGES[1], FEATURED_IMAGES[0], FEATURED_IMAGES[2], FEATURED_IMAGES[3]]}
        featuredImages={FEATURED_IMAGES}
        industryImages={{
          residential: FEATURED_IMAGES[1],
          'commercial-offices': FEATURED_IMAGES[2],
          hospitality: FEATURED_IMAGES[3],
        }}
        projects={projects}
        designers={designers}
        industryCount={extras.industryCount}
        categoryCount={cardCount}
        rating={extras.rating}
        saved={extras.saved}
        nav={drawerItems()}
        user={phone.user}
        unread={phone.unread}
      />

      <main className="hidden md:block">
        {/* ══════════════════════════════════════════════
            §1 — HERO  (exact blueprint geometry: 1240×460, left 690/max-500,
            right card column 380, cards 380×118, gap 10, right margin 18)
            ══════════════════════════════════════════════ */}
        <div className="container-af">
          <HeroSlider images={HERO_BANNERS}>
            <div className="relative z-10 mx-auto max-w-[1240px] md:h-[400px] lg:h-[460px]">
              {/* LEFT CONTENT — max 500px, never runs under the card column */}
              <div className="max-w-[520px] px-5 py-10 md:absolute md:left-7 md:top-1/2 md:max-w-[380px] md:-translate-y-1/2 md:px-0 md:py-0 lg:left-10 lg:max-w-[540px]">
                <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-brand md:text-[10px]">
                  India&apos;s Most Trusted Architecture Ecosystem
                </p>
                <h1 className="font-display text-[28px] font-medium leading-[1.12] tracking-tight text-white sm:text-[32px] md:whitespace-nowrap md:text-[27px] lg:text-[40px]">
                  Ideas Into Spaces.
                  <br />
                  <span className="text-brand">Spaces Into Possibilities.</span>
                </h1>
                <p className="mt-5 max-w-md text-[13px] leading-relaxed text-white/90">
                  The one-stop platform for Architects, Designers, Manufacturers,
                  Suppliers &amp; Professionals to build a stronger industry together.
                </p>
                <div className="mt-6 flex gap-2.5">
                  <Link href="/projects" className="btn-primary shrink-0 px-4 py-2.5 text-[12.5px]">
                    Explore Projects
                    <Glyph name="right" className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/register?type=professional" className="btn-on-navy shrink-0 px-4 py-2.5 text-[12.5px]">
                    Join as a Professional
                  </Link>
                </div>
                {/* Trust stats — fills the vertical space and balances the left
                    column against the card stack on the right */}
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span className="flex flex-col leading-none">
                    <span className="font-display text-[19px] font-bold text-white">{statValue(stats.projects)}</span>
                    <span className="mt-1.5 text-[10.5px] text-white/70">Projects</span>
                  </span>
                  <span className="h-8 w-px bg-white/20" />
                  <span className="flex flex-col leading-none">
                    <span className="font-display text-[19px] font-bold text-white">{statValue(stats.members)}</span>
                    <span className="mt-1.5 text-[10.5px] text-white/70">Professionals</span>
                  </span>
                  <span className="h-8 w-px bg-white/20" />
                  <span className="flex flex-col leading-none">
                    <span className="font-display text-[19px] font-bold text-white">{statValue(stats.pincodes)}</span>
                    <span className="mt-1.5 text-[10.5px] text-white/70">PIN Codes</span>
                  </span>
                </div>
              </div>

              {/* RIGHT CARDS — tablet & desktop: absolute, vertically centered
                  (scaled to 320px on the tablet, exact 380px on the computer) */}
              <div className="hidden md:absolute md:right-[18px] md:top-1/2 md:flex md:w-[310px] md:-translate-y-1/2 md:flex-col md:gap-[10px] lg:w-[380px]">
                {HERO_CARDS.map((card) => (
                  <HeroCard key={card.title} card={card} />
                ))}
              </div>
            </div>
          </HeroSlider>

          {/* MOBILE CARDS — a separate stacked layout below the hero on phones */}
          <div className="mt-3 flex flex-col gap-[10px] md:hidden">
            {HERO_CARDS.map((card) => (
              <HeroCard key={card.title} card={card} />
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            §4 — EXPLORE BY INDUSTRY
            ══════════════════════════════════════════════ */}
        <section className="border-y border-line bg-paper-2">
          <div className="container-af py-5">
            <HomeSectionHead
              title="Explore by Industry"
              action={{ label: 'View All Industries', href: '/projects' }}
            />

            {/* All eight across on a computer, matching the blueprint's single
                band of industries. */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
              {INDUSTRIES.map((item) => (
                <li key={item.slug} className="min-w-0">
                  <IndustryCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            §5 — MARKETPLACE INTELLIGENCE
            ══════════════════════════════════════════════ */}
        <section className="container-af py-5">
          <div className="rounded-card bg-gradient-dark p-6 md:p-8">
            <HomeSectionHead
              title={<>Marketplace <span className="text-brand">Intelligence</span></>}
              tone="dark"
            />

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:gap-0 md:divide-x md:divide-white/10">
              {intelligence.map((t) => (
                <IntelligenceTile key={t.label} icon={t.icon} label={t.label} value={t.value} />
              ))}
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            §6 — BROWSE CATEGORIES
            ══════════════════════════════════════════════ */}
        <section className="container-af py-5">
          <HomeSectionHead
            title={<>Browse <span className="text-brand">Categories</span></>}
            action={{ label: 'View All Categories', href: '/products' }}
          />

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {PRODUCT_CARDS.map((item) => (
              <li key={item.countKey} className="min-w-0">
                <CategoryCard item={item} count={cardCount(item.group)} />
              </li>
            ))}
          </ul>
        </section>

        {/* ══════════════════════════════════════════════
            §7 — FEATURED PROJECTS  (live, from listProjects)
            ══════════════════════════════════════════════ */}
        <section className="border-y border-line bg-paper-2">
          <div className="container-af py-5">
            <HomeSectionHead
              title={<>Featured <span className="text-brand">Projects</span></>}
              action={{ label: 'View All Projects', href: '/projects' }}
              aside={
                projectsOverflow ? (
                  <RailArrows
                    firstId="featured-project-first"
                    lastId="featured-project-last"
                    what="featured project"
                  />
                ) : null
              }
            />

            {projects.length === 0 ? (
              <EmptyState icon="grid" title="No projects published yet">
                Projects appear here the moment the first one is approved.
              </EmptyState>
            ) : (
              <Rail label="Featured projects">
                {projects.map((post, i) => (
                  <li
                    key={post.id}
                    /* The id sits on the <li> because that is the element
                       carrying scroll-mt — the arrows above target it, and the
                       margin keeps the sticky header off the card. */
                    id={
                      i === 0
                        ? 'featured-project-first'
                        : i === projects.length - 1
                          ? 'featured-project-last'
                          : undefined
                    }
                    className="w-[80%] shrink-0 snap-start scroll-mt-24
                               sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-3rem)/4)]"
                  >
                    <FeaturedProjectCard post={post} image={FEATURED_IMAGES[i]} />
                  </li>
                ))}
              </Rail>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            §8 — TOP DESIGNERS & ASSOCIATES  (live professionals)
            ══════════════════════════════════════════════ */}
        <section className="container-af py-5">
          <HomeSectionHead
            title="Top Designers & Associates"
            action={{ label: 'View All Designers', href: '/designers-associates' }}
          />

          {designers.length === 0 ? (
            <EmptyState icon="users" title="No verified professionals yet">
              Professionals appear here once their profile has been verified.
            </EmptyState>
          ) : (
            <Rail label="Top designers and associates">
              {designers.map((d) => (
                <li
                  key={d.id}
                  className="w-[70%] shrink-0 snap-start scroll-mt-24
                             sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-4rem)/5)]"
                >
                  <DesignerCard designer={d} />
                </li>
              ))}
            </Rail>
          )}
        </section>

        {/* ══════════════════════════════════════════════
            §9 — DESIGN CHALLENGE
            ══════════════════════════════════════════════ */}
        <section className="container-af py-5">
          <div className="relative isolate overflow-hidden rounded-card bg-navy">
            {/* No gradient — the banner is shown clean, as the reference draws it. */}
            <Image
              src="https://ik.imagekit.io/archfacing/comptetion%20banner.png?updatedAt=1784872675883"
              alt=""
              fill
              sizes="100vw"
              unoptimized
              className="-z-10 object-cover object-[center_22%]"
            />

            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1.5fr_1fr] md:items-center">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
                  ArchFacing Design Challenge 2026
                </p>

                <h2 className="mt-2.5 font-display text-[22px] font-bold leading-[1.1] tracking-tight text-white sm:text-[26px] md:text-[22px] lg:text-[28px]">
                  Showcase Your Talent.
                  <br />
                  Win Recognition.
                </h2>

                <ul className="mt-4 flex flex-col gap-1.5">
                  <TickLine>Open for Architects, Designers &amp; Students</TickLine>
                  <TickLine>Exciting Prizes &amp; Global Exposure</TickLine>
                </ul>

                <Link href="/competition" className="btn-primary mt-5 px-4 py-2 text-[13px]">
                  Participate Now
                  <Glyph name="right" className="h-4 w-4" />
                </Link>
              </div>

              {/* Prize card — trophy on the left, the figure stacked to the
                  right, on a dark rounded panel, exactly as the reference. */}
              <div className="flex min-w-0 items-center gap-2 rounded-card border border-white/12 bg-navy/70 p-5 backdrop-blur-sm md:ml-auto md:max-w-[320px]">
                <Image
                  src="https://ik.imagekit.io/archfacing/Icon/winner%20trophy.png?updatedAt=1784864786424"
                  alt="Trophy"
                  width={96}
                  height={96}
                  unoptimized
                  className="-mx-2 h-[72px] w-[72px] shrink-0 object-contain"
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
                    Prize Pool
                  </span>
                  {/*
                    LIVE when any open competition carries prize money —
                    `getHomeData()` sums Post.prizeMoney across them. Falls back
                    to "To be announced" — never an invented figure.
                  */}
                  <span className={cn('tabular mt-1 block font-display font-bold leading-none text-white', prizePool ? 'text-[28px]' : 'text-[20px]')}>
                    {prizePool ? inRupees(prizePool) : 'To be announced'}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] text-white/60">+ More Rewards</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            §10 — ARTISTRY, CULTURE & HERITAGE
            ══════════════════════════════════════════════ */}
        <section className="border-y border-line bg-paper-2">
          <div className="container-af py-5">
            <HomeSectionHead
              title="Artistry, Culture & Heritage"
              action={{ label: 'Explore More', href: '/artistry' }}
            />

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {ARTISTRY_CARDS.map((item) => (
                <li key={item.label} className="min-w-0">
                  <ArtistryCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            §12 — TRUSTED BY  (real brand logos)
            ══════════════════════════════════════════════ */}
        {/* -mb-5 trims the footer's global 40px top margin to the 20px asked
            for between the logos and the footer. */}
        {logos.length > 0 && (
        <section id="trusted-brands" className="-mb-5 border-t border-line bg-paper-2 py-5">
          <div className="container-af">
            <p className="mb-6 text-center font-display text-[13px] font-bold uppercase tracking-[0.09em] text-ink-3">
              Trusted by Leading Brands &amp; Organisations
            </p>
          </div>
          {/* Full-width, continuously auto-sliding logo marquee. Two copies of
              the logos in the track loop seamlessly (translate -50%); each logo
              carries its own right margin so both halves are identical. Hover
              pauses it; reduced-motion switches it off. */}
          <div className="af-marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
            <div className="af-marquee-track flex w-max">
              {[...logos, ...logos].map((b, i) => {
                /* Padded and contained: any logo, any shape, sits centred
                   inside the tile instead of running into its edges. */
                const tile = (
                  <span className="relative mr-4 block h-[70px] w-[160px] shrink-0 overflow-hidden rounded-[10px] border border-line bg-white">
                    <Image src={b.src} alt={b.name} fill sizes="160px" className="object-contain p-3" />
                  </span>
                )
                return b.href ? (
                  <a key={i} href={b.href} target="_blank" rel="noopener noreferrer" aria-hidden={i >= logos.length} tabIndex={i >= logos.length ? -1 : undefined}>{tile}</a>
                ) : (
                  <span key={i} aria-hidden={i >= logos.length}>{tile}</span>
                )
              })}
            </div>
          </div>
        </section>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
