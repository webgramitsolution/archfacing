'use client'

import { useActionState, useEffect, useState } from 'react'
import { Icon } from '@/components/ui'
import { savePlanAction, type PlanState } from './actions'

export type PlanView = {
  id: string; slug: string; name: string; tagline: string | null; price: number; months: number; taxPercent: number
  pactTerritories: number | null; benefits: string[]; isActive: boolean; isPopular: boolean; sortOrder: number
  activeSubs: number; revenue: number
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const field = 'h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none'

/** One plan card — read view with live numbers, and an in-place editor. */
export function PlanCard({ p }: { p: PlanView }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<PlanState, FormData>(savePlanAction, null)
  useEffect(() => { if (state?.ok) setEditing(false) }, [state])

  if (!editing) {
    return (
      <article className={'flex flex-col rounded-card border bg-white p-5 shadow-card ' + (p.isPopular ? 'border-brand ring-2 ring-brand/20' : 'border-line')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-[17px] font-bold text-ink">{p.name}</p>
            <p className="text-[11.5px] text-ink-3">{p.tagline ?? '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {p.isPopular && <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">Most popular</span>}
            <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (p.isActive ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{p.isActive ? 'On sale' : 'Hidden'}</span>
          </div>
        </div>
        <p className="tabular mt-3 font-display text-[26px] font-bold leading-none text-ink">{inr(p.price)}</p>
        <p className="mt-1 text-[11.5px] text-ink-3">for {p.months} months + {p.taxPercent}% GST · {inr(p.price / p.months)}/month</p>
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#E7F7EE] px-3 py-2 text-[12px] font-semibold text-[#0D7A4F]">
          <Icon name="map" className="h-4 w-4" /> {p.pactTerritories == null ? 'Unlimited' : p.pactTerritories} PACT territor{p.pactTerritories === 1 ? 'y' : 'ies'}
        </p>
        <ul className="mt-3 flex-1 space-y-1.5">
          {p.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[12px] text-ink-2"><Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" /> {b}</li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line-soft pt-3 text-center">
          <div><p className="tabular font-display text-[18px] font-bold text-ink">{p.activeSubs}</p><p className="text-[10.5px] text-ink-3">active members</p></div>
          <div><p className="tabular font-display text-[18px] font-bold text-ink">{inr(p.revenue)}</p><p className="text-[10.5px] text-ink-3">sold, all time</p></div>
        </div>
        {state?.ok && <p role="status" className="mt-2 text-center text-[11px] text-ok">{state.message}</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-3 rounded-lg border border-line py-2 text-[12.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Edit plan</button>
      </article>
    )
  }

  return (
    <form action={action} className="space-y-3 rounded-card border border-brand bg-white p-5 shadow-card">
      <input type="hidden" name="id" value={p.id} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-ink-3">Name<input name="name" required defaultValue={p.name} maxLength={40} className={field} /></label>
        <label className="text-[11px] text-ink-3">Display order<input name="sortOrder" type="number" min={0} max={99} defaultValue={p.sortOrder} className={field} /></label>
      </div>
      <label className="block text-[11px] text-ink-3">Tagline<input name="tagline" defaultValue={p.tagline ?? ''} maxLength={120} className={field} /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-ink-3">Price ₹<input name="price" type="number" min={0} step="1" required defaultValue={p.price} className={field} /></label>
        <label className="text-[11px] text-ink-3">Months<input name="months" type="number" min={1} max={120} required defaultValue={p.months} className={field} /></label>
        <label className="text-[11px] text-ink-3">GST %<input name="taxPercent" type="number" min={0} max={40} step="0.01" required defaultValue={p.taxPercent} className={field} /></label>
      </div>
      <label className="block text-[11px] text-ink-3">
        PACT territories <span className="text-ink-4">(blank = unlimited)</span>
        <input name="pactTerritories" inputMode="numeric" defaultValue={p.pactTerritories ?? ''} placeholder="Unlimited" className={field} />
      </label>
      <label className="block text-[11px] text-ink-3">
        Benefits <span className="text-ink-4">(one per line)</span>
        <textarea name="benefits" rows={5} defaultValue={p.benefits.join('\n')} className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[12.5px] focus:border-brand focus:outline-none" />
      </label>
      <div className="flex flex-wrap gap-4 text-[12px] text-ink-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={p.isActive} className="h-3.5 w-3.5 accent-brand" /> On sale</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isPopular" defaultChecked={p.isPopular} className="h-3.5 w-3.5 accent-brand" /> Most popular</label>
      </div>
      <p className="text-[10.5px] text-ink-4">Listings stay unlimited on every plan. Members who already bought keep the price they paid.</p>
      {state && !state.ok && <p role="alert" className="text-[11.5px] text-danger">{state.message}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-[12.5px] font-semibold text-ink-3">Cancel</button>
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save plan'}</button>
      </div>
    </form>
  )
}
