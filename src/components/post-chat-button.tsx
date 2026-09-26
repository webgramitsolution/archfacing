'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { startPostChatAction } from '@/app/dashboard/(shell)/messages/actions'

/**
 * The "Chat Now" / "Contact" button on a public Artistry or Around Us post.
 *
 * Signed in → opens (or re-opens) the chat with the post's author and takes
 * the reader to Messages. Signed out → sends them to sign in and back here,
 * rather than failing silently.
 */
export function PostChatButton({
  postId,
  signedIn,
  returnTo,
  label = 'Chat Now',
  intent = 'chat',
  icon = 'mail',
  variant = 'outline',
  className,
}: {
  postId: string
  signedIn: boolean
  returnTo: string
  label?: string
  /** 'enquiry' opens the same thread with an enquiry already typed in the box. */
  intent?: 'chat' | 'enquiry'
  icon?: IconName
  variant?: 'outline' | 'primary'
  className?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function go() {
    setError(null)
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(returnTo)}`)
      return
    }
    start(async () => {
      const res = await startPostChatAction(postId)
      if (res.ok) {
        const q = new URLSearchParams()
        if (res.conversationId) q.set('c', res.conversationId)
        if (intent === 'enquiry') q.set('enquire', '1')
        router.push(`/dashboard/messages${q.size ? `?${q}` : ''}`)
      }
      else setError(res.error ?? 'Could not open the chat.')
    })
  }

  return (
    <>
      <button type="button" onClick={go} disabled={pending} className={cn(variant === 'primary' ? 'btn-primary' : 'btn-outline w-full whitespace-nowrap px-2.5 text-[13px]', className)}>
        <Icon name={icon} className="h-4 w-4 shrink-0" />
        {pending ? 'Opening…' : label}
      </button>
      {error && <p className="mt-1.5 text-[11.5px] font-medium text-danger">{error}</p>}
    </>
  )
}
