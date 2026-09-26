'use client'

import { useState } from 'react'
import Image from 'next/image'

/**
 * The profile output page's hero banner — a slider of the professional's own
 * published photography (via `storefrontBanners`). Overlay: discipline eyebrow,
 * heading and tagline. Arrows + dots for more than one slide; a quiet navy
 * gradient when there are none yet.
 */
export function ProfileHero({
  images,
  eyebrow,
  heading,
  tagline,
  script,
}: {
  images: string[]
  eyebrow: string
  heading: string
  tagline: string | null
  script?: string | null
}) {
  const [i, setI] = useState(0)
  const n = images.length
  const go = (d: number) => setI((p) => (p + d + Math.max(1, n)) % Math.max(1, n))

  return (
    <section className="relative h-[150px] w-full overflow-hidden rounded-card bg-navy sm:h-[175px] lg:h-[200px]">
      {n > 0 ? (
        images.map((src, idx) => (
          <div
            key={src + idx}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: idx === i ? 1 : 0 }}
            aria-hidden={idx !== i}
          >
            <Image src={src} alt="" fill priority={idx === 0} sizes="100vw" className="object-cover" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-[#0e2c54] to-[#123a6b]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/45 to-navy/10" />

      {/* decorative script, top-right (reference) */}
      {script && (
        <p className="pointer-events-none absolute right-6 top-8 hidden max-w-[180px] text-right font-serif text-[22px] italic leading-tight text-white/85 lg:block lg:text-[26px]">
          {script}
        </p>
      )}

      <div className="relative flex h-full flex-col justify-center px-6 sm:px-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 max-w-xl font-display text-[20px] font-bold leading-[1.1] text-white sm:text-[24px] lg:text-[28px]">
          {heading}
        </h2>
        {tagline && (
          <p className="mt-1.5 max-w-md text-[11.5px] leading-relaxed text-white/85 sm:text-[12.5px]">{tagline}</p>
        )}
      </div>

      {n > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={() => go(-1)}
            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm transition-colors hover:bg-white">‹</button>
          <button type="button" aria-label="Next slide" onClick={() => go(1)}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm transition-colors hover:bg-white">›</button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, idx) => (
              <button key={idx} type="button" aria-label={`Go to slide ${idx + 1}`} onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
