'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui'

/** "Share Profile" — copies the public profile URL, with feedback. */
export function ShareButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const full = typeof window !== 'undefined' ? new URL(url, window.location.origin).href : url
    try {
      if (navigator.share) { await navigator.share({ url: full }); return }
    } catch { /* dismissed — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked */ }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <Icon name={copied ? 'check' : 'share'} className="h-4 w-4" />
      {copied ? 'Link copied' : 'Share Profile'}
    </button>
  )
}
