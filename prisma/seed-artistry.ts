/**
 * Artistry postings — §5.2.5.
 *
 *   pnpm db:artistry
 *
 * Artistry lives in the shared `Post` table as type `ARTISTRY`. Everything the
 * design shows that has no column of its own — the gallery, the two
 * specification columns, the artist card, the comment list — goes into
 * `Post.meta`. `src/lib/artistry.ts` holds the shape and the parser that reads
 * it back.
 *
 * ⚠️ Photographs are seeded as bare Unsplash ids, not finished URLs. The detail
 *    page renders the same photograph at five different sizes, so the size is
 *    chosen at the call site by `photoSrc()`.
 *
 * Re-running is safe: every row is upserted by its natural key.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { HERITAGE_PHOTOS, PERSON_PHOTOS, PROJECT_PHOTOS, ARTICLE_PHOTOS } from '../src/config/content-media'
import { unsplash } from '../src/config/club-media'

const prisma = new PrismaClient()

const on = (y: number, m: number, d: number, hour = 10) => new Date(y, m - 1, d, hour, 0, 0, 0)

// ═══════════════════════════════════════════════════════════
//  Artists — real User rows with a ProfessionalProfile, so the
//  artist card and its verified tick are reading actual data
// ═══════════════════════════════════════════════════════════

const ARTISTS = [
  {
    key: 'rajeev',
    name: 'Ar. Rajeev Sharma',
    shortName: 'Ar. Rajeev S.',
    email: 'rajeev.sharma@artists.archfacing.com',
    role: 'Heritage Conservation Expert',
    /** the heading of the sidebar card — "Artist / Conservation Architect" */
    cardLabel: 'Conservation Architect',
    firm: 'Sharma Heritage Conservation',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    photo: '',
    location: 'Jaipur, Rajasthan, India',
    bio: 'Specialized in restoration and conservation of heritage buildings across India. Passionate about preserving architectural legacy and promoting sustainable heritage conservation.',
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '',
    followers: '',
    successRate: '',
  },
  {
    key: 'studio',
    name: 'Heritage Studio',
    shortName: 'Heritage Studio',
    email: 'studio@artists.archfacing.com',
    role: 'Conservation Practice',
    cardLabel: 'Conservation Practice',
    firm: 'Heritage Studio',
    city: 'Jodhpur',
    state: 'Rajasthan',
    pincode: '342001',
    photo: '',
    location: 'Jodhpur, Rajasthan, India',
    bio: 'A conservation practice working on forts, stepwells and havelis across western Rajasthan.',
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '',
    followers: '',
    successRate: '',
  },
  {
    key: 'meera',
    name: 'Ar. Meera Iyer',
    shortName: 'Ar. Meera I.',
    email: 'meera.iyer@artists.archfacing.com',
    role: 'Environmental Artist',
    cardLabel: 'Environmental Artist',
    firm: 'Riverline Studio',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '221001',
    photo: '',
    location: 'Varanasi, Uttar Pradesh, India',
    bio: 'Works at the meeting point of ecology and public space, with a long-running study of India’s river edges.',
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '',
    followers: '',
    successRate: '',
  },
  {
    key: 'kunal',
    name: 'Ar. Kunal Desai',
    shortName: 'Ar. Kunal D.',
    email: 'kunal.desai@artists.archfacing.com',
    role: 'Water Architecture Specialist',
    cardLabel: 'Water Architect',
    firm: 'Desai & Associates',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    photo: '',
    location: 'Ahmedabad, Gujarat, India',
    bio: 'Studies stepwells, tanks and traditional water systems, and adapts them for contemporary sites.',
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '',
    followers: '',
    successRate: '',
  },
  {
    key: 'sonal',
    name: 'Sonal Patil',
    shortName: 'Sonal P.',
    email: 'sonal.patil@artists.archfacing.com',
    role: 'Mural Artist',
    cardLabel: 'Mural Artist',
    firm: 'Patil Mural Works',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    photo: '',
    location: 'Mumbai, Maharashtra, India',
    bio: 'Paints large-format murals rooted in Warli and Pithora traditions for public and residential walls.',
    rating: 0,
    reviews: 0,
    recommend: 0,
    projects: '',
    followers: '',
    successRate: '',
  },
] as const

type ArtistKey = (typeof ARTISTS)[number]['key']

