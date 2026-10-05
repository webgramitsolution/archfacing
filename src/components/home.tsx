import Image from 'next/image'
import Link from 'next/link'
import { Glyph, photoSrc, VerifiedTick, type GlyphName } from './projects'
import { cn } from '@/lib/utils'
import { inCount, type HomeDesigner } from '@/lib/home'
import { placeLine, projectMeta, type ProjectRow } from '@/lib/projects'
import {
  ARTICLE_PHOTOS,
  HERITAGE_PHOTOS,
  PRODUCT_PHOTOS,
  PROJECT_PHOTOS,
  unsplash,
} from '@/config/content-media'

/**
 * Everything the home page is built from.
 *
 * The page itself (`src/app/page.tsx`) is a Server Component with no client
 * JavaScript at all, and so is every component in this file. The three
 * "carousels" in the design are horizontal scroll-snap rails moved by plain
 * `#id` anchors — there is no slider library and no `'use client'` anywhere.
 */

// ═══════════════════════════════════════════════════════════
//  MARKETING FIGURES
//
//  ⚠️ NOTHING IN THIS OBJECT IS A LIVE COUNT. Every number here is a
//     headline figure from the design comp. They are collected in one place
//     so they are obviously editable and can never be mistaken for something
//     the database produced.
//
//     Every OTHER number on the home page — featured projects, top designers,
//     the Marketplace Intelligence tiles marked LIVE below, the Design
//     Challenge prize pool — is read from the database at render time by
//     `getHomeData()` in `src/lib/home.ts`.
// ═══════════════════════════════════════════════════════════

// Marketing figures were removed — every number on the page is read from the database.

// ═══════════════════════════════════════════════════════════
//  Glyphs
//
//  `Glyph` in `src/components/projects.tsx` already carries the building,
//  sofa, factory, school, hotel, tree and pin marks this page needs, so it is
//  reused rather than copied. The handful below are the ones it does not
//  have; `HomeIcon` puts both behind a single name space.
// ═══════════════════════════════════════════════════════════

export type HomeGlyphName = 'trophy' | 'medical' | 'news' | 'award' | 'file' | 'clock'

const EXTRA_GLYPHS: Record<HomeGlyphName, React.ReactNode> = {
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 01-12 0z" />
      <path d="M6 5H4a2 2 0 000 4h2M18 5h2a2 2 0 010 4h-2" />
    </>
  ),
  medical: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M12 11v6M9 14h6" />
    </>
  ),
  news: (
    <>
      <path d="M4 5h12a1 1 0 011 1v13a2 2 0 002 2H5a2 2 0 01-2-2V6a1 1 0 011-1z" />
      <path d="M17 8h3a1 1 0 011 1v10a2 2 0 01-2 2M7 9h7M7 13h7M7 17h4" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14.2L7 22l5-2.6L17 22l-1.5-7.8" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
}

export type HomeIconName = GlyphName | HomeGlyphName

/** One glyph set for the whole page — `Glyph`'s marks plus the extras above. */
export function HomeIcon({ name, className }: { name: HomeIconName; className?: string }) {
  if (name in EXTRA_GLYPHS) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn('h-[18px] w-[18px]', className)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {EXTRA_GLYPHS[name as HomeGlyphName]}
      </svg>
    )
  }

  return <Glyph name={name as GlyphName} className={className} />
}

// ═══════════════════════════════════════════════════════════
//  Section furniture
// ═══════════════════════════════════════════════════════════

/** A section title with the design's "View All … →" link on the right. */
export function HomeSectionHead({
  title,
  sub,
  action,
  aside,
  tone = 'light',
}: {
  title: React.ReactNode
  sub?: string
  action?: { label: string; href: string }
  /** Extra controls on the right — the rails put their arrows here. */
  aside?: React.ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2
          className={cn(
            'font-display text-[20px] font-bold leading-tight tracking-tight sm:text-[26px] md:text-[19px] lg:text-[26px]',
            tone === 'dark' ? 'text-white' : 'text-ink'
          )}
        >
          {title}
        </h2>
        {sub && (
          <p
            className={cn(
              'mt-1.5 text-[13.5px] leading-relaxed',
              tone === 'dark' ? 'text-white/60' : 'text-ink-3'
            )}
          >
            {sub}
          </p>
        )}
      </div>

      {(action || aside) && (
        <div className="flex shrink-0 items-center gap-4">
          {action && (
            <Link
              href={action.href}
              className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-brand transition-colors hover:text-brand-hover"
            >
              {action.label}
              <Glyph name="right" className="h-4 w-4" />
            </Link>
          )}
          {aside}
        </div>
      )}
    </div>
  )
}

