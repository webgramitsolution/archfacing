/**
 * The full header structure — per §6.1.1 and the approved mockup.
 *
 * For items that have a mega-menu, the categories come from `taxonomy.ts` —
 * so a single change there updates the menu, the forms and the filters at once.
 */

import { BUSINESS_RULES, termYears } from './permissions'
import {
  PROJECT_CATEGORIES,
  PRODUCT_CATEGORIES,
  AROUND_US_CATEGORIES,
  ARTISTRY_CATEGORIES,
  CONSULTANT_GROUPS,
  DESIGNA_CATEGORIES,
  DESIGNI_CATEGORIES,
  type TaxonomyNode,
} from './taxonomy'

export type MenuLink = {
  href: string
  title: string
  desc: string
  icon: 'users' | 'map' | 'star'
}

export type MenuItem = {
  label: string
  href: string
  /** Columns shown inside the mega-menu when it opens */
  mega?: TaxonomyNode[]
  /** Which query param the listing page filters by */
  megaParam?: 'category' | 'group'
  /** A dropdown of direct links instead of a taxonomy */
  links?: MenuLink[]
  /**
   * Illustration pinned to the right of the mega-panel.
   *
   * `width` and `height` are the size it is drawn at, in the source's own
   * proportion. Giving both means the panel reserves the right box rather
   * than squeezing the picture into whatever height the columns happen to
   * come out at.
   */
  megaImage?: { src: string; width: number; height: number }
  /**
   * Scales this one mega-panel, exactly as Ctrl+- scales a page: at 0.9 the
   * columns lay out against a box a ninth wider and render at 90%. Set it only
   * on a menu that is too tall or too cramped at full size; every other menu,
   * and the rest of the site, is untouched.
   */
  megaZoom?: number
  /** Drops the "View all …" footer from this one panel. */
  megaHideViewAll?: boolean
  /**
   * How the columns are drawn:
   *   · striped — every second column tinted, columns edge to edge
   *   · cards   — each column a bordered box with a centred heading
   * Omitted, they are plain columns on the panel background.
   */
  megaStyle?: 'striped' | 'cards'
  /**
   * Category slugs that take two column tracks instead of one and list their
   * children in two sub-columns. For a category with far more children than
   * the rest, which would otherwise stretch the whole panel to its height.
   */
  megaWide?: string[]
  /** New feature — shows a marker beside the label */
  highlight?: boolean
}

/**
 * The Membership dropdown — three offerings sit under it.
 * They are not listed separately in the top-level nav; they are grouped here.
 */
const MEMBERSHIP_LINKS: MenuLink[] = [
  {
    href: '/designers-associates',
    title: 'Designers Associates',
    desc: 'Work with ArchFacing — you keep 80%, ArchFacing takes 20%',
    icon: 'users',
  },
  {
    href: '/pact',
    title: 'PIN Code PACT',
    // Reads the contractual term rather than repeating it — this line sits
    // in the mega-menu on every page, so a stale figure was site-wide.
    desc: `An exclusive franchise for your PIN code, for ${termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}`,
    icon: 'map',
  },
  {
    href: '/club',
    title: 'Club Membership',
    desc: 'Events, networking and member plans — learn, connect, grow together',
    icon: 'star',
  },
]

/** Consult Nearby — the "Menu of service" from §4.1.2 */
const CONSULT_MENU: TaxonomyNode[] = [
  { slug: 'designa', name: 'DESIGNA — Architecture', children: DESIGNA_CATEGORIES },
  { slug: 'designi', name: 'DESIGNI — Interior', children: DESIGNI_CATEGORIES },
  ...CONSULTANT_GROUPS,
]

/**
 * The top-level bar.
 *
 * Home, PACT and Club are deliberately absent. Home is the logo's job, and
 * PACT and Club are reachable from the Membership dropdown — listing them
 * twice made the bar long enough to wrap on a laptop.
 */
export const HEADER_NAV: MenuItem[] = [
  // Projects carries 14 categories and 124 links, far more than any other
  // menu, so its panel alone is scaled to 90%.
  { label: 'Projects', href: '/projects', mega: PROJECT_CATEGORIES, megaParam: 'category', megaZoom: 0.9, megaHideViewAll: true, megaStyle: 'striped' },
  // Photo and Videography carries 21 children against three to twelve
  // elsewhere, so it takes two tracks and splits them into two sub-columns.
  { label: 'Products', href: '/products', mega: PRODUCT_CATEGORIES, megaParam: 'category', megaZoom: 0.9, megaHideViewAll: true, megaStyle: 'striped', megaWide: ['photo-videography'] },
  {
    label: 'Around Us',
    href: '/around-us',
    mega: AROUND_US_CATEGORIES,
    megaParam: 'category',
    megaZoom: 0.9,
    megaStyle: 'striped',
    megaHideViewAll: true,
    // Source is 1716 x 917, so 478 wide keeps its proportion. 478 rather than
    // 430 because the panel is scaled to 0.9: it lands back on 430 on screen.
    megaImage: {
      src: 'https://ik.imagekit.io/archfacing/around%20us%20menue%20image.png?updatedAt=1784125069737',
      width: 478,
      height: 256,
    },
  },
  // Artistry has five real groups, so the categories go in as columns rather
  // than being wrapped in a single synthetic 'all' node.
  {
    label: 'Artistry',
    href: '/artistry',
    mega: ARTISTRY_CATEGORIES,
    megaParam: 'category',
    megaZoom: 0.9,
    megaStyle: 'striped',
    megaHideViewAll: true,
    // Source is 1389 x 641. 478 rather than 430 because the panel is scaled
    // to 0.9: it lands back on 430 on screen.
    megaImage: {
      src: 'https://ik.imagekit.io/archfacing/Artistry%20-11.png?updatedAt=1784128280932',
      width: 478,
      height: 221,
    },
  },
  { label: 'Membership', href: '/membership', links: MEMBERSHIP_LINKS },
  { label: 'Merchandise', href: '/merchandise' },
  { label: 'Advertisements', href: '/advertisements' },
  // No mega menu. The six competition categories live on the /competition page
  // itself, in the category strip under the hero — a dropdown repeating them
  // was a second place to keep the same list in sync.
  { label: 'Design Competition', href: '/competition' },
  { label: 'Podcast', href: '/podcast' },
  // No mega menu. The eight blog categories are on the /blog page itself, in
  // the strip under the hero — a dropdown repeating them was a second place
  // to keep in step for no gain.
  { label: 'Blog', href: '/blog' },
]

/**
 * A few major cities for the location picker in the top bar.
 * Everything else is reachable through search — 19,238 PIN codes are in the DB.
 */
export const QUICK_CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
] as const
