import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from './ui'
import { VerifiedTick, photoSrc } from './blog'
import { ArtGlyph } from './artistry-glyph'
import { aroundUsMeta, type AroundUsRow } from '@/lib/around-us'
import { cn } from '@/lib/utils'

/**
 * The pieces the two Around Us pages share.
 *
 * Everything here is a Server Component. `VerifiedTick` and `photoSrc` come
 * from the Blog components rather than being written again; they are generic,
 * not blog-specific.
 */

// ═══════════════════════════════════════════════════════════
//  Category colour
// ═══════════════════════════════════════════════════════════

/**
 * One fill per top-level group, so a reader can tell a launch from a CSR drive
 * while scanning a grid. Anything outside the taxonomy falls back to navy.
 */
const GROUP_TONE: Record<string, string> = {
  'new-development': 'bg-info',
  'social-welfare': 'bg-ok',
  'reporting-publication': 'bg-chart-6',
  'design-competition': 'bg-brand',
}

/**
 * The word on the pill.
 *
 * The taxonomy's own names are filing labels — "Designers Awards", "Seminars",
 * "Expansion" — and the design puts one short word on the card instead. This
 * is that word, keyed by sub-category; anything unmapped falls back to the
 * taxonomy name, which is long but never wrong.
 */
const BADGE_WORD: Record<string, string> = {
  seminars: 'Event',
  conferences: 'Event',
  exhibition: 'Exhibition',
  'new-book-magazine': 'Publication',
  interviews: 'Interview',
  'designers-awards': 'Award',
  news: 'Industry News',
  media: 'Media',
  'e-tender': 'Tender',
  'government-policies': 'Policy',
  launches: 'Launch',
  milestones: 'Milestone',
  expansion: 'Company Update',
  partnerships: 'Partnership',
  environment: 'Sustainability',
  community: 'Community',
  education: 'Education',
  'green-initiatives': 'CSR',
}

export function badgeWord(subCategory: string | null | undefined, fallback: string): string {
  return (subCategory && BADGE_WORD[subCategory]) || fallback
}

export function CategoryBadge({
  category,
  label,
  className,
}: {
  category: string
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-card px-2 py-[3px] text-[10px] font-semibold leading-tight text-white',
        GROUP_TONE[category] ?? 'bg-navy',
        className
      )}
    >
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Formatting
// ═══════════════════════════════════════════════════════════

