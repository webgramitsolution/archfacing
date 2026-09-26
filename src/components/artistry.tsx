import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from './ui'
import { VerifiedTick, photoSrc } from './blog'
import { artworkMeta, type ArtworkRow, type SpecRow } from '@/lib/artistry'
import type { CommentView } from '@/lib/post-comments'
import { cn } from '@/lib/utils'
import { SaveToggle } from './save-button'

/**
 * The pieces the two Artistry pages share.
 *
 * Everything here is a Server Component except the gallery, which advances
 * itself on a timer and therefore lives in `artistry-gallery.tsx`.

 *
 * `VerifiedTick` and `photoSrc` are imported from the Blog components rather
 * than written again; they are generic, not blog-specific.
 */

import { ArtGlyph, isArtGlyph, type ArtGlyphName } from './artistry-glyph'

export { ArtGlyph, type ArtGlyphName }

export { Gallery } from './artistry-gallery'

// ═══════════════════════════════════════════════════════════
//  Stat cells
// ═══════════════════════════════════════════════════════════

export type StatCell = { icon: IconName | ArtGlyphName; value: string; label: string }

/** Renders whichever set the name belongs to, so callers can mix the two. */
function AnyGlyph({ name, className }: { name: IconName | ArtGlyphName; className?: string }) {
  return isArtGlyph(name) ? (
    <ArtGlyph name={name as ArtGlyphName} className={className} />
  ) : (
    <Icon name={name as IconName} className={className} />
  )
}

/** The four-cell strip under the title: outlined orange glyph, number, label. */
export function StatStrip({ items }: { items: StatCell[] }) {
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3 border-y border-line py-4 sm:grid-cols-4">
      {items.map((s) => (
        <li key={s.label} className="flex min-w-0 flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-soft text-brand">
            <AnyGlyph name={s.icon} className="h-[18px] w-[18px]" />
          </span>
          <span className="tabular mt-2 block w-full truncate font-display text-[17px] font-bold leading-none text-ink">
            {s.value}
          </span>
          <span className="mt-1 block w-full truncate text-[11.5px] text-ink-3">{s.label}</span>
        </li>
      ))}
    </ul>
  )
}

