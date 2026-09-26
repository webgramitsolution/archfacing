'use client'

import { useState, useTransition } from 'react'
import { approveAdAction, rejectAdAction } from './actions'
import { Button, Alert } from '@/components/form'

export function AdReviewActions({ bookingId }: { bookingId: string }) {
  const [pending, start] = useTransition()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="border-t border-line bg-paper-2 px-5 py-4">
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">
              Reason for sending back
              <span className="ml-1 text-brand">★</span>
            </span>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. the banner is not the right pixel size, or the landing page does not match the offer"
              className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
            />
            <span className="text-[12px] text-ink-3">
              This message is sent to the advertiser as a notification and shown
              on their booking. At least 10 characters.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() =>
                start(async () => {
                  const r = await rejectAdAction(bookingId, reason)
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
                const r = await approveAdAction(bookingId)
                if (!r.ok) setError(r.error ?? 'Could not approve it')
              })
            }
          >
            {pending ? 'Approving…' : 'Approve and run'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
            Send back
          </Button>
        </div>
      )}
    </div>
  )
}
