'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePostAction } from './post-actions'

/**
 * Remove one of your own postings.
 *
 * Two clicks, not one: the first turns the link into a confirmation, the
 * second does it. A posting is work — a photo shoot, a write-up, a review
 * queue — and a single stray click should not be able to take it away. It is
 * a soft delete on the server, but nothing in the dashboard can bring one
 * back, so from here it is permanent.
 */
export function DeletePostingButton({ id, title }: { id: string; title: string }) {
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (error) {
    return <span className="text-[11.5px] text-danger">{error}</span>
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="ml-auto text-[11.5px] text-ink-4 transition-colors hover:text-danger"
      >
        Remove
      </button>
    )
  }

  return (
    <span className="ml-auto flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-label={`Confirm removing ${title}`}
        onClick={() =>
          start(async () => {
            const res = await deletePostAction(id)
            if (res.ok) router.refresh()
            else setError(res.error ?? 'Could not remove it.')
          })
        }
        className="text-[11.5px] font-semibold text-danger hover:underline disabled:opacity-60"
      >
        {pending ? 'Removing…' : 'Confirm'}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-[11.5px] text-ink-4 hover:text-ink-2"
      >
        Cancel
      </button>
    </span>
  )
}
