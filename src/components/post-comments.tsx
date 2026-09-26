'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { addCommentAction, deleteCommentAction, type CommentState } from '@/app/(public)/artistry/comment-actions'

const MAX = 1000

/** The composer under an artwork. Signed out, it is a sign-in prompt. */
export function CommentComposer({
  postId,
  path,
  signedIn,
  viewerName,
}: {
  postId: string
  path: string
  signedIn: boolean
  viewerName?: string | null
}) {
  const [state, action, pending] = useActionState<CommentState | null, FormData>(
    addCommentAction.bind(null, postId, path),
    null
  )
  const [text, setText] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  // A posted comment clears the box; a rejected one keeps the text to fix.
  useEffect(() => {
    if (state?.ok) setText('')
  }, [state?.nonce, state?.ok])

  const loginHref = `/login?next=${encodeURIComponent(`${path}#comments`)}`

  if (!signedIn) {
    return (
      <div className="mt-4 rounded-card border border-line bg-paper-3 p-4 text-[13px] text-ink-3">
        <Link href={loginHref} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>{' '}
        to join the conversation on this artwork.
      </div>
    )
  }

  const initial = (viewerName ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <form ref={formRef} action={action} className="mt-4 rounded-card border border-line bg-paper-3 p-4">
      <div className="flex min-w-0 gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <textarea
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) formRef.current?.requestSubmit()
            }}
            className="input min-h-[74px] resize-y bg-white"
            placeholder="Write a comment..."
            rows={3}
            maxLength={MAX}
            required
            aria-label="Write a comment"
            aria-invalid={state?.error ? true : undefined}
          />

          {state?.error && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-danger">
              {state.error}
            </p>
          )}
          {state?.signIn && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-danger">
              Your session ended —{' '}
              <Link href={loginHref} className="underline">sign in again</Link>.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="tabular text-[11.5px] text-ink-4">
              {text.length}/{MAX} · no phone numbers
            </span>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-[13px]"
              disabled={pending || text.trim().length < 2}
            >
              {pending ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

/** Remove — shown to the comment's author, the artwork's owner and staff. */
export function DeleteCommentButton({ commentId, path }: { commentId: string; path: string }) {
  const [pending, start] = useTransition()
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="text-[11.5px] font-medium text-ink-4 hover:text-danger">
        Delete
      </button>
    )
  }

  return (
    <span className="flex items-center gap-2 text-[11.5px]">
      <span className="text-ink-3">{error ?? 'Delete this comment?'}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteCommentAction(commentId, path)
            if (!res.ok) setError(res.error ?? 'Could not delete.')
          })
        }
        className="font-semibold text-danger hover:underline disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={() => { setArmed(false); setError(null) }} className="text-ink-3 hover:underline">
        Cancel
      </button>
    </span>
  )
}
