'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The product's photographs — the feature image and the thumbnail row.
 *
 * ★ The FEATURE IMAGE is what slides. The thumbnails do not move; they sit in
 *   one row and the one matching the picture on screen shows as selected, so
 *   the strip reads as an index of the set rather than a second carousel.
 *
 * Everything else follows from that:
 *
 *  · Choosing a thumbnail shows that picture and stops the timer — a person
 *    who has picked a photograph should not have it taken away two seconds
 *    later. Hover, keyboard focus and touch pause it the same way.
 *  · `prefers-reduced-motion` switches the advance off entirely.
 *  · The strip shows 5 across on a computer and 4 on a tablet. When a product
 *    carries more photographs than that, the row slides just enough to keep
 *    the selected one in view — it is never the thing driving the change.
 *  · One photograph means no timer, no strip: nothing to advance to.
 *
 * The images arrive already resolved to their final URLs, so this component
 * pulls no product code into the client bundle.
 */

const INTERVAL_MS = 4000
const GAP = 8

export function ProductGallery({
  photos,
  title,
}: {
  /** Final image URLs, in order. `src` leads the page, `thumb` fills the row. */
  photos: { src: string; thumb: string }[]
  title: string
}) {
  const count = photos.length

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [chosen, setChosen] = useState(false)
  const [perView, setPerView] = useState(5)
  const [step, setStep] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  /* 5 across on a computer, 4 from the tablet down. */
  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1024px)')
    const read = () => setPerView(lg.matches ? 5 : 4)
    read()
    lg.addEventListener('change', read)
    return () => lg.removeEventListener('change', read)
  }, [])

  /*
   * One slot's advance, derived from the strip's own width rather than
   * measured off a child: `(W + gap) / perView` is exactly a slot plus its
   * gap, and needs nothing React is still laying out.
   */
  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    const measure = () => setStep((el.getBoundingClientRect().width + GAP) / perView)
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [perView])

  /* The feature image advances on its own. */
  useEffect(() => {
    if (count < 2 || paused || chosen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS)
    return () => window.clearTimeout(t)
  }, [index, paused, chosen, count])

  if (count === 0) return null

  /* Slide the strip only as far as it takes to keep the selection in view. */
  const maxStart = Math.max(0, count - perView)
  const offset = Math.min(maxStart, Math.max(0, index - perView + 1))

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {/* ─── the feature image ─── */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-paper-2"
        aria-roledescription="carousel"
        aria-label={`${title} — photographs`}
      >
        {photos.map((p, i) => (
          <div
            key={p.src + i}
            aria-hidden={i !== index}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Image
              src={p.src}
              alt={i === index ? title : ''}
              fill
              priority={i === 0}
              sizes="(min-width:1024px) 28vw, (min-width:768px) 34vw, 92vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      {/* ─── the thumbnails: an index, not a second carousel ─── */}
      {count > 1 && (
        <div ref={stripRef} className="overflow-hidden">
          <ul
            className="flex transition-transform duration-500 ease-out"
            style={{ gap: `${GAP}px`, transform: `translateX(-${offset * step}px)` }}
          >
            {photos.map((p, i) => (
              <li
                key={p.thumb + i}
                className="shrink-0"
                style={{ width: `calc((100% - ${(perView - 1) * GAP}px) / ${perView})` }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i)
                    setChosen(true)
                  }}
                  aria-label={`Show photograph ${i + 1} of ${count}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={cn(
                    'block aspect-square w-full overflow-hidden rounded-card border-2 transition-colors',
                    i === index ? 'border-brand' : 'border-line hover:border-brand-border'
                  )}
                >
                  <Image
                    src={p.thumb}
                    alt=""
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