// ═══════════════════════════════════════════════════════════
//  The reference artwork
// ═══════════════════════════════════════════════════════════

/**
 * Fifteen gallery frames, cycling the six heritage photographs.
 *
 * ⚠️ The design shows fifteen distinct photographs of one building. Six exist,
 *    so they repeat — the counter reads "1 / 15" and the rail shows four plus
 *    a "+12 More" tile exactly as drawn. Replace this array with the real
 *    photo set when it arrives; nothing else has to change.
 */
const HERITAGE_CYCLE = [
  HERITAGE_PHOTOS.haveli,
  HERITAGE_PHOTOS.tajArch,
  HERITAGE_PHOTOS.domes,
  HERITAGE_PHOTOS.tajAxis,
  HERITAGE_PHOTOS.indiaGate,
  HERITAGE_PHOTOS.backwaters,
]

const HAVELI_GALLERY = Array.from({ length: 10 }, (_, i) => HERITAGE_CYCLE[i % HERITAGE_CYCLE.length])

const HAVELI_ABOUT = [
  'The Timeless Haveli stands in the old quarter of Jaipur as one of Rajasthan’s finest surviving examples of nineteenth-century domestic architecture. Built in 1896 around a central courtyard, the house was planned so that every room drew light and air from the open heart of the plan — a passive cooling strategy that still holds the interiors several degrees below the street outside.',
  'The restoration began with a full condition survey of the sandstone façade. Handcrafted stonework had weathered unevenly over a century, and more than four hundred individual blocks were re-dressed by masons working with the same chisels and the same Karauli sandstone the original builders used. Cement repairs added in the 1970s were removed entirely and replaced with lime plaster, which lets the wall breathe as it was built to.',
  'The jharokhas — the projecting balconies that give the elevation its rhythm — were the most delicate part of the work. Every carved column, bracket and perforated screen was numbered, taken down, consolidated and refitted in its original position. Where a member was beyond saving, the replacement was carved by hand from matching stone and left slightly under-detailed, so that a later reader of the building can always tell new work from old.',
  'Teak doors, lime-washed interiors and the marble inlay of the courtyard floor were conserved under the same principle: minimum intervention, maximum reversibility. The house reopened in April 2023 after fourteen months of work and is now open for public visits, with the upper floors returned to family use — a heritage property that earns its keep rather than one preserved behind glass.',
]

/*
 * No seeded comments.
 *
 * This was twelve invented architects and engineers — names, job titles, like
 * counts and stock portraits of real strangers — writing praise for a project
 * they never saw. The page's own `visible.length > 0` branch prints "No
 * comments yet", which is the truth. Real comments arrive through the
 * composer.
 */
const HAVELI_COMMENTS: { name: string; role: string; date: string; likes: number; photo: string; body: string }[] = []

const HAVELI_SPECS_LEFT = [
  { label: 'Medium', value: 'Heritage Architecture' },
  { label: 'Material', value: 'Sandstone, Marble, Teak Wood, Lime Plaster' },
  { label: 'Height', value: '42 ft (12.8 m)' },
  { label: 'Width', value: '78 ft (23.7 m)' },
  { label: 'Depth', value: '64 ft (19.5 m)' },
  { label: 'Weight', value: 'Approx. 450 Tons' },
  { label: 'Year', value: 'Originally Built – 1896' },
  { label: 'Type', value: 'Heritage Building' },
]

const HAVELI_SPECS_RIGHT = [
  { label: 'Climate', value: 'All Weather' },
  { label: 'Maintenance', value: 'Periodic Conservation' },
  { label: 'Eco Friendly', value: 'Yes' },
  { label: 'Water System', value: 'Traditional Rainwater Harvesting' },
  { label: 'Lighting', value: 'Heritage Architectural Lighting' },
  { label: 'Heritage Grade', value: 'Grade I Heritage Property' },
  { label: 'Accessibility', value: 'Open for Public Visits' },
]

const HAVELI_PROJECT_INFO = [
  { icon: 'clock', label: 'Construction Period', value: 'Late 19th Century' },
  { icon: 'check', label: 'Conservation Completed', value: 'April 2023' },
  { icon: 'shield', label: 'Restoration Status', value: 'Fully Restored' },
  { icon: 'chart', label: 'Project Duration', value: '14 Months' },
]

// ═══════════════════════════════════════════════════════════
//  Every artwork
// ═══════════════════════════════════════════════════════════

