'use client'

import { useRef, useState } from 'react'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import { uploadProfileImageAction, removeProfileImageAction } from './profile-tab-actions'

/**
 * Uploads a profile photo or company logo. The image saves straight to the User
 * row server-side, so the preview updates as soon as it is processed and there
 * is nothing to submit with the form.
 *
 *  - `full`   → the reference photo block: round photo with a camera badge, a
 *               dashed "Upload Photo" box and a Remove control.
 *  - default  → a compact button (used for the company logo).
 */
export function ImageUpload({
  current,
  target,
  shape = 'circle',
  label,
  full = false,
}: {
  current: string | null
  target: 'photo' | 'logo'
  shape?: 'circle' | 'square'
  label?: string
  full?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Instant feedback — show the picked file straight away while it uploads.
    const localPreview = URL.createObjectURL(file)
    setUrl(localPreview)
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.set('file', file)
    fd.set('target', target)
    const r = await uploadProfileImageAction(fd)
    setBusy(false)
    URL.revokeObjectURL(localPreview)
    if (r.ok) setUrl(r.url)
    else { setError(r.error); setUrl(current) }
    if (inputRef.current) inputRef.current.value = ''
  }

  async function remove() {
    setBusy(true)
    await removeProfileImageAction(target)
    setBusy(false)
    setUrl(null)
  }

  const round = shape === 'circle' ? 'rounded-full' : 'rounded-card'

  if (full) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-4">
          {/* photo with camera badge */}
          <div className="relative shrink-0">
            <span className={cn('flex h-24 w-24 items-center justify-center overflow-hidden border border-line bg-paper-3', round)}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name={target === 'logo' ? 'building' : 'user'} className="h-9 w-9 text-ink-4" />
              )}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label="Change photo"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white shadow-md transition-opacity hover:opacity-90"
            >
              <Icon name="image" className="h-4 w-4" />
            </button>
          </div>

          {/* dashed upload box */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex min-w-[190px] flex-1 flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-line bg-paper-2 px-4 py-4 text-center transition-colors hover:border-brand"
          >
            <Icon name="download" className="h-5 w-5 rotate-180 text-brand" />
            <span className="text-[13px] font-semibold text-brand">{busy ? 'Uploading…' : 'Upload Photo'}</span>
            <span className="text-[11px] text-ink-4">JPG, PNG (Max 2MB)</span>
            {url && (
              <span
                onClick={(e) => { e.stopPropagation(); remove() }}
                className="mt-1 rounded-lg border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink-2 hover:border-brand hover:text-brand"
              >
                Remove
              </span>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-3">A clear professional photo helps build trust.</p>
        {error && <p className="mt-1 text-[11px] font-medium text-brand">{error}</p>}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn('group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-line bg-paper-3', round)}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name={target === 'logo' ? 'building' : 'user'} className="h-8 w-8 text-ink-4" />
        )}
        <span className={cn('absolute inset-0 flex items-center justify-center bg-navy/55 text-white opacity-0 transition-opacity group-hover:opacity-100', busy && 'opacity-100')}>
          <Icon name={busy ? 'clock' : 'image'} className="h-5 w-5" />
        </span>
      </button>
      <div className="min-w-0">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60">
          <Icon name="image" className="h-3.5 w-3.5" /> {busy ? 'Uploading…' : label ?? (url ? 'Change' : 'Upload')}
        </button>
        <p className="mt-1 text-[11px] text-ink-4">JPG, PNG, WEBP · Max 2MB</p>
        {error && <p className="mt-1 text-[11px] font-medium text-brand">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
    </div>
  )
}
