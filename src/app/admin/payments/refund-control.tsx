'use client'

import { useActionState, useState } from 'react'
import { refundPaymentAction, type RefundState } from './actions'

/** "Refund" on a ledger row — shown only while a refund is still allowed. */
export function RefundControl({ id, left }: { id: string; left: number }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<RefundState, FormData>(refundPaymentAction, null)
  if (state?.ok) return <span role="status" className="text-[11.5px] text-ok">{state.message}</span>
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-brand hover:bg-brand-soft">
        Refund
      </button>
    )
  }
  return (
    <form action={action} className="flex w-[210px] flex-col gap-1.5">
      <input type="hidden" name="id" value={id} />
      <label className="text-[10.5px] text-ink-3">Amount (up to ₹{left.toLocaleString('en-IN')})
        <input name="amount" type="number" min="1" step="0.01" max={left} defaultValue={left} required className="input mt-0.5 h-8 text-[12px]" />
      </label>
      <input name="reason" required maxLength={300} placeholder="Reason" className="input h-8 text-[12px]" />
      {state && !state.ok && <span role="alert" className="text-[11px] text-danger">{state.message}</span>}
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="btn-primary flex-1 px-3 py-1.5 text-[12px] disabled:opacity-60">{pending ? 'Refunding…' : 'Refund'}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line px-3 text-[12px] text-ink-3 hover:text-ink">Cancel</button>
      </div>
    </form>
  )
}
