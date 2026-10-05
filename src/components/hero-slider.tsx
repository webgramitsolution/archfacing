'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The home hero's background slider.
 *
 * The banner cross-fades between the supplied images on a timer, and the
 * dots drive it by hand (no side arrows — client request). The headline, buttons and
 * the three cards are passed in as `children` and sit still on top — only the
 * photograph behind them changes, which is how the reference hero behaves.
 *
 * · Auto-advance pauses on hover, focus and touch, and switches off entirely
 *   under `prefers-reduced-motion`.
 * · A single image renders as a plain banner — no timer, no arrows, no dots.
 */

const INTERVAL_MS = 5000

export function HeroSlider({
  images,
  children,
}: {
  images: string[]
  children: React.ReactNode
}) {
  const count = images.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  )

  useEffect(() => {
    if (count < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS)
    return () => window.clearTimeout(t)
  }, [index, paused, count, go])

  return (
    <section
      className="relative isolate overflow-hidden rounded-[14px] bg-navy"
      aria-roledescription="carousel"
      aria-label="ArchFacing highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* the cross-fading photographs */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {images.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              'object-cover object-center transition-opacity duration-700 ease-out',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}
        {/* No gradient — the supplied banners carry their own composition and
            are shown clean, exactly as the client asked. */}
      </div>

      {children}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1} of ${count}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'h-[7px] rounded-pill transition-all',
                i === index ? 'w-8 bg-brand' : 'w-5 bg-white/85 hover:bg-white'
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

