'use client'

import { useActionState } from 'react'
import { reviewComplaintAction, type EmployeeOpState } from '../actions'

export function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<EmployeeOpState, FormData>(reviewComplaintAction, null)
  if (state?.ok) return <p role="status" className="border-t border-line-soft bg-white px-5 py-3 text-[12px] text-ok">{state.message}</p>
  return (
    <form action={action} className="flex flex-col gap-2 border-t border-line-soft bg-white px-5 py-3 sm:flex-row sm:items-end">
      <input type="hidden" name="id" value={id} />
      <label className="min-w-0 flex-1 text-[11px] text-ink-3">Your finding
        <textarea name="note" rows={1} required maxLength={2000} placeholder="Spoke to both sides — …" className="input mt-0.5 min-h-[36px] py-1.5 text-[12.5px]" />
      </label>
      <div className="flex items-center gap-2">
        {state && !state.ok && <span role="alert" className="text-[11.5px] text-danger">{state.message}</span>}
        <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-[12.5px] disabled:opacity-60">{pending ? 'Saving…' : 'Take under review'}</button>
      </div>
    </form>
  )
}
