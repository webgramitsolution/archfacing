'use client'

import { useTransition } from 'react'
import { deleteReviewAction } from '@/app/dashboard/visitor-actions'

/** Removes one of the reader's own reviews; the page revalidates around it. */
export function DeleteReviewButton({ postId }: { postId: string }) {
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void deleteReviewAction(postId))}
      className="text-[11.5px] font-semibold text-ink-3 transition-colors hover:text-danger disabled:opacity-50"
    >
      {pending ? 'Removing…' : 'Remove review'}
    </button>
  )
}
