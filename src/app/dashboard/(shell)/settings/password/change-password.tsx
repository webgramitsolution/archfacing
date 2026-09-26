'use client'

import { useActionState } from 'react'
import { Icon } from '@/components/ui'
import { changePasswordAction, type PwState } from './actions'

export function ChangePassword() {
  const [state, action, pending] = useActionState<PwState | null, FormData>(changePasswordAction, null)

  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.done && (
        <p className="flex items-center gap-1.5 rounded-lg border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[13px] font-medium text-ok">
          <Icon name="check" className="h-4 w-4" />
          Your password has been updated.
        </p>
      )}
      {state && !state.ok && state.error && (
        <p className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
          <Icon name="alert" className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <Field name="current" label="Current password" />
      <Field name="next" label="New password" hint="At least 8 characters." />
      <Field name="confirm" label="Confirm new password" />

      <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5">
        <Icon name="check" className="h-4 w-4" />
        {pending ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}

function Field({ name, label, hint }: { name: string; label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      <input type="password" name={name} required autoComplete="off" className="input" />
      {hint && <span className="mt-1 block text-[11.5px] text-ink-4">{hint}</span>}
    </label>
  )
}
