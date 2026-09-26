import Image from 'next/image'
import Link from 'next/link'

import { compactCount, episodeMeta, postDate, type EpisodeRow } from '@/lib/content'

/**
 * Podcast page pieces.
 *
 * Everything here is a Server Component — the podcast pages carry no client
 * JavaScript at all. The topic filter, "Load More" and every "View All" are
 * plain links that raise a search param.
 *
 * The small glyphs below are drawn here rather than added to `Icon` in
 * `ui.tsx`: they are player chrome and card furniture that only the podcast
 * design asks for, and `IconName` is a deliberately short, shared list.
 */

// ═══════════════════════════════════════════════════════════
//  Glyphs — all decorative, all aria-hidden
// ═══════════════════════════════════════════════════════════

type GlyphProps = { className?: string }

/** Solid triangle, for the play buttons on thumbnails. */
export function PlayGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

/** Two solid bars, for the hero player strip. */
export function PauseGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" />
    </svg>
  )
}

function stroke(className: string, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function CalendarGlyph({ className = 'h-3.5 w-3.5' }: GlyphProps) {
  return stroke(
    className,
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  )
}

export function EyeGlyph({ className = 'h-3.5 w-3.5' }: GlyphProps) {
  return stroke(
    className,
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  )
}

export function BookmarkGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return stroke(className, <path d="M18 21l-6-4.2L6 21V5a2 2 0 012-2h8a2 2 0 012 2z" />)
}

export function VolumeGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return stroke(
    className,
    <>
      <path d="M11 5L6.5 9H3v6h3.5L11 19z" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.8a9 9 0 010 12.4" />
    </>
  )
}

export function FullscreenGlyph({ className = 'h-4 w-4' }: GlyphProps) {
  return stroke(className, <path d="M8 3H3v5M16 3h5v5M16 21h5v-5M8 21H3v-5" />)
}

export function MicGlyph({ className = 'h-6 w-6' }: GlyphProps) {
  return stroke(
    className,
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v4M8.5 22h7" />
    </>
  )
}

export function ChevronGlyph({
  dir,
  className = 'h-4 w-4',
}: GlyphProps & { dir: 'left' | 'right' }) {
  return stroke(className, <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />)
}

/** The little equaliser next to the microphone on the dark CTA band. */
export function WaveBars({ className = 'text-white/30' }: GlyphProps) {
  // Fixed heights — a decoration, not a reading of anything.
  const bars = [10, 20, 32, 16, 26, 12, 22, 34, 18, 9]
  return (
    <span aria-hidden className={`flex items-end gap-[3px] ${className}`}>
      {bars.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}px` }}
          className="w-[3px] rounded-full bg-current"
        />
      ))}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════
//  Episode card — the 3-across grid
// ═══════════════════════════════════════════════════════════

export function EpisodeCard({ episode }: { episode: EpisodeRow }) {
  const m = episodeMeta(episode.meta)

  return (
    <Link
      href={`/podcast/${episode.slug}`}
      className="card-hover group flex min-w-0 flex-col overflow-hidden"
    >
      {/* ─── thumbnail: card title over the photo, play button, duration ─── */}
      <div className="relative aspect-[16/10] w-full bg-navy">
        <Image
          src={episode.media[0]?.thumbnailUrl || m.thumbImage}
          alt=""
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="object-cover"
        />

        <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand shadow-lift transition-transform group-hover:scale-105">
          <PlayGlyph className="ml-0.5 h-4 w-4" />
        </span>

        <span className="tabular absolute bottom-3 right-3 rounded-md bg-ink/85 px-2 py-1 text-[11px] font-semibold text-white">
          {m.duration}
        </span>
      </div>

      {/* ─── body ─── */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="pill-brand">{m.topicLabel}</span>
          {m.episodeNumber > 0 && (
            <span className="text-[12px] text-ink-3">Episode {m.episodeNumber}</span>
          )}
        </div>

        <h3 className="mt-2.5 font-display text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
          {episode.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
          {episode.description}
        </p>

        <div className="mt-4 flex min-w-0 items-center gap-4 border-t border-line-soft pt-3 text-[12px] text-ink-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <CalendarGlyph />
            <span className="truncate">{postDate(episode.publishedAt)}</span>
          </span>
          <span className="tabular flex items-center gap-1.5">
            <EyeGlyph />
            {compactCount(episode.viewCount)}
          </span>
          <span className="ml-auto text-ink-4 transition-colors group-hover:text-brand">
            <BookmarkGlyph />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  Popular episodes — the numbered sidebar list
// ═══════════════════════════════════════════════════════════

export function PopularRow({ episode, rank }: { episode: EpisodeRow; rank: number }) {
  const m = episodeMeta(episode.meta)

  return (
    <li className="min-w-0">
      <Link href={`/podcast/${episode.slug}`} className="group flex min-w-0 gap-3">
        <span className="tabular w-4 shrink-0 pt-0.5 text-center font-display text-[15px] font-bold text-ink-4">
          {rank}
        </span>

        <span className="relative h-[46px] w-[68px] shrink-0 overflow-hidden rounded-md bg-navy">
          <Image src={episode.media[0]?.thumbnailUrl || m.thumbImage} alt="" fill sizes="68px" className="object-cover" />
          <span className="tabular absolute bottom-0.5 right-0.5 rounded bg-ink/85 px-1 py-px text-[9px] font-semibold text-white">
            {m.duration}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[12.5px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {episode.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <PlayGlyph className="h-2.5 w-2.5" />
            {compactCount(episode.viewCount)} Plays
          </span>
        </span>
      </Link>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  Featured guest card — the horizontal strip
// ═══════════════════════════════════════════════════════════

export function GuestCard({
  guest,
}: {
  guest: { slug: string; name: string; role: string; company: string; photo: string }
}) {
  return (
    <li className="w-[210px] shrink-0">
      <div className="card flex h-full min-w-0 flex-col items-center px-4 py-5 text-center">
        <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full bg-paper-3 ring-2 ring-brand-border">
          <Image src={guest.photo} alt={guest.name} fill sizes="68px" className="object-cover" />
        </span>
        <p className="mt-3 w-full truncate font-display text-[13.5px] font-bold text-ink">
          {guest.name}
        </p>
        <p className="mt-1 w-full truncate text-[12px] text-ink-2">{guest.role}</p>
        <p className="w-full truncate text-[11.5px] text-ink-3">{guest.company}</p>
      </div>
    </li>
  )
}
