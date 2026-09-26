'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveClubPlanAction, saveEventAction, type ClubOpState } from './actions'

export type EventDraft = {
  id?: string; title: string; type: string; summary: string; description: string; heroImage: string
  startsAt: string; endsAt: string; isOnline: boolean; venueName: string; venueAddress: string; city: string
  contactPhone: string; contactEmail: string; totalSeats: number; standardPrice: number
  earlyBirdPrice: string; earlyBirdTill: string; spotPrice: string; taxPercent: number
  includes: string; audience: string; speakers: string; agenda: string; faqs: string
}

const f = 'h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none'
const ta = 'w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[12.5px] text-ink focus:border-brand focus:outline-none'
const L = ({ label, hint, children, span = 1 }: { label: string; hint?: string; children: React.ReactNode; span?: 1 | 2 | 3 }) => (
  <label className={`block text-[11px] font-medium text-ink-3 ${span === 3 ? 'col-span-3' : span === 2 ? 'col-span-2' : ''}`}>
    {label}{hint && <span className="ml-1 font-normal text-ink-4">{hint}</span>}
    <span className="mt-0.5 block">{children}</span>
  </label>
)

export function EventEditor({ e }: { e: EventDraft }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<ClubOpState, FormData>(saveEventAction, null)
  useEffect(() => {
    if (state?.ok && state.id && !e.id) router.replace(`/admin/club?edit=${state.id}`)
  }, [state, e.id, router])

  return (
    <form action={action} className="space-y-4">
      {e.id && <input type="hidden" name="id" value={e.id} />}
      <div className="grid grid-cols-3 gap-3">
        <L label="Title" span={2}><input name="title" required maxLength={140} defaultValue={e.title} className={f} /></L>
        <L label="Type">
          <select name="type" defaultValue={e.type} className={f}>
            {['SEMINAR', 'EXHIBITION', 'WEBINAR', 'NETWORKING', 'CONFERENCE', 'WORKSHOP'].map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        </L>
        <L label="Summary" hint="one or two lines on the card" span={3}><input name="summary" required maxLength={300} defaultValue={e.summary} className={f} /></L>
        <L label="Description" hint="blank line = new paragraph" span={3}><textarea name="description" required rows={5} maxLength={8000} defaultValue={e.description} className={ta} /></L>
        <L label="Hero image URL" hint="https://…" span={3}><input name="heroImage" type="url" required defaultValue={e.heroImage} className={f} /></L>
        <L label="Starts"><input name="startsAt" type="datetime-local" required defaultValue={e.startsAt} className={f} /></L>
        <L label="Ends"><input name="endsAt" type="datetime-local" required defaultValue={e.endsAt} className={f} /></L>
        <L label="Seats"><input name="totalSeats" type="number" min={1} required defaultValue={e.totalSeats} className={f} /></L>
        <L label="Venue"><input name="venueName" maxLength={140} defaultValue={e.venueName} className={f} /></L>
        <L label="City"><input name="city" maxLength={80} defaultValue={e.city} className={f} /></L>
        <label className="flex items-end gap-2 pb-2 text-[12px] text-ink-2"><input type="checkbox" name="isOnline" defaultChecked={e.isOnline} className="h-3.5 w-3.5 accent-brand" /> Online event</label>
        <L label="Venue address" span={3}><input name="venueAddress" maxLength={300} defaultValue={e.venueAddress} className={f} /></L>
        <L label="Contact phone"><input name="contactPhone" maxLength={20} defaultValue={e.contactPhone} className={f} /></L>
        <L label="Contact email" span={2}><input name="contactEmail" type="email" defaultValue={e.contactEmail} className={f} /></L>
      </div>

      <fieldset className="rounded-lg border border-line p-3">
        <legend className="px-1 text-[11.5px] font-semibold text-ink-2">Pricing (₹, before GST)</legend>
        <div className="grid grid-cols-5 gap-3">
          <L label="Standard"><input name="standardPrice" type="number" min={0} required defaultValue={e.standardPrice} className={f} /></L>
          <L label="Early bird"><input name="earlyBirdPrice" type="number" min={0} defaultValue={e.earlyBirdPrice} className={f} /></L>
          <L label="Early bird until"><input name="earlyBirdTill" type="datetime-local" defaultValue={e.earlyBirdTill} className={f} /></L>
          <L label="Spot (on the day)"><input name="spotPrice" type="number" min={0} defaultValue={e.spotPrice} className={f} /></L>
          <L label="GST %"><input name="taxPercent" type="number" min={0} max={40} step="0.01" required defaultValue={e.taxPercent} className={f} /></L>
        </div>
        <p className="mt-2 text-[10.5px] text-ink-4">0 = free. Registration uses the live tier and holds the seat until payment.</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <L label="What’s included" hint="one per line"><textarea name="includes" rows={3} defaultValue={e.includes} className={ta} /></L>
        <L label="Who should attend" hint="one per line"><textarea name="audience" rows={3} defaultValue={e.audience} className={ta} /></L>
        <L label="Speakers" hint="Name | Role | Company | photo URL — only people who agreed to speak"><textarea name="speakers" rows={4} defaultValue={e.speakers} className={ta} /></L>
        <L label="Agenda" hint="10:00 AM | 11:00 AM | Title | Speaker"><textarea name="agenda" rows={4} defaultValue={e.agenda} className={ta} /></L>
        <L label="FAQs" hint="Question | Answer" span={2}><textarea name="faqs" rows={3} defaultValue={e.faqs} className={ta} /></L>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-3">
        {state && <p role={state.ok ? 'status' : 'alert'} className={'text-[12px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-60">
          {pending ? 'Saving…' : e.id ? 'Save event' : 'Create event'}
        </button>
      </div>
    </form>
  )
}

export function ClubPlanRow({ p }: { p: { id: string; name: string; price: number; months: number; taxPercent: number; benefits: string[]; isActive: boolean; members: number } }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<ClubOpState, FormData>(saveClubPlanAction, null)
  useEffect(() => { if (state?.ok) setEditing(false) }, [state])
  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">{p.name} <span className={'ml-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold ' + (p.isActive ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{p.isActive ? 'On sale' : 'Hidden'}</span></span>
          <span className="block text-[11.5px] text-ink-3">₹{p.price.toLocaleString('en-IN')} for {p.months} months + {p.taxPercent}% GST · {p.members} active member{p.members === 1 ? '' : 's'}</span>
          {state?.ok && <span className="text-[11px] text-ok">Saved</span>}
        </span>
        <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Edit</button>
      </li>
    )
  }
  return (
    <li className="py-3">
      <form action={action} className="space-y-2">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid grid-cols-4 gap-2">
          <L label="Name"><input name="name" required defaultValue={p.name} className={f} /></L>
          <L label="Price ₹"><input name="price" type="number" min={0} required defaultValue={p.price} className={f} /></L>
          <L label="Months"><input name="months" type="number" min={1} required defaultValue={p.months} className={f} /></L>
          <L label="GST %"><input name="taxPercent" type="number" min={0} max={40} step="0.01" required defaultValue={p.taxPercent} className={f} /></L>
        </div>
        <L label="Benefits" hint="one per line"><textarea name="benefits" rows={4} defaultValue={p.benefits.join('\n')} className={ta} /></L>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" name="isActive" defaultChecked={p.isActive} className="h-3.5 w-3.5 accent-brand" /> On sale</label>
          <div className="flex items-center gap-2">
            {state && !state.ok && <span role="alert" className="text-[11px] text-danger">{state.message}</span>}
            <button type="button" onClick={() => setEditing(false)} className="px-2.5 text-[12px] font-semibold text-ink-3">Cancel</button>
            <button type="submit" disabled={pending} className="rounded-lg bg-navy px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </li>
  )
}
