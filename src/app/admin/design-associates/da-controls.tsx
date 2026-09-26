'use client'

import { useActionState, useState } from 'react'
import { decideDaAction, type DaOpState } from './actions'

export function DaDecision({ id }: { id: string }) {
  const [rejecting, setRejecting] = useState(false)
  const [state, action, pending] = useActionState<DaOpState, FormData>(decideDaAction, null)
  if (state?.ok) return <span role="status" className="text-[11.5px] text-ok">{state.message}</span>
  return (
    <form action={action} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="id" value={id} />
      {rejecting && <input name="note" required maxLength={500} placeholder="Reason (sent to the applicant)" className="input h-8 w-[220px] text-[12px]" />}
      <div className="flex gap-1.5">
        {rejecting ? (
          <>
            <button type="submit" name="decision" value="REJECT" disabled={pending} className="rounded-md border border-danger px-2.5 py-1 text-[11.5px] font-semibold text-danger disabled:opacity-60">Send</button>
            <button type="button" onClick={() => setRejecting(false)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-3">Cancel</button>
          </>
        ) : (
          <>
            <button type="submit" name="decision" value="APPROVE" disabled={pending} className="btn-primary px-3 py-1 text-[11.5px] disabled:opacity-60">{pending ? '…' : 'Approve'}</button>
            <button type="button" onClick={() => setRejecting(true)} className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-3 hover:text-danger">Reject</button>
          </>
        )}
      </div>
      {state && !state.ok && <span role="alert" className="text-[11px] text-danger">{state.message}</span>}
    </form>
  )
}
