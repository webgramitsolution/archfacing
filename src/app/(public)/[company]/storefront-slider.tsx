'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The banner slider under a seller's header.
 *
 * A 3:1 band that advances on its own — the shopfront window, replacing the
 * grid of thumbnails that used to sit here.
 *
 * Three things it deliberately does:
 *
 *  · **Stops when a person is looking.** Hovering, focusing a control or
 *    holding a touch pauses the timer. An advertisement that slides away
 *    while somebody is reading it is worse than one that never moved.
 *  · **Obeys `prefers-reduced-motion`.** Auto-advance is motion the reader
 *    did not ask for, and some readers have asked for none.
 *  · **Works without JavaScript having run.** The first slide is rendered
 *    server-side inside the same markup, so the band never appears empty.
 *
 * One slide only? It renders as a plain banner — no timer, no arrows, no
 * dots, because there is nothing to advance to.
 */

const INTERVAL_MS = 5000

export function StorefrontSlider({
  images,
  alt,
}: {
  images: string[]
  /** The seller's name — the slides are decorative, so this describes the set. */
  alt: string
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = images.length

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  )

  /*
   * The timer.
   *
   * Rebuilt whenever the index changes, so a manual jump restarts the full
   * interval rather than leaving the reader a fraction of a second before the
   * next slide takes over.
   */
  useEffect(() => {
    if (count < 2 || paused) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS)
    return () => window.clearTimeout(t)
  }, [index, paused, count, go])

  if (count === 0) return null

  return (
    <section
      className="container-af pt-6"
      aria-roledescription="carousel"
      aria-label={`${alt} — gallery`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative isolate overflow-hidden rounded-card bg-paper-3">
        {/* 3:1 — the shape the band is drawn at, whatever the photographs are. */}
        <div className="relative aspect-[3/1] w-full">
          {images.map((src, i) => (
            <div
              key={src + i}
              aria-hidden={i !== index}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-out',
                i === index ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                sizes="(max-width:1024px) 100vw, 1200px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <SlideButton side="left" onClick={() => go(index - 1)} label="Previous slide" />
            <SlideButton side="right" onClick={() => go(index + 1)} label="Next slide" />

            {/* Dots: position, and a way to jump straight to a slide. */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1} of ${count}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function SlideButton({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right'
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-card transition-colors hover:bg-white',
        side === 'left' ? 'left-3' : 'right-3'
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d={side === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
