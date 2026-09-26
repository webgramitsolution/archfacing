'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        // Instant feedback the moment it is clicked — the sign-out round-trip
        // and the redirect to "/" take a beat, so show the state right away.
        setBusy(true)
        signOut({ callbackUrl: '/' })
      }}
      className={cn(
        'text-[13px] font-medium text-ink-3 transition-colors hover:text-brand disabled:opacity-60',
        className
      )}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
