'use client'

import { useActionState } from 'react'
import { uploadMyDocumentAction, type DocState } from './actions'

export function UploadDocumentForm({ types }: { types: { id: string; name: string; required: boolean }[] }) {
  const [state, action, pending] = useActionState<DocState, FormData>(uploadMyDocumentAction, null)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end" key={state?.ok ? String(Date.now()) : 'form'}>
      <label className="block text-[12px] font-medium text-ink-2">Document type
        <select name="docTypeId" required className="input mt-1 h-10 text-[13px]">
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.required ? ' (required)' : ''}</option>)}
        </select>
      </label>
      <label className="block text-[12px] font-medium text-ink-2">File <span className="font-normal text-ink-4">(JPG, PNG, WebP or PDF)</span>
        <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full text-[12.5px] text-ink-2 file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-ink-2" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary h-10 px-5 text-[13px] disabled:opacity-60">{pending ? 'Uploading…' : 'Upload'}</button>
      {state && <p role={state.ok ? 'status' : 'alert'} className={'text-[12px] md:col-span-3 ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
    </form>
  )
}
