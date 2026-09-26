'use client'

import { useActionState } from 'react'
import { applyForDaAction, type DaApplyState } from './actions'

export function DaApplyForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<DaApplyState, FormData>(applyForDaAction, null)
  if (state?.ok) return <p role="status" className="rounded-card bg-ok-soft px-4 py-3 text-[13px] text-ok">{state.message}</p>
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <label className="block text-[12px] font-medium text-ink-2">PAN
        <input name="pan" required maxLength={10} disabled={disabled} className="input mt-1 h-10 font-mono uppercase text-[13px]" placeholder="ABCDE1234F" />
      </label>
      <label className="block text-[12px] font-medium text-ink-2">GSTIN <span className="font-normal text-ink-4">(if registered)</span>
        <input name="gst" maxLength={15} disabled={disabled} className="input mt-1 h-10 font-mono uppercase text-[13px]" />
      </label>
      <label className="flex items-start gap-2 text-[12.5px] text-ink-2 md:col-span-2">
        <input type="checkbox" name="agree" disabled={disabled} className="mt-0.5 h-4 w-4 accent-brand" />
        I agree that projects assigned through ArchFacing are invoiced monthly and settled on the revenue share below, and that my KYC documents may be checked.
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button type="submit" disabled={disabled || pending} className="btn-primary px-5 py-2 text-[13px] disabled:opacity-50">{pending ? 'Sending…' : 'Apply to become a Design Associate'}</button>
        {state && !state.ok && <p role="alert" className="text-[12px] text-danger">{state.message}</p>}
      </div>
    </form>
  )
}
