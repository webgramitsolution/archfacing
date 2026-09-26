'use client'

import { useState, useTransition } from 'react'
import { resetEmployeePasswordAction, toggleEmployeeAction } from './actions'
import { Icon } from '@/components/ui'

export function EmployeeRowActions({
  id,
  name,
  suspended,
}: {
  id: string
  name: string
  suspended: boolean
}) {
  const [pending, start] = useTransition()
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          title="Send a new password"
          onClick={() =>
            start(async () => {
              setNewPassword(null)
              setNote(null)
              const r = await resetEmployeePasswordAction(id)
              if (!r.ok) {
                setNote(r.error ?? 'Reset failed')
              } else if (r.password) {
                // SMTP is off — the password has to be shown here
                setNewPassword(r.password)
              } else {
                setNote('New password emailed')
              }
            })
          }
          className="rounded-lg border border-line p-1.5 text-ink-3 transition-colors hover:border-ink-4 hover:text-ink disabled:opacity-50"
        >
          <Icon name="mail" className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={pending}
          title={suspended ? 'Reactivate' : 'Suspend'}
          onClick={() =>
            start(async () => {
              setNote(null)
              const r = await toggleEmployeeAction(id, !suspended)
              if (!r.ok) setNote(r.error ?? 'Could not change this account')
            })
          }
          className={`rounded-lg border p-1.5 transition-colors disabled:opacity-50 ${
            suspended
              ? 'border-ok/30 text-ok hover:bg-ok-soft'
              : 'border-line text-ink-3 hover:border-brand hover:text-brand'
          }`}
        >
          <Icon name={suspended ? 'check' : 'alert'} className="h-4 w-4" />
        </button>
      </div>

      {newPassword && (
        <p className="max-w-[16rem] text-right text-[11.5px] leading-snug text-ink-2">
          New password for {name} —{' '}
          <strong className="select-all font-mono text-ink">{newPassword}</strong>
          <span className="block text-ink-3">
            SMTP is off, so share it with them yourself
          </span>
        </p>
      )}

      {note && (
        <p className="text-right text-[11.5px] text-ink-3">{note}</p>
      )}
    </div>
  )
}
