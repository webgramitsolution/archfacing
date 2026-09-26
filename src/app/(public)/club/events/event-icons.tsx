import { cn } from '@/lib/utils'

/**
 * The handful of glyphs the event pages need that `Icon` in
 * `src/components/ui.tsx` does not carry — a calendar, a share node, a gift
 * box, a chevron and the share-row social marks.
 *
 * They live here rather than in `ui.tsx` because nothing outside the Club
 * event pages uses them, and the shared icon set is deliberately small.
 * Same drawing style as `Icon`: a 24-unit box, 1.7 stroke, no fill.
 *
 * The social marks are drawn as plain letterforms and shapes, not traced
 * reproductions of the companies' logo artwork — the same line the partner
 * wordmarks take in `src/config/club-media.ts`.
 */

const BASE = 'h-[18px] w-[18px]'

function Glyph({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(BASE, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Glyph>
  )
}

export function ShareIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.6 13.4l6.8 4M15.4 6.6l-6.8 4" />
    </Glyph>
  )
}

export function GiftIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8v13" />
      <path d="M12 8S10.6 4 8.6 4a2.5 2.5 0 000 5M12 8s1.4-4 3.4-4a2.5 2.5 0 010 5" />
    </Glyph>
  )
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M6 9l6 6 6-6" />
    </Glyph>
  )
}

export function TicketIcon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z" />
      <path d="M14 6v2M14 11v2M14 16v2" />
    </Glyph>
  )
}

// ═══════════════════════════════════════════════════════════
//  Share row
// ═══════════════════════════════════════════════════════════

export type SocialNetwork = 'facebook' | 'x' | 'linkedin' | 'whatsapp' | 'email'

const SOCIAL: Record<SocialNetwork, React.ReactNode> = {
  facebook: <path d="M13.4 21v-9.5h2.9M10 13.6h6.3M13.4 11.5V8.9A2.9 2.9 0 0116.3 6h1.2" />,
  x: <path d="M5 5l14 14M19 5L5 19" />,
  linkedin: (
    <>
      <path d="M7 10.5V17M7 6.9h.01" />
      <path d="M12 17v-6.5M12 13.2a2.6 2.6 0 015.2 0V17" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.5 11.6a8.3 8.3 0 01-12.2 7.4L3.5 20.5l1.6-4.7a8.3 8.3 0 1115.4-4.2z" />
      <path d="M9.3 9.6c0 2.6 2.2 4.8 4.8 4.8l1-1.2 1.4.7-.4 1.4a4.2 4.2 0 01-4.6-1 4.2 4.2 0 01-1.2-4.6l1.4-.4.7 1.4z" />
    </>
  ),
  email: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M3 7.5l9 5.5 9-5.5" />
    </>
  ),
}

export function SocialIcon({
  network,
  className,
}: {
  network: SocialNetwork
  className?: string
}) {
  return <Glyph className={className}>{SOCIAL[network]}</Glyph>
}
