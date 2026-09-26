'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminUploadDocumentAction, rejectUserAction, saveUserAccessAction, type UserOpState } from '../actions'

const btn = 'rounded-lg px-3 py-2 text-[12px] font-semibold transition-opacity disabled:opacity-50'

/** Super Admin only: which admin modules this staff account may open. */
export function AccessEditor({
  userId, current, modules, presets,
}: {
  userId: string
  current: string[]
  modules: { key: string; label: string; hint: string }[]
  presets: { label: string; keys: string[] }[]
}) {
  const [state, action, pending] = useActionState<UserOpState, FormData>(saveUserAccessAction, null)
  const [picked, setPicked] = useState<Set<string>>(new Set(current))
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-ink-4">Quick set:</span>
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => setPicked(new Set(p.keys))} className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] font-medium text-ink-2 hover:border-brand hover:text-brand">{p.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {modules.map((m) => (
          <label key={m.key} className={'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ' + (picked.has(m.key) ? 'border-brand bg-brand-soft/40' : 'border-line')}>
            <input type="checkbox" name="permissions" value={m.key} checked={picked.has(m.key)} onChange={() => toggle(m.key)} className="mt-0.5 h-3.5 w-3.5 accent-brand" />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-ink">{m.label}</span>
              <span className="block text-[10.5px] leading-snug text-ink-3">{m.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3">
        {state && <p role={state.ok ? 'status' : 'alert'} className={'text-[11.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
        <button type="submit" disabled={pending} className={`${btn} bg-navy text-white`}>{pending ? 'Saving…' : `Save access (${picked.size})`}</button>
      </div>
    </form>
  )
}

/** Upload a verification document on the member's behalf. */
export function DocUpload({ userId, types }: { userId: string; types: { id: string; name: string; required: boolean }[] }) {
  const [state, action, pending] = useActionState<UserOpState, FormData>(adminUploadDocumentAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  if (types.length === 0) return <p className="text-[11.5px] text-ink-3">No document types apply to this account — add them in Verification Settings.</p>
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="text-[11px] text-ink-3">Document
        <select name="docTypeId" required className="mt-0.5 block h-9 rounded-lg border border-line bg-white px-2 text-[12px]">
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.required ? ' *' : ''}</option>)}
        </select>
      </label>
      <label className="min-w-0 flex-1 text-[11px] text-ink-3">File (JPG, PNG or PDF)
        <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-0.5 block w-full text-[12px] file:mr-2 file:rounded-md file:border-0 file:bg-paper-3 file:px-2.5 file:py-1.5 file:text-[11.5px] file:font-semibold" />
      </label>
      <button type="submit" disabled={pending} className={`${btn} bg-brand text-white`}>{pending ? 'Uploading…' : 'Upload'}</button>
      {state && <p role={state.ok ? 'status' : 'alert'} className={'w-full text-[11.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
    </form>
  )
}

/** Reject a pending professional with the reason they will be sent. */
export function RejectVerification({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${btn} bg-danger-soft text-danger`}>Reject…</button>
  return (
    <div className="flex w-full flex-col gap-2">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} placeholder="What is missing? The member receives this." className="w-full rounded-lg border border-line px-2.5 py-2 text-[12px] focus:border-brand focus:outline-none" />
      <div className="flex items-center gap-2">
        <button type="button" disabled={pending || reason.trim().length < 5} onClick={() => start(async () => {
          const r = await rejectUserAction(userId, reason)
          if (!r.ok) setError(r.error ?? 'Could not send.')
          else { setOpen(false); router.refresh() }
        })} className={`${btn} bg-danger text-white`}>{pending ? 'Sending…' : 'Send rejection'}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-ink-3">Cancel</button>
        {error && <span role="alert" className="text-[11px] text-danger">{error}</span>}
      </div>
    </div>
  )
}
