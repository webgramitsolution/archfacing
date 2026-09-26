'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui'
import type { LeadDetail } from '@/lib/admin-leads'
import {
  addLeadNoteAction, replyToLeadAction, routeLeadAction, updateLeadAction, type LeadOpState,
} from './actions'

const fmt = (d: Date) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function Msg({ s }: { s: LeadOpState }) {
  if (!s) return null
  return <p role={s.ok ? 'status' : 'alert'} className={'text-[10.5px] ' + (s.ok ? 'text-ok' : 'text-danger')}>{s.message}</p>
}

const field = 'w-full rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink focus:border-brand focus:outline-none'

/** Status + staff owner — the two things an admin changes most. */
export function ManageBox({ d }: { d: LeadDetail }) {
  const [state, action, pending] = useActionState<LeadOpState, FormData>(updateLeadAction, null)
  return (
    <form action={action} className="mt-4 space-y-2 rounded-lg border border-line p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Manage</p>
      <input type="hidden" name="id" value={d.id} />
      <label className="block text-[11px] text-ink-3">
        Status
        <select name="status" defaultValue={d.status === 'UNROUTED' ? 'NEW' : d.status} className={`${field} mt-0.5 h-8`}>
          {['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] text-ink-3">
        Handled by
        <select name="employeeId" defaultValue={d.employeeId ?? ''} className={`${field} mt-0.5 h-8`}>
          <option value="">Nobody yet</option>
          {d.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="flex items-center justify-between gap-2">
        <Msg s={state} />
        <button type="submit" disabled={pending} className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

/** Send the lead to one more member by email — the fix for an unrouted lead. */
export function RouteBox({ id }: { id: string }) {
  const [state, action, pending] = useActionState<LeadOpState, FormData>(routeLeadAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  return (
    <form ref={ref} action={action} className="space-y-2 rounded-lg border border-dashed border-line p-3">
      <p className="text-[12px] font-bold text-ink">Route to a member</p>
      <p className="text-[10.5px] text-ink-3">Sends this lead to a professional, consultant, BMF or corporate by their account email.</p>
      <input type="hidden" name="id" value={id} />
      <input name="email" type="email" required placeholder="member@email.com" className={`${field} h-8`} />
      <div className="flex items-center justify-between gap-2">
        <Msg s={state} />
        <button type="submit" disabled={pending} className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60">
          {pending ? 'Sending…' : 'Send lead'}
        </button>
      </div>
    </form>
  )
}

/** Internal notes — only staff ever see them. */
export function NotesPanel({ d }: { d: LeadDetail }) {
  const [state, action, pending] = useActionState<LeadOpState, FormData>(addLeadNoteAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  return (
    <div className="space-y-3">
      <form ref={ref} action={action} className="space-y-2">
        <input type="hidden" name="id" value={d.id} />
        <textarea name="body" rows={3} required maxLength={1000} placeholder="Add an internal note…" className={`${field} py-2`} />
        <div className="flex items-center justify-between gap-2">
          <Msg s={state} />
          <button type="submit" disabled={pending} className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60">
            {pending ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </form>
      {d.notes.length === 0 ? (
        <p className="py-4 text-center text-[11.5px] text-ink-3">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {d.notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-paper-2 p-2.5">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">{n.body}</p>
              <p className="mt-1 text-[10px] text-ink-4">{n.author} · {fmt(n.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The drawer footer: opens an email composer; honest when there is no email. */
export function ReplyBox({ d }: { d: LeadDetail }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<LeadOpState, FormData>(replyToLeadAction, null)
  useEffect(() => { if (state?.ok) setOpen(false) }, [state])

  if (!d.contactEmail) {
    return (
      <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-center text-[11.5px] text-ink-3">
        No email on this enquiry — reply by Call or WhatsApp above.
      </p>
    )
  }
  if (!open) {
    return (
      <div className="space-y-1.5">
        {state?.ok && <Msg s={state} />}
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">
          <Icon name="mail" className="h-4 w-4" /> Reply to Enquiry
        </button>
      </div>
    )
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={d.id} />
      <p className="text-[11px] text-ink-3">To <span className="font-semibold text-ink">{d.contactEmail}</span></p>
      <textarea name="body" rows={5} required maxLength={3000} autoFocus placeholder={`Hello ${d.contactName.split(' ')[0]},`} className={`${field} py-2`} />
      <Msg s={state} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-line py-2 text-[12px] font-semibold text-ink-2">Cancel</button>
        <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-navy py-2 text-[12px] font-semibold text-white disabled:opacity-60">
          {pending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  )
}