/** The 2×3 grid of circular glyph tiles in the sidebar. */
export function StatTiles({ items }: { items: StatCell[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((s) => (
        <li
          key={s.label}
          className="flex min-w-0 flex-col items-center rounded-card border border-line bg-paper-3 px-2 py-3.5 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-paper-2 text-brand">
            <AnyGlyph name={s.icon} className="h-4 w-4" />
          </span>
          <span className="tabular mt-2 block w-full truncate font-display text-[15px] font-bold leading-none text-ink">
            {s.value}
          </span>
          <span className="mt-1 block w-full truncate text-[11px] text-ink-3">{s.label}</span>
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════
//  Specifications
// ═══════════════════════════════════════════════════════════

/** One of the two specification columns — label left, value right, one row each. */
export function SpecColumn({ rows }: { rows: SpecRow[] }) {
  if (rows.length === 0) return null

  return (
    <ul className="flex min-w-0 flex-col">
      {rows.map((r) => (
        <li
          key={r.label}
          className="flex min-w-0 items-start justify-between gap-4 border-b border-line-soft py-2.5 last:border-b-0"
        >
          <span className="shrink-0 text-[12.5px] text-ink-3">{r.label}</span>
          <span className="min-w-0 break-words text-right text-[12.5px] font-semibold text-ink">
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════
//  Rating row
// ═══════════════════════════════════════════════════════════

export function RatingRow({
  rating,
  reviews,
  recommend,
}: {
  rating: number
  reviews: number
  /** percent — omitted where the design does not show it */
  recommend?: number
}) {
  // A score needs reviews behind it. "0.0 · 0 Reviews" beside an empty star
  // row reads as a bad rating rather than as an absence.
  if (reviews < 1) {
    return (
      <span className="flex items-center justify-center text-[12px] text-ink-3">
        No reviews yet
      </span>
    )
  }
  return (
    <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
      <span className="flex items-center gap-1 font-semibold text-ink">
        <Icon name="star" className="h-4 w-4 fill-current text-brand" />
        {rating.toFixed(1)}
      </span>
      <span aria-hidden>·</span>
      <span>{reviews} Reviews</span>
      {recommend ? (
        <>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <ArtGlyph name="eye" className="h-3.5 w-3.5" />
            {recommend}% Recommend
          </span>
        </>
      ) : null}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Comments
// ═══════════════════════════════════════════════════════════

/** One real comment (PostComment). The page supplies the formatted date. */
export function CommentItem({ comment, date, action }: { comment: CommentView; date: string; action?: React.ReactNode }) {
  const initial = comment.name.trim().charAt(0).toUpperCase() || '?'
  const src = comment.photo && /^(https?:\/\/|\/)/.test(comment.photo) ? comment.photo : null
  return (
    <li className="flex min-w-0 gap-3 border-b border-line-soft pb-4 last:border-b-0 last:pb-0">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-3 text-[13px] font-bold text-ink-3">
        {src ? <Image src={src} alt="" fill sizes="36px" unoptimized className="object-cover" /> : initial}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-bold text-ink">{comment.name}</span>
          {comment.role && <span className="text-[11.5px] text-ink-3">{comment.role}</span>}
          <span className="ml-auto shrink-0 text-[11.5px] text-ink-4">{date}</span>
        </div>

        <p className="mt-1.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-ink-2">{comment.body}</p>

        {action && <div className="mt-2">{action}</div>}
      </div>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  Similar artworks
// ═══════════════════════════════════════════════════════════

export function SimilarRow({ post }: { post: ArtworkRow }) {
  const m = artworkMeta(post.meta)

  return (
    <li className="border-b border-line-soft pb-3.5 last:border-b-0 last:pb-0">
      <Link href={`/artistry/${post.slug}`} className="group flex min-w-0 gap-3">
        <span className="relative h-[54px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-paper-3">
          <Image
            src={photoSrc(m.image, { w: 200, h: 150 })}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>
          <span className="mt-1 block truncate text-[11.5px] text-ink-3">
            By {m.artist.shortName}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[11.5px] text-ink-3">
            <span className="min-w-0 truncate">{post.city ?? '—'}</span>
            {/* No reviews, no star — "0.0 (0)" reads as a bad score. */}
            {m.artist.reviews > 0 && (
              <span className="flex shrink-0 items-center gap-1 font-semibold text-ink-2">
                <Icon name="star" className="h-3.5 w-3.5 fill-current text-brand" />
                {m.artist.rating.toFixed(1)}
                <span className="font-normal text-ink-4">({m.artist.reviews})</span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  Listing
// ═══════════════════════════════════════════════════════════

/**
 * One colour per top-level Artistry group.
 *
 * The badge is how a reader tells a heritage building from a sculpture while
 * scanning a grid, so the five groups get five distinct fills rather than all
 * sharing the brand orange. Anything outside the taxonomy falls back to navy.
 */
const GROUP_TONE: Record<string, string> = {
  heritage: 'bg-info',
  'indian-culture': 'bg-brand',
  environments: 'bg-ok',
  arts: 'bg-chart-6',
  'design-integration': 'bg-navy',
}

export function ArtworkCard({ post, saved = false }: { post: ArtworkRow; saved?: boolean }) {
  const m = artworkMeta(post.meta)
  const place = m.location || [post.city, post.state].filter(Boolean).join(', ')

  return (
    <article className="card-hover group relative flex min-w-0 flex-col overflow-hidden">
      {/* Outside the link: a control inside an anchor cannot be clicked on
          its own. The heart is the real save (SavedItem) — the count beside
          the eye below is how many members saved this piece. */}
      <span className="absolute right-3 top-3 z-10 flex gap-1.5">
        <SaveToggle
          postId={post.id}
          initialSaved={saved}
          path="/artistry"
          noun="artwork"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/90 text-ink-3 shadow-card transition-colors hover:text-brand"
          savedClassName="!text-brand [&_svg]:fill-current"
          icon={<ArtGlyph name="heart" className="h-3.5 w-3.5" />}
        />
      </span>

      <Link href={`/artistry/${post.slug}`} className="flex min-w-0 flex-1 flex-col">
        <span className="relative block aspect-[16/10] w-full overflow-hidden bg-paper-3">
          <Image
            src={photoSrc(m.image, { w: 640, h: 400 })}
            alt=""
            fill
            sizes="(min-width:1280px) 300px, (min-width:640px) 45vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <span
            className={cn(
              'absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.09em] text-white',
              GROUP_TONE[post.category] ?? 'bg-navy'
            )}
          >
            {m.categoryLabel || post.category}
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col px-4 pb-3 pt-3.5">
          <span className="line-clamp-2 font-display text-[14.5px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>

          {place && (
            <span className="mt-2 flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-3">
              <Icon name="map" className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{place}</span>
            </span>
          )}

          <span className="mt-2.5 flex min-w-0 items-center gap-2">
            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-paper-3">
              {m.artist.photo && (
                <Image
                  src={photoSrc(m.artist.photo, { w: 72, h: 72 })}
                  alt=""
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-[11.5px] text-ink-2">{m.artist.name}</span>
              {m.artist.verified && <VerifiedTick className="h-3 w-3" tone={m.artist.badgeTone} />}
            </span>
          </span>
        </span>
      </Link>

      <div className="mt-auto flex items-center gap-3 border-t border-line-soft px-4 py-2.5">
        <span className="tabular flex items-center gap-1 text-[11.5px] text-ink-3">
          <ArtGlyph name="eye" className="h-3.5 w-3.5" />
          {compact(m.stats.views)}
        </span>
        <span className="tabular flex items-center gap-1 text-[11.5px] text-ink-3">
          <ArtGlyph name="heart" className="h-3.5 w-3.5" />
          {compact(m.stats.favourites)}
        </span>

      </div>
    </article>
  )
}

/** 12,100 → "12.1K". Local so the card does not pull in the blog's helpers. */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

/**
 * The filter chips.
 *
 * Every chip is a plain link that sets `?category=` or `?sub=` — no client
 * state, and the browser back button works the way a reader expects.
 */
export function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand'
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'tabular rounded-pill px-1.5 text-[10.5px]',
            active ? 'bg-white/20 text-white' : 'bg-paper-3 text-ink-3'
          )}
        >
          {count}
        </span>
      )}
    </Link>
  )
}
