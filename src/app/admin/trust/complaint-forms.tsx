'use client'

import { useActionState, useState } from 'react'
import { decideComplaintAction, fileComplaintAction, type TrustOpState } from './actions'

/** Inline decision for one complaint row. */
export function ComplaintDecision({ id, status }: { id: string; status: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<TrustOpState, FormData>(decideComplaintAction, null)
  if (status === 'RESOLVED' || status === 'DISMISSED') return <span className="text-[11px] text-ink-4">Closed</span>
  if (state?.ok) return <span role="status" className="block max-w-[200px] text-[11.5px] text-ok">{state.message}</span>
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-brand hover:bg-brand-soft">
        Decide
      </button>
    )
  }
  return (
    <form action={action} className="flex w-[230px] flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <select name="decision" defaultValue={status === 'OPEN' ? 'REVIEW' : 'UPHOLD'} className="input h-8 py-0 text-[12px]">
        {status === 'OPEN' && <option value="REVIEW">Take under review</option>}
        <option value="UPHOLD">Uphold — counts toward PACT limit</option>
        <option value="DISMISS">Dismiss — does not count</option>
      </select>
      <textarea name="note" rows={2} required maxLength={2000} placeholder="What you found" className="input py-1.5 text-[12px]" />
      {state && !state.ok && <span role="alert" className="text-[11px] text-danger">{state.message}</span>}
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="btn-primary flex-1 px-3 py-1.5 text-[12px] disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-3 text-[12px] text-ink-3 hover:text-ink">Cancel</button>
      </div>
    </form>
  )
}

/** Log a complaint — prefilled when opened from a support ticket. */
export function FileComplaintForm({ prefill }: { prefill?: { ticketId: string; byEmail: string; reason: string; details: string } }) {
  const [state, action, pending] = useActionState<TrustOpState, FormData>(fileComplaintAction, null)
  return (
    <form action={action} className="space-y-2.5" key={state?.ok ? 'done' : 'form'}>
      {prefill && <input type="hidden" name="ticketId" value={prefill.ticketId} />}
      <label className="block text-[11.5px] font-medium text-ink-2">About (their email)
        <input name="againstEmail" type="email" required className="input mt-1 h-9 text-[12.5px]" placeholder="holder@example.com" />
      </label>
      <label className="block text-[11.5px] font-medium text-ink-2">PACT pincode <span className="font-normal text-ink-4">(optional)</span>
        <input name="pincode" inputMode="numeric" pattern="\d{6}" className="input mt-1 h-9 text-[12.5px]" placeholder="Leave empty for all their PACTs" />
      </label>
      <label className="block text-[11.5px] font-medium text-ink-2">Filed by (email) <span className="font-normal text-ink-4">(empty = you)</span>
        <input name="byEmail" type="email" defaultValue={prefill?.byEmail} className="input mt-1 h-9 text-[12.5px]" />
      </label>
      <label className="block text-[11.5px] font-medium text-ink-2">Reason
        <input name="reason" required maxLength={150} defaultValue={prefill?.reason} className="input mt-1 h-9 text-[12.5px]" placeholder="No response to enquiry" />
      </label>
      <label className="block text-[11.5px] font-medium text-ink-2">What happened
        <textarea name="details" required rows={3} maxLength={4000} defaultValue={prefill?.details} className="input mt-1 py-1.5 text-[12.5px]" />
      </label>
      {state && <p role={state.ok ? 'status' : 'alert'} className={'text-[11.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full py-2 text-[12.5px] disabled:opacity-60">{pending ? 'Logging…' : 'Log complaint'}</button>
    </form>
  )
}
