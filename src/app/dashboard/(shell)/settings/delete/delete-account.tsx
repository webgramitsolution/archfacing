'use client'

import { useActionState, useState } from 'react'
import { Icon } from '@/components/ui'
import { SettingsPanel } from '../settings-parts'
import { requestAccountDeletionAction, type DelState } from './actions'

export function DeleteAccount({ email }: { email: string }) {
  const [state, action, pending] = useActionState<DelState | null, FormData>(requestAccountDeletionAction, null)
  const [typed, setTyped] = useState('')

  if (state?.done) {
    return (
      <SettingsPanel icon="check" title="Deletion Requested" subtitle="Your request has been received">
        <div className="flex items-start gap-3 rounded-card border border-ok/30 bg-ok-soft px-4 py-3.5 text-[13px] text-ink-2">
          <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
          <p className="leading-relaxed">
            We have received your request to delete your account. Our team will process it within 7 days.
            You can keep using ArchFacing until then, and may cancel the request any time by contacting
            support.
          </p>
        </div>
      </SettingsPanel>
    )
  }

  return (
    <SettingsPanel icon="trash" title="Delete Account" subtitle="Permanently delete your account" tone="danger">
      <div className="mb-5 flex items-start gap-3 rounded-card border border-danger/25 bg-danger-soft px-4 py-3.5 text-[13px] text-ink-2">
        <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <div className="leading-relaxed">
          <p className="font-semibold text-danger">This cannot be undone.</p>
          <p className="mt-1">
            Deleting your account removes your profile, listings, storefront and enquiry history. Active
            memberships are not refunded. Submitting this starts the process — an admin completes it after a
            7-day grace period, during which you can cancel by contacting support.
          </p>
        </div>
      </div>

      <form action={action} className="max-w-md space-y-4">
        {state && !state.ok && state.error && (
          <p className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
            <Icon name="alert" className="h-4 w-4" />
            {state.error}
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Reason (optional)</span>
          <textarea name="reason" rows={3} maxLength={500} className="input resize-none" placeholder="Tell us why you're leaving…" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">
            Type <span className="font-mono text-danger">{email}</span> to confirm
          </span>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="input"
            placeholder="your account email"
          />
        </label>

        <button
          type="submit"
          disabled={pending || typed.trim().toLowerCase() !== email.toLowerCase()}
          className="btn inline-flex items-center justify-center rounded-lg bg-danger px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Icon name="trash" className="h-4 w-4" />
          {pending ? 'Submitting…' : 'Delete My Account'}
        </button>
      </form>
    </SettingsPanel>
  )
}
