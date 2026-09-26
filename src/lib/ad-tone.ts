/**
 * The colour of an advertisement type.
 *
 * The blueprints give every advertisement type its own hue, and they use it in
 * two shapes: a soft tile behind the icon on the Create Advertisement type
 * picker, and a bordered pill in the Type column of the campaign tables. Both
 * come from this one table so a Sponsored Product is the same violet wherever
 * it appears — three screens each choosing their own palette is how a module
 * ends up with three different greens for the same thing.
 *
 * Keyed by `AdType.slug`, which is seed data, so a type added later without an
 * entry here simply falls back to the brand tone rather than rendering
 * uncoloured.
 *
 * Pure module — no Prisma, no React — so a Server Component, a Client
 * Component and a test can all read it.
 */

export type AdTone = {
  /** Soft tile behind the icon: background + icon colour. */
  tile: string
  /** Bordered pill for a table cell: border + background + text. */
  pill: string
}

const RAMP = {
  brand: { tile: 'bg-brand-soft text-brand', pill: 'border-brand-border bg-brand-soft text-brand' },
  amber: { tile: 'bg-warn-soft text-warn', pill: 'border-warn/25 bg-warn-soft text-warn' },
  violet: { tile: 'bg-[#F5F3FF] text-[#7C3AED]', pill: 'border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]' },
  green: { tile: 'bg-ok-soft text-ok', pill: 'border-ok/25 bg-ok-soft text-ok' },
  blue: { tile: 'bg-info-soft text-info', pill: 'border-info/25 bg-info-soft text-info' },
  teal: { tile: 'bg-[#ECFEFF] text-[#0891B2]', pill: 'border-[#BAE6FD] bg-[#ECFEFF] text-[#0891B2]' },
  rose: { tile: 'bg-danger-soft text-danger', pill: 'border-danger/25 bg-danger-soft text-danger' },
  pink: { tile: 'bg-[#FDF2F8] text-[#DB2777]', pill: 'border-[#FBCFE8] bg-[#FDF2F8] text-[#DB2777]' },
} as const satisfies Record<string, AdTone>

/**
 * Slug → hue, read straight off the blueprint's type grid, reading across then
 * down: Banner, Featured, Sponsored Product / Sponsored Project, Sponsored
 * Listing, Brand Spotlight / Category, Search, Local / PACT, Event Sponsor,
 * Sponsored Content.
 */
const BY_SLUG: Record<string, AdTone> = {
  banner: RAMP.brand,
  featured: RAMP.amber,
  'sponsored-product': RAMP.violet,
  'sponsored-project': RAMP.green,
  'sponsored-listing': RAMP.brand,
  'brand-spotlight': RAMP.teal,
  category: RAMP.green,
  search: RAMP.blue,
  local: RAMP.rose,
  pact: RAMP.pink,
  'event-sponsor': RAMP.amber,
  'sponsored-content': RAMP.violet,
}

export function adTone(slug: string | null | undefined): AdTone {
  return (slug && BY_SLUG[slug]) || RAMP.brand
}
