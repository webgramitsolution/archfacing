'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { photoSrc } from './blog'
import { ArtGlyph } from './artistry-glyph'

/**
 * The artwork gallery.
 *
 * The frames are one scroll-snap rail, so a swipe or a trackpad flick lands
 * squarely on a photograph with no layout maths. On top of that the rail
 * advances itself every few seconds, which is the only reason this is a Client
 * Component at all.
 *
 * The thumbnails below are the whole set, in ONE row of fixed-size tiles —
 * eight across on tablet/desktop, five on a phone (client rule). A piece with
 * fewer photos keeps small tiles rather than stretching one into a second
 * hero; more than eight scroll sideways and follow the auto-advancing image.
 *
 * The auto-advance stops the moment a reader touches it — hover, focus, or a
 * scroll of their own — and never starts if the system asks for reduced
 * motion. An image carousel that keeps yanking itself out from under a
 * pointer is worse than no carousel.
 */

/** How long each frame holds before the rail moves on. */
const DWELL_MS = 5000

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const total = images.length
  const rail = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [current, setCurrent] = useState(0)
  const strip = useRef<HTMLUListElement>(null)

  // No scrollbar on the strip — so it follows the main image by itself.
  useEffect(() => {
    const ul = strip.current
    const li = ul?.children[current] as HTMLElement | undefined
    if (!ul || !li) return
    const left = li.offsetLeft - (ul.clientWidth - li.clientWidth) / 2
    ul.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [current])

  /** Scroll the rail to frame `i` (wrapping), the arrows' and thumbnails' one move. */
  const goTo = (i: number) => {
    const el = rail.current
    if (!el || total === 0) return
    const n = ((i % total) + total) % total
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }

  // Which frame is showing — read from the rail, so swipes count too.
  useEffect(() => {
    const el = rail.current
    if (!el) return
    const onScroll = () => setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (total < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = window.setInterval(() => {
      const el = rail.current
      if (!el) return

      const step = el.clientWidth
      const atEnd = el.scrollLeft + step >= el.scrollWidth - 8
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' })
    }, DWELL_MS)

    return () => window.clearInterval(id)
  }, [total, paused])

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* ─── the frames ─── */}
      <div className="relative min-w-0">
      <div
        ref={rail}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onTouchStart={() => setPaused(true)}
        className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card bg-paper-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={`${title} — ${total} images`}
      >
        {images.map((id, i) => {
          const n = i + 1

          return (
            <figure
              key={`img-${i}`}
              id={`img-${n}`}
              className="relative aspect-[16/9] w-full shrink-0 snap-start scroll-mt-24"
            >
              <Image
                src={photoSrc(id, { w: 1400, h: 790 })}
                alt={`${title} — image ${n} of ${total}`}
                fill
                priority={i === 0}
                sizes="(min-width:1024px) 800px, 100vw"
                className="object-cover"
              />

              {/* Opens the photograph at full size — a real destination, not a
                  lightbox we would need more JavaScript to build. */}
              <a
                href={photoSrc(id, { w: 2000 })}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`Open image ${n} at full size`}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-navy/60 text-white backdrop-blur-sm transition-colors hover:bg-navy"
              >
                <ArtGlyph name="expand" className="h-4 w-4" />
              </a>

              <figcaption className="tabular absolute bottom-3 right-3 rounded-pill bg-navy/70 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-sm">
                {n} / {total}
              </figcaption>
            </figure>
          )
        })}
      </div>

      </div>

      {/* ─── every thumbnail ─── */}
      <ul ref={strip} className="relative flex min-w-0 gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((id, i) => {
          const n = i + 1

          return (
            <li key={`thumb-${i}`} className="w-[calc((100%-4*0.625rem)/5)] shrink-0 md:w-[calc((100%-7*0.625rem)/8)]">
              <a
                href={`#img-${n}`}
                onClick={(e) => { e.preventDefault(); setPaused(true); goTo(i) }}
                aria-label={`Show image ${n} of ${total}`}
                aria-current={i === current ? 'true' : undefined}
                className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg border-2 bg-paper-3 transition-colors ${i === current ? 'border-brand' : 'border-transparent hover:border-brand/50'}`}
              >
                <Image
                  src={photoSrc(id, { w: 320, h: 240 })}
                  alt=""
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
