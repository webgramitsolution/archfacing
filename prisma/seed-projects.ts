/**
 * Projects — §5.2.2.
 *
 *   pnpm db:projects
 *
 * Seeds the thirteen projects the two design comps show, plus one architect
 * User per firm with a verified ProfessionalProfile behind it, so a card's
 * byline and a detail page's seller card both point at a real row.
 *
 * Everything specific to a project — the tags, the badge, likes and comments,
 * the gallery, the key features, the seller card and the testimonials — goes
 * into `Post.meta`. `src/lib/projects.ts` holds the shape and the parser that
 * reads it back defensively.
 *
 * ⚠️ This is demonstration content. The firm names, view/like/comment counts,
 *    ratings, review totals, budgets and testimonials all come from the design
 *    comps — none of it is real business data, and the named firms have not
 *    endorsed anything. Replace it before the site goes anywhere near
 *    production.
 *
 * Re-running is safe: every row is an upsert keyed on slug or email.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { PROJECT_PHOTOS, PERSON_PHOTOS } from '../src/config/content-media'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
//  Photography
// ═══════════════════════════════════════════════════════════

type PhotoKey = keyof typeof PROJECT_PHOTOS

/** The order the gallery walks, so every project gets ten distinct pictures. */
const PHOTO_ORDER: PhotoKey[] = [
  'villa', 'modernHouse', 'courtyardHouse', 'bedroom', 'kitchen', 'resort',
  'rooftopPool', 'poolVilla', 'beachResort', 'deck', 'cityScale', 'lobby',
  'retreat', 'gardenHouse',
]

/**
 * ⚠️ Pictures are stored as bare Unsplash photo ids, NOT as finished URLs.
 *    The same photograph appears as a 4:3 card, a 16:9 hero and a full-size
 *    view, so the crop and the width have to be decided at render time —
 *    `photoSrc()` in components/projects.tsx does that. Baking a URL in here
 *    would pin every slot to one size and stretch the hero.
 */
const cover = (k: PhotoKey) => PROJECT_PHOTOS[k]

/** Ten gallery photo ids, starting from the project's own cover and wrapping. */
function galleryFor(k: PhotoKey): string[] {
  const start = PHOTO_ORDER.indexOf(k)
  return Array.from({ length: 10 }, (_, i) =>
    PROJECT_PHOTOS[PHOTO_ORDER[(start + i) % PHOTO_ORDER.length]]
  )
}

// ═══════════════════════════════════════════════════════════
//  Key features — eight per project, by project type
// ═══════════════════════════════════════════════════════════

/** The eight from the reference detail comp. */
const RESIDENTIAL_FEATURES = [
  { icon: 'sofa', label: 'Spacious Living Area' },
  { icon: 'window', label: 'Floor to Ceiling Windows' },
  { icon: 'pool', label: 'Private Swimming Pool' },
  { icon: 'kitchen', label: 'Modern Modular Kitchen' },
  { icon: 'sparkle', label: 'Premium Interior Finishes' },
  { icon: 'tree', label: 'Landscaped Garden' },
  { icon: 'smart', label: 'Smart Home Integration' },
  { icon: 'leaf', label: 'Sustainable Design' },
]

const INTERIOR_FEATURES = [
  { icon: 'sofa', label: 'Bespoke Loose Furniture' },
  { icon: 'window', label: 'Daylight-led Planning' },
  { icon: 'kitchen', label: 'Modular Kitchen & Storage' },
  { icon: 'sparkle', label: 'Premium Surface Finishes' },
  { icon: 'smart', label: 'Integrated Lighting Control' },
  { icon: 'area', label: 'Optimised Space Planning' },
  { icon: 'leaf', label: 'Low-VOC Materials' },
  { icon: 'shieldCheck', label: 'Acoustic Treatment' },
]

const COMMERCIAL_FEATURES = [
  { icon: 'briefcase', label: 'Flexible Workstations' },
  { icon: 'window', label: 'Glazed Perimeter Façade' },
  { icon: 'users', label: 'Collaboration Zones' },
  { icon: 'smart', label: 'Building Management System' },
  { icon: 'leaf', label: 'IGBC Gold Rated' },
  { icon: 'area', label: 'Column-free Floor Plates' },
  { icon: 'shieldCheck', label: 'Access Controlled Entry' },
  { icon: 'boxCheck', label: 'Basement Parking' },
]

