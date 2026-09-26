/**
 * Photography for the Blog and Podcast pages.
 *
 * Unsplash photo ids, each one checked to resolve and viewed before being
 * assigned, so the subject matches the article it illustrates. Sizing is
 * handled by `unsplash()` in `club-media.ts`.
 *
 * To swap a picture, replace the id here — nothing else needs to change.
 */

import { BLOG_CATEGORIES } from './taxonomy'

export { unsplash } from './club-media'

// ═══════════════════════════════════════════════════════════
//  Architecture and interiors
// ═══════════════════════════════════════════════════════════

export const ARTICLE_PHOTOS = {
  /** Timber-and-glass house among trees */
  greenBuilding: '1600585154340-be6161a56a0c',
  /** Pale modern living room */
  interiorTrends: '1600607687939-ce8a6c25118c',
  /** Bright living room with an open stair */
  livingRoom: '1600566753086-00f18fb6b3ea',
  /** White house with a pool, hard sunlight */
  modernVilla: '1512917774080-9991f1c4c750',
  /** Long modern villa beside water */
  villaDusk: '1580587771525-78b9dba3b914',
  /** Suburban house behind palms */
  lowCostHomes: '1583608205776-bfd35f0d9f83',
  /** Sunlit room, plants, herringbone floor */
  naturalLighting: '1493809842364-78817add7ffb',
  /** Living room walled in glass */
  glassLiving: '1503174971373-b1f69850bded',
  /** White minimal building against sky */
  minimalist: '1523217582562-09d0def993a6',
  /** Pastel interior, arc lamp, soft chairs */
  designTrends: '1524758631624-e2822e304c36',
  /** Neutral living room, plants */
  comfortLiving: '1567767292278-a4f21aa2d36e',
  /** Glass-partitioned office corridor */
  workspace: '1497366754035-f200968a6e72',
  /** Architects drawing together at a table */
  collaboration: '1517048676732-d65bc937f952',
  /** Construction site seen from above, crew in hi-vis */
  construction: '1541888946425-d81bb19240f5',
  /** Loft with a timber stair */
  loft: '1502005229762-cf1b2da7c5d6',
  /** Calm neutral living room */
  vastu: '1616486338812-3dadae4b4ace',
  /** Living room with a gallery wall and large plants */
  biophilic: '1600210492486-724fe5c67fb0',
  /** Modern kitchen and dining */
  smartHome: '1600607687920-4e2a09cf159d',
  /** A worker at the bench, tools in hand */
  materials: '1558618666-fcd25c85cd64',
  /** City street between towers */
  urbanDesign: '1449824913935-59a10b8d2000',
} as const

// ═══════════════════════════════════════════════════════════
//  Author and guest portraits
// ═══════════════════════════════════════════════════════════

export const PERSON_PHOTOS = {
  rituSharma: '1573496359142-b8d87734a5a2',
  anjaliMehta: '1580489944761-15a19d654956',
  vikramPatel: '1472099645785-5658abf4ff4e',
  nehaVerma: '1573497019940-1c28c88b4f3e',
  amitSingh: '1506794778202-cad84cf45f1d',
  poojaNair: '1544005313-94ddf0286df2',
  neerajSharma: '1500648767791-00dcc994a43e',
  sonalPatel: '1494790108377-be9c29b29330',
  kunalMehta: '1507003211169-0a1dd7228f2d',
  riteshKumar: '1519345182560-3f2917c472ef',
  priyaNair: '1438761681033-6461ffad8d80',
  /** The host, for the podcast hero */
  host: '1521119989659-a83eee488004',
} as const

// ═══════════════════════════════════════════════════════════
//  Podcast
// ═══════════════════════════════════════════════════════════

/** The topic chips above the episode list. */
export const PODCAST_TOPICS: { slug: string; label: string; icon: string }[] = [
  { slug: 'architecture', label: 'Architecture', icon: 'grid' },
  { slug: 'interior-design', label: 'Interior Design', icon: 'star' },
  { slug: 'construction', label: 'Construction', icon: 'box' },
  { slug: 'sustainability', label: 'Sustainability', icon: 'shield' },
  { slug: 'business', label: 'Business & Entrepreneurship', icon: 'chart' },
  { slug: 'materials', label: 'Materials & Technology', icon: 'tag' },
  { slug: 'career', label: 'Career & Growth', icon: 'user' },
  { slug: 'urban-design', label: 'City & Urban Development', icon: 'map' },
]

