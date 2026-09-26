'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A one-row strip that shows a fixed number of items and slides on its own.
 *
 * Used twice on the product page — the gallery thumbnails (5 across on a
 * computer, 4 on a tablet) and the Related Products row (6 across, full
 * width) — so the two behave identically instead of drifting apart.
 *
 * Three deliberate properties:
 *
 *  · **Always one row.** The slot width is computed from the visible count,
 *    so items never wrap out of their column the way a `flex-wrap` strip did.
 *  · **Stops when a person is looking.** Hover, keyboard focus and touch all
 *    pause the timer; `prefers-reduced-motion` switches it off entirely.
 *  · **Server-rendered children.** The items are passed in already rendered,
 *    so `<ProductCard>` and the thumbnail links stay Server Components and no
 *    product data crosses into the client bundle.
 *
 * Fewer items than fit? The timer never starts — there is nothing to advance
 * to, and a strip that jitters in place reads as a bug.
 */

type PerView = { base: number; md: number; lg: number }

export function AutoRail({
  items,
  perView,
  gap = 8,
  intervalMs = 3200,
  label,
  className,
}: {
  items: React.ReactNode[]
  perView: PerView
  /** Pixels between slots. Also the figure the slot width subtracts. */
  gap?: number
  intervalMs?: number
  label: string
  className?: string
}) {
  const count = items.length

  const [visible, setVisible] = useState(perView.lg)
  const [start, setStart] = useState(0)
  const [paused, setPaused] = useState(false)
  const [step, setStep] = useState(0)
  const trackRef = useRef<HTMLUListElement>(null)

  /* Which breakpoint we are at. Read from the same widths Tailwind uses. */
  useEffect(() => {
    const md = window.matchMedia('(min-width: 768px)')
    const lg = window.matchMedia('(min-width: 1024px)')
    const read = () =>
      setVisible(lg.matches ? perView.lg : md.matches ? perView.md : perView.base)

    read()
    md.addEventListener('change', read)
    lg.addEventListener('change', read)
    return () => {
      md.removeEventListener('change', read)
      lg.removeEventListener('change', read)
    }
  }, [perView.base, perView.md, perView.lg])

  /*
   * How far one advance moves the track.
   *
   * ★ Derived from the VIEWPORT width, never measured off a slot.
   *
   *   Measuring the first child looked simpler and was wrong: when the
   *   breakpoint changes, `visible` updates a render before the children are
   *   laid out at their new width, so the observer recorded the *previous*
   *   slot size and the strip settled a few pixels off — items hanging out of
   *   the column on one side and clipped on the other.
   *
   *   A slot is `(W - (visible - 1) * gap) / visible`, so one advance is that
   *   plus the gap, which reduces exactly to `(W + gap) / visible`. No
   *   measurement of anything React is still rendering.
   */
  useEffect(() => {
    const el = trackRef.current?.parentElement
    if (!el) return

    const measure = () => setStep((el.getBoundingClientRect().width + gap) / visible)

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [gap, visible])

  const maxStart = Math.max(0, count - visible)

  /* A narrower window can leave the track scrolled past its own end. */
  useEffect(() => {
    if (start > maxStart) setStart(0)
  }, [start, maxStart])

  useEffect(() => {
    if (maxStart === 0 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const t = window.setTimeout(
      () => setStart((s) => (s >= maxStart ? 0 : s + 1)),
      intervalMs
    )
    return () => window.clearTimeout(t)
  }, [start, paused, maxStart, intervalMs])

  if (count === 0) return null

  return (
    <div
      className={cn('relative', className)}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="overflow-hidden">
        <ul
          ref={trackRef}
          className="flex transition-transform duration-500 ease-out"
          style={{ gap: `${gap}px`, transform: `translateX(-${start * step}px)` }}
        >
          {items.map((node, i) => (
            <li
              key={i}
              className="shrink-0"
              style={{ width: `calc((100% - ${(visible - 1) * gap}px) / ${visible})` }}
            >
              {node}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