const LANDSCAPE_FEATURES = [
  { icon: 'tree', label: 'Native Plant Palette' },
  { icon: 'pool', label: 'Water Body & Fountains' },
  { icon: 'area', label: 'Walking & Cycling Loop' },
  { icon: 'users', label: 'Community Gathering Lawn' },
  { icon: 'leaf', label: 'Rainwater Harvesting' },
  { icon: 'sparkle', label: 'Landscape Lighting' },
  { icon: 'shieldCheck', label: 'Universal Accessibility' },
  { icon: 'smart', label: 'Drip Irrigation Control' },
]

const HOSPITALITY_FEATURES = [
  { icon: 'hotel', label: 'Signature Arrival Lobby' },
  { icon: 'pool', label: 'Infinity Edge Pool' },
  { icon: 'kitchen', label: 'Show Kitchen & Bar' },
  { icon: 'sofa', label: 'All-day Dining Lounge' },
  { icon: 'window', label: 'Sea-facing Guest Rooms' },
  { icon: 'sparkle', label: 'Spa & Wellness Suite' },
  { icon: 'leaf', label: 'Locally Sourced Materials' },
  { icon: 'smart', label: 'In-room Automation' },
]

const INSTITUTIONAL_FEATURES = [
  { icon: 'school', label: 'Flexible Learning Studios' },
  { icon: 'users', label: 'Central Amphitheatre' },
  { icon: 'window', label: 'North-lit Classrooms' },
  { icon: 'tree', label: 'Shaded Courtyards' },
  { icon: 'area', label: 'Barrier-free Circulation' },
  { icon: 'leaf', label: 'Passive Cooling Strategy' },
  { icon: 'smart', label: 'Smart Campus Network' },
  { icon: 'shieldCheck', label: 'Fire & Life Safety' },
]

const INDUSTRIAL_FEATURES = [
  { icon: 'factory', label: 'Clear-span Production Hall' },
  { icon: 'truck', label: 'Segregated Logistics Yard' },
  { icon: 'window', label: 'North-light Roof Glazing' },
  { icon: 'boxCheck', label: 'Automated Warehousing' },
  { icon: 'shieldCheck', label: 'Fire Compartmentation' },
  { icon: 'leaf', label: 'Rooftop Solar Array' },
  { icon: 'smart', label: 'SCADA Monitoring' },
  { icon: 'area', label: 'Expandable Bay Grid' },
]

const FEATURE_SETS: Record<string, { icon: string; label: string }[]> = {
  Residential: RESIDENTIAL_FEATURES,
  Interior: INTERIOR_FEATURES,
  Commercial: COMMERCIAL_FEATURES,
  Landscape: LANDSCAPE_FEATURES,
  Hospitality: HOSPITALITY_FEATURES,
  Institutional: INSTITUTIONAL_FEATURES,
  Industrial: INDUSTRIAL_FEATURES,
}

// ═══════════════════════════════════════════════════════════
//  Firms — one User + verified ProfessionalProfile each
// ═══════════════════════════════════════════════════════════

type Firm = {
  key: string
  /** The firm name is also the User's `name`, which is what search matches on. */
  name: string
  email: string
  designa: 'DESIGNA' | 'DESIGNI'
  tagline: string
  city: string
  state: string
  pincode: string
  photo: string
  initials: string
  rating: number
  reviews: number
}

