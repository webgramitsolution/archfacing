'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The phone hero's photograph — cross-fades between the supplied banners,
 * with the pager dots under the button. Text and the header sit on top as
 * children. Pauses on touch and under reduced motion.
 */
export function MobileHero({ images, children }: { images: string[]; children: React.ReactNode }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = images.length

  useEffect(() => {
    if (count < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), 5000)
    return () => window.clearTimeout(t)
  }, [index, paused, count])

  return (
    <section
      className="relative isolate overflow-hidden bg-navy text-white"
      onTouchStart={() => setPaused(true)}
      aria-roledescription="carousel"
      aria-label="ArchFacing"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            unoptimized
            className={cn('object-cover object-[70%_center] transition-opacity duration-700', i === index ? 'opacity-100' : 'opacity-0')}
          />
        ))}
        {/* the left-side wash that keeps the white type readable */}
        <span className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/55 to-navy/10" />
        <span className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy/70 to-transparent" />
      </div>

      {children}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => { setIndex(i); setPaused(true) }}
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn('h-[5px] rounded-full transition-all', i === index ? 'w-6 bg-brand' : 'w-4 bg-white/85')}
            />
          ))}
        </div>
      )}
    </section>
  )
}
