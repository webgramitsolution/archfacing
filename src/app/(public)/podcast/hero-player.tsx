'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Icon } from '@/components/ui'
import { PlayGlyph, VolumeGlyph, FullscreenGlyph } from '@/components/podcast'
import { EMBED_ALLOW } from '@/lib/video'

/**
 * The hero player, drawn exactly as the design shows it: the episode poster
 * with one large centred play button and a control bar overlaid along the
 * bottom of the video. It is a facade — the bar is painted, not wired — and a
 * click swaps in the real embed (autoplaying), so the page still plays inline
 * without shipping a player of its own.
 */
export function HeroPlayer({
  embedUrl,
  poster,
  title,
  duration,
}: {
  embedUrl: string
  poster: string
  title: string
  duration: string
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy shadow-lift ring-1 ring-black/5">
      {playing ? (
        <iframe
          src={`${embedUrl}?autoplay=1&rel=0`}
          title={title}
          allow={EMBED_ALLOW}
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play — ${title}`}
          className="group absolute inset-0 block h-full w-full"
        >
          <Image
            src={poster}
            alt={title}
            fill
            priority
            sizes="(max-width:1024px) 100vw, 640px"
            className="object-cover"
          />

          {/* a touch of darkening top and bottom so the controls read */}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10"
          />

          {/* big centred play button — a clean hollow white ring, as the design draws it */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/15 backdrop-blur-[2px] transition-all group-hover:scale-105 group-hover:bg-black/25"
          >
            <PlayGlyph className="ml-1 h-6 w-6 text-white" />
          </span>

          {/* painted control bar */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3.5 pt-10 text-white"
          >
            {/* Not started yet: the bar shows the real length and no progress. */}
            <PlayGlyph className="h-4 w-4 shrink-0" />
            <span className="tabular shrink-0 text-[11.5px] text-white/85">00:00 / {duration}</span>

            <span className="relative mx-1 h-[3px] min-w-0 flex-1 rounded-full bg-white/25">
              <span className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow" />
            </span>

            <span className="flex shrink-0 items-center gap-3">
              <VolumeGlyph />
              <Icon name="settings" className="h-4 w-4" />
              <FullscreenGlyph />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
