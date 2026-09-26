import { cn } from '@/lib/utils'

/**
 * The marks that exist only for Artistry.
 *
 * Split out of `artistry.tsx` so the client-side gallery can import it
 * without dragging the whole component file into the browser bundle.
 */


//  Glyphs the shared Icon union does not carry


/**
 * `Icon` in `ui.tsx` is a closed, site-wide set and `Glyph` in `blog.tsx` is
 * the Blog's own. Neither should grow entries that exist only for Artistry, so
 * the extra marks live here. Anything already in `IconName` — map, star, mail,
 * shield, clock, check, chart — is drawn with <Icon /> instead of duplicated.
 */
export type ArtGlyphName =
  | 'eye' | 'heart' | 'bookmark' | 'calendar' | 'share' | 'expand'
  | 'percent' | 'chat' | 'flag' | 'left' | 'right'
  | 'bold' | 'italic' | 'link' | 'reply' | 'sort'

const GLYPHS: Record<ArtGlyphName, React.ReactNode> = {
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  heart: <path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 00-7.1 7.1l1.7 1.7L12 21.4l7.1-7L20.8 12a5 5 0 000-7.1z" />,
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />,
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>),
  share: (<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>),
  expand: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
  percent: (<><path d="M19 5L5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
  chat: <path d="M21 11.5a8.4 8.4 0 01-9 8.5 9 9 0 01-4-.9L3 21l1.9-5a8.4 8.4 0 01-.9-4 8.4 8.4 0 018.5-9 8.5 8.5 0 018.5 8.5z" />,
  flag: (<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22V3" /></>),
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 6l6 6-6 6" />,
  bold: <path d="M7 4h6.5a4 4 0 010 8H7zM7 12h7.5a4 4 0 010 8H7z" />,
  italic: <path d="M19 4h-9M14 20H5M15 4L9 20" />,
  link: <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />,
  reply: <path d="M9 17l-5-5 5-5M4 12h10a6 6 0 016 6v2" />,
  sort: <path d="M3 6h13M3 12h9M3 18h5M17 10l3-3 3 3M20 7v13" />,
}

export function ArtGlyph({ name, className }: { name: ArtGlyphName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('h-[18px] w-[18px]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </svg>
  )
}

/** True when the name belongs to this set rather than the site-wide one. */
export function isArtGlyph(name: string): name is ArtGlyphName {
  return name in GLYPHS
}
