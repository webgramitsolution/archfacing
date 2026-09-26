'use client'

import { useActionState, useState } from 'react'
import { Icon } from '@/components/ui'
import { saveVerificationMessagesAction, type VerificationMessagesState } from '../../actions'

/**
 * 4. Verification Messages — the three notices the Verification Queue sends.
 *
 * All six fields stay mounted (hidden, not unmounted) so switching tabs never
 * drops an unsaved edit and one Save writes all three. The queue's Approve /
 * Send for Review / Reject actions read these at send time.
 */
export type MessageValues = Record<
  | 'verification.review.subject' | 'verification.review.body'
  | 'verification.approved.subject' | 'verification.approved.body'
  | 'verification.rejected.subject' | 'verification.rejected.body',
  string
>

const TABS = [
  { id: 'review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
] as const

export function MessagesForm({ values }: { values: MessageValues }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('review')
  const [state, action, pending] = useActionState<VerificationMessagesState, FormData>(saveVerificationMessagesAction, null)

  return (
    <form action={action}>
      <div role="tablist" className="mb-3 flex gap-0.5 border-b border-line text-[10.5px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={'whitespace-nowrap border-b-2 px-1.5 py-2 font-medium transition-colors ' + (tab === t.id ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => {
        const subject = `verification.${t.id}.subject` as keyof MessageValues
        const body = `verification.${t.id}.body` as keyof MessageValues
        return (
          <div key={t.id} role="tabpanel" hidden={tab !== t.id} className="space-y-3">
            <div>
              <label htmlFor={subject} className="mb-1 block text-[12px] font-medium text-ink-2">Title</label>
              <input id={subject} name={subject} defaultValue={values[subject]} maxLength={120} required className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[12.5px] text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label htmlFor={body} className="mb-1 block text-[12px] font-medium text-ink-2">Message</label>
              <textarea id={body} name={body} rows={6} defaultValue={values[body]} maxLength={600} required className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[12px] text-ink focus:border-brand focus:outline-none" />
            </div>
          </div>
        )
      })}

      <div className="mt-3 flex items-center justify-end gap-3">
        {state?.ok && !pending && <span role="status" className="text-[11.5px] font-medium text-ok">Saved</span>}
        {state && !state.ok && <span role="alert" className="text-[11.5px] font-medium text-danger">{state.error}</span>}
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
        >
          <Icon name="check" className="h-4 w-4" /> {pending ? 'Saving…' : 'Save Messages'}
        </button>
      </div>
    </form>
  )
}
