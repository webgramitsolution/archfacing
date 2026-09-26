'use client'

import { useLinkStatus } from 'next/link'
import { cn } from '@/lib/utils'

/**
 * The spinner that appears on a nav item the instant it is clicked.
 *
 * App Router keeps the CURRENT page on screen while the next one is fetched,
 * so without this a click looks like nothing happened at all — the complaint
 * that pages "don't open instantly". `useLinkStatus` reports that its parent
 * `<Link>` has a navigation in flight, so the item the reader clicked marks
 * itself busy in the same frame.
 *
 * Must be rendered INSIDE the `<Link>` whose status it reports.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus()
  if (!pending) return null

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-80',
        className
      )}
    />
  )
}