type Seed = {
  slug: string
  title: string
  subtitle: string
  artist: ArtistKey
  category: string
  categoryLabel: string
  sub: string
  subLabel: string
  city: string
  state: string
  location: string
  artworkId: string
  medium: string
  projectStatus: string
  year: number
  publishedAt: Date
  lastUpdated: string
  addedOn: string
  badges: string[]
  image: string
  gallery?: string[]
  description: string
  about: string[]
  specsLeft?: { label: string; value: string }[]
  specsRight?: { label: string; value: string }[]
  tags: string[]
  projectInfo?: { icon: string; label: string; value: string }[]
  /** Overrides the artist's own rating for this posting — the design gives each similar artwork its own. */
  rating?: number
  reviews?: number
}

const ARTWORKS: Seed[] = [
  // ─────────── the reference artwork ───────────
  {
    slug: 'the-timeless-haveli',
    title: 'The Timeless Haveli',
    subtitle: 'Preserving India’s Architectural Heritage',
    artist: 'rajeev',
    category: 'heritage',
    categoryLabel: 'Heritage',
    sub: 'heritage-buildings',
    subLabel: 'Heritage Building',
    city: 'Jaipur',
    state: 'Rajasthan',
    location: 'Jaipur, Rajasthan, India',
    artworkId: '#AFH1256',
    medium: 'Heritage Architecture',
    projectStatus: 'Restored',
    year: 1896,
    publishedAt: on(2025, 5, 10, 12),
    lastUpdated: '10 May 2025',
    addedOn: '10 May 2025',
    badges: ['Heritage', 'Featured'],
    image: HERITAGE_PHOTOS.haveli,
    gallery: HAVELI_GALLERY,
    description:
      'A nineteenth-century Jaipur courtyard house returned to use after fourteen months of hand restoration — sandstone façade, carved jharokhas and lime plaster throughout.',
    about: HAVELI_ABOUT,
    specsLeft: HAVELI_SPECS_LEFT,
    specsRight: HAVELI_SPECS_RIGHT,
    tags: ['Heritage', 'HeritageBuildings', 'HeritageArchitecture', 'Restoration', 'IndianHeritage'],
    projectInfo: HAVELI_PROJECT_INFO,
  },

  // ─────────── the three "Similar Artworks" ───────────
  {
    slug: 'city-palace-restoration',
    title: 'City Palace Restoration',
    subtitle: 'Courtyards, Gateways and Painted Ceilings',
    artist: 'rajeev',
    category: 'heritage',
    categoryLabel: 'Heritage',
    sub: 'heritage-buildings',
    subLabel: 'Heritage Building',
    city: 'Jaipur',
    state: 'Rajasthan',
    location: 'Jaipur, Rajasthan, India',
    artworkId: '#AFH1188',
    medium: 'Heritage Architecture',
    projectStatus: 'Restored',
    year: 1727,
    publishedAt: on(2025, 4, 22),
    lastUpdated: '22 Apr 2025',
    addedOn: '22 Apr 2025',
    badges: ['Heritage'],
    image: HERITAGE_PHOTOS.domes,
    description:
      'Conservation of the outer courtyards and painted ceilings of the City Palace complex, carried out while the museum stayed open to visitors.',
    about: [
      'The work covered the two outer courtyards, four gateways and roughly nine hundred square metres of painted ceiling. Every intervention was staged around the museum calendar, so the complex never closed to visitors during the fourteen-week programme.',
      'Lime plaster was re-run to the original profiles and the ceiling paintings were cleaned with a conservation-grade gel rather than solvent, which leaves the original binder intact.',
    ],
    tags: ['Heritage', 'HeritageBuildings', 'Restoration', 'Jaipur'],
    rating: 0,
    reviews: 0,
  },
  {
    slug: 'mehrangarh-fort-conservation',
    title: 'Mehrangarh Fort Conservation',
    subtitle: 'Stabilising a Rock-Cut Rampart',
    artist: 'studio',
    category: 'heritage',
    categoryLabel: 'Heritage',
    sub: 'heritage-buildings',
    subLabel: 'Heritage Building',
    city: 'Jodhpur',
    state: 'Rajasthan',
    location: 'Jodhpur, Rajasthan, India',
    artworkId: '#AFH1142',
    medium: 'Heritage Architecture',
    projectStatus: 'Ongoing',
    year: 1459,
    publishedAt: on(2025, 4, 8),
    lastUpdated: '08 Apr 2025',
    addedOn: '08 Apr 2025',
    badges: ['Heritage'],
    image: HERITAGE_PHOTOS.tajArch,
    description:
      'Structural stabilisation of the eastern rampart where the fort wall meets the living rock, using stainless anchors and lime grout.',
    about: [
      'The eastern rampart sits directly on the rock the fort was cut from, and a century of water ingress had opened the joint between the two. The repair uses stainless steel anchors set in lime grout, chosen because it stays weaker than the surrounding stone and will fail before the historic fabric does.',
      'Work continues on the upper bastions and is expected to run through the next two dry seasons.',
    ],
    tags: ['Heritage', 'HeritageBuildings', 'Conservation', 'Jodhpur'],
    rating: 0,
    reviews: 0,
  },
  {
    slug: 'hawa-mahal-preservation',
    title: 'Hawa Mahal Preservation',
    subtitle: 'Nine Hundred and Fifty Screens',
    artist: 'rajeev',
    category: 'heritage',
    categoryLabel: 'Heritage',
    sub: 'heritage-buildings',
    subLabel: 'Heritage Building',
    city: 'Jaipur',
    state: 'Rajasthan',
    location: 'Jaipur, Rajasthan, India',
    artworkId: '#AFH1097',
    medium: 'Heritage Architecture',
    projectStatus: 'Restored',
    year: 1799,
    publishedAt: on(2025, 3, 26),
    lastUpdated: '26 Mar 2025',
    addedOn: '26 Mar 2025',
    badges: ['Heritage', 'Featured'],
    image: HERITAGE_PHOTOS.haveli,
    description:
      'Cleaning and consolidation of the pink sandstone jharokha screens on the principal façade, screen by screen.',
    about: [
      'The façade carries nine hundred and fifty three perforated screens, and every one was surveyed, cleaned and consolidated individually. Fewer than forty needed replacement stone.',
      'The pink lime wash was re-made from the original recipe after pigment analysis, which turned out to be closer to a terracotta than the colour the building had been repainted in during the 1980s.',
    ],
    tags: ['Heritage', 'HeritageBuildings', 'Restoration', 'IndianHeritage'],
    rating: 0,
    reviews: 0,
  },

  // ─────────── the other Artistry groups, so the listing is not bare ───────────
  {
    slug: 'ganga-riverfront-revival',
    title: 'Ganga Riverfront Revival',
    subtitle: 'Returning a Ghat Edge to the City',
    artist: 'meera',
    category: 'environments',
    categoryLabel: 'Environments',
    sub: 'rivers',
    subLabel: 'Rivers',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    location: 'Varanasi, Uttar Pradesh, India',
    artworkId: '#AFE2041',
    medium: 'Environmental Art',
    projectStatus: 'Completed',
    year: 2024,
    publishedAt: on(2025, 3, 14),
    lastUpdated: '14 Mar 2025',
    addedOn: '14 Mar 2025',
    badges: ['Environments'],
    image: HERITAGE_PHOTOS.backwaters,
    description:
      'A four-hundred-metre stretch of ghat edge cleared, re-paved in local stone and planted with species that hold the bank through monsoon.',
    about: [
      'Four hundred metres of the river edge were cleared of encroachment and re-paved in Chunar sandstone laid dry, so the surface drains straight back to the river rather than pooling on the steps.',
      'Planting along the upper bank uses species that hold the soil through monsoon flood, chosen with the botanical survey rather than for appearance.',
    ],
    tags: ['Environments', 'Rivers', 'PublicSpace', 'Varanasi'],
  },
  {
    slug: 'the-stepwell-water-court',
    title: 'The Stepwell Water Court',
    subtitle: 'An Old Water System, Read Again',
    artist: 'kunal',
    category: 'design-integration',
    categoryLabel: 'Design Integration',
    sub: 'with-water',
    subLabel: 'With Water',
    city: 'Ahmedabad',
    state: 'Gujarat',
    location: 'Ahmedabad, Gujarat, India',
    artworkId: '#AFD3117',
    medium: 'Water Architecture',
    projectStatus: 'Completed',
    year: 2023,
    publishedAt: on(2025, 2, 27),
    lastUpdated: '27 Feb 2025',
    addedOn: '27 Feb 2025',
    badges: ['Design Integration'],
    image: PROJECT_PHOTOS.courtyardHouse,
    description:
      'A stepped water court for a campus courtyard, working the way an Adalaj stepwell does — cooling the air as it descends.',
    about: [
      'The court steps down five metres over four flights, and the air above the water sits four to six degrees below the courtyard at the top. The section is taken almost directly from the stepwells at Adalaj and Rudabai.',
      'Rainwater from the surrounding roofs is the only supply. In a dry year the lowest flight stays empty, which is the honest behaviour of the type and was accepted rather than designed out.',
    ],
    tags: ['DesignIntegration', 'WithWater', 'Stepwell', 'PassiveCooling'],
  },
  {
    slug: 'warli-mural-courtyard',
    title: 'Warli Mural Courtyard',
    subtitle: 'Eleven Metres of Painted Wall',
    artist: 'sonal',
    category: 'arts',
    categoryLabel: 'Arts',
    sub: 'murals',
    subLabel: 'Murals',
    city: 'Mumbai',
    state: 'Maharashtra',
    location: 'Mumbai, Maharashtra, India',
    artworkId: '#AFA4208',
    medium: 'Mural Painting',
    projectStatus: 'Completed',
    year: 2024,
    publishedAt: on(2025, 2, 11),
    lastUpdated: '11 Feb 2025',
    addedOn: '11 Feb 2025',
    badges: ['Arts'],
    image: ARTICLE_PHOTOS.materials,
    description:
      'An eleven-metre Warli mural painted in rice paste on a cow-dung and mud ground, in the courtyard of a Mumbai housing society.',
    about: [
      'The mural is painted in rice paste on a ground of mud and cow dung, exactly as a Warli wall is made in Palghar. It was laid up over nine days with two painters from the tradition working alongside the studio.',
      'The society was asked to accept that the surface will weather and be repainted rather than sealed. That cycle is part of the form.',
    ],
    tags: ['Arts', 'Murals', 'WarliArt', 'IndianCulture'],
  },
  {
    slug: 'mandap-pavilion-craft',
    title: 'Mandap Pavilion Craft',
    subtitle: 'A Ceremony Structure Built to Be Taken Apart',
    artist: 'sonal',
    category: 'indian-culture',
    categoryLabel: 'Indian Culture',
    sub: 'ceremonies',
    subLabel: 'Ceremonies',
    city: 'Udaipur',
    state: 'Rajasthan',
    location: 'Udaipur, Rajasthan, India',
    artworkId: '#AFC5063',
    medium: 'Craft & Textile',
    projectStatus: 'Completed',
    year: 2024,
    publishedAt: on(2025, 1, 29),
    lastUpdated: '29 Jan 2025',
    addedOn: '29 Jan 2025',
    badges: ['Indian Culture'],
    image: HERITAGE_PHOTOS.indiaGate,
    description:
      'A demountable mandap in teak and block-printed cotton, designed to be re-erected rather than discarded after one ceremony.',
    about: [
      'The frame is teak with brass collars and no fixings that need a tool, so four people can put it up in an afternoon. The canopy is block-printed cotton from Bagru, cut so that a damaged panel can be replaced on its own.',
      'It has been erected eleven times since it was made, which was the point — the ordinary version of this structure is thrown away after a single day.',
    ],
    tags: ['IndianCulture', 'Ceremonies', 'Craft', 'BlockPrint'],
  },
  {
    slug: 'kailasa-rock-temple-study',
    title: 'Kailasa Rock Temple Study',
    subtitle: 'Measuring a Building Carved Downwards',
    artist: 'studio',
    category: 'heritage',
    categoryLabel: 'Heritage',
    sub: 'lord-shiva',
    subLabel: 'Lord Shiva',
    city: 'Aurangabad',
    state: 'Maharashtra',
    location: 'Ellora, Aurangabad, Maharashtra, India',
    artworkId: '#AFH1024',
    medium: 'Documentation & Survey',
    projectStatus: 'Documented',
    year: 760,
    publishedAt: on(2025, 1, 15),
    lastUpdated: '15 Jan 2025',
    addedOn: '15 Jan 2025',
    badges: ['Heritage'],
    image: HERITAGE_PHOTOS.tajAxis,
    description:
      'A measured survey of Cave 16 at Ellora — a temple cut downwards out of a single rock face — recorded to conservation standard.',
    about: [
      'Cave 16 was cut downwards from the top of the rock in the eighth century, with no possibility of correcting a mistake. The survey records the whole monolith to conservation standard, including the shikhara and the flanking elephants.',
      'The drawings are lodged with the state archaeology department and are available to researchers on request.',
    ],
    tags: ['Heritage', 'LordShiva', 'Ellora', 'Documentation'],
  },
]