const FIRMS: Firm[] = [
  { key: 'rahul-mehta', name: 'Ar. Rahul Mehta & Associates', email: 'studio.rahulmehta@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Interior Designers', city: 'Gurugram', state: 'Haryana', pincode: '122001', photo: PERSON_PHOTOS.kunalMehta, initials: 'RM', rating: 0, reviews: 0 },
  { key: 'yamini', name: 'Studio Yamini', email: 'studio.yamini@studios.archfacing.com', designa: 'DESIGNI', tagline: 'Interior Designers', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', photo: PERSON_PHOTOS.anjaliMehta, initials: 'SY', rating: 0, reviews: 0 },
  { key: 'd-design', name: 'Dhara Design Forum', email: 'dharadesignforum@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Workplace Consultants', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', photo: PERSON_PHOTOS.neerajSharma, initials: 'DF', rating: 0, reviews: 0 },
  { key: 'greenhat', name: 'Greenhat Landscape Studio', email: 'greenhat@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Landscape Architects', city: 'Pune', state: 'Maharashtra', pincode: '411001', photo: PERSON_PHOTOS.poojaNair, initials: 'GL', rating: 0, reviews: 0 },
  { key: 'kulture', name: 'Design Kulture', email: 'designkulture@studios.archfacing.com', designa: 'DESIGNI', tagline: 'Interior & Hospitality Designers', city: 'Delhi', state: 'Delhi', pincode: '110001', photo: PERSON_PHOTOS.nehaVerma, initials: 'DK', rating: 0, reviews: 0 },
  { key: 'course', name: 'Studio Course', email: 'studiocourse@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Interior Designers', city: 'Alibaug', state: 'Maharashtra', pincode: '402201', photo: PERSON_PHOTOS.vikramPatel, initials: 'SC', rating: 0, reviews: 0 },
  { key: 'arch-studio', name: 'The Arch Studio', email: 'thearchstudio@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Interior Designers', city: 'Udaipur', state: 'Rajasthan', pincode: '313001', photo: PERSON_PHOTOS.amitSingh, initials: 'TA', rating: 0, reviews: 0 },
  { key: 'morphogenesis', name: 'Morphline Architects', email: 'morphline@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Urban Designers', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', photo: PERSON_PHOTOS.riteshKumar, initials: 'ML', rating: 0, reviews: 0 },
  { key: 'collective', name: 'Designers Collective', email: 'designerscollective@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Campus Planners', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', photo: PERSON_PHOTOS.sonalPatel, initials: 'DC', rating: 0, reviews: 0 },
  { key: 'rahul-desai', name: 'Rahul Desai Architects', email: 'rahuldesai@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Hospitality Consultants', city: 'Panaji', state: 'Goa', pincode: '403001', photo: PERSON_PHOTOS.rituSharma, initials: 'RD', rating: 0, reviews: 0 },
  { key: 'structura', name: 'Structura Consultants', email: 'structura@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Industrial Architects & Engineers', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', photo: PERSON_PHOTOS.priyaNair, initials: 'SL', rating: 0, reviews: 0 },
  { key: 'studio-1011', name: 'Studio 10.11', email: 'studio1011@studios.archfacing.com', designa: 'DESIGNI', tagline: 'Interior Designers', city: 'Chandigarh', state: 'Punjab', pincode: '160001', photo: PERSON_PHOTOS.host, initials: 'S1', rating: 0, reviews: 0 },
  { key: 'a3', name: 'Archfacing Studio A3', email: 'studioa3@studios.archfacing.com', designa: 'DESIGNA', tagline: 'Architects & Interior Designers', city: 'Mumbai', state: 'Maharashtra', pincode: '400051', photo: PERSON_PHOTOS.kunalMehta, initials: 'A3', rating: 0, reviews: 0 },
]

// ═══════════════════════════════════════════════════════════
//  The thirteen projects
// ═══════════════════════════════════════════════════════════

type Seed = {
  slug: string
  title: string
  firm: string
  city: string
  state: string
  pincode: string
  /** Taxonomy slug from src/config/taxonomy.ts §5.2.2.1 */
  category: string
  subCategory: string
  categoryLabel: string
  subCategoryLabel: string
  /** The coarse grouping the "Project Type" filter and the orange pill use. */
  projectType: keyof typeof FEATURE_SETS
  tags: string[]
  photo: PhotoKey
  year: number
  areaSqft: number
  budget: number
  views: number
  likes: number
  comments: number
  badge?: 'featured' | 'award' | 'new'
  award?: boolean
  style: string
  scope: string
  client: string
  description: string
  body: string
}

const PROJECTS: Seed[] = [
  {
    slug: 'the-urban-courtyard-residence',
    title: 'The Urban Courtyard Residence',
    firm: 'rahul-mehta', city: 'Gurugram', state: 'Haryana', pincode: '122001',
    category: 'residential', subCategory: 'villas',
    categoryLabel: 'Residential', subCategoryLabel: 'Villas', projectType: 'Residential',
    tags: ['Residential', 'Villa'], photo: 'courtyardHouse',
    year: 2024, areaSqft: 6400, budget: 42000000,
    views: 0, likes: 0, comments: 0, badge: 'featured',
    style: 'Contemporary Indian', scope: 'Architecture, Interior Design', client: 'Private',
    description: 'A four-bedroom family house planned around a shaded central courtyard that keeps every room cross-ventilated through the Gurugram summer.',
    body: 'The plan folds around a double-height courtyard, so no habitable room in the house depends on a single external wall for light. Deep reveals, a jaali screen to the west and a shallow water body at the centre carry the courtyard through the hottest months without mechanical help.',
  },
  {
    slug: 'the-minimalist-abode',
    title: 'The Minimalist Abode',
    firm: 'yamini', city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
    category: 'interior', subCategory: 'int-residential',
    categoryLabel: 'Interior', subCategoryLabel: 'Residential', projectType: 'Interior',
    tags: ['Interior', 'Residence'], photo: 'bedroom',
    year: 2024, areaSqft: 1850, budget: 9500000,
    views: 0, likes: 0, comments: 0, badge: 'award', award: true,
    style: 'Minimal Contemporary', scope: 'Interior Design, Furniture', client: 'Private',
    description: 'A restrained two-bedroom apartment interior in south Mumbai, built from a palette of three materials and very little else.',
    body: 'Everything that could be built in was built in, which left the floor clear and the apartment reading larger than its carpet area. Oak, lime plaster and blackened steel are the only three finishes in the flat.',
  },
  {
    slug: 'greenwood-corporate-office',
    title: 'Greenwood Corporate Office',
    firm: 'd-design', city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
    category: 'commercial-offices', subCategory: 'private-offices',
    categoryLabel: 'Commercial & Offices', subCategoryLabel: 'Private Offices', projectType: 'Commercial',
    tags: ['Commercial', 'Office'], photo: 'cityScale',
    year: 2023, areaSqft: 48000, budget: 310000000,
    views: 0, likes: 0, comments: 0, badge: 'featured',
    style: 'Modern Corporate', scope: 'Architecture, Interior Design, MEP Coordination', client: 'Greenwood Technologies',
    description: 'A 48,000 sq.ft. headquarters on Outer Ring Road, planned as four column-free floor plates around a planted atrium.',
    body: 'The brief asked for a building that could be re-planned every three years without touching the shell. Services drop from a central spine, the plates are column-free, and every partition is demountable.',
  },
  {
    slug: 'serenity-landscape-park',
    title: 'Serenity Landscape Park',
    firm: 'greenhat', city: 'Pune', state: 'Maharashtra', pincode: '411001',
    category: 'landscaped', subCategory: 'ls-gardens',
    categoryLabel: 'Landscaped', subCategoryLabel: 'Gardens', projectType: 'Landscape',
    tags: ['Landscape', 'Public Park'], photo: 'gardenHouse',
    year: 2023, areaSqft: 120000, budget: 68000000,
    views: 0, likes: 0, comments: 0,
    style: 'Naturalistic', scope: 'Landscape Architecture, Irrigation Design', client: 'Pune Municipal Corporation',
    description: 'A twelve-acre neighbourhood park replacing a disused quarry, planted almost entirely with species native to the Deccan plateau.',
    body: 'The quarry floor became the retention pond, and the spoil that came out of it became the mounding along the road edge. Nothing was carted off site.',
  },
  {
    slug: 'the-earthy-restaurant',
    title: 'The Earthy Restaurant',
    firm: 'kulture', city: 'Delhi', state: 'Delhi', pincode: '110001',
    category: 'interior', subCategory: 'int-hospitalities',
    categoryLabel: 'Interior', subCategoryLabel: 'Hospitalities', projectType: 'Interior',
    tags: ['Interior', 'Hospitality'], photo: 'lobby',
    year: 2025, areaSqft: 3200, budget: 21000000,
    views: 0, likes: 0, comments: 0, badge: 'new',
    style: 'Rustic Modern', scope: 'Interior Design, Lighting, Furniture', client: 'Earthy Hospitality',
    description: 'A ninety-cover restaurant in central Delhi finished in rammed earth, reclaimed teak and unglazed terracotta.',
    body: 'The rammed-earth walls were built on site from soil excavated for the basement, which set both the colour of the room and its acoustics.',
  },
  {
    slug: 'hill-view-farmhouse',
    title: 'Hill View Farmhouse',
    firm: 'course', city: 'Alibaug', state: 'Maharashtra', pincode: '402201',
    category: 'residential', subCategory: 'plotted-housing',
    categoryLabel: 'Residential', subCategoryLabel: 'Plotted Housing', projectType: 'Residential',
    tags: ['Residential', 'Farmhouse'], photo: 'retreat',
    year: 2022, areaSqft: 4800, budget: 27000000,
    views: 0, likes: 0, comments: 0,
    style: 'Contemporary Vernacular', scope: 'Architecture, Landscape', client: 'Private',
    description: 'A weekend house on a sloped mango plot outside Alibaug, set on three terraces so not one existing tree had to come down.',
    body: 'The house steps with the contour instead of cutting it, which meant three small footprints rather than one large one, and a roof you can walk across from the upper terrace.',
  },
  {
    slug: 'azure-hills-villa',
    title: 'Azure Hills Villa',
    firm: 'arch-studio', city: 'Udaipur', state: 'Rajasthan', pincode: '313001',
    category: 'residential', subCategory: 'villas',
    categoryLabel: 'Residential', subCategoryLabel: 'Villas', projectType: 'Residential',
    tags: ['Residential', 'Villa'], photo: 'poolVilla',
    year: 2024, areaSqft: 7200, budget: 58000000,
    views: 0, likes: 0, comments: 0,
    style: 'Modern Rajasthani', scope: 'Architecture, Interior Design, Landscape', client: 'Private',
    description: 'A hillside villa above Lake Pichola, built in local Kota stone with a plunge pool cantilevered over the slope.',
    body: 'Local Kota stone was cut at a yard nine kilometres away, so the villa reads as part of the ridge rather than an object placed on it.',
  },
  {
    slug: 'innovate-workspace',
    title: 'Innovate Workspace',
    firm: 'morphogenesis', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301',
    category: 'commercial-offices', subCategory: 'it-parks',
    categoryLabel: 'Commercial & Offices', subCategoryLabel: 'IT Parks', projectType: 'Commercial',
    tags: ['Commercial', 'Office'], photo: 'modernHouse',
    year: 2023, areaSqft: 32000, budget: 190000000,
    views: 0, likes: 0, comments: 0,
    style: 'Modern Corporate', scope: 'Architecture, Interior Design', client: 'Innovate Labs',
    description: 'A co-working floor plate for 400 desks, arranged so every workstation sits within nine metres of daylight.',
    body: 'The core was pushed to the south-west corner, which freed the good façades for desks and pushed the heat load onto the lift lobbies.',
  },
  {
    slug: 'knowledge-hub-campus',
    title: 'Knowledge Hub Campus',
    firm: 'collective', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001',
    category: 'education-sports', subCategory: 'universities',
    categoryLabel: 'Education & Sports', subCategoryLabel: 'Universities', projectType: 'Institutional',
    tags: ['Institutional', 'Education'], photo: 'villa',
    year: 2022, areaSqft: 210000, budget: 940000000,
    views: 0, likes: 0, comments: 0,
    style: 'Contemporary Institutional', scope: 'Master Planning, Architecture, Landscape', client: 'Knowledge Hub Trust',
    description: 'A 21-acre university campus for 4,000 students, planned as five faculty blocks around a shaded central spine.',
    body: 'The spine is the whole idea: a five-hundred-metre shaded walk that every block opens onto, which is where the campus actually happens.',
  },
  {
    slug: 'the-lakeview-hotel',
    title: 'The Lakeview Hotel',
    // The comp labels this one "Goa, Goa" rather than naming the town, so the
    // city is left as the design has it; the firm's own row says Panaji.
    firm: 'rahul-desai', city: 'Goa', state: 'Goa', pincode: '403001',
    category: 'hospitality', subCategory: 'hotels',
    categoryLabel: 'Hospitality', subCategoryLabel: 'Hotels', projectType: 'Hospitality',
    tags: ['Hospitality', 'Hotel'], photo: 'beachResort',
    year: 2024, areaSqft: 86000, budget: 620000000,
    views: 0, likes: 0, comments: 0,
    style: 'Indo-Portuguese Contemporary', scope: 'Architecture, Interior Design, Landscape', client: 'Lakeview Hospitality',
    description: 'A 96-key resort hotel on the Mandovi, arranged as low blocks so no room is more than two storeys above the water.',
    body: 'Height was traded for spread. Nothing rises above the canopy line, and the arrival is a courtyard rather than a porte-cochère.',
  },
  {
    slug: 'precision-engineering-plant',
    title: 'Precision Engineering Plant',
    firm: 'structura', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001',
    category: 'industrials-factories', subCategory: 'big-industries',
    categoryLabel: 'Industrial & Factories', subCategoryLabel: 'Big Industries', projectType: 'Industrial',
    tags: ['Industrial', 'Factory'], photo: 'cityScale',
    year: 2023, areaSqft: 165000, budget: 480000000,
    // ⚠️ PROJECT_PHOTOS has no industrial subject in it, so this reuses the
    //    aerial cityscape. It is the least wrong of the fourteen; a real
    //    factory photograph should replace it before launch.
    views: 0, likes: 0, comments: 0,
    style: 'Functional Industrial', scope: 'Architecture, Structural Design, Services', client: 'Precision Engineering Ltd.',
    description: 'A 165,000 sq.ft. component plant with a clear-span production hall, north-light roof glazing and a segregated logistics yard.',
    body: 'A 36-metre clear span keeps the production line free of columns, and the north-light roof means the hall runs on daylight for most of the working day.',
  },
  {
    slug: 'warm-woods-residence',
    title: 'Warm Woods Residence',
    firm: 'studio-1011', city: 'Chandigarh', state: 'Punjab', pincode: '160001',
    category: 'interior', subCategory: 'int-residential',
    categoryLabel: 'Interior', subCategoryLabel: 'Residential', projectType: 'Interior',
    tags: ['Interior', 'Residence'], photo: 'kitchen',
    year: 2022, areaSqft: 2400, budget: 11000000,
    views: 0, likes: 0, comments: 0,
    style: 'Warm Modern', scope: 'Interior Design, Joinery', client: 'Private',
    description: 'A sector-house interior rebuilt around a single continuous run of ash joinery that carries from the entrance to the kitchen.',
    body: 'One material, detailed once and repeated, does the work of a dozen. The joinery run holds the shoe store, the bar, the crockery and the kitchen tall units.',
  },

  // ─── the reference detail comp ───
  {
    slug: 'modern-villa-design',
    title: 'Modern Villa Design',
    firm: 'a3', city: 'Mumbai', state: 'Maharashtra', pincode: '400051',
    category: 'residential', subCategory: 'villas',
    categoryLabel: 'Residential', subCategoryLabel: 'Villas', projectType: 'Residential',
    tags: ['Residential', 'Villa'], photo: 'villa',
    year: 2024, areaSqft: 5200, budget: 45000000,
    views: 0, likes: 0, comments: 0, badge: 'featured',
    style: 'Modern Contemporary', scope: 'Architecture, Interior Design', client: 'Private',
    description: 'A luxurious modern villa designed with a perfect blend of contemporary architecture and natural surroundings.',
    body: 'This modern villa is a perfect example of luxury, comfort, and elegance. Designed with a focus on natural light, ventilation, and open spaces, the villa offers a seamless connection between indoor and outdoor living.',
  },
]

// ═══════════════════════════════════════════════════════════

/** "5,200 Sq.ft." */
const areaLabel = (n: number) => `${n.toLocaleString('en-IN')} Sq.ft.`

/** "₹4.5 Cr" / "₹95 Lakh" — the budget as an Indian reader writes it. */
function budgetLabel(rupees: number): string {
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1).replace(/\.0$/, '')} Lakh`
  return `₹${rupees.toLocaleString('en-IN')}`
}

/**
 * Publish timestamps run backwards from today, an hour apart, so the newest
 * project in the array is the newest on the page and no two share an instant.
 */
function publishedAt(index: number): Date {
  const d = new Date()
  d.setHours(10, 0, 0, 0)
  d.setDate(d.getDate() - index * 3)
  return d
}

async function main() {
  console.log('\n── Architect firms ──')

  const firmIds: Record<string, string> = {}

  for (const f of FIRMS) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      create: {
        email: f.email, name: f.name, role: 'PROFESSIONAL', status: 'ACTIVE',
        emailVerified: new Date(), profilePhoto: null,
        city: f.city, state: f.state, pincode: f.pincode,
      },
      update: {
        name: f.name, profilePhoto: null,
        city: f.city, state: f.state, pincode: f.pincode,
      },
    })

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, designaType: f.designa, tier: 'PROFESSIONAL',
        firmName: f.name, bio: `${f.tagline} based in ${f.city}, ${f.state}.`,
        isVerified: true, verifiedAt: new Date(), categories: [],
      },
      update: { firmName: f.name, isVerified: true, verifiedAt: new Date() },
    })

    firmIds[f.key] = user.id
    console.log(`  ✓ ${f.name.padEnd(32)} ${f.city}, ${f.state}`)
  }

  console.log('\n── Projects ──')

  for (const [i, p] of PROJECTS.entries()) {
    const firm = FIRMS.find((f) => f.key === p.firm)
    if (!firm) throw new Error(`Project "${p.slug}" names an unknown firm: ${p.firm}`)

    const meta = {
      kind: 'project',
      firmName: firm.name,
      tags: p.tags,
      badge: p.badge ?? null,
      likes: p.likes,
      comments: p.comments,
      categoryLabel: p.categoryLabel,
      subCategoryLabel: p.subCategoryLabel,
      projectType: p.projectType,

      coverImage: cover(p.photo),
      gallery: galleryFor(p.photo),

      area: areaLabel(p.areaSqft),
      areaSqft: p.areaSqft,
      yearLabel: String(p.year),
      style: p.style,
      scopeOfWork: p.scope,
      client: p.client,
      architect: firm.name,

      budget: p.budget,
      budgetLabel: budgetLabel(p.budget),

      awardWinning: p.award === true || p.badge === 'award',
      verified: true,
      featured: p.badge === 'featured',

      detailBody: p.body,

      seller: {
        name: firm.name,
        tagline: firm.tagline,
        verified: true,
        rating: firm.rating,
        reviews: firm.reviews,
        // No stock portrait stands in for a real person — the card shows initials.
        photo: '',
        initials: firm.initials,
      },

      features: FEATURE_SETS[p.projectType] ?? RESIDENTIAL_FEATURES,
      // Client quotes come from real Review rows on the page, never the seed.
      testimonials: [],
    }

    const data = {
      status: 'PUBLISHED' as const,
      authorId: firmIds[p.firm],
      title: p.title,
      description: p.description,
      category: p.category,
      subCategory: p.subCategory,
      city: p.city,
      state: p.state,
      pincode: p.pincode,
      year: p.year,
      publishedAt: publishedAt(PROJECTS.length - 1 - i),
      viewCount: 0, // counts real visits only
      meta: meta as Prisma.InputJsonValue,
    }

    await prisma.post.upsert({
      where: { slug: p.slug },
      create: { ...data, type: 'PROJECT', slug: p.slug },
      update: { ...data, type: 'PROJECT' },
    })

    console.log(
      `  ✓ ${p.categoryLabel.padEnd(22)} ${p.title.slice(0, 32).padEnd(34)} ${`${p.city}, ${p.state}`.padEnd(28)} ${areaLabel(p.areaSqft)}`
    )
  }

  const total = await prisma.post.count({
    where: { type: 'PROJECT', status: 'PUBLISHED', deletedAt: null },
  })

  console.log(`\n${FIRMS.length} firms · ${PROJECTS.length} projects seeded · ${total} published projects in total\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
