import { cn } from '@/lib/utils'

/** The Meta-style verified blue — fixed, so a badge always reads the same. */
const VERIFIED_BLUE = '#0095F6'
/** The top-plan member's badge. */
const VERIFIED_GOLD = '#E6A700'

/**
 * The verified badge — a scalloped rosette with a white check, in the manner
 * of Meta's verified badge (client request, Sept 2026). Blue for an active
 * PACT holder, gold for a member on the highest paid plan (see lib/verified.ts).
 */
export function VerifiedTick({
  className,
  label,
  tone = 'blue',
}: {
  className?: string
  label?: string
  tone?: 'blue' | 'gold' | null
}) {
  const gold = tone === 'gold'
  const fill = gold ? VERIFIED_GOLD : VERIFIED_BLUE
  const text = label ?? (gold ? 'Verified · Top plan member' : 'Verified · PACT holder')
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={text}
      className={cn('h-4 w-4 shrink-0', className)}
    >
      <title>{text}</title>
      {/* 16-point rosette; the round stroke join softens the points into scallops */}
      <path
        d="M12 .8L15.58 3.36L19.92 4.08L20.64 8.42L23.2 12L20.64 15.58L19.92 19.92L15.58 20.64L12 23.2L8.42 20.64L4.08 19.92L3.36 15.58L.8 12L3.36 8.42L4.08 4.08L8.42 3.36Z"
        fill={fill}
        stroke={fill}
        strokeWidth="1.6"
        strokeLinejoin="round"
        transform="translate(12 12) scale(0.9) translate(-12 -12)"
      />
      <path
        d="M7.6 12.2l3 3 5.8-6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
