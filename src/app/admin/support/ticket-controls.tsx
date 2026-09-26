'use client'

import { useActionState, useEffect, useRef } from 'react'
import { replyTicketAction, updateTicketAction, type TicketOpState } from './actions'

const field = 'w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink focus:border-brand focus:outline-none'
function Msg({ s }: { s: TicketOpState }) {
  if (!s) return null
  return <p role={s.ok ? 'status' : 'alert'} className={'text-[11px] ' + (s.ok ? 'text-ok' : 'text-danger')}>{s.message}</p>
}

export function TicketTriage({
  id, status, priority, assigneeId, staff,
}: { id: string; status: string; priority: string; assigneeId: string | null; staff: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<TicketOpState, FormData>(updateTicketAction, null)
  return (
    <form action={action} className="grid grid-cols-3 gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-[11px] text-ink-3">Status
        <select name="status" defaultValue={status} className={`${field} mt-0.5 h-8`}>
          <option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
        </select>
      </label>
      <label className="text-[11px] text-ink-3">Priority
        <select name="priority" defaultValue={priority} className={`${field} mt-0.5 h-8`}>
          <option value="LOW">Low</option><option value="NORMAL">Normal</option>
          <option value="HIGH">High</option><option value="URGENT">Urgent</option>
        </select>
      </label>
      <label className="text-[11px] text-ink-3">Assigned to
        <select name="assigneeId" defaultValue={assigneeId ?? ''} className={`${field} mt-0.5 h-8`}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="col-span-3 flex items-center justify-between gap-2">
        <Msg s={state} />
        <button type="submit" disabled={pending} className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-brand hover:text-brand disabled:opacity-60">
          {pending ? 'Saving…' : 'Update'}
        </button>
      </div>
    </form>
  )
}

export function TicketReply({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action, pending] = useActionState<TicketOpState, FormData>(replyTicketAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  if (disabled) return <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-center text-[12px] text-ink-3">This ticket is closed. Reopen it to reply.</p>
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="body" rows={4} required maxLength={4000} placeholder="Write your reply to the member…" className={`${field} py-2`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[12px] text-ink-2">
          <input type="checkbox" name="resolve" className="h-3.5 w-3.5 accent-brand" /> Mark as resolved
        </label>
        <Msg s={state} />
        <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
          {pending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  )
}
