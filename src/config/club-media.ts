/**
 * Photography for the ArchFacing Club pages.
 *
 * These are Unsplash photographs, referenced by their permanent photo id and
 * served from `images.unsplash.com`. Every id below was checked to resolve,
 * and each was viewed before being assigned, so the subject actually matches
 * the slot it fills.
 *
 * To swap one out, replace the id — the sizing is handled by `unsplash()`.
 * `images.unsplash.com` is allowlisted in `next.config.ts`; without that entry
 * `next/image` refuses to load any of them.
 */

/** Builds a sized, cropped Unsplash URL. */
export function unsplash(
  id: string,
  { w = 1200, h, q = 75 }: { w?: number; h?: number; q?: number } = {}
): string {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    q: String(q),
  })
  if (h) params.set('h', String(h))
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`
}

// ═══════════════════════════════════════════════════════════
//  Event photography
// ═══════════════════════════════════════════════════════════

export const CLUB_PHOTOS = {
  /** Seated audience facing a lit screen — the Club hero */
  clubHero: '1524178232363-1fb2b075b655',
  /** A speaker on a large stage, auditorium full */
  seminar: '1587825140708-dfaf72ae4b04',
  /** Exhibition floor with screens and visitors */
  exhibition: '1523580494863-6f3031224c94',
  /** A presentation deck on screen in a dark hall */
  webinar: '1505373877841-8d25f7d46678',
  /** A crowd mingling at an event */
  networking: '1517457373958-b7bdd4587205',
  /** A hall seen from above, packed */
  conference: '1560439514-4e9645039924',
  /** Colleagues celebrating over laptops */
  collaboration: '1497366216548-37526070297c',
  /** A workshop wall covered in sticky notes */
  workshop: '1552664730-d307ca884978',
  /** An empty conference room set with round tables */
  venue: '1511578314322-379afb476865',
} as const

/** The gallery strip — "Glimpses from our events" */
export const CLUB_GALLERY: string[] = [
  '1517457373958-b7bdd4587205', // crowd mingling
  '1497366216548-37526070297c', // celebrating over laptops
  '1524178232363-1fb2b075b655', // seated audience
  '1560439514-4e9645039924', // packed hall from above
  '1523580494863-6f3031224c94', // exhibition floor
  '1587825140708-dfaf72ae4b04', // speaker on stage
  '1552664730-d307ca884978', // workshop wall
  '1511578314322-379afb476865', // conference room
]

// ═══════════════════════════════════════════════════════════
//  Speaker portraits
// ═══════════════════════════════════════════════════════════

export const SPEAKER_PHOTOS = {
  karanGrover: '1500648767791-00dcc994a43e',
  rituSharma: '1573496359142-b8d87734a5a2',
  sameerPuri: '1507003211169-0a1dd7228f2d',
  meeraSinha: '1573497019940-1c28c88b4f3e',
  vikramNair: '1472099645785-5658abf4ff4e',
  ananyaIyer: '1580489944761-15a19d654956',
  rohanMehta: '1506794778202-cad84cf45f1d',
  priyaDesai: '1544005313-94ddf0286df2',
} as const

// ═══════════════════════════════════════════════════════════
//  Partners
// ═══════════════════════════════════════════════════════════

/**
 * Partner brands from the design.
 *
 * These are rendered as plain wordmarks rather than reproductions of the
 * companies' actual logo artwork. Drop real logo files into
 * `public/img/partners/` and add a `logo` path here once you have permission
 * to use them.
 */
export const CLUB_PARTNERS: { name: string; logo?: string }[] = [
  { name: 'SAINT-GOBAIN' },
  { name: 'Asian Paints' },
  { name: 'HÄFELE' },
  { name: 'Jaquar' },
  { name: 'Godrej Interio' },
  { name: 'Dornbracht' },
  { name: 'KOHLER' },
  { name: 'NITCO' },
  { name: 'Greenply' },
  { name: 'Fenesta' },
]
