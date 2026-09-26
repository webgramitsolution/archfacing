'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Icon } from '@/components/ui'

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)
  return (
    <div className="md:sticky md:top-24">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-paper-2">
        {images[active] ? (
          <Image src={images[active]} alt={title} fill priority sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-ink-4"><Icon name="bag" className="h-10 w-10" /></span>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button key={i} type="button" onClick={() => setActive(i)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === active ? 'border-brand' : 'border-line hover:border-brand/40'}`}>
              <Image src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