export function shortDate(d: Date | null | undefined): string {
  if (!d) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

/** The name and mark to print for whoever posted — a company if there is one. */
export function poster(row: AroundUsRow) {
  const c = row.author.corporateProfile
  return {
    name: c?.companyName ?? row.author.name,
    logo: c?.companyLogo ?? row.author.profilePhoto ?? '',
    // Blue tick = an active PACT, nothing else (see lib/verified.ts).
    verified: (row.author as { pactVerified?: boolean }).pactVerified === true,
    tone: (row.author as { badgeTone?: 'gold' | 'blue' | null }).badgeTone ?? null,
  }
}

// ═══════════════════════════════════════════════════════════
//  The card
// ═══════════════════════════════════════════════════════════

/**
 * One card in the Around Us grid.
 *
 * Three things about it are load-bearing and were each got wrong once:
 *
 *  · The photograph is INSET from the card edge with rounded corners of its
 *    own — it is a picture on a card, not the card's own top.
 *  · The category pill straddles the picture's bottom-left corner, half on
 *    the photograph. It therefore cannot live inside the element that clips
 *    the photograph, which is why the image has its own clipping box and the
 *    pill is a sibling of it.
 *  · The date sits on the right of the same band, outside the picture.
 */
export function AroundUsCard({ post }: { post: AroundUsRow }) {
  const m = aroundUsMeta(post.meta, post)
  const by = poster(post)
  const cover = m.image || post.media[0]?.url || ''

  return (
    <article className="card-hover group flex min-w-0 flex-col p-2">
      <Link href={`/around-us/${post.slug}`} className="flex min-w-0 flex-1 flex-col">
        {/* not clipped — the pill has to be able to hang below it */}
        <span className="relative block w-full">
          <span className="block aspect-[2/1] w-full overflow-hidden rounded-card bg-paper-3">
            {cover && (
              <Image
                src={photoSrc(cover, { w: 640, h: 320 })}
                alt=""
                width={640}
                height={320}
                sizes="(min-width:1280px) 300px, (min-width:640px) 45vw, 100vw"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            )}
          </span>

          <CategoryBadge
            category={post.category}
            label={badgeWord(post.subCategory, m.categoryLabel || post.category)}
            className="absolute bottom-0 left-2.5 translate-y-1/2"
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col px-2 pt-2.5">
          {/* the date, on the right of the band the pill hangs into */}
          {(m.eventDate || post.publishedAt) && (
            <span className="tabular flex items-center justify-end gap-1.5 text-[11px] font-semibold text-ink-3">
              <Icon name="calendar" className="h-3 w-3 text-brand" />
              {shortDate(m.eventDate ?? post.publishedAt)}
            </span>
          )}

          <span className="mt-2.5 line-clamp-2 font-display text-[15px] font-bold leading-[1.35] text-ink transition-colors group-hover:text-brand">
            {post.title}
          </span>
          <span className="mt-2.5 line-clamp-3 text-[12.5px] leading-[1.6] text-ink-3">
            {post.description}
          </span>
        </span>
      </Link>

      <div className="mx-2 mt-4 flex items-center gap-2.5 border-t border-line-soft pb-1 pt-3">
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-line bg-paper">
          {by.logo && (
            <Image src={photoSrc(by.logo, { w: 96, h: 96 })} alt="" fill sizes="32px" className="object-cover" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-[12.5px] font-semibold text-ink">By {by.name}</span>
          {by.verified && <VerifiedTick className="h-4 w-4 shrink-0" tone={by.tone} />}
        </span>
        {/* No glyph here — the reference prints the figure alone on the card
            and keeps the eye for the rail's Trending rows. */}
        <span className="tabular shrink-0 text-[12px] text-ink-3">
          {compact(post.viewCount)} Views
        </span>
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
//  The chip strip
// ═══════════════════════════════════════════════════════════

export function ChipTile({
  href,
  icon,
  label,
  active,
}: {
  href: string
  icon: IconName
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-card border px-1.5 py-2.5 text-center transition-colors sm:px-2 sm:py-3',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-paper text-ink-2 hover:border-brand hover:text-brand'
      )}
    >
      <Icon name={icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate text-[10px] font-semibold leading-tight sm:text-[10.5px] lg:text-[11.5px]">{label}</span>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  Rail rows
// ═══════════════════════════════════════════════════════════

/** One line of "Trending Updates" — thumbnail, title, views. */
export function TrendingRow({ post }: { post: AroundUsRow }) {
  const m = aroundUsMeta(post.meta, post)
  const cover = m.image || post.media[0]?.url || ''

  return (
    <Link href={`/around-us/${post.slug}`} className="group flex min-w-0 items-start gap-2.5">
      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-3">
        {cover && (
          <Image src={photoSrc(cover, { w: 160, h: 120 })} alt="" fill sizes="64px" className="object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
          {post.title}
        </span>
        <span className="tabular mt-1 flex items-center gap-1 text-[10.5px] text-ink-4">
          <ArtGlyph name="eye" className="h-3.5 w-3.5" />
          {compact(post.viewCount)} Views
        </span>
      </span>
    </Link>
  )
}

/** One line of "Upcoming Events" — a date block beside the title. */
export function EventRow({
  slug,
  title,
  when,
  place,
}: {
  slug: string
  title: string
  when: Date
  place: string
}) {
  return (
    <Link href={`/around-us/${slug}`} className="group flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-paper-3 leading-none">
        <span className="tabular font-display text-[15px] font-bold text-ink">
          {when.toLocaleDateString('en-IN', { day: '2-digit' })}
        </span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-3">
          {when.toLocaleDateString('en-IN', { month: 'short' })}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[12px] font-semibold text-ink transition-colors group-hover:text-brand">
          {title}
        </span>
        {place && (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10.5px] text-ink-4">
            <Icon name="map" className="h-3 w-3 shrink-0" />
            <span className="truncate">{place}</span>
          </span>
        )}
      </span>
    </Link>
  )
}