// ═══════════════════════════════════════════════════════════
//  Seed
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('\n── Artists ──')

  const artistIds: Record<string, string> = {}

  for (const a of ARTISTS) {
    // No stock portrait — an empty id must not become an 'images.unsplash.com/photo-?' URL.
    const photo = a.photo ? unsplash(a.photo, { w: 200, h: 200 }) : null

    const user = await prisma.user.upsert({
      where: { email: a.email },
      create: {
        email: a.email, name: a.name, role: 'PROFESSIONAL', status: 'ACTIVE',
        emailVerified: new Date(), profilePhoto: photo,
        city: a.city, state: a.state, pincode: a.pincode,
      },
      update: { name: a.name, profilePhoto: photo, city: a.city, state: a.state },
    })

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, designaType: 'DESIGNA', tier: 'PROFESSIONAL',
        firmName: a.firm, bio: a.bio, isVerified: true,
        verifiedAt: new Date(), categories: [],
      },
      update: { firmName: a.firm, bio: a.bio, isVerified: true, verifiedAt: new Date() },
    })

    artistIds[a.key] = user.id
    console.log(`  ✓ ${a.name.padEnd(20)} ${a.role}`)
  }

  console.log('\n── Artworks ──')

  for (const art of ARTWORKS) {
    const artist = ARTISTS.find((a) => a.key === art.artist)!

    const meta = {
      kind: 'artistry',
      subtitle: art.subtitle,
      location: art.location,
      artworkId: art.artworkId,
      medium: art.medium,
      projectStatus: art.projectStatus,
      lastUpdated: art.lastUpdated,
      addedOn: art.addedOn,
      categoryLabel: art.categoryLabel,
      subCategoryLabel: art.subLabel,
      badges: art.badges,
      image: art.image,
      gallery: art.gallery ?? [art.image],
      about: art.about,
      specsLeft: art.specsLeft ?? [],
      specsRight: art.specsRight ?? [],
      tags: art.tags,
      projectInfo: art.projectInfo ?? [],
      // stats are counted live (lib/artistry.ts withRealStats) — never seeded
      artist: {
        name: artist.name,
        shortName: artist.shortName,
        role: artist.role,
        cardLabel: artist.cardLabel,
        bio: artist.bio,
        photo: artist.photo,
        location: artist.location,
        // A posting carries its own rating where the design gives it one;
        // otherwise it inherits the artist's overall figure.
        rating: art.rating ?? artist.rating,
        reviews: art.reviews ?? artist.reviews,
        recommend: artist.recommend,
        projects: artist.projects,
        followers: artist.followers,
        successRate: artist.successRate,
        verified: true,
      },
      comments: art.slug === 'the-timeless-haveli' ? HAVELI_COMMENTS : [],
    }

    const data = {
      status: 'PUBLISHED' as const,
      authorId: artistIds[art.artist],
      title: art.title,
      description: art.description,
      category: art.category,
      subCategory: art.sub,
      city: art.city,
      state: art.state,
      year: art.year,
      publishedAt: art.publishedAt,
      viewCount: 0, // counts real visits only
      meta: meta as Prisma.InputJsonValue,
    }

    await prisma.post.upsert({
      where: { slug: art.slug },
      create: { ...data, type: 'ARTISTRY', slug: art.slug },
      update: { ...data, type: 'ARTISTRY' },
    })

    console.log(
      `  ✓ ${art.categoryLabel.padEnd(20)} ${art.title.slice(0, 34).padEnd(36)} ` +
        `${String(meta.gallery.length).padStart(2)} img · ${String(meta.comments.length).padStart(2)} comments`
    )
  }

  const galleryTotal = ARTWORKS.reduce((n, a) => n + (a.gallery ?? [a.image]).length, 0)

  console.log(
    `\n${ARTISTS.length} artists · ${ARTWORKS.length} artworks · ` +
      `${galleryTotal} gallery images · ${HAVELI_COMMENTS.length} comments\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