/**
 * Where the podcast is published.
 *
 * These point at each platform's search for the show, which is a real,
 * working destination today. Replace each `href` with the show's own URL as
 * soon as it is claimed on that platform — a `#` here would render a control
 * that looks clickable and does nothing.
 *
 * ⚠️ Google Podcasts was retired in 2024 and its shows moved to YouTube
 *    Music. The tile is kept because it appears in the design, but it points
 *    at YouTube Music. Worth dropping the tile altogether at some point.
 */
export const LISTEN_ON: { name: string; href: string; color: string }[] = [
  { name: 'Spotify', href: 'https://open.spotify.com/search/ArchFacing/podcasts', color: '#1DB954' },
  { name: 'Apple Podcasts', href: 'https://podcasts.apple.com/search?term=ArchFacing', color: '#9933CC' },
  { name: 'Google Podcasts', href: 'https://music.youtube.com/search?q=ArchFacing', color: '#4285F4' },
  { name: 'Amazon Music', href: 'https://music.amazon.com/search/ArchFacing', color: '#00A8E1' },
  { name: 'JioSaavn', href: 'https://www.jiosaavn.com/search/ArchFacing', color: '#2BC5B4' },
  { name: 'YouTube', href: 'https://www.youtube.com/results?search_query=ArchFacing+podcast', color: '#FF0000' },
]

// ═══════════════════════════════════════════════════════════
//  Blog
// ═══════════════════════════════════════════════════════════

/** An `IconName` per category slug — the strip draws one glyph per tile. */
const BLOG_TOPIC_ICON: Record<string, string> = {
  'technical-papers': 'file',
  'research-development': 'chart',
  'legends-autobiographies': 'award',
  'learning-reading': 'list',
  lectures: 'users',
  'photo-blog': 'image',
  webinars: 'monitor',
  'famous-recording': 'star',
  'copyrights-patents': 'shield',
}

/**
 * The blog's categories, for the public category strip and sidebar.
 *
 * ⚠️ Derived from `BLOG_CATEGORIES` in `src/config/taxonomy.ts` — the §5.2.6.1
 *    list, which is also what the `Category` table is seeded from and what the
 *    Blog Builder offers an author.
 *
 *    These used to be a second, unrelated set of eight slugs
 *    (`architecture`, `interior-design`, `smart-building` …). `Post.category`
 *    is a free string with no foreign key, so nothing ever errored — but a
 *    blog written in the dashboard could never appear in the public category
 *    strip, because its category was not one of the eight the strip knew
 *    about. One list, derived once, is the fix.
 */
export const BLOG_TOPICS: { slug: string; label: string; icon: string }[] =
  BLOG_CATEGORIES.map((c) => ({
    slug: c.slug,
    label: c.name,
    icon: BLOG_TOPIC_ICON[c.slug] ?? 'file',
  }))

/**
 * The "Popular Topics" chips under the blog search box.
 *
 * These are free-text searches, not categories — they run against the title
 * and description, so they are worded as a reader would type them rather than
 * as a category slug.
 */
export const POPULAR_BLOG_TOPICS = [
  'Sustainable',
  'Daylight',
  'Materials',
  'Construction',
  'Vaastu',
]

// ═══════════════════════════════════════════════════════════
//  Heritage and Artistry
// ═══════════════════════════════════════════════════════════

/**
 * Indian heritage architecture, for the Artistry pages.
 * Each viewed before assignment — these are genuine heritage subjects.
 */
export const HERITAGE_PHOTOS = {
  /** Hawa Mahal, Jaipur — the ornate pink-sandstone facade */
  haveli: '1477587458883-47145ed94245',
  /** Taj Mahal on axis, reflected */
  tajAxis: '1524492412937-b28074a5d7da',
  /** India Gate at dusk */
  indiaGate: '1587474260584-136574528ed5',
  /** Taj framed through a sandstone arch */
  tajArch: '1466442929976-97f336a657be',
  /** Domes and minarets */
  domes: '1602216056096-3b40cc0c9944',
  /** Kerala backwaters, houseboat */
  backwaters: '1548013146-72479768bada',
} as const