/**
 * A horizontal scroll-snap rail.
 *
 * This is how every "carousel" in the design is built. The rail is an ordinary
 * overflow-x container with `scroll-snap-type: x mandatory`; a swipe, a
 * trackpad, a shift-scroll or the arrow keys all move it, and the round
 * arrows in the design are `#id` anchors pointing at the first and last card.
 * No JavaScript is involved, so the whole page stays a Server Component.
 *
 * `tabIndex` makes the rail itself focusable, which is what lets a keyboard
 * user scroll it — a scrollable region with no focusable ancestor is
 * otherwise unreachable.
 */
export function Rail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <ul
      tabIndex={0}
      aria-label={label}
      // No edge-to-edge breakout here — this only ever renders inside the
      // `hidden md:block` desktop/tablet <main>, so cancelling the
      // container's own gutter just pushed the cards past the page's
      // left/right margin while every other section on the page kept it.
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain
                 scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </ul>
  )
}

/**
 * The round prev / next controls beside a rail.
 *
 * They are anchors to the rail's first and last card, not buttons — the whole
 * point is that they work with JavaScript switched off. They are only
 * rendered when the rail actually overflows (see the call sites), so there is
 * never a dead control on the page.
 */
export function RailArrows({
  firstId,
  lastId,
  what,
}: {
  firstId: string
  lastId: string
  what: string
}) {
  const base =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line ' +
    'bg-paper-2 text-ink-3 shadow-card transition-colors hover:border-brand hover:text-brand'

  return (
    <div className="flex shrink-0 items-center gap-2">
      <a href={`#${firstId}`} aria-label={`Jump to the first ${what}`} className={base}>
        <Glyph name="chevronLeft" className="h-4 w-4" />
      </a>
      <a href={`#${lastId}`} aria-label={`Jump to the last ${what}`} className={base}>
        <Glyph name="chevronRight" className="h-4 w-4" />
      </a>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  §1 — Hero cards (right column)
// ═══════════════════════════════════════════════════════════

/**
 * The three shortcut cards down the right of the hero. Exact geometry per the
 * UI blueprint: each card 380 × 118, a 145 × 118 image block flush on the left
 * (no gap), then the text + an orange arrow near the right edge.
 */
export const HERO_CARDS: { title: string; body: string; href: string; image: string }[] = [
  { title: 'Explore Projects', body: 'Discover stunning architecture & real-world projects', href: '/projects', image: 'https://ik.imagekit.io/archfacingb2b/home%20page%203card/Explore%20image.png' },
  { title: 'Shop Products', body: 'Wide range of premium building materials & products', href: '/products', image: 'https://ik.imagekit.io/archfacingb2b/home%20page%203card/Shop%20product.png' },
  { title: 'Find Professionals', body: 'Connect with verified architects & designers near you', href: '/designers-associates', image: 'https://ik.imagekit.io/archfacingb2b/home%20page%203card/Find%20Professionals.png' },
]

export function HeroCard({ card, index }: { card: (typeof HERO_CARDS)[number]; index?: number }) {
  return (
    <Link
      href={card.href}
      className="group flex min-h-0 w-full flex-1 items-stretch overflow-hidden rounded-[12px] border-2 border-white bg-white shadow-[0_4px_14px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5"
    >
      {/* Image — flush to the card's left edge, full height; the card's
          overflow-hidden rounds its left corners. */}
      <span className="relative w-[118px] shrink-0 self-stretch overflow-hidden rounded-[10px] bg-paper-3 lg:w-[150px]">
        <Image src={card.image} alt="" fill sizes="150px" unoptimized className="object-cover" />
        {index ? (
          <span className="absolute left-3 top-3 font-display text-[12px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,.5)]">
            {String(index).padStart(2, '0')}
          </span>
        ) : null}
      </span>

      {/* Content — title, description, orange arrow in the bottom-right corner */}
      <span className="relative min-w-0 flex-1 py-3 pl-4 pr-3 lg:py-4 lg:pl-[18px] lg:pr-4">
        <span className="block font-display text-[14.5px] font-semibold leading-[1.25] text-[#092143] lg:text-[16px]">{card.title}</span>
        <span className="mt-1.5 block pr-6 text-[11.5px] leading-[1.5] text-[#667085] line-clamp-3 lg:mt-2 lg:text-[12.5px]">{card.body}</span>
        <Glyph name="right" className="absolute bottom-3 right-3 h-5 w-5 text-[#FF6B00] transition-transform group-hover:translate-x-0.5 lg:bottom-3.5 lg:right-4" />
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §3 — Our Ecosystem
// ═══════════════════════════════════════════════════════════

/**
 * Eight tiles, each pointing at a route that really exists.
 *
 * `chip` is the icon's pastel, straight from the blueprint — every tile a
 * different hue, which is what makes the row read as a map of the platform
 * rather than eight copies of one card.
 */
export const ECOSYSTEM: {
  icon: HomeIconName; label: string; body: string; href: string; chip: string
}[] = [
  { icon: 'building', label: 'Projects', body: 'Explore real projects', href: '/projects', chip: 'bg-[#E0EDFF] text-[#2563EB]' },
  { icon: 'boxCheck', label: 'Products', body: 'Shop premium products', href: '/products', chip: 'bg-[#DCF6EC] text-[#0D9488]' },
  { icon: 'users', label: 'Designers', body: 'Connect with professionals', href: '/designers-associates', chip: 'bg-[#EDE6FF] text-[#7C3AED]' },
  { icon: 'sparkle', label: 'Artistry', body: 'Art, culture & heritage', href: '/artistry', chip: 'bg-[#FDE7F1] text-[#DB2777]' },
  { icon: 'globe', label: 'Around Us', body: 'News, updates & opportunities', href: '/around-us', chip: 'bg-[#FFEEDD] text-[#EA7A14]' },
  { icon: 'pin', label: 'PACT', body: 'Verified business network', href: '/pact', chip: 'bg-[#E3F5DF] text-[#16A34A]' },
  { icon: 'award', label: 'Membership', body: 'Grow with exclusive benefits', href: '/membership', chip: 'bg-[#E7E9FD] text-[#4F46E5]' },
  { icon: 'trophy', label: 'Competition', body: 'Showcase your talent', href: '/competition', chip: 'bg-[#FDE8E8] text-[#DC2626]' },
]

// ═══════════════════════════════════════════════════════════
//  §4 — Explore by Industry
//
//  Every `href` uses a real slug from `PROJECT_CATEGORIES`, so each card
//  lands on a /projects listing that filters rather than a dead end.
//
//  ⚠️ The photography is the closest subject the licensed library carries,
//     not a picture of that building type. Healthcare and Education in
//     particular are stand-ins — swap the ids in `content-media.ts` the day
//     real photography arrives; nothing here needs to change.
// ═══════════════════════════════════════════════════════════

export const INDUSTRIES: {
  icon: HomeIconName
  label: string
  body: string
  slug: string
  photo: string
}[] = [
  { icon: 'home', label: 'Residential', body: 'Build beautiful living spaces', slug: 'residential', photo: PROJECT_PHOTOS.villa },
  { icon: 'briefcase', label: 'Commercial', body: 'Modern work environments', slug: 'commercial-offices', photo: ARTICLE_PHOTOS.workspace },
  { icon: 'hotel', label: 'Hospitality', body: 'Hotels, resorts & restaurants', slug: 'hospitality', photo: PROJECT_PHOTOS.resort },
  { icon: 'medical', label: 'Healthcare', body: 'Hospitals & medical spaces', slug: 'medical-health-care', photo: ARTICLE_PHOTOS.minimalist },
  { icon: 'school', label: 'Education', body: 'Schools & institutions', slug: 'education-sports', photo: ARTICLE_PHOTOS.collaboration },
  { icon: 'building', label: 'Infrastructure', body: 'Smart cities & public spaces', slug: 'public-buildings', photo: PROJECT_PHOTOS.cityScale },
  { icon: 'factory', label: 'Industrial', body: 'Factories & industries', slug: 'industrials-factories', photo: ARTICLE_PHOTOS.construction },
  { icon: 'tree', label: 'Landscape', body: 'Outdoor & green environments', slug: 'landscaped', photo: PROJECT_PHOTOS.gardenHouse },
]

export function IndustryCard({ item }: { item: (typeof INDUSTRIES)[number] }) {
  return (
    <Link
      href={`/projects?category=${item.slug}`}
      className="card-hover group flex min-w-0 flex-col overflow-hidden"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-paper-3">
        <Image
          src={unsplash(item.photo, { w: 640, h: 480, q: 70 })}
          alt=""
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>

      <span className="min-w-0 p-4">
        <span className="block truncate font-display text-[12px] font-bold leading-tight text-ink transition-colors group-hover:text-brand md:text-[10.5px] lg:text-[12px]">
          {item.label}
        </span>
        <span className="mt-1 block text-[10.5px] leading-snug text-ink-3 md:text-[9.5px] lg:text-[10.5px]">{item.body}</span>
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §6 — Browse Categories
//
//  `category` and `sub` are both real PRODUCT slugs from
//  `src/config/taxonomy.ts`, and both are what `/products` filters on.
//  Sanitaryware, Hardware & Fittings and Lighting are sub-categories, so they
//  carry a `sub` as well — otherwise three of the six cards would collide on
//  the same parent.
// ═══════════════════════════════════════════════════════════

export const PRODUCT_CARDS: {
  label: string
  /**
   * A real `PRODUCT_GROUPS` value (`src/lib/products.ts`) — the products page's
   * own category strip. Links go to `/products?group=<group>`, which the page
   * expands to a genuine `category IN (…)` / `subCategory IN (…)` filter.
   * `undefined` (only "Interior Products", which has no matching group yet)
   * links to the unfiltered catalogue rather than a filter that matches nothing.
   */
  group?: string
  /** Stable react key, and the legacy key into MARKETING.categoryCounts. */
  countKey: string
  photo: string
  /** A direct image URL (ImageKit) — overrides `photo` when present. */
  image?: string
}[] = [
  { label: 'Building Materials', group: 'building-materials', countKey: 'structural-products', photo: ARTICLE_PHOTOS.materials, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Building%20Materials.png?updatedAt=1784863328762' },
  { label: 'Interior Products', countKey: 'interior-products', photo: PRODUCT_PHOTOS.living, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Interior%20Products.png?updatedAt=1784863328304' },
  { label: 'Furniture & Decor', group: 'kitchen', countKey: 'furniture-furnishing', photo: PRODUCT_PHOTOS.furniture, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Furniture%20&%20Decor.png?updatedAt=1784863328831' },
  { label: 'Sanitaryware', group: 'bathroom', countKey: 'plumbing-sanitary', photo: PRODUCT_PHOTOS.sanitaryware, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Sanitaryware.png?updatedAt=1784863328541' },
  { label: 'Hardware & Fittings', group: 'doors-windows', countKey: 'hardware-fittings', photo: PRODUCT_PHOTOS.storage, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Hardware%20&%20Fittings.png?updatedAt=1784863327473' },
  { label: 'Lighting Solutions', group: 'lighting', countKey: 'lighting-fixtures', photo: PRODUCT_PHOTOS.livingPendants, image: 'https://ik.imagekit.io/archfacing/Home%20page/Explore%20by%20Industry/Lighting%20Solutions.png?updatedAt=1784863328044' },
]

export function CategoryCard({
  item,
  count,
}: {
  item: (typeof PRODUCT_CARDS)[number]
  /** Live published-product count for this card's group, from the page. */
  count: number
}) {
  const href = item.group ? `/products?group=${item.group}` : '/products'

  return (
    // Reference card: a rounded, bordered, softly-shadowed white card with the
    // image INSET (its own rounded corners and a small margin), and the title
    // + count in a padded body below.
    // Image flush to the top (no padding above it), the title + count in a
    // padded body below. The card keeps its border, shadow and rounded corners.
    <Link
      href={href}
      className="group block min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all hover:border-brand-border hover:shadow-lift"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-paper-3">
        <Image
          src={item.image ?? unsplash(item.photo, { w: 640, h: 480, q: 70 })}
          alt={item.label}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          /* The supplied category PNGs are large; letting Next optimize them
             times out (504). ImageKit is a CDN and already serves them well,
             so these load straight from the source, unoptimized. */
          unoptimized={Boolean(item.image)}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>

      <span className="block min-w-0 px-4 pb-4 pt-3">
        {/* One line — a long category name truncates with an ellipsis. */}
        <span className="block truncate font-display text-[13.5px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">
          {item.label}
        </span>
        {/*
          The live published count for this group. A group with nothing in it
          says so rather than borrowing a marketing figure.
        */}
        <span className="mt-1 block truncate text-[11.5px] text-ink-3 md:text-[10px] lg:text-[11.5px]">
          {count > 0 ? `${count.toLocaleString('en-IN')} Product${count === 1 ? '' : 's'}` : 'Browse catalogue'}
        </span>
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §7 — Featured Projects
// ═══════════════════════════════════════════════════════════

/** The badge colour is per category, so the row reads at a glance. */
const CATEGORY_TONE: Record<string, string> = {
  residential: 'bg-brand text-white',
  interior: 'bg-info text-white',
  'commercial-offices': 'bg-navy text-white',
  hospitality: 'bg-pact text-white',
  landscaped: 'bg-ok text-white',
  'education-sports': 'bg-warn text-white',
  'industrials-factories': 'bg-ink-2 text-white',
}

export function FeaturedProjectCard({ post, image }: { post: ProjectRow; image?: string }) {
  const m = projectMeta(post.meta)
  const place = placeLine(post.city, post.state)

  return (
    // Reference card: image on top with a category badge, then the title and
    // location in a white body below — a bordered, rounded, softly-shadowed
    // card (not an overlay).
    <Link
      href={`/projects/${post.slug}`}
      className="group block h-full min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all hover:border-brand-border hover:shadow-lift"
    >
      <span className="relative block aspect-[16/10] overflow-hidden bg-paper-3">
        <Image
          src={image ?? photoSrc(m.coverImage, { w: 700, h: 440 })}
          alt=""
          fill
          sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 80vw"
          /* The supplied ImageKit PNGs are large; Next optimization times out
             (504), so an overriding image loads straight from the CDN. */
          unoptimized={Boolean(image)}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span
          className={cn(
            'pill absolute left-3 top-3 uppercase tracking-[0.06em]',
            CATEGORY_TONE[post.category] ?? 'bg-navy text-white'
          )}
        >
          {m.categoryLabel}
        </span>
      </span>

      <span className="block min-w-0 p-4">
        <span className="block truncate font-display text-[15px] font-bold leading-tight text-ink transition-colors group-hover:text-brand md:text-[12.5px] lg:text-[15px]">
          {post.title}
        </span>
        {place && (
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3 md:text-[10.5px] lg:text-[12px]">
            <Glyph name="pin" className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate">{place}</span>
          </span>
        )}
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §8 — Top Designers & Associates
// ═══════════════════════════════════════════════════════════

/**
 * ★ There is no rating anywhere in the schema — no `rating` column on
 *   `ProfessionalProfile`, and no reviews table to average. The design puts a
 *   star and a review count on this card, so the star is drawn and the value
 *   reads "—". Inventing a 4.8 here would be fabricating a business metric.
 *   The one real number the card can show is the professional's published
 *   project count, which is what sits beside it.
 */
export function DesignerCard({ designer }: { designer: HomeDesigner }) {
  /**
   * The design's second line is the specialty. Several seeded professionals
   * are registered under their practice name, so `name` and `firmName` are
   * the same string — printing both would repeat the card's own heading.
   * The firm only earns the line when it says something the name does not.
   */
  const secondary =
    designer.firmName && designer.firmName !== designer.name
      ? designer.firmName
      : designer.specialty

  return (
    <Link
      href={designer.slug ? `/${designer.slug}` : '/designers-associates'}
      className="group flex h-full min-w-0 items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-card transition-all hover:border-brand-border hover:shadow-lift"
    >
      {/* Square logo on the LEFT, a green verified badge on its corner. */}
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-soft ring-1 ring-brand-border">
        {designer.photo ? (
          <Image
            src={photoSrc(designer.photo, { w: 160, h: 160 })}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-[17px] font-bold text-brand">
            {designer.initials}
          </span>
        )}
        {designer.verified && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <VerifiedTick className="h-4 w-4" tone={designer.badgeTone} />
          </span>
        )}
      </span>

      {/* Name, discipline, rating and location stacked to the RIGHT. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[14px] font-bold text-ink transition-colors group-hover:text-brand md:text-[12px] lg:text-[14px]">
          {designer.name}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-3 md:text-[10.5px] lg:text-[12px]">{secondary}</span>

        {/* rating — no source in the schema, so an em dash rather than a number */}
        <span className="mt-1.5 flex items-center gap-1 text-[12px] md:text-[10.5px] lg:text-[12px]">
          <Glyph name="star" className="h-3.5 w-3.5 text-brand" />
          <span className="font-semibold text-ink-3" title="No ratings recorded yet">
            —
          </span>
          <span className="truncate text-ink-4">
            {designer.projectCount === 1 ? '1 project' : `${designer.projectCount} projects`}
          </span>
        </span>

        {designer.location && (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3 md:text-[10px] lg:text-[11.5px]">
            <Glyph name="pin" className="h-3 w-3 shrink-0" />
            <span className="truncate">{designer.location}</span>
          </span>
        )}
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §10 — Artistry, Culture & Heritage
//
//  Every link is a real ARTISTRY group slug, and where the design's label is
//  narrower than the group, the real sub-category slug goes with it.
// ═══════════════════════════════════════════════════════════

export const ARTISTRY_CARDS: {
  label: string
  category: string
  sub?: string
  photo: string
}[] = [
  { label: 'Heritage Buildings', category: 'heritage', sub: 'heritage-buildings', photo: HERITAGE_PHOTOS.haveli },
  { label: 'Indian Culture', category: 'indian-culture', photo: HERITAGE_PHOTOS.backwaters },
  { label: 'Sculptures & Artworks', category: 'arts', sub: 'sculptures', photo: HERITAGE_PHOTOS.domes },
  { label: 'Traditional Patterns', category: 'arts', sub: 'murals', photo: HERITAGE_PHOTOS.tajArch },
  { label: 'Art Gallery', category: 'arts', photo: HERITAGE_PHOTOS.tajAxis },
]

export function ArtistryCard({ item }: { item: (typeof ARTISTRY_CARDS)[number] }) {
  const href = item.sub
    ? `/artistry?category=${item.category}&sub=${item.sub}`
    : `/artistry?category=${item.category}`

  // A distinct white card: image on top, the label centred on a WHITE body
  // below. Bordered, rounded, softly shadowed.
  return (
    <Link
      href={href}
      className="group block min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-card transition-all hover:border-brand-border hover:shadow-lift"
    >
      {/* Image flush to the edges — no padding above it. */}
      <span className="relative block aspect-[16/10] overflow-hidden bg-paper-3">
        <Image
          src={unsplash(item.photo, { w: 640, h: 400, q: 70 })}
          alt=""
          fill
          sizes="(min-width: 1024px) 19vw, (min-width: 640px) 30vw, 45vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </span>

      {/* One line, smaller on a tablet. */}
      <span className="block truncate bg-white px-2 py-2.5 text-center font-display text-[12px] font-bold leading-tight text-ink md:text-[10.5px] lg:text-[12px]">
        {item.label}
      </span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  §11 — Around Us
//
//  ⚠️ "Government Tenders" has no home in the taxonomy — `AROUND_US_CATEGORIES`
//     carries Social Welfare and Reporting & Publication only. Rather than
//     invent a slug that would filter to nothing, that tile links to the
//     section index. Add a tenders category to the taxonomy and point it at
//     the slug when one exists.
// ═══════════════════════════════════════════════════════════

export const AROUND_US_TILES: {
  icon: HomeIconName
  /** Icon image (ImageKit) — replaces the glyph when present. Alt = label. */
  image: string
  label: string
  body: string
  href: string
  /** Pastel gradient background for the tile. */
  bg: string
  /** Accent colour for the circular arrow. */
  accent: string
}[] = [
  { icon: 'news', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/News%20&%20Updates.png', label: 'News & Updates', body: 'Latest Industry News', href: '/around-us?category=reporting-publication', bg: 'from-[#EAF2FF] to-[#D9E8FF]', accent: 'text-[#2563EB]' },
  { icon: 'calendar', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/Exhibitions.png', label: 'Exhibitions', body: 'Upcoming Events', href: '/around-us?category=reporting-publication&sub=exhibition', bg: 'from-[#FFF1E7] to-[#FFE1CD]', accent: 'text-[#F97316]' },
  { icon: 'file', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/Government%20Tenders.png', label: 'Government Tenders', body: 'Latest Opportunities', href: '/around-us', bg: 'from-[#E9F8EF] to-[#D3F0E0]', accent: 'text-[#16A34A]' },
  { icon: 'school', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/Seminars.png', label: 'Seminars', body: 'Learning & Growth', href: '/around-us?category=reporting-publication&sub=seminars', bg: 'from-[#F2ECFB] to-[#E3D8F7]', accent: 'text-[#7C3AED]' },
  { icon: 'trophy', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/Awards%20&%20Recognition.png', label: 'Awards & Recognition', body: 'Achievements', href: '/competition', bg: 'from-[#FEF6E0] to-[#FCEBC2]', accent: 'text-[#F59E0B]' },
  { icon: 'leaf', image: 'https://ik.imagekit.io/housekase/Archfacing%20Icon%20/Sustainability.png', label: 'Sustainability', body: 'Green Future', href: '/blog?category=sustainable-design', bg: 'from-[#E4F6F1] to-[#CCEEE4]', accent: 'text-[#0D9488]' },
]
// ═══════════════════════════════════════════════════════════
//  Shared small pieces
// ═══════════════════════════════════════════════════════════

/** An orange tick and a line of copy — used by §9 and §11. */
export function TickLine({ children, tone = 'dark' }: { children: React.ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
          tone === 'dark' ? 'bg-brand text-white' : 'bg-ok-soft text-ok'
        )}
      >
        <Glyph name="check" className="h-2.5 w-2.5" />
      </span>
      <span
        className={cn(
          'min-w-0 text-[12px] leading-relaxed md:text-[11px] lg:text-[12px]',
          tone === 'dark' ? 'text-white/75' : 'text-ink-2'
        )}
      >
        {children}
      </span>
    </li>
  )
}

/** One tile in the dark Marketplace Intelligence band. */
export function IntelligenceTile({
  icon,
  label,
  value,
}: {
  icon: HomeIconName
  label: string
  value: string
}) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-card bg-white/[0.05] p-3.5 md:flex-1 md:rounded-none md:bg-transparent md:px-4 md:py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <HomeIcon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] text-white/60 md:text-[10px] lg:text-[11.5px]">{label}</span>
        <span className="tabular mt-0.5 block truncate font-display text-[16px] font-bold text-white md:text-[13px] lg:text-[16px]">
          {value}
        </span>
      </span>
    </li>
  )
}

/** One item in the six-up stats band. */
export function StatItem({
  icon,
  value,
  label,
}: {
  icon: HomeIconName
  value: string
  label: string
}) {
  // Icon on the left, value + label stacked to its right — the blueprint's
  // horizontal stat. The dividers between the six live on the <ul>.
  return (
    <li className="flex min-w-0 items-center gap-3 md:flex-1 md:justify-center md:px-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand ring-1 ring-brand-border">
        <HomeIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="tabular block font-display text-[18px] font-bold leading-none text-ink sm:text-[20px]">
          {value}
        </span>
        <span className="mt-1 block text-[11px] leading-tight text-ink-3">{label}</span>
      </span>
    </li>
  )
}

/** Formats a live count for a tile, e.g. `12,458`. Re-exported for the page. */
export { inCount }
