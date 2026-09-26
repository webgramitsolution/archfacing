'use client'

import { useActionState, useEffect, useRef } from 'react'
import { memberTicketReplyAction, type TicketReplyState } from '../actions'

export function MemberReplyForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<TicketReplyState, FormData>(memberTicketReplyAction, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok) ref.current?.reset() }, [state])
  return (
    <form ref={ref} action={action} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="id" value={id} />
      <textarea name="body" rows={2} required maxLength={4000} placeholder="Reply to ArchFacing support…" className="input min-h-[44px] flex-1 py-2 text-[12.5px]" />
      <div className="flex items-center gap-2">
        {state && !state.ok && <span role="alert" className="text-[11.5px] text-danger">{state.error}</span>}
        {state?.ok && <span role="status" className="text-[11.5px] text-ok">Sent</span>}
        <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-[12.5px] disabled:opacity-60">{pending ? 'Sending…' : 'Send'}</button>
      </div>
    </form>
  )
}
