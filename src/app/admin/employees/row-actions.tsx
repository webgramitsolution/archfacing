'use client'

import { useState, useTransition } from 'react'
import { resetEmployeePasswordAction, toggleEmployeeAction } from './actions'
import { Icon } from '@/components/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'

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
  // Reset and Suspend ask first — both used to happen on a single click.
  const [ask, setAsk] = useState<null | 'reset' | 'suspend'>(null)

  const resetPassword = () =>
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

  const toggle = () =>
    start(async () => {
      setNote(null)
      const r = await toggleEmployeeAction(id, !suspended)
      if (!r.ok) setNote(r.error ?? 'Could not change this account')
    })

  return (
    <div className="flex flex-col items-end gap-1.5">
      {ask && (
        <ConfirmDialog
          confirm={
            ask === 'reset'
              ? { title: `Send ${name} a new password?`, body: 'Their current password stops working straight away and they must use the new one to sign in.', confirmLabel: 'Send New Password', cancelLabel: 'Cancel', tone: 'warn', run: async () => ({ ok: true }) }
              : { title: `Suspend ${name}?`, body: 'They are signed out of ArchFacing and cannot sign in until the account is reactivated.', confirmLabel: 'Suspend', cancelLabel: 'Cancel', tone: 'danger', run: async () => ({ ok: true }) }
          }
          busy={pending}
          error={null}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            const a = ask
            setAsk(null)
            if (a === 'reset') resetPassword()
            else toggle()
          }}
        />
      )}
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          title="Send a new password"
          aria-label={`Send a new password to ${name}`}
          onClick={() => setAsk('reset')}
          className="rounded-lg border border-line p-1.5 text-ink-3 transition-colors hover:border-ink-4 hover:text-ink disabled:opacity-50"
        >
          <Icon name="mail" className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={pending}
          title={suspended ? 'Reactivate' : 'Suspend'}
          aria-label={suspended ? `Reactivate ${name}` : `Suspend ${name}`}
          // Reactivating is not destructive, so only Suspend asks first.
          onClick={() => (suspended ? toggle() : setAsk('suspend'))}
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
