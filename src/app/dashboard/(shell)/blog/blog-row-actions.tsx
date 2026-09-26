'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitBlogAction, deleteBlogAction } from './blog-actions'

/**
 * Submit and Delete on a blog card.
 *
 * Delete asks twice — a written article is real work, and the dashboard has
 * no way to bring one back.
 */
export function BlogRowActions({
  id,
  title,
  status,
}: {
  id: string
  title: string
  status: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = status === 'DRAFT' || status === 'REJECTED'

  if (error) {
    return (
      <span className="ml-auto text-[11.5px] text-danger" role="alert">
        {error}
      </span>
    )
  }

  return (
    <span className="ml-auto flex items-center gap-3">
      {canSubmit && !armed && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await submitBlogAction(id)
              if (r.ok) router.refresh()
              else setError(r.error ?? 'Could not send it.')
            })
          }
          className="font-semibold text-ok hover:underline disabled:opacity-60"
        >
          {pending ? 'Sending…' : status === 'REJECTED' ? 'Resubmit' : 'Submit'}
        </button>
      )}

      {armed ? (
        <>
          <button
            type="button"
            disabled={pending}
            aria-label={`Confirm removing ${title}`}
            onClick={() =>
              start(async () => {
                const r = await deleteBlogAction(id)
                if (r.ok) router.refresh()
                else setError(r.error ?? 'Could not remove it.')
              })
            }
            className="font-semibold text-danger hover:underline disabled:opacity-60"
          >
            {pending ? 'Removing…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-ink-4 hover:text-ink-2"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-ink-4 transition-colors hover:text-danger"
        >
          Delete
        </button>
      )}
    </span>
  )
}
