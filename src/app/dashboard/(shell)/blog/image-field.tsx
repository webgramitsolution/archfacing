'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { uploadBlogImageAction } from './blog-actions'
import { cn } from '@/lib/utils'

/**
 * Pick a picture, upload it, keep the URL.
 *
 * Sections are added and edited long before the blog is saved, so a section's
 * image cannot ride along with the form the way every other upload in the app
 * does. This posts the one file on its own and stores the URL it gets back in
 * the block.
 *
 * `cover` marks the featured image, which has to sit in a card grid and so
 * keeps the 16:9 rule; everything inside the article uploads at any shape.
 */
export function ImageField({
  value,
  onChange,
  cover = false,
  label = 'Image',
  ratio = 'aspect-[16/9]',
  error,
}: {
  value: string
  onChange: (url: string) => void
  cover?: boolean
  label?: string
  ratio?: string
  error?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState<string | null>(null)

  function choose(file: File | undefined) {
    if (!file) return
    setProblem(null)
    start(async () => {
      const fd = new FormData()
      fd.set('file', file)
      if (cover) fd.set('cover', '1')
      const res = await uploadBlogImageAction(fd)
      if (res.ok) onChange(res.url)
      else setProblem(res.error)
      // let the same file be chosen again after a failure
      if (input.current) input.current.value = ''
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-dashed bg-paper-3',
          ratio,
          error || problem ? 'border-brand' : 'border-line'
        )}
      >
        {value ? (
          <Image src={value} alt="" fill sizes="400px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-4">
            {pending ? 'Uploading…' : 'No image yet'}
          </span>
        )}

        {pending && value && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper-2/70 text-[12px] font-semibold text-ink">
            Uploading…
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => input.current?.click()}
          className="btn-outline px-3 py-1.5 text-[12.5px] disabled:opacity-60"
        >
          {value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {value && !pending && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[12px] text-ink-4 transition-colors hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>

      {problem && <p className="text-[12px] font-medium text-brand">{problem}</p>}
      {!problem && (
        <p className="text-[11.5px] text-ink-4">
          JPG, PNG or WebP, up to 2 MB.
          {cover ? ' Landscape, close to 16:9 — it sits in the article cards.' : ' Any shape.'}
        </p>
      )}
    </div>
  )
}
