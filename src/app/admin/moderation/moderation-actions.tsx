'use client'

import { useState, useTransition } from 'react'
import { approvePostAction, rejectPostAction } from './actions'
import { Button, Alert } from '@/components/form'

export function ModerationActions({ postId }: { postId: string }) {
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
              placeholder="e.g. images are blurry, or the description is incomplete"
              className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
            />
            <span className="text-[12px] text-ink-3">
              This message is sent to the user as a notification.
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() =>
                start(async () => {
                  const r = await rejectPostAction(postId, reason)
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
                await approvePostAction(postId)
              })
            }
          >
            {pending ? 'Publishing…' : 'Publish'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
            Send back
          </Button>
        </div>
      )}
    </div>
  )
}
