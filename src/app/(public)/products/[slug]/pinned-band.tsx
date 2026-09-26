'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The product page's three-column band.
 *
 * ★ THE PAGE'S OWN SCROLLBAR DRIVES THE MIDDLE COLUMN.
 *
 *   The requirement, stated plainly: the middle column is exactly as tall as
 *   the product-feature column, shows only that much, and the rest appears as
 *   you scroll — the gallery and the seller card holding still meanwhile, the
 *   way a blog's author card holds still beside the article. When the middle
 *   column runs out, the page carries on to what is below.
 *
 *   An inner `overflow-y: auto` box looked like the answer and was not: the
 *   wheel only reaches it while the pointer is over it, so the page scrolled
 *   the band away instead and the description became unreachable. Hiding the
 *   scrollbar removed the last clue that it was even there.
 *
 *   So nothing here is a scroll container. The band is PINNED for exactly as
 *   long as the middle column has content left to reveal — the outer element
 *   is that much taller than the band — and the reader's ordinary page scroll
 *   is converted into a translate on the middle column's content. Wheel,
 *   trackpad, touch, keyboard, scrollbar drag and Page Down all work, because
 *   they are all just page scrolling.
 *
 * Below the tablet none of this applies: one column, normal flow, and the
 * page scrolls the way it always did.
 */

/** Matches `top-28` — clear of the 104px sticky site header. */
const PIN_TOP = 112

export function PinnedBand({
  gallery,
  info,
  seller,
}: {
  gallery: React.ReactNode
  info: React.ReactNode
  seller: React.ReactNode
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  /** Whether the pinned behaviour applies at all (tablet and up). */
  const [wide, setWide] = useState(false)
  /** The band's height — the product-feature column decides it. */
  const [bandH, setBandH] = useState(0)
  /** How much of the middle column does not fit in the band. */
  const [overflow, setOverflow] = useState(0)
  /** How far the middle column's content has been revealed. */
  const [shift, setShift] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const read = () => setWide(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  const measure = useCallback(() => {
    const g = galleryRef.current
    const c = contentRef.current
    if (!g || !c) return

    /*
     * The band is EXACTLY as tall as the product-feature column — image plus
     * thumbnail strip. The middle column shows only that much of the
     * specification; the rest is revealed by scrolling. Matching the gallery
     * height is the whole point: the two columns' bottoms line up, and nothing
     * of the middle column hangs below the picture.
     */
    const band = Math.round(g.getBoundingClientRect().height)
    setBandH(band)
    setOverflow(Math.max(0, Math.round(c.getBoundingClientRect().height) - band))
  }, [])

  useEffect(() => {
    if (!wide) {
      setShift(0)
      return
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (galleryRef.current) ro.observe(galleryRef.current)
    if (contentRef.current) ro.observe(contentRef.current)
    return () => ro.disconnect()
  }, [wide, measure])

  useEffect(() => {
    if (!wide || overflow === 0) {
      setShift(0)
      return
    }

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const el = outerRef.current
        if (!el) return
        const travelled = PIN_TOP - el.getBoundingClientRect().top
        setShift(Math.min(overflow, Math.max(0, travelled)))
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [wide, overflow])

  const pinned = wide && bandH > 0

  return (
    /*
     * Taller than the band by exactly the amount left to reveal. That extra
     * height is what the reader scrolls through while the band stays put.
     */
    <div ref={outerRef} style={pinned ? { height: bandH + overflow } : undefined}>
      <div
        className={pinned ? 'sticky top-28' : undefined}
        style={pinned ? { height: bandH } : undefined}
      >
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[minmax(0,33fr)_minmax(0,45fr)_minmax(0,22fr)]">
          {/* ─── 1 · the product feature image, which sets the band's height ─── */}
          <div className="min-w-0">
            <div ref={galleryRef}>{gallery}</div>
          </div>

          {/* ─── 2 · the window onto the middle column ─── */}
          <div className="relative min-w-0 overflow-hidden">
            <div
              ref={contentRef}
              className="md:absolute md:inset-x-0 md:top-0 md:will-change-transform"
              style={pinned ? { transform: `translateY(-${shift}px)` } : undefined}
            >
              {info}
            </div>
          </div>

          {/* ─── 3 · the seller, holding still beside it ─── */}
          <div className="hidden min-w-0 md:block">{seller}</div>
        </div>
      </div>
    </div>
  )
}
