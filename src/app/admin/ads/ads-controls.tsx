'use client'

import { useActionState, useEffect, useState } from 'react'
import { adOpAction, savePlacementAction, type AdOpState } from './actions'

const btn = 'rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity disabled:opacity-50'

/** Pause / Resume / End for one campaign; End asks once before it fires. */
export function AdOpButtons({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<AdOpState, FormData>(adOpAction, null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const live = ['RUNNING', 'SCHEDULED', 'PAUSED'].includes(status)
  if (!live) return <span className="text-[11px] text-ink-4">—</span>

  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-1">
      <input type="hidden" name="id" value={id} />
      {!confirmEnd ? (
        <>
          {(status === 'RUNNING' || status === 'SCHEDULED') && (
            <button type="submit" name="op" value="PAUSE" disabled={pending} className={`${btn} bg-warn-soft text-warn`}>Pause</button>
          )}
          {status === 'PAUSED' && (
            <button type="submit" name="op" value="RESUME" disabled={pending} className={`${btn} bg-ok-soft text-ok`}>Resume</button>
          )}
          <button type="button" onClick={() => setConfirmEnd(true)} className={`${btn} bg-danger-soft text-danger`}>End</button>
        </>
      ) : (
        <>
          <span className="text-[10.5px] text-ink-3">End now?</span>
          <button type="submit" name="op" value="END" disabled={pending} onClick={() => setTimeout(() => setConfirmEnd(false), 0)} className={`${btn} bg-danger text-white`}>Yes, end</button>
          <button type="button" onClick={() => setConfirmEnd(false)} className={`${btn} text-ink-3`}>Cancel</button>
        </>
      )}
      {state && !state.ok && <span role="alert" className="w-full text-right text-[10.5px] text-danger">{state.message}</span>}
    </form>
  )
}

/** One placement row, editable in place. */
export function PlacementRow({
  p,
}: {
  p: { id: string; name: string; size: string; weeklyPrice: number; taxPercent: number; maxSlots: number; isActive: boolean; live: number }
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<AdOpState, FormData>(savePlacementAction, null)
  useEffect(() => { if (state?.ok) setEditing(false) }, [state])
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN')
  const f = 'h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] focus:border-brand focus:outline-none'

  if (!editing) {
    return (
      <tr className="text-[12px]">
        <td className="py-2.5 pr-2">
          <span className="block font-semibold text-ink">{p.name}</span>
          <span className="block text-[10.5px] text-ink-4">{p.size}</span>
        </td>
        <td className="py-2.5 pr-2 tabular text-ink-2">{inr(p.weeklyPrice)}<span className="text-ink-4"> /wk + {p.taxPercent}%</span></td>
        <td className="py-2.5 pr-2 tabular text-ink-2">{p.live} / {p.maxSlots}</td>
        <td className="py-2.5 pr-2">
          <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (p.isActive ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{p.isActive ? 'On sale' : 'Off'}</span>
          {state?.ok && <span className="ml-1.5 text-[10.5px] text-ok">Saved</span>}
        </td>
        <td className="py-2.5 text-right">
          <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-line px-2 py-0.5 text-[10.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Edit</button>
        </td>
      </tr>
    )
  }
  return (
    <tr className="bg-paper-2/60 text-[12px]">
      <td colSpan={5} className="p-2.5">
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={p.id} />
          <span className="min-w-[120px] flex-1 font-semibold text-ink">{p.name}</span>
          <label className="w-[110px] text-[10px] text-ink-3">Weekly ₹<input name="weeklyPrice" type="number" min={0} step="1" required defaultValue={p.weeklyPrice} className={f} /></label>
          <label className="w-[70px] text-[10px] text-ink-3">GST %<input name="taxPercent" type="number" min={0} max={40} step="0.01" required defaultValue={p.taxPercent} className={f} /></label>
          <label className="w-[70px] text-[10px] text-ink-3">Slots<input name="maxSlots" type="number" min={Math.max(1, p.live)} max={50} required defaultValue={p.maxSlots} className={f} /></label>
          <label className="flex h-8 items-center gap-1.5 text-[11px] text-ink-2"><input name="isActive" type="checkbox" defaultChecked={p.isActive} className="h-3.5 w-3.5 accent-brand" /> On sale</label>
          <button type="button" onClick={() => setEditing(false)} className="h-8 rounded-md px-2.5 text-[11px] font-semibold text-ink-3">Cancel</button>
          <button type="submit" disabled={pending} className="h-8 rounded-md bg-navy px-3 text-[11px] font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
          {state && !state.ok && <span role="alert" className="w-full text-[10.5px] text-danger">{state.message}</span>}
        </form>
      </td>
    </tr>
  )
}
