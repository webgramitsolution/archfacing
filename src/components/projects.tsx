import Image from 'next/image'
import { AutoRail } from '@/components/auto-rail'
import Link from 'next/link'
import { unsplash } from '@/config/club-media'
import { PROJECT_CATEGORIES } from '@/config/taxonomy'
import { projectPhotos,
  compactCount, placeLine, projectMeta, PROJECT_TYPES,
  type ProjectBadge, type ProjectRow,
} from '@/lib/projects'
import { cn } from '@/lib/utils'

/**
 * Everything the two Projects pages share.
 *
 * The listing and the detail page draw the same cards, the same glyph set and
 * the same brand strip, so they live here once instead of drifting apart.
 *
 * Every component in this file is a Server Component. The Projects pages carry
 * no client JavaScript at all: the filters are a plain GET <form>, the sort is
 * a <select> attached to that same form with the HTML `form=` attribute, the
 * grid/list toggle and the pagination are links, and both galleries are
 * scroll-snap rails moved by in-page anchors.
 */

// ═══════════════════════════════════════════════════════════
//  Marketing figures
//
//  ⚠️ NONE OF THESE ARE LIVE DATA. They are the headline numbers from the
//     design, kept in one place so they are obviously editable and can never
//     be mistaken for a database count. Every other number on the Projects
//     pages — the results bar, the category strip, the pagination — is
//     computed from the database at render time.
//
//     Edit them here; nothing else needs to change.
// ═══════════════════════════════════════════════════════════

// Marketing figures were removed — every number on the page is read from the database.

// ═══════════════════════════════════════════════════════════
//  Glyphs
//
//  The shared <Icon> set in components/ui.tsx does not carry the domestic
//  vocabulary these pages need (a pool, a modular kitchen, a floor-to-ceiling
//  window). They are drawn here in the same single-stroke style, at the same
//  weight, so the two sets sit together without a seam.
// ═══════════════════════════════════════════════════════════

export type GlyphName =
  | 'right' | 'left' | 'chevronRight' | 'chevronLeft' | 'expand'
  | 'bookmark' | 'eye' | 'heart' | 'comment' | 'info' | 'share'
  | 'search' | 'grid' | 'list' | 'dots' | 'check' | 'star' | 'quote'
  | 'building' | 'users' | 'pin' | 'globe'
  | 'home' | 'sofa' | 'briefcase' | 'tree' | 'factory' | 'school' | 'hotel'
  | 'area' | 'calendar' | 'tag' | 'ruler'
  | 'window' | 'pool' | 'kitchen' | 'sparkle' | 'smart' | 'leaf'
  | 'shieldCheck' | 'boxCheck' | 'rupee' | 'truck' | 'lock'

