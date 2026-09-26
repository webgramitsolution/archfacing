'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addBrandLogoAction, updateBrandLogoAction, type BrandState } from './actions'

const f = 'h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none'

/** The tile exactly as the public strip draws it: white card, padded, contained. */
export function LogoTile({ src, name, dim = false }: { src: string; name: string; dim?: boolean }) {
  return (
    <span className={'relative flex h-[70px] w-[160px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line bg-white p-3 ' + (dim ? 'opacity-40' : '')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="max-h-full max-w-full object-contain" />
    </span>
  )
}

function FilePreview({ onPick }: { onPick: (url: string | null) => void }) {
  return (
    <input
      name="file"
      type="file"
      accept="image/svg+xml,image/png,image/jpeg,image/webp"
      onChange={(e) => {
        const file = e.target.files?.[0]
        onPick(file ? URL.createObjectURL(file) : null)
      }}
      className="block w-full text-[12px] file:mr-2 file:rounded-md file:border-0 file:bg-paper-3 file:px-2.5 file:py-1.5 file:text-[11.5px] file:font-semibold"
    />
  )
}

export function AddBrandForm() {
  const [state, action, pending] = useActionState<BrandState, FormData>(addBrandLogoAction, null)
  const [preview, setPreview] = useState<string | null>(null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setPreview(null) } }, [state])
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-3">
      <label className="w-[200px] text-[11px] font-medium text-ink-3">Brand / organisation<input name="name" required maxLength={60} className={`${f} mt-0.5`} /></label>
      <label className="w-[240px] text-[11px] font-medium text-ink-3">Link (optional)<input name="href" type="url" placeholder="https://…" className={`${f} mt-0.5`} /></label>
      <label className="min-w-[220px] flex-1 text-[11px] font-medium text-ink-3">Logo — SVG, PNG, JPG or WebP, any size
        <span className="mt-0.5 block"><FilePreview onPick={setPreview} /></span>
      </label>
      {preview && <LogoTile src={preview} name="Preview" />}
      <button type="submit" disabled={pending} className="h-9 rounded-lg bg-brand px-4 text-[12.5px] font-semibold text-white disabled:opacity-60">{pending ? 'Uploading…' : 'Add logo'}</button>
      {state && <p role={state.ok ? 'status' : 'alert'} className={'w-full text-[11.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
    </form>
  )
}

export function EditBrandForm({ b }: { b: { id: string; name: string; href: string | null; active: boolean; src: string } }) {
  const [state, action, pending] = useActionState<BrandState, FormData>(updateBrandLogoAction, null)
  const [preview, setPreview] = useState<string | null>(null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={b.id} />
      <LogoTile src={preview ?? b.src} name={b.name} dim={!b.active} />
      <label className="w-[180px] text-[11px] text-ink-3">Name<input name="name" required maxLength={60} defaultValue={b.name} className={`${f} mt-0.5`} /></label>
      <label className="w-[210px] text-[11px] text-ink-3">Link<input name="href" type="url" defaultValue={b.href ?? ''} placeholder="https://…" className={`${f} mt-0.5`} /></label>
      <label className="w-[210px] text-[11px] text-ink-3">Replace image<span className="mt-0.5 block"><FilePreview onPick={setPreview} /></span></label>
      <label className="flex h-9 items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" name="active" defaultChecked={b.active} className="h-3.5 w-3.5 accent-brand" /> Shown</label>
      <button type="submit" disabled={pending} className="h-9 rounded-lg border border-line px-3 text-[12px] font-semibold text-ink-2 hover:border-brand hover:text-brand disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
      {state && <span role={state.ok ? 'status' : 'alert'} className={'text-[11px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</span>}
    </form>
  )
}
