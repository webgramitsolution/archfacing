'use client'

import { useState, useTransition } from 'react'
import { verifyUserAction, rejectUserAction } from './actions'
import { Button, Alert, Textarea } from '@/components/form'

export function VerifyActions({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const [pending, start] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="border-t border-line bg-paper-3 px-5 py-4">
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">
              What is missing?<span className="ml-1 text-brand">*</span>
            </span>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. COA number could not be found, or the certificate is not legible"
            />
            <span className="text-[12px] text-ink-3">
              This message is sent to {name} by email and as a notification.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const r = await rejectUserAction(userId, reason)
                  if (!r.ok) setError(r.error ?? 'Could not send it back')
                })
              }
            >
              {pending ? 'Sending…' : 'Send back'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRejecting(false)
                setReason('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null)
                const r = await verifyUserAction(userId)
                if (!r.ok) setError(r.error ?? 'Could not verify the user')
              })
            }
          >
            {pending ? 'Verifying…' : 'Verify'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
            Report an issue
          </Button>
        </div>
      )}
    </div>
  )
}
