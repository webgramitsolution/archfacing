'use client'

import { useActionState, useEffect, useState } from 'react'
import { pactOpAction, savePactPriceAction, type PactOpState } from './actions'

/**
 * Row actions for one PACT seat. The buttons offered depend on the seat's
 * status; Suspend and Revoke open an inline reason field (the holder is told
 * why), Extend asks for months. The server re-checks every rule.
 */
export function PactRowActions({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<PactOpState, FormData>(pactOpAction, null)
  const [mode, setMode] = useState<null | 'SUSPEND' | 'REVOKE' | 'EXTEND'>(null)

  const btn = 'rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity disabled:opacity-50'
  const live = status === 'ACTIVE' || status === 'SUSPENDED'
  if (!live) return <span className="text-[11px] text-ink-4">—</span>

  return (
    <form action={action} className="min-w-[180px]" onSubmit={() => setTimeout(() => setMode(null), 0)}>
      <input type="hidden" name="id" value={id} />
      {mode === null ? (
        <div className="flex flex-wrap justify-end gap-1">
          {status === 'ACTIVE' && (
            <button type="button" onClick={() => setMode('SUSPEND')} className={`${btn} bg-warn-soft text-warn`}>Suspend</button>
          )}
          {status === 'SUSPENDED' && (
            <button type="submit" name="op" value="REINSTATE" disabled={pending} className={`${btn} bg-ok-soft text-ok`}>Reinstate</button>
          )}
          <button type="button" onClick={() => setMode('EXTEND')} className={`${btn} bg-[#EAF2FF] text-[#2563EB]`}>Extend</button>
          <button type="button" onClick={() => setMode('REVOKE')} className={`${btn} bg-danger-soft text-danger`}>Revoke</button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-1">
          {mode === 'EXTEND' ? (
            <select name="months" defaultValue="3" aria-label="Extend by" className="h-7 rounded-md border border-line bg-white px-1.5 text-[11px]">
              {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
            </select>
          ) : (
            <input
              name="reason"
              required
              autoFocus
              maxLength={300}
              placeholder={mode === 'SUSPEND' ? 'Reason for suspension' : 'Reason for withdrawal'}
              className="h-7 w-[150px] rounded-md border border-line bg-white px-2 text-[11px] focus:border-brand focus:outline-none"
            />
          )}
          <button type="submit" name="op" value={mode} disabled={pending} className={`${btn} ${mode === 'REVOKE' ? 'bg-danger text-white' : mode === 'SUSPEND' ? 'bg-warn text-white' : 'bg-[#2563EB] text-white'}`}>
            {pending ? '…' : 'Confirm'}
          </button>
          <button type="button" onClick={() => setMode(null)} className={`${btn} text-ink-3`}>Cancel</button>
        </div>
      )}
      {state && !pending && (
        <p role={state.ok ? 'status' : 'alert'} className={'mt-1 text-right text-[10.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>
          {state.ok ? 'Done' : state.message}
        </p>
      )}
    </form>
  )
}

/** One pricing row: read view, and an inline editor on "Edit". */
export function PactPriceRow({
  serviceType, price, renewalPrice, taxPercent,
}: { serviceType: string; price: number; renewalPrice: number | null; taxPercent: number }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<PactOpState, FormData>(savePactPriceAction, null)
  // Close the editor once the server confirms the save.
  useEffect(() => { if (state?.ok) setEditing(false) }, [state])
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN')
  const total = price + (price * taxPercent) / 100

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 py-2.5">
        <span className="min-w-0">
          <span className="block text-[12.5px] font-semibold text-ink">{serviceType}</span>
          <span className="block text-[11px] text-ink-3">
            {inr(price)} + {taxPercent}% GST{renewalPrice != null ? ` · renews ${inr(renewalPrice)}` : ''}
          </span>
          {state?.ok && <span className="block text-[10.5px] text-ok">Saved</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tabular text-[13px] font-bold text-ink">{inr(Math.round(total))}</span>
          <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-line px-2 py-0.5 text-[10.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Edit</button>
        </span>
      </li>
    )
  }

  const field = 'h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] focus:border-brand focus:outline-none'
  return (
    <li className="py-2.5">
      <form action={action} className="space-y-2">
        <input type="hidden" name="serviceType" value={serviceType} />
        <p className="text-[12.5px] font-semibold text-ink">{serviceType}</p>
        <div className="grid grid-cols-3 gap-1.5">
          <label className="text-[10px] text-ink-3">Price ₹<input name="price" type="number" min={0} step="1" required defaultValue={price} className={field} /></label>
          <label className="text-[10px] text-ink-3">Renewal ₹<input name="renewalPrice" type="number" min={0} step="1" defaultValue={renewalPrice ?? ''} className={field} /></label>
          <label className="text-[10px] text-ink-3">GST %<input name="taxPercent" type="number" min={0} max={40} step="0.01" required defaultValue={taxPercent} className={field} /></label>
        </div>
        {state && !state.ok && <p role="alert" className="text-[10.5px] text-danger">{state.message}</p>}
        <div className="flex justify-end gap-1.5">
          <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-3">Cancel</button>
          <button type="submit" disabled={pending} className="rounded-md bg-navy px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </li>
  )
}