// ═══════════════════════════════════════════════════════════
//  Projects
// ═══════════════════════════════════════════════════════════

export const PROJECT_PHOTOS = {
  /** Timber-and-glass house, dusk */
  villa: '1600585152220-90363fe7e115',
  /** Modern house with a timber screen */
  modernHouse: '1600047509807-ba8f99d2cdde',
  /** Concrete-and-timber house */
  courtyardHouse: '1600566753190-17f0baa2a6c3',
  /** ⚠️ Mislabelled when first added: this is a POOLSIDE DECK with loungers
   *  and umbrellas, not a bedroom. The key is kept because seeds reference it. */
  bedroom: '1582719508461-905c673771fd',
  /** White kitchen with an island */
  kitchen: '1556909212-d5b604d0c90d',
  /** Resort pool between palms */
  resort: '1590050752117-238cb0fb12b1',
  /** Rooftop infinity pool */
  rooftopPool: '1571003123894-1f0594d2b5d9',
  /** Timber villa with a plunge pool */
  poolVilla: '1596436889106-be35e843f974',
  /** Beach-front cabanas */
  beachResort: '1512453979798-5ea266f8880c',
  /** Deck loungers over water */
  deck: '1571896349842-33c89424de2d',
  /** Dubai skyline from above */
  cityScale: '1519681393784-d120267933ba',
  /** Hotel lobby / lounge */
  lobby: '1566073771259-6a8506099945',
  /** Mountain-edge retreat */
  retreat: '1445019980597-93fa8acb246c',
  /** ⚠️ Mislabelled when first added: this is an OPEN-PLAN BEDROOM/LIVING
   *  space walled in glass, not a house behind planting. Key kept for seeds. */
  gardenHouse: '1578683010236-d716f9a3f461',
} as const

// ═══════════════════════════════════════════════════════════
//  Products
// ═══════════════════════════════════════════════════════════

/**
 * Photography for the Products pages.
 *
 * ⚠️ These are interior and fixture photographs, not studio product shots.
 *    A generic architecture library has no picture of a cement bag or a paint
 *    bucket, so several products below are illustrated by the room the product
 *    belongs in rather than the product itself. Swap in real catalogue imagery
 *    from the brands as it arrives — the key names stay the same.
 */
export const PRODUCT_PHOTOS = {
  /** Living room, pendant lights over a sofa */
  livingPendants: '1615971677499-5467cbab01c0',
  /** Bathroom with a freestanding tub */
  bathTub: '1600566752355-35792bedcfea',
  /** Shower enclosure, glass and tile */
  shower: '1584622650111-993a426fbf0a',
  /** Bathroom vanity and mirror */
  vanity: '1513694203232-719a280e022f',
  /** Black basin on a timber vanity */
  basin: '1604709177225-055f99402ea3',
  /** White kitchen with open shelving */
  kitchenWhite: '1556909212-d5b604d0c90d',
  /** Twin basins beside a tub */
  sanitaryware: '1620626011761-996317b8d101',
  /** Kitchen with pendant lighting and a hob */
  kitchenPendants: '1541123437800-1bb1317badc2',
  /** Hallway floor, wide timber boards */
  flooring: '1581858726788-75bc0f6a952d',
  /** Bright living room */
  living: '1631679706909-1844bbd07221',
  /** Bed with layered cushions */
  furnishing: '1616627561950-9f746e330187',
  /** Wall-mounted shelving unit */
  storage: '1595428774223-ef52624120d2',
  /** Ceramic vessels, close up */
  decor: '1610701596007-11502861dcfa',
  /** Kitchen island with stools */
  kitchenIsland: '1600607686527-6fb886090705',
  /** Upholstered sofa, strong colour */
  furniture: '1567016432779-094069958ea5',
  /** Open shelving against a wall */
  shelving: '1594026112284-02bb6f3352fe',
  /** Living room with a fireplace */
  livingWide: '1560448204-e02f11c3d0e2',
  /** Dining and living, natural light */
  dining: '1522708323590-d24dbb6b0267',
} as const
