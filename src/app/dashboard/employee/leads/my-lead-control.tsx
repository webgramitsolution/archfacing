'use client'

import { useActionState, useEffect, useRef } from 'react'
import { updateMyLeadAction, type EmployeeOpState } from '../actions'

/** Status + optional note on a lead assigned to this RM. */
export function MyLeadControl({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<EmployeeOpState, FormData>(updateMyLeadAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) (ref.current?.elements.namedItem('note') as HTMLTextAreaElement | null)?.value && ((ref.current!.elements.namedItem('note') as HTMLTextAreaElement).value = '') }, [state])
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2 border-t border-line-soft bg-white px-5 py-3 sm:flex-row sm:items-end">
      <input type="hidden" name="id" value={id} />
      <label className="text-[11px] text-ink-3">Status
        <select name="status" defaultValue={status === 'NEW' || status === 'UNROUTED' ? 'ASSIGNED' : status} className="input mt-0.5 h-9 py-0 text-[12.5px]">
          <option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In progress</option><option value="RESPONDED">Responded</option>
          <option value="CONVERTED">Converted</option><option value="CLOSED">Closed</option>
        </select>
      </label>
      <label className="min-w-0 flex-1 text-[11px] text-ink-3">Note (optional)
        <textarea name="note" rows={1} maxLength={1000} placeholder="What happened on the call…" className="input mt-0.5 min-h-[36px] py-1.5 text-[12.5px]" />
      </label>
      <div className="flex items-center gap-2">
        {state && <span role={state.ok ? 'status' : 'alert'} className={'text-[11.5px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</span>}
        <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-[12.5px] disabled:opacity-60">{pending ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