const GLYPHS: Record<GlyphName, React.ReactNode> = {
  right: <path d="M5 12h14M13 6l6 6-6 6" />,
  left: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  expand: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />,
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  heart: <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21.4l8.8-8.7a5 5 0 000-7.1z" />,
  comment: <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.8-.8L3 21l1.9-5A8.2 8.2 0 014 11.5 8.4 8.4 0 0112.5 3 8.4 8.4 0 0121 11.5z" />,
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  list: (<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.3" /><circle cx="3.5" cy="12" r="1.3" /><circle cx="3.5" cy="18" r="1.3" /></>),
  dots: (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  check: <path d="M20 6L9 17l-5-5" />,
  star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />,
  quote: <path d="M9 7H5a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3M20 7h-4a2 2 0 00-2 2v3a2 2 0 002 2h2v1a3 3 0 01-3 3" />,

  building: (<><path d="M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M15 21V11h4a2 2 0 012 2v8" /><path d="M8 7h3M8 11h3M8 15h3" /></>),
  users: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
  pin: (<><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z" /></>),

  home: (<><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>),
  sofa: (<><path d="M4 12V8a2 2 0 012-2h12a2 2 0 012 2v4" /><path d="M2 13a2 2 0 014 0v3h12v-3a2 2 0 014 0v6H2z" /></>),
  briefcase: (<><rect x="2.5" y="7" width="19" height="13" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M2.5 12.5h19" /></>),
  tree: (<><path d="M12 21v-5" /><path d="M12 3l5 6h-3l4 5H6l4-5H7z" /></>),
  factory: (<><path d="M3 21h18V10l-6 4V10l-6 4V4H3z" /><path d="M7 17h2M13 17h2M18 17h.01" /></>),
  school: (<><path d="M12 3L2 8l10 5 10-5z" /><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5M20 9v5" /></>),
  hotel: (<><path d="M4 21V4h16v17" /><path d="M2 21h20M9 8h2M13 8h2M9 12h2M13 12h2" /><path d="M10 21v-4h4v4" /></>),

  area: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 3v4M3 8h4M16 21v-4M21 16h-4" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>),
  tag: (<><path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
  ruler: (<><path d="M15.5 2.5l6 6L8.5 21.5l-6-6z" /><path d="M12 6l2 2M9 9l2 2M6 12l2 2" /></>),

  window: (<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M12 3v18M4 12h16" /></>),
  pool: (<><path d="M2 17c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2" /><path d="M7 15V5a2 2 0 014 0v10M13 15V5a2 2 0 014 0v10M7 8h10M7 11.5h10" /></>),
  kitchen: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 10h18M8 6.5h.01M12 6.5h.01M8 14h.01M8 17.5h.01M14 13.5h4" /></>),
  sparkle: (<><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></>),
  smart: (<><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 14.5a3.5 3.5 0 015 0M11.5 17h1" /></>),
  leaf: (<><path d="M20 4c0 9-5.5 14-13 14a6 6 0 010-12c4 0 6-2 13-2z" /><path d="M4 20c3-6 7-9 12-10.5" /></>),

  shieldCheck: (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 11.5l2.2 2.2L15.5 9.5" /></>),
  boxCheck: (<><path d="M21 11V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l5 2.9" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /><path d="M14 18.5l2.2 2.2 4.3-4.2" /></>),
  rupee: <path d="M6 3h12M6 8h12M15.5 3c0 5-3.5 5-3.5 5H6l7.5 8" />,
  truck: (<><path d="M2 16V6a1 1 0 011-1h11v11M14 9h4l4 4v3h-3" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M9 18h7" /></>),
  lock: (<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3M12 15v2" /></>),
}

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
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
      {GLYPHS[name]}
    </svg>
  )
}

/** The blue tick beside a verified seller. */
export { VerifiedTick } from './verified-badge'

/** Five stars, filled up to `value`. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-brand', className)} role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill={i <= Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />
        </svg>
      ))}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Photography
// ═══════════════════════════════════════════════════════════

const FALLBACK_IMAGE = '/img/hero-professionals.svg'

/** Accepts either a full URL (as seeded) or a bare Unsplash photo id. */
export function photoSrc(value: string, size: { w: number; h?: number }): string {
  if (!value) return FALLBACK_IMAGE
  if (value.startsWith('http') || value.startsWith('/')) return value
  return unsplash(value, size)
}

// ═══════════════════════════════════════════════════════════
//  Links — one place that builds a /projects URL
// ═══════════════════════════════════════════════════════════

export type ProjectParams = Record<string, string | number | undefined | null>

/** Builds `/projects?…`, dropping every empty value so the URL stays readable. */
export function projectsHref(params: ProjectParams): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `/projects?${s}` : '/projects'
}

// ═══════════════════════════════════════════════════════════
//  The category strip
// ═══════════════════════════════════════════════════════════

/**
 * The eight chips above the results.
 *
 * `slug` is a real taxonomy slug from `src/config/taxonomy.ts`, so the chip
 * links to a filter that actually returns something. "Others" has no slug —
 * it clears the category instead.
 */
export const CATEGORY_STRIP: { slug?: string; label: string; icon: GlyphName }[] = [
  { slug: 'residential', label: 'Residential', icon: 'home' },
  { slug: 'interior', label: 'Interior', icon: 'sofa' },
  { slug: 'commercial-offices', label: 'Commercial', icon: 'briefcase' },
  { slug: 'landscaped', label: 'Landscape', icon: 'tree' },
  { slug: 'industrials-factories', label: 'Industrial', icon: 'factory' },
  { slug: 'education-sports', label: 'Institutional', icon: 'school' },
  { slug: 'hospitality', label: 'Hospitality', icon: 'hotel' },
  { label: 'Others', icon: 'dots' },
]

/**
 * The client's own artwork for the category strip, keyed by the strip's label
 * (the "Others" entry has no slug, so the label is the stable key).
 *
 * ⚠️ These live on the `housekase` ImageKit account, which is NOT in
 *    `next.config.ts`'s `remotePatterns`. Render them with `unoptimized`, which
 *    skips both the optimizer and the domain check; without it Next refuses the
 *    URL outright. A label with no entry here falls back to its `Glyph`.
 */
const CAT_ICON_BASE = 'https://ik.imagekit.io/housekase/Project'

export const CATEGORY_ICON_IMAGES: Record<string, string> = {
  Residential: `${CAT_ICON_BASE}/Residential.png`,
  Interior: `${CAT_ICON_BASE}/Interior.png`,
  Commercial: `${CAT_ICON_BASE}/skyscrapers.png`,
  Landscape: `${CAT_ICON_BASE}/Landscape.png`,
  Industrial: `${CAT_ICON_BASE}/Industrial.png`,
  Institutional: `${CAT_ICON_BASE}/Institutional.png`,
  Hospitality: `${CAT_ICON_BASE}/Hospitality.png`,
  Others: `${CAT_ICON_BASE}/More%20Categories.png`,
}

// ═══════════════════════════════════════════════════════════
//  Cards
// ═══════════════════════════════════════════════════════════

const BADGES: Record<ProjectBadge, { label: string; className: string }> = {
  featured: { label: 'Featured', className: 'bg-brand text-white' },
  award: { label: 'Award Winner', className: 'bg-[#7C3AED] text-white' },
  new: { label: 'New', className: 'bg-ok text-white' },
}

function CardBadge({ badge }: { badge: ProjectBadge }) {
  const b = BADGES[badge]
  return (
    <span className={cn('absolute left-3 top-3 rounded-pill px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]', b.className)}>
      {b.label}
    </span>
  )
}

/** Views · likes · comments — the footer row on every card. */
function CardStats({ views, likes, comments }: { views: number; likes: number; comments: number }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
      <span className="flex items-center gap-1.5"><Glyph name="eye" className="h-3.5 w-3.5" />{compactCount(views)}</span>
      <span className="flex items-center gap-1.5"><Glyph name="heart" className="h-3.5 w-3.5" />{compactCount(likes)}</span>
      <span className="flex items-center gap-1.5"><Glyph name="comment" className="h-3.5 w-3.5" />{compactCount(comments)}</span>
    </span>
  )
}

function TagPills({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <span className="mt-2.5 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="rounded-pill bg-paper-3 px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
          {t}
        </span>
      ))}
    </span>
  )
}

/**
 * The bookmark control on a card.
 *
 * Saving a project is not built yet, so this is drawn but inert — it is marked
 * aria-hidden rather than being made a button that does nothing when clicked.
 */
function BookmarkMark() {
  return (
    <span aria-hidden className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-2 shadow-card">
      <Glyph name="bookmark" className="h-4 w-4" />
    </span>
  )
}

/** The 4-up grid card. */
export function ProjectCard({ post, sizes }: { post: ProjectRow; sizes?: string }) {
  const m = projectMeta(post.meta)

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden">
      <Link href={`/projects/${post.slug}`} className="flex min-w-0 flex-1 flex-col">
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-paper-3">
          <Image
            src={photoSrc(projectPhotos(post).cover, { w: 600, h: 450 })}
            alt=""
            fill
            sizes={sizes ?? '(min-width:1280px) 300px, (min-width:768px) 45vw, 100vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {m.badge && <CardBadge badge={m.badge} />}
          <BookmarkMark />
        </span>

        <span className="flex min-w-0 flex-1 flex-col p-4">
          <span className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>

          <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <Glyph name="pin" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{placeLine(post.city, post.state)}</span>
          </span>

          <span className="mt-1 truncate text-[12.5px] font-semibold text-brand">
            {m.firmName || post.author.name}
          </span>

          <TagPills tags={m.tags} />
        </span>
      </Link>

      <div className="mt-auto border-t border-line-soft px-4 py-3">
        <CardStats views={post.viewCount} likes={post._count.savedBy} comments={post._count.reviews} />
      </div>
    </article>
  )
}

/** The wide row used by `?view=list` — image on the left. */
export function ProjectListRow({ post }: { post: ProjectRow }) {
  const m = projectMeta(post.meta)

  return (
    <article className="card-hover group flex min-w-0 flex-col overflow-hidden sm:flex-row">
      <Link href={`/projects/${post.slug}`} className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-paper-3 sm:aspect-auto sm:h-[190px] sm:w-[260px]">
        <Image
          src={photoSrc(projectPhotos(post).cover, { w: 600, h: 450 })}
          alt=""
          fill
          sizes="(min-width:640px) 260px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {m.badge && <CardBadge badge={m.badge} />}
        <BookmarkMark />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <Link href={`/projects/${post.slug}`} className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[16.5px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </h3>
        </Link>

        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <Glyph name="pin" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{placeLine(post.city, post.state)}</span>
        </p>

        <p className="mt-1 truncate text-[13px] font-semibold text-brand">
          {m.firmName || post.author.name}
        </p>

        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
          {post.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <TagPills tags={m.tags} />
          <CardStats views={post.viewCount} likes={post._count.savedBy} comments={post._count.reviews} />
        </div>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  Pagination — plain links, driven by ?page=
// ═══════════════════════════════════════════════════════════

/**
 * Produces the design's `1 2 3 4 5 … 12` shape: a window around the current
 * page, the first and last page always reachable, and `null` where an ellipsis
 * belongs.
 */
function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)

  const out: (number | null)[] = []
  const from = Math.max(2, Math.min(page - 1, pages - 4))
  const to = Math.min(pages - 1, Math.max(page + 1, 5))

  out.push(1)
  if (from > 2) out.push(null)
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push(null)
  out.push(pages)

  return out
}

export function Pagination({
  page,
  pages,
  params,
}: {
  page: number
  pages: number
  /** Every other search param, so paging never drops the active filters. */
  params: ProjectParams
}) {
  if (pages <= 1) return null

  const cell = 'flex h-9 min-w-[36px] items-center justify-center rounded-lg border px-3 text-[13px] font-semibold transition-colors'

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="px-1 text-[13px] text-ink-4">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={projectsHref({ ...params, page: n === 1 ? undefined : n })}
                aria-current={n === page ? 'page' : undefined}
                className={cn(cell, n === page ? 'border-brand bg-brand text-white' : 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand')}
              >
                {n}
              </Link>
            </li>
          )
        )}

        {page < pages && (
          <li>
            <Link
              href={projectsHref({ ...params, page: page + 1 })}
              aria-label="Next page"
              className={cn(cell, 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand')}
            >
              <Glyph name="chevronRight" className="h-4 w-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════
//  The filter sidebar
// ═══════════════════════════════════════════════════════════

/** The submitted values, so every control comes back showing what was asked for. */
export type FilterValues = {
  q: string
  pactArea: string
  pin: string
  category: string
  sub: string
  city: string
  state: string
  projectType: string
  areaMin: string
  areaMax: string
  budgetMin: string
  budgetMax: string
  year: string
  award: boolean
  verified: boolean
  featured: boolean
  view: string
  sort: string
}

function FieldLabel({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink">
      {children}
      {info && (
        <span title={info} className="text-ink-4">
          <Glyph name="info" className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  )
}

const SELECT_CLASS = 'input appearance-none py-2 text-[12.5px]'

/**
 * The left-hand filter card.
 *
 * ★ It is a real GET <form>. Submitting it navigates to /projects with the
 *   chosen values as search params, and the page re-renders filtered — no
 *   client JavaScript is involved anywhere. The `id` is also used by the sort
 *   <select> further down the page through the HTML `form=` attribute, so the
 *   sort rides along with the filters in a single submission.
 */
export function FilterSidebar({
  id,
  values,
  facets,
  counts,
}: {
  id: string
  values: FilterValues
  facets: { cities: string[]; states: string[]; years: number[] }
  counts: Record<string, number>
}) {
  const activeCategory = PROJECT_CATEGORIES.find((c) => c.slug === values.category)

  return (
    <form method="get" action="/projects" id={id} className="card min-w-0 p-4">
      {/* The view mode is a link-driven toggle, not a field — carry it through
          the submission so applying a filter does not knock the reader back
          into grid view. */}
      {values.view && <input type="hidden" name="view" value={values.view} />}

      <div className="flex items-center justify-between gap-3 border-b border-line-soft pb-3">
        <h2 className="font-display text-[15px] font-bold text-ink">Filters</h2>
        <Link href="/projects" className="text-[12px] font-semibold text-brand hover:underline">
          Clear All
        </Link>
      </div>

      {/* On a tablet the sidebar spans the full width, so the fields run in
          TWO columns — in one column the panel was taller than the screen and
          pushed every project below the fold. Back to one column at lg, where
          the sidebar is a 250px rail again. */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        {/* ─── search ─── */}
        <label className="block min-w-0 md:col-span-2 lg:col-span-1">
          <span className="sr-only">Search projects</span>
          <span className="relative block">
            <Glyph name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
            <input
              type="search"
              name="q"
              defaultValue={values.q}
              placeholder="Search by title, architect, location..."
              className="input py-2 pl-9 text-[12.5px]"
            />
          </span>
        </label>

        {/* ─── PACT area ─── */}
        <div className="min-w-0 rounded-lg border border-brand-border bg-brand-soft p-3 md:col-span-2 lg:col-span-1">
          <FieldLabel>PACT Area</FieldLabel>
          <select name="pactArea" defaultValue={values.pactArea} className={SELECT_CLASS}>
            <option value="">Select PACT Area</option>
            {facets.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="mt-2 flex min-w-0 gap-2">
            <input
              type="text"
              name="pin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              defaultValue={values.pin}
              placeholder="Enter PIN Code"
              className="input min-w-0 flex-1 py-2 text-[12.5px]"
            />
            {/* Submits the whole form — the PIN is applied along with every
                other filter, which is what a reader expects from "Apply". */}
            <button type="submit" className="btn-primary shrink-0 px-3.5 py-2 text-[12.5px]">
              Apply
            </button>
          </div>

          <Link href="/pact" className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:underline">
            What is PACT? Learn more
            <Glyph name="right" className="h-3 w-3" />
          </Link>
        </div>

        {/* ─── category ─── */}
        <label className="block min-w-0">
          <FieldLabel>Project Category</FieldLabel>
          <select name="category" defaultValue={values.category} className={SELECT_CLASS}>
            <option value="">All Categories</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
                {counts[c.slug] ? ` (${counts[c.slug]})` : ''}
              </option>
            ))}
          </select>
        </label>

        {/* ─── sub-category ─── */}
        <label className="block min-w-0">
          <FieldLabel>Sub Category</FieldLabel>
          <select name="sub" defaultValue={values.sub} className={SELECT_CLASS}>
            <option value="">All Sub Categories</option>
            {/* Narrowed to the chosen category when there is one; otherwise
                every sub-category is offered, grouped by its parent. */}
            {(activeCategory ? [activeCategory] : PROJECT_CATEGORIES).map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {(c.children ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {/* ─── location ─── */}
        <div className="min-w-0">
          <FieldLabel>Location</FieldLabel>
          <div className="flex min-w-0 flex-col gap-2">
            <select name="city" defaultValue={values.city} className={SELECT_CLASS}>
              <option value="">All Cities</option>
              {facets.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select name="state" defaultValue={values.state} className={SELECT_CLASS}>
              <option value="">All States</option>
              {facets.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── project type ─── */}
        <label className="block min-w-0">
          <FieldLabel>Project Type</FieldLabel>
          <select name="ptype" defaultValue={values.projectType} className={SELECT_CLASS}>
            <option value="">All Types</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        {/* ─── built-up area ─── */}
        <div className="min-w-0">
          <FieldLabel>Built-up Area (Sq.ft.)</FieldLabel>
          <div className="flex min-w-0 gap-2">
            <input type="number" name="areaMin" min={0} step={100} defaultValue={values.areaMin} placeholder="Min" className="input min-w-0 flex-1 py-2 text-[12.5px]" aria-label="Minimum built-up area" />
            <input type="number" name="areaMax" min={0} step={100} defaultValue={values.areaMax} placeholder="Max" className="input min-w-0 flex-1 py-2 text-[12.5px]" aria-label="Maximum built-up area" />
          </div>
        </div>

        {/* ─── budget ─── */}
        <div className="min-w-0">
          <FieldLabel>Budget Range (₹)</FieldLabel>
          <div className="flex min-w-0 gap-2">
            <input type="number" name="budgetMin" min={0} step={100000} defaultValue={values.budgetMin} placeholder="Min" className="input min-w-0 flex-1 py-2 text-[12.5px]" aria-label="Minimum budget" />
            <input type="number" name="budgetMax" min={0} step={100000} defaultValue={values.budgetMax} placeholder="Max" className="input min-w-0 flex-1 py-2 text-[12.5px]" aria-label="Maximum budget" />
          </div>
        </div>

        {/* ─── year ─── */}
        <label className="block min-w-0">
          <FieldLabel>Year of Completion</FieldLabel>
          <select name="year" defaultValue={values.year} className={SELECT_CLASS}>
            <option value="">Any Year</option>
            {facets.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        {/* ─── flags ─── */}
        <fieldset className="min-w-0 border-t border-line-soft pt-3.5 md:col-span-2 lg:col-span-1">
          <legend className="sr-only">Project quality</legend>
          <div className="flex flex-col gap-2.5">
            <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
              <input type="checkbox" name="award" value="1" defaultChecked={values.award} className="h-4 w-4 shrink-0 accent-brand" />
              Award Winning Projects
            </label>
            <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
              <input type="checkbox" name="verified" value="1" defaultChecked={values.verified} className="h-4 w-4 shrink-0 accent-brand" />
              Verified Projects
            </label>
            <label className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-ink-2">
              <input type="checkbox" name="featured" value="1" defaultChecked={values.featured} className="h-4 w-4 shrink-0 accent-brand" />
              Featured Projects
              <span title="Featured projects are promoted by their PACT holder." className="text-ink-4">
                <Glyph name="info" className="h-3.5 w-3.5" />
              </span>
            </label>
          </div>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <button type="submit" className="btn-primary w-full py-2.5 text-[13px]">
            Apply Filters
          </button>
          {/* A link, not a reset button — a form reset would only restore the
              submitted values, which is not what "Reset" means here. */}
          <Link href="/projects" className="btn-outline w-full py-2.5 text-[13px]">
            Reset Filters
          </Link>
        </div>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  Detail-page furniture
// ═══════════════════════════════════════════════════════════

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.09em] text-ink">
        {children}
      </h2>
      {action}
    </div>
  )
}

/**
 * TRUSTED BY LEADING BRANDS.
 *
 * ⚠️ These are plain wordmarks set in the site's own type, NOT reproductions
 *    of the companies' logo artwork. Using a real logo file needs that
 *    company's permission; once you have it, drop the files into
 *    `public/img/brands/` and add a `logo` path to each entry here.
 */
export const TRUSTED_BRANDS: { name: string; logo?: string }[] = [
  { name: 'Asian Paints' },
  { name: 'AGI' },
  { name: 'Häfele' },
  { name: 'Jaquar' },
  { name: 'Duravit' },
  { name: 'Hindware' },
  { name: 'Kajaria' },
  { name: 'Nitco' },
  { name: 'AND MANY MORE' },
]

export function BrandStrip() {
  return (
    <AutoRail
      label="Trusted brands"
      perView={{ base: 2, md: 4, lg: 6 }}
      gap={12}
      intervalMs={2600}
      items={TRUSTED_BRANDS.map((b) => (
        <span
          key={b.name}
          className="flex h-full min-w-0 items-center justify-center rounded-card border border-line bg-paper-2 px-2 py-3.5 text-center"
        >
          <span className="truncate font-display text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
            {b.name}
          </span>
        </span>
      ))}
    />
  )
}

/** The five reassurance tiles under a project. */
export const TRUST_POINTS: { icon: GlyphName; title: string; body: string }[] = [
  { icon: 'shieldCheck', title: 'Verified Professionals', body: 'Background Verified' },
  { icon: 'boxCheck', title: 'Quality Products', body: 'Genuine & Trusted' },
  { icon: 'rupee', title: 'Best Price Guarantee', body: 'Competitive Pricing' },
  { icon: 'truck', title: 'On-time Delivery', body: 'Pan India Delivery' },
  { icon: 'lock', title: 'Secure Payments', body: '100% Safe & Secure' },
]

/**
 * The five reassurance tiles — one row at every width.
 *
 * Two columns wrapped them onto three rows and left the strip taller than the
 * content it reassures about, so the type and the icon are sized down instead
 * and the row holds. Below the tablet the caption drops and the tile centres
 * on its title, which is the part that carries the meaning.
 */
export function TrustStrip() {
  return (
    <ul className="grid grid-cols-5 gap-1.5 sm:gap-2 lg:gap-3">
      {TRUST_POINTS.map((t) => (
        <li
          key={t.title}
          className="card flex min-w-0 flex-col items-center gap-1 p-2 text-center md:flex-row lg:gap-2.5 lg:p-3 lg:text-left"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-brand-soft text-brand sm:h-7 sm:w-7 lg:h-8 lg:w-8">
            <Glyph name={t.icon} className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
          </span>

          <span className="min-w-0">
            {/*
              The title WRAPS below the desktop and truncates only at lg.

              Five tiles across 723px leave about 90px of text each — less
              than "Verified Professionals" needs — so truncating there
              clipped every single one. Two short lines say it; an ellipsis
              does not.
            */}
            <span className="block text-balance text-[9.5px] font-bold leading-[1.25] text-ink sm:text-[10.5px] lg:truncate lg:text-[12.5px]">
              {t.title}
            </span>
            <span className="mt-0.5 hidden truncate text-[11px] text-ink-3 lg:block">
              {t.body}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The square logo mark used wherever a seller appears without a photograph. */
export function SellerMark({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft font-display text-[15px] font-bold text-brand ring-1 ring-brand-border',
        className
      )}
    >
      {initials}
    </span>
  )
}
