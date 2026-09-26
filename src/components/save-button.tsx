'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleSavedAction } from '@/app/dashboard/visitor-actions'

/**
 * The bookmark heart that sits on a public detail page.
 *
 * Optimistic — the heart flips at once, and flips back if the server said no.
 * Signed out, it sends the visitor to login and brings them straight back.
 */
export function SaveButton({
  postId,
  initialSaved,
  path,
  className = '',
}: {
  postId: string
  /** Whether THIS viewer had already saved it, read on the server. */
  initialSaved: boolean
  /** The page to revalidate, e.g. `/projects/some-slug`. */
  path?: string
  className?: string
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [pending, start] = useTransition()

  function onClick() {
    const next = !saved
    setSaved(next)
    start(async () => {
      const res = await toggleSavedAction(postId, path)
      if (res.signIn) {
        setSaved(false)
        router.push(`/login?next=${encodeURIComponent(path ?? '/')}`)
        return
      }
      if (!res.ok) setSaved(!next)
      else if (typeof res.saved === 'boolean') setSaved(res.saved)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved items' : 'Save this item'}
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
        saved
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-line bg-paper-2 text-ink-2 hover:border-brand hover:text-brand'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-4 w-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

/**
 * The same real save, in whatever shape a page already draws — the round
 * heart on a competition card, the square bookmark on a competition page,
 * the outline "Save" on an artwork. The look comes in as props; the
 * behaviour (optimistic flip, sign-in bounce, SavedItem row) is shared.
 */
export function SaveToggle({
  postId,
  initialSaved,
  path,
  noun = 'item',
  className = '',
  savedClassName = '',
  icon,
  savedIcon,
  withText = false,
}: {
  postId: string
  initialSaved: boolean
  path?: string
  /** "competition", "artwork" — used in the accessible label. */
  noun?: string
  className?: string
  /** Added on top of `className` while saved. */
  savedClassName?: string
  icon: React.ReactNode
  savedIcon?: React.ReactNode
  /** Print "Save" / "Saved" beside the icon. */
  withText?: boolean
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [pending, start] = useTransition()

  function onClick() {
    const next = !saved
    setSaved(next)
    start(async () => {
      const res = await toggleSavedAction(postId, path)
      if (res.signIn) {
        setSaved(false)
        router.push(`/login?next=${encodeURIComponent(path ?? '/')}`)
        return
      }
      if (!res.ok) setSaved(!next)
      else if (typeof res.saved === 'boolean') setSaved(res.saved)
    })
  }

  const label = saved ? `Remove this ${noun} from saved items` : `Save this ${noun}`
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`${className} ${saved ? savedClassName : ''} disabled:opacity-60`}
    >
      {saved && savedIcon ? savedIcon : icon}
      {withText && (saved ? 'Saved' : 'Save')}
    </button>
  )
}
