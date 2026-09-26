/**
 * Products — §4.1.7.
 *
 *   pnpm db:products
 *
 * Seeds the twelve products the design comp names, plus twenty-eight more
 * spread across the rest of the taxonomy so the filters, the facets and the
 * pagination all have something real to work on. Behind them sit brand Users —
 * CORPORATE accounts for the manufacturers, BMF accounts for the members who
 * list and install locally — each with a verified profile, so a card's brand
 * line and a detail page's brand card both point at a real row.
 *
 * Everything specific to a product — the brand, the price and its unit, the
 * rating, the badge, the material, the colour/finish, the application, the
 * availability, the Original / BMF flags, the gallery and the specification
 * rows — goes into `Post.meta`. `src/lib/products.ts` holds the shape and the
 * parser that reads it back defensively.
 *
 * ⚠️ This is demonstration content. Every seller name here is FICTIONAL and
 *    deliberately so — a real company must never appear as an account it did
 *    not open. Prices, GST and PAN numbers and descriptions are invented to
 *    fill the comp; seller ratings and review counts are 0 so the storefront
 *    prints its honest "New Seller · No reviews yet" branch instead of a
 *    number nobody earned. Replace the lot with real, consenting sellers
 *    before this goes anywhere near production.
 *
 * Re-running is safe: every row is an upsert keyed on slug or email.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { PRODUCT_PHOTOS, PERSON_PHOTOS } from '../src/config/content-media'
import { unsplash } from '../src/config/club-media'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════
//  Photography
// ═══════════════════════════════════════════════════════════

type PhotoKey = keyof typeof PRODUCT_PHOTOS

/**
 * The order the gallery walks, so every product gets six distinct pictures.
 *
 * ⚠️ Read the comment above `PRODUCT_PHOTOS` in `src/config/content-media.ts`
 *    before swapping any of these. The library has no studio shot of a cement
 *    bag, a paint tin or a TMT bar, so a fair number of the products below are
 *    illustrated by the room the product ends up in rather than the product
 *    itself. Each stand-in is marked `stand-in` in the row that uses it.
 */
const PHOTO_ORDER: PhotoKey[] = [
  'livingPendants', 'bathTub', 'shower', 'vanity', 'basin', 'kitchenWhite',
  'sanitaryware', 'kitchenPendants', 'flooring', 'living', 'furnishing',
  'storage', 'decor', 'kitchenIsland', 'furniture', 'shelving', 'livingWide',
  'dining',
]

/**
 * ⚠️ Pictures are stored as bare Unsplash photo ids, NOT as finished URLs.
 *    The same photograph appears as a 4:3 card, a 16:9 hero and a full-size
 *    view, so the crop and the width have to be decided at render time —
 *    `photoSrc()` in components/projects.tsx does that. Baking a URL in here
 *    would pin every slot to one size and stretch the hero.
 */
const cover = (k: PhotoKey) => PRODUCT_PHOTOS[k]

/** Six gallery photo ids, starting from the product's own cover and wrapping. */
function galleryFor(k: PhotoKey): string[] {
  const start = PHOTO_ORDER.indexOf(k)
  return Array.from({ length: 6 }, (_, i) =>
    PRODUCT_PHOTOS[PHOTO_ORDER[(start + i) % PHOTO_ORDER.length]]
  )
}

// ═══════════════════════════════════════════════════════════
//  Brands — one User + a verified profile each
// ═══════════════════════════════════════════════════════════

type Brand = {
  key: string
  /** Also the User's `name`, which is what the free-text search matches on. */
  name: string
  email: string
  /**
   * CORPORATE = the manufacturer's own account (§4.5).
   * BMF       = a Building Material Facilitator reselling locally (§4.1.6).
   */
  kind: 'CORPORATE' | 'BMF'
  tagline: string
  city: string
  state: string
  pincode: string
  photo: string
  initials: string
  rating: number
  reviews: number
}

/**
 * ⚠️ The GST and PAN numbers written onto these profiles further down are
 *    format-valid placeholders generated from the row index. They are NOT the
 *    companies' real registrations and must never be treated as such.
 */
const BRANDS: Brand[] = [
  { key: 'terracotta', name: 'Terracotta Ceramics India', email: 'terracotta@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Tiles, marble & sanitaryware', city: 'New Delhi', state: 'Delhi', pincode: '110019', photo: '', initials: 'TC', rating: 0, reviews: 0 },
  { key: 'laminova', name: 'Laminova Surfaces', email: 'laminova@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Laminates, veneers & flooring', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', photo: '', initials: 'LX', rating: 0, reviews: 0 },
  { key: 'aquaform', name: 'Aquaform Bath Studio', email: 'aquaform@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Bath & lighting solutions', city: 'Manesar', state: 'Haryana', pincode: '122051', photo: '', initials: 'AQ', rating: 0, reviews: 0 },
  { key: 'lumenworks', name: 'Lumenworks Lighting', email: 'lumenworks@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Architectural & interior lighting', city: 'Gurugram', state: 'Haryana', pincode: '122002', photo: '', initials: 'LW', rating: 0, reviews: 0 },
  { key: 'cucina-air', name: 'Cucina Air Appliances', email: 'cucinaair@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Kitchen appliances', city: 'Pune', state: 'Maharashtra', pincode: '411057', photo: '', initials: 'CA', rating: 0, reviews: 0 },
  { key: 'fittwell', name: 'Fittwell Hardware Systems', email: 'fittwell@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Furniture fittings & modular systems', city: 'Mumbai', state: 'Maharashtra', pincode: '400059', photo: '', initials: 'FW', rating: 0, reviews: 0 },
  { key: 'bedrock', name: 'Bedrock Cement & Concrete', email: 'bedrock@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Cement & ready mix concrete', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', photo: '', initials: 'BR', rating: 0, reviews: 0 },
  { key: 'claystone', name: 'Claystone Tiles & Bathware', email: 'claystone@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Tiles & bathware', city: 'Kadi', state: 'Gujarat', pincode: '382715', photo: '', initials: 'CS', rating: 0, reviews: 0 },
  { key: 'chromaline', name: 'Chromaline Paints', email: 'chromaline@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Paints, coatings & finishes', city: 'Mumbai', state: 'Maharashtra', pincode: '400030', photo: '', initials: 'CP', rating: 0, reviews: 0 },
  { key: 'puresan', name: 'Puresan Sanitaryware', email: 'puresan@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Sanitaryware & bath fittings', city: 'Gurugram', state: 'Haryana', pincode: '122016', photo: '', initials: 'PN', rating: 0, reviews: 0 },
  { key: 'clearspan', name: 'Clearspan Windows', email: 'clearspan@brands.archfacing.com', kind: 'CORPORATE', tagline: 'uPVC & aluminium windows', city: 'New Delhi', state: 'Delhi', pincode: '110001', photo: '', initials: 'CW', rating: 0, reviews: 0 },
  { key: 'glasscraft', name: 'Glasscraft Building Systems', email: 'glasscraft@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Glass, gypsum & building solutions', city: 'Chennai', state: 'Tamil Nadu', pincode: '600032', photo: '', initials: 'GC', rating: 0, reviews: 0 },
  { key: 'voltline', name: 'Voltline Electricals', email: 'voltline@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Electricals & switchgear', city: 'Noida', state: 'Uttar Pradesh', pincode: '201304', photo: '', initials: 'VL', rating: 0, reviews: 0 },
  { key: 'ironspan', name: 'Ironspan Steel', email: 'ironspan@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Steel & reinforcement', city: 'Jamshedpur', state: 'Jharkhand', pincode: '831001', photo: '', initials: 'IR', rating: 0, reviews: 0 },
  { key: 'coolcore', name: 'Coolcore HVAC', email: 'coolcore@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Air conditioning & HVAC', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', photo: '', initials: 'CC', rating: 0, reviews: 0 },
  { key: 'woodnest', name: 'Woodnest Interiors', email: 'woodnest@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Furniture & interior solutions', city: 'Mumbai', state: 'Maharashtra', pincode: '400079', photo: '', initials: 'WN', rating: 0, reviews: 0 },
  { key: 'safehold', name: 'Safehold Security Systems', email: 'safehold@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Security & home automation', city: 'Mumbai', state: 'Maharashtra', pincode: '400079', photo: '', initials: 'SH', rating: 0, reviews: 0 },
  { key: 'timberply', name: 'Timberply Panels', email: 'timberply@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Plywood, doors & panels', city: 'Kolkata', state: 'West Bengal', pincode: '700017', photo: '', initials: 'TP', rating: 0, reviews: 0 },
  { key: 'tessella', name: 'Tessella Stone Studio', email: 'tessella@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Tiles, marble & mosaic', city: 'Thane', state: 'Maharashtra', pincode: '400604', photo: '', initials: 'MO', rating: 0, reviews: 0 },
  { key: 'brickfield', name: 'Brickfield Clay Works', email: 'brickfield@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Clay facade, roofing & blocks', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', photo: '', initials: 'BF', rating: 0, reviews: 0 },
  { key: 'aeroblock', name: 'Aeroblock Building Products', email: 'aeroblock@brands.archfacing.com', kind: 'CORPORATE', tagline: 'AAC blocks & dry-mix products', city: 'Hyderabad', state: 'Telangana', pincode: '500034', photo: '', initials: 'AE', rating: 0, reviews: 0 },
  { key: 'sealright', name: 'Sealright Waterproofing', email: 'sealright@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Waterproofing & construction chemicals', city: 'Mumbai', state: 'Maharashtra', pincode: '400013', photo: '', initials: 'SR', rating: 0, reviews: 0 },
  { key: 'draperie', name: 'Draperie Furnishings', email: 'draperie@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Furnishing fabrics & curtains', city: 'Mumbai', state: 'Maharashtra', pincode: '400604', photo: '', initials: 'DR', rating: 0, reviews: 0 },
  { key: 'vertirise', name: 'Vertirise Elevators', email: 'vertirise@brands.archfacing.com', kind: 'CORPORATE', tagline: 'Elevators & escalators', city: 'Chennai', state: 'Tamil Nadu', pincode: '600096', photo: '', initials: 'VR', rating: 0, reviews: 0 },

  // ─── BMF members — they list and install, they do not manufacture ───
  { key: 'delite', name: 'Delite Interiors', email: 'delite@brands.archfacing.com', kind: 'BMF', tagline: 'Interior materials & turnkey fit-outs', city: 'New Delhi', state: 'Delhi', pincode: '110024', photo: '', initials: 'DI', rating: 0, reviews: 0 },
  { key: 'studio-course', name: 'Studio Course Materials', email: 'studiocoursematerials@brands.archfacing.com', kind: 'BMF', tagline: 'Coastal build & finish specialists', city: 'Alibaug', state: 'Maharashtra', pincode: '402201', photo: '', initials: 'SM', rating: 0, reviews: 0 },
  { key: 'arch-studio', name: 'The Arch Studio Materials', email: 'archstudiomaterials@brands.archfacing.com', kind: 'BMF', tagline: 'Stone, lime & heritage finishes', city: 'Udaipur', state: 'Rajasthan', pincode: '313001', photo: '', initials: 'AS', rating: 0, reviews: 0 },
  { key: 'greenscape', name: 'Greenscape Systems', email: 'greenscape@brands.archfacing.com', kind: 'BMF', tagline: 'Green walls & landscape products', city: 'Pune', state: 'Maharashtra', pincode: '411001', photo: '', initials: 'GN', rating: 0, reviews: 0 },
  { key: 'artisan', name: 'Artisan Collective', email: 'artisancollective@brands.archfacing.com', kind: 'BMF', tagline: 'Handcrafted decor & artefacts', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', photo: '', initials: 'AC', rating: 0, reviews: 0 },
]

// ═══════════════════════════════════════════════════════════
//  The products
// ═══════════════════════════════════════════════════════════

type Seed = {
  slug: string
  title: string
  /** A key from BRANDS — the User the posting belongs to. */
  brand: string
  /**
   * What the card prints on the brand line. Normally the brand's own name;
   * it is spelled out separately only for the rows noted below, where the
   * design puts a place there instead.
   */
  brandLabel?: string
  /** Taxonomy slugs from src/config/taxonomy.ts §4.1.7.1 */
  category: string
  subCategory: string
  categoryLabel: string
  subCategoryLabel: string
  price: number
  unit: string
  rating: number
  reviews: number
  badge?: 'best-seller' | 'premium' | 'new-arrival' | 'top-rated' | 'new'
  material: string
  colour: string
  /** A swatch slug from PRODUCT_COLOURS in src/lib/products.ts */
  colourSlug: string
  application: string
  availability: 'In Stock' | 'Made to Order'
  isOriginal: boolean
  isBmfListed: boolean
  photo: PhotoKey
  views: number
  description: string
  body: string
  highlights: string[]
  specs: { label: string; value: string }[]
  moq: string
  warranty: string
  year: number
}

/**
 * ★ Rows 5, 6 and 7 — "The Earthy Restaurant", "Hill View Farmhouse" and
 *   "Azure Hills Villa" — read as PROJECTS, not products, and their brand line
 *   in the comp is a place ("Delite, Delhi", "Alibaug, Maharashtra", "Udaipur,
 *   Rajasthan") rather than a manufacturer. They are reproduced exactly as the
 *   design names them, because that is what was asked for, but they look like
 *   rows the comp picked up from the Projects page by mistake.
 *
 *   To correct them later: either move them to `prisma/seed-projects.ts` as
 *   PROJECT posts, or keep them here and rename them after the material they
 *   actually sell (each already carries a real category, material and finish),
 *   then set `brandLabel` back to the BMF member's own name. Nothing else on
 *   the page depends on their current wording.
 */

/**
 * ★ Three of the twelve rows the design names — The Earthy Restaurant, Hill
 *   View Farmhouse and Azure Hills Villa — are ALSO project titles in the
 *   Projects design, and their "brand" is a place rather than a company.
 *
 *   ⚠️ Post.slug is unique across the whole table, not per type. Seeding
 *      them under the bare slug silently CONVERTED the three matching PROJECT
 *      rows into products — the Projects listing quietly dropped from 13 to 10.
 *      They are prefixed with product- for that reason. Do not un-prefix them.
 *
 *   They look like rows copied from the Projects comp by mistake. Renaming
 *   them to real products is the proper fix whenever the client confirms.
 */
const PRODUCTS: Seed[] = [
  // ─────────── 1–12: the twelve the design names, in its order ───────────
  {
    slug: 'italian-marble-statuario',
    title: 'Italian Marble Statuario',
    brand: 'terracotta',
    category: 'interior-products', subCategory: 'floor-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Floors Materials and Decors',
    price: 320, unit: '/sq.ft', rating: 0, reviews: 0, badge: 'best-seller',
    material: 'Italian Marble', colour: 'Statuario White', colourSlug: 'white',
    application: 'Flooring', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'living', // stand-in — a bright living room, not the slab itself
    views: 4820,
    description: 'Book-matched Statuario slabs with fine grey veining on a bright white ground, honed and calibrated for large-format interior flooring.',
    body: 'Statuario is quarried in Carrara and graded on the strength of its veining. These slabs are supplied in book-matched pairs so a large floor can be laid as a single continuous figure, and every slab is resin-treated and calibrated to 18 mm before it leaves the factory. Recommended for interior floors, feature walls and vanity tops; a penetrating sealer is advised in wet areas.',
    highlights: ['Book-matched slabs', 'Resin treated & calibrated', 'Honed matte finish', 'Large format 18 mm'],
    specs: [
      { label: 'Slab Size', value: '2400 × 1200 mm' },
      { label: 'Thickness', value: '18 mm' },
      { label: 'Finish', value: 'Honed matte' },
      { label: 'Water Absorption', value: '< 0.4%' },
      { label: 'Country of Origin', value: 'Italy' },
    ],
    moq: '200 sq.ft', warranty: '1 year against manufacturing defects', year: 2025,
  },
  {
    slug: 'engineered-wooden-flooring',
    title: 'Engineered Wooden Flooring',
    brand: 'laminova',
    category: 'interior-products', subCategory: 'floor-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Floors Materials and Decors',
    price: 245, unit: '/sq.ft', rating: 0, reviews: 0, badge: 'premium',
    material: 'Engineered Wood', colour: 'Natural Oak', colourSlug: 'teak',
    application: 'Flooring', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'flooring',
    views: 3910,
    description: 'A 14 mm engineered board with a 3 mm oak wear layer over a birch-ply core, click-locked and pre-finished with a UV-cured matte lacquer.',
    body: 'The multi-ply core keeps the board dimensionally stable through an Indian monsoon in a way a solid plank cannot, while the 3 mm oak wear layer can still be sanded and re-finished twice over its life. Boards click together without adhesive and can be laid over an existing screed with an underlay.',
    highlights: ['3 mm real oak wear layer', 'Click-lock, no adhesive', 'UV-cured matte lacquer', 'Underfloor-heating compatible'],
    specs: [
      { label: 'Plank Size', value: '1860 × 189 mm' },
      { label: 'Thickness', value: '14 mm (3 mm wear layer)' },
      { label: 'Core', value: 'Birch multi-ply' },
      { label: 'Finish', value: 'UV matte lacquer' },
      { label: 'Installation', value: 'Floating click-lock' },
    ],
    moq: '150 sq.ft', warranty: '10 years residential', year: 2025,
  },
  {
    slug: 'pull-out-kitchen-faucet',
    title: 'Pull Out Kitchen Faucet',
    brand: 'aquaform',
    category: 'interior-products', subCategory: 'kitchen-equipment',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Kitchen Equipment and Fittings',
    price: 8990, unit: '/piece', rating: 0, reviews: 0, badge: 'new-arrival',
    material: 'Chrome-plated Brass', colour: 'Chrome', colourSlug: 'chrome',
    application: 'Kitchen', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'kitchenWhite', // stand-in — the kitchen, not the tap
    views: 2760,
    description: 'A single-lever sink mixer with a two-mode pull-out spray head, a 1.5 m braided hose and a weighted retraction.',
    body: 'The spray head switches between an aerated stream and a needle spray with a thumb button, and retracts on a weighted pulley so the hose never sags into the cabinet. The cartridge is a 40 mm ceramic disc rated for half a million cycles, and the whole body is forged brass under a triple-plated chrome finish.',
    highlights: ['Two-mode pull-out spray', '40 mm ceramic disc cartridge', 'Weighted hose retraction', '360° swivel spout'],
    specs: [
      { label: 'Spout Reach', value: '220 mm' },
      { label: 'Hose Length', value: '1500 mm' },
      { label: 'Cartridge', value: '40 mm ceramic disc' },
      { label: 'Operating Pressure', value: '0.5 – 5 bar' },
      { label: 'Finish', value: 'Triple-plated chrome' },
    ],
    moq: '1 piece', warranty: '7 years on cartridge, 10 on finish', year: 2025,
  },
  {
    slug: 'modern-pendant-light',
    title: 'Modern Pendant Light',
    brand: 'lumenworks',
    category: 'services-products', subCategory: 'lighting-fixtures',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Lighting Fixtures',
    price: 2450, unit: '/piece', rating: 0, reviews: 0, badge: 'top-rated',
    material: 'Powder-coated Steel', colour: 'Matte Black', colourSlug: 'black',
    application: 'Lighting', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'livingPendants',
    views: 3240,
    description: 'A 12 W dimmable LED pendant in a matte black spun shade, warm 3000 K, with a 1.5 m adjustable braided cord.',
    body: 'Sized for a run of three over a two-metre island or a single drop over a side table. The driver is integrated and TRIAC-dimmable down to five per cent, and the spun steel shade is deep enough to keep the source out of a seated line of sight.',
    highlights: ['12 W integrated LED', 'Dimmable to 5%', 'CRI 90+, 3000 K', 'Adjustable 1.5 m cord'],
    specs: [
      { label: 'Shade Diameter', value: '250 mm' },
      { label: 'Wattage', value: '12 W' },
      { label: 'Colour Temperature', value: '3000 K warm white' },
      { label: 'Luminous Flux', value: '1050 lm' },
      { label: 'Dimming', value: 'TRIAC' },
    ],
    moq: '1 piece', warranty: '3 years', year: 2025,
  },
  {
    // ★ Reads as a project, not a product — see the note above PRODUCTS.
    slug: 'product-the-earthy-restaurant',
    title: 'The Earthy Restaurant',
    brand: 'delite', brandLabel: 'Delite, Delhi',
    category: 'interior-products', subCategory: 'cladding-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Cladding Materials and Decors',
    price: 620, unit: '/sq.ft', rating: 0, reviews: 0, badge: 'new',
    material: 'Natural Stone', colour: 'Terracotta', colourSlug: 'terracotta',
    application: 'Wall Cladding', availability: 'Made to Order',
    isOriginal: false, isBmfListed: true,
    photo: 'dining', // stand-in — a dining room
    views: 1580,
    description: 'A supply-and-fix earthy cladding package — split-face stone, lime plaster and reclaimed timber battens — as specified for a restaurant fit-out in Delhi.',
    body: 'Quoted per square foot of finished wall, inclusive of substrate, adhesive, cutting and labour. The stone is hand-split so no two panels repeat, and the lime plaster is tinted with natural oxides rather than pigment, which is what gives the finished wall its depth under warm light.',
    highlights: ['Supply and fix', 'Hand-split natural stone', 'Lime plaster, oxide tinted', 'Reclaimed timber battens'],
    specs: [
      { label: 'Panel Size', value: '600 × 150 mm (random)' },
      { label: 'Thickness', value: '20 – 35 mm split face' },
      { label: 'Coverage', value: '1 sq.ft per panel set' },
      { label: 'Scope', value: 'Supply, cut and fix' },
      { label: 'Lead Time', value: '3 – 4 weeks' },
    ],
    moq: '300 sq.ft', warranty: '2 years on workmanship', year: 2025,
  },
  {
    // ★ Reads as a project, not a product — see the note above PRODUCTS.
    slug: 'product-hill-view-farmhouse',
    title: 'Hill View Farmhouse',
    brand: 'studio-course', brandLabel: 'Alibaug, Maharashtra',
    category: 'exterior-products', subCategory: 'facade-materials',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Facade Materials',
    price: 550, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Natural Stone', colour: 'Beige', colourSlug: 'beige',
    application: 'Facade', availability: 'Made to Order',
    isOriginal: false, isBmfListed: true,
    photo: 'livingWide', // stand-in — an interior, not a facade
    views: 2140,
    description: 'A coastal facade package in local basalt and lime render, detailed to shed the Konkan monsoon and weather without sealants.',
    body: 'Basalt is quarried within eighty kilometres of Alibaug, dressed on site and laid with an open joint over a drained cavity, so wind-driven rain never reaches the structure. The lime render above it is breathable and can be re-coated rather than stripped.',
    highlights: ['Locally quarried basalt', 'Drained and back-ventilated', 'Breathable lime render', 'No silicone sealants'],
    specs: [
      { label: 'Stone', value: 'Local basalt, dressed' },
      { label: 'Cavity', value: '25 mm drained, back-ventilated' },
      { label: 'Render', value: 'NHL 3.5 lime, three coat' },
      { label: 'Scope', value: 'Supply and fix' },
      { label: 'Lead Time', value: '5 – 6 weeks' },
    ],
    moq: '500 sq.ft', warranty: '5 years on workmanship', year: 2024,
  },
  {
    // ★ Reads as a project, not a product — see the note above PRODUCTS.
    slug: 'product-azure-hills-villa',
    title: 'Azure Hills Villa',
    brand: 'arch-studio', brandLabel: 'Udaipur, Rajasthan',
    category: 'exterior-products', subCategory: 'facade-materials',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Facade Materials',
    price: 760, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Natural Stone', colour: 'Ivory / Cream', colourSlug: 'ivory',
    application: 'Facade', availability: 'Made to Order',
    isOriginal: false, isBmfListed: true,
    photo: 'furnishing', // stand-in — a bedroom
    views: 1960,
    description: 'A hand-carved Rajasthani sandstone facade package — jaali screens, chajja bands and dressed ashlar — cut to the villa drawings.',
    body: 'Every jaali is cut from a single block by hand in Udaipur, so the screen has no joint running through its pattern. The chajja bands are dressed with a drip groove on the underside, which is the detail that keeps a monsoon streak off the wall below.',
    highlights: ['Hand-carved jaali screens', 'Single-block cutting', 'Drip-grooved chajja bands', 'Cut to drawing'],
    specs: [
      { label: 'Stone', value: 'Dholpur beige sandstone' },
      { label: 'Jaali Thickness', value: '75 mm' },
      { label: 'Ashlar Course', value: '300 mm dressed' },
      { label: 'Scope', value: 'Cut, carve and fix' },
      { label: 'Lead Time', value: '8 – 10 weeks' },
    ],
    moq: '400 sq.ft', warranty: '5 years on workmanship', year: 2024,
  },
  {
    slug: 'kitchen-chimney-90cm',
    title: 'Kitchen Chimney 90cm',
    brand: 'cucina-air',
    category: 'interior-products', subCategory: 'kitchen-equipment',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Kitchen Equipment and Fittings',
    price: 22990, unit: '/piece', rating: 0, reviews: 0,
    material: 'Stainless Steel', colour: 'Matte Black', colourSlug: 'black',
    application: 'Kitchen', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'kitchenPendants',
    views: 3520,
    description: 'A 90 cm auto-clean filterless chimney rated at 1425 m³/h, with motion-sensor controls and an oil collector.',
    body: 'Filterless means the oil is thrown out of the airstream by the blower itself and drips into a removable collector, so there is no baffle to soak and scrub every month. Rated for a heavy Indian kitchen with a four-burner hob under a 900 mm hood.',
    highlights: ['1425 m³/h suction', 'Filterless auto-clean', 'Motion-sensor control', 'Removable oil collector'],
    specs: [
      { label: 'Width', value: '900 mm' },
      { label: 'Suction Capacity', value: '1425 m³/h' },
      { label: 'Noise Level', value: '58 dB' },
      { label: 'Control', value: 'Motion sensor + touch' },
      { label: 'Duct Size', value: '150 mm' },
    ],
    moq: '1 piece', warranty: '1 year product, 5 years motor', year: 2025,
  },
  {
    slug: 'modular-kitchen-set',
    title: 'Modular Kitchen Set',
    brand: 'fittwell',
    category: 'furniture-furnishing', subCategory: 'modular-furniture',
    categoryLabel: 'Furniture & Furnishing', subCategoryLabel: 'Modular Furniture',
    price: 125000, unit: '/set', rating: 0, reviews: 0,
    material: 'Marine Plywood', colour: 'Walnut', colourSlug: 'walnut',
    application: 'Kitchen', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'kitchenIsland',
    views: 4110,
    description: 'A ten-foot L-shaped modular kitchen in BWP marine plywood with soft-close hinges, tandem drawers and a full set of internal organisers.',
    body: 'Priced as a complete set for a ten-foot run: base units, wall units, a tall unit, tandem box drawers on full-extension runners, and the corner and cutlery organisers. Carcass is 18 mm BWP plywood with a 0.8 mm laminate; shutters are 18 mm with a 2 mm PVC edge band.',
    highlights: ['BWP marine ply carcass', 'Soft-close everywhere', 'Full-extension tandem drawers', 'Internal organisers included'],
    specs: [
      { label: 'Run Length', value: '10 ft L-shaped' },
      { label: 'Carcass', value: '18 mm BWP plywood' },
      { label: 'Shutter', value: '18 mm laminate, 2 mm edge band' },
      { label: 'Hardware', value: 'Soft-close hinges & tandem runners' },
      { label: 'Lead Time', value: '4 weeks' },
    ],
    moq: '1 set', warranty: '10 years on hardware', year: 2025,
  },
  {
    slug: 'opc-53-grade-cement',
    title: 'OPC 53 Grade Cement',
    brand: 'bedrock',
    category: 'structural-products', subCategory: 'cement-concrete',
    categoryLabel: 'Structural Products', subCategoryLabel: 'Cement & Concrete',
    price: 420, unit: '/bag', rating: 0, reviews: 0,
    material: 'Cement', colour: 'Grey', colourSlug: 'grey',
    application: 'Structural', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', // stand-in — no cement photograph exists in the library
    views: 5240,
    description: 'IS 269 compliant 53-grade Ordinary Portland Cement in 50 kg bags, for structural concrete and high-strength precast.',
    body: 'Fifty-three grade develops 53 MPa at twenty-eight days and gains most of it early, which is what makes it the right choice for structural members on a fast slab cycle. Not the right choice for plaster — a 43-grade or a PPC gives a more workable mix with less shrinkage cracking.',
    highlights: ['IS 269 : 2015 compliant', '53 MPa at 28 days', 'Low chloride content', '50 kg moisture-barrier bag'],
    specs: [
      { label: 'Bag Weight', value: '50 kg' },
      { label: 'Standard', value: 'IS 269 : 2015' },
      { label: '28-day Strength', value: '≥ 53 MPa' },
      { label: 'Initial Setting Time', value: '≥ 30 minutes' },
      { label: 'Shelf Life', value: '3 months from packing' },
    ],
    moq: '100 bags', warranty: 'Batch-tested to IS 269', year: 2025,
  },
  {
    slug: 'vitrified-tiles-600x1200',
    title: 'Vitrified Tiles 600x1200mm',
    brand: 'claystone',
    category: 'interior-products', subCategory: 'floor-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Floors Materials and Decors',
    price: 95, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Vitrified Ceramic', colour: 'Ivory / Cream', colourSlug: 'ivory',
    application: 'Flooring', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'shower', // stand-in — a tiled shower enclosure
    views: 3680,
    description: 'Double-charged vitrified tiles in a 600 × 1200 mm format, glossy rectified edge, with a marble-effect print carried 3–4 mm into the body.',
    body: 'Double-charged means the pattern is pressed 3–4 mm deep rather than printed on the surface, so heavy foot traffic wears into more of the same rather than through to a biscuit. Rectified edges allow a 2 mm joint, which is what makes a large-format floor read as continuous.',
    highlights: ['Double-charged, 3–4 mm depth', 'Rectified edge, 2 mm joint', 'Water absorption < 0.5%', 'PEI IV traffic rating'],
    specs: [
      { label: 'Tile Size', value: '600 × 1200 mm' },
      { label: 'Thickness', value: '9 mm' },
      { label: 'Finish', value: 'Glossy rectified' },
      { label: 'Water Absorption', value: '< 0.5%' },
      { label: 'Tiles per Box', value: '2 (16 sq.ft)' },
    ],
    moq: '200 sq.ft', warranty: '5 years against manufacturing defects', year: 2025,
  },
  {
    slug: 'interior-emulsion-paint',
    title: 'Interior Emulsion Paint',
    brand: 'chromaline',
    category: 'interior-products', subCategory: 'wall-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Wall Materials and Decors',
    price: 2850, unit: '/10L', rating: 0, reviews: 0,
    material: 'Acrylic Emulsion', colour: 'White', colourSlug: 'white',
    application: 'Wall Cladding', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'furniture', // stand-in — a sofa against a painted wall
    views: 4470,
    description: 'A low-VOC acrylic interior emulsion with a soft sheen, washable to 10,000 scrub cycles, tintable to the full shade card.',
    body: 'Two coats over a primed wall give a uniform soft sheen that takes a wipe without burnishing — the failure mode of most cheap emulsions in a corridor. Low-VOC and virtually odour-free, so a room can be reoccupied the same evening.',
    highlights: ['Low VOC, low odour', '10,000 scrub cycles', 'Soft sheen finish', 'Tintable to full shade card'],
    specs: [
      { label: 'Pack Size', value: '10 litres' },
      { label: 'Coverage', value: '130 – 150 sq.ft per litre per coat' },
      { label: 'Finish', value: 'Soft sheen' },
      { label: 'Recoat Time', value: '4 – 6 hours' },
      { label: 'VOC Content', value: '< 50 g/l' },
    ],
    moq: '1 pack', warranty: '5 years performance', year: 2025,
  },

  // ─────────── 13–40: breadth, so the filters and paging have work ───────────
  {
    slug: 'gypsum-false-ceiling-board',
    title: 'Gypsum False Ceiling Board',
    brand: 'glasscraft',
    category: 'interior-products', subCategory: 'ceiling-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Ceiling Materials and Decors',
    price: 78, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Gypsum', colour: 'White', colourSlug: 'white',
    application: 'Ceiling', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'living', views: 2180,
    description: 'A 12.5 mm tapered-edge gypsum board on a galvanised steel grid, ready for a seamless jointed and painted ceiling.',
    body: 'The tapered edge is what lets a joint be taped, filled and sanded flush, so a finished ceiling reads as one plane with no shadow line. Supplied with the GI grid, screws and jointing compound as a per-square-foot package.',
    highlights: ['12.5 mm tapered edge', 'GI grid included', 'Seamless jointing', 'Class 1 surface spread of flame'],
    specs: [
      { label: 'Board Size', value: '2400 × 1200 mm' },
      { label: 'Thickness', value: '12.5 mm' },
      { label: 'Edge', value: 'Tapered' },
      { label: 'Grid', value: 'Galvanised steel, 0.55 mm' },
      { label: 'Fire Rating', value: 'Class 1' },
    ],
    moq: '300 sq.ft', warranty: '3 years on system', year: 2025,
  },
  {
    slug: 'designer-wall-tiles-300x600',
    title: 'Designer Wall Tiles 300x600mm',
    brand: 'claystone',
    category: 'interior-products', subCategory: 'wall-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Wall Materials and Decors',
    price: 58, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Ceramic', colour: 'Sage Green', colourSlug: 'green',
    application: 'Wall Cladding', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'shower', views: 2260,
    description: 'Glazed ceramic wall tiles in a 300 × 600 mm format with a lightly textured matte face, for bathrooms and kitchen splashbacks.',
    body: 'A matte glaze hides water spotting far better than a gloss, which is the whole argument for it in a shower. Rectified on all four edges so the joint can be closed to 2 mm.',
    highlights: ['Textured matte glaze', 'Rectified edges', 'Stain and scratch resistant', 'Bathroom and kitchen rated'],
    specs: [
      { label: 'Tile Size', value: '300 × 600 mm' },
      { label: 'Thickness', value: '8.5 mm' },
      { label: 'Finish', value: 'Matte textured' },
      { label: 'Application', value: 'Interior walls' },
      { label: 'Tiles per Box', value: '6 (11.6 sq.ft)' },
    ],
    moq: '120 sq.ft', warranty: '3 years', year: 2025,
  },
  {
    slug: 'textured-wall-cladding-stone',
    title: 'Textured Wall Cladding Stone',
    brand: 'tessella',
    category: 'interior-products', subCategory: 'cladding-materials',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Cladding Materials and Decors',
    price: 340, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Natural Stone', colour: 'Charcoal', colourSlug: 'charcoal',
    application: 'Wall Cladding', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'decor', views: 1420,
    description: 'Split-face quartzite cladding in interlocking Z-panels, dry-fixed to a batten with concealed clips.',
    body: 'The Z-panel geometry interlocks course to course, so a wall goes up with a fraction of the setting-out a random ashlar needs. Concealed stainless clips mean no visible fixing and no adhesive squeezing out of a joint.',
    highlights: ['Interlocking Z-panels', 'Concealed stainless clips', 'Dry fix, no adhesive bleed', 'Interior and sheltered exterior'],
    specs: [
      { label: 'Panel Size', value: '600 × 150 mm' },
      { label: 'Thickness', value: '15 – 30 mm split face' },
      { label: 'Fixing', value: 'Concealed SS clip on batten' },
      { label: 'Weight', value: '38 kg per sq.m' },
      { label: 'Panels per Box', value: '10 (9 sq.ft)' },
    ],
    moq: '100 sq.ft', warranty: '3 years', year: 2024,
  },
  {
    slug: 'freestanding-soaking-bathtub',
    title: 'Freestanding Soaking Bathtub',
    brand: 'aquaform',
    category: 'interior-products', subCategory: 'toilet-equipment',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Toilet Equipment and Fittings',
    price: 68000, unit: '/piece', rating: 0, reviews: 0, badge: 'premium',
    material: 'Acrylic Composite', colour: 'White', colourSlug: 'white',
    application: 'Bathroom', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'bathTub', views: 1880,
    description: 'A 1700 mm freestanding soaking tub in reinforced acrylic composite with a slotted overflow and a click-clack waste.',
    body: 'Reinforced acrylic holds heat far longer than steel and weighs a fraction of stone composite, which matters on a slab that was not designed for a tub. Supplied with the concealed waste and overflow set.',
    highlights: ['1700 mm soaking depth', 'Reinforced acrylic, warm to touch', 'Concealed waste & overflow', 'Anti-bacterial surface'],
    specs: [
      { label: 'Size', value: '1700 × 800 × 580 mm' },
      { label: 'Capacity', value: '230 litres' },
      { label: 'Material', value: 'Reinforced acrylic composite' },
      { label: 'Waste', value: 'Click-clack, chrome' },
      { label: 'Weight (empty)', value: '42 kg' },
    ],
    moq: '1 piece', warranty: '10 years on tub shell', year: 2025,
  },
  {
    slug: 'wall-mounted-vanity-unit',
    title: 'Wall Mounted Vanity Unit',
    brand: 'puresan',
    category: 'interior-products', subCategory: 'toilet-equipment',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Toilet Equipment and Fittings',
    price: 22500, unit: '/piece', rating: 0, reviews: 0,
    material: 'Marine Plywood', colour: 'Teak / Oak', colourSlug: 'teak',
    application: 'Bathroom', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'vanity', views: 1640,
    description: 'A 900 mm wall-hung vanity in water-resistant ply with a moulded basin top, soft-close drawers and a concealed bottle trap.',
    body: 'Wall-hung keeps the floor clear under the unit, which makes a small bathroom read larger and a wet floor far easier to mop. The carcass is BWP ply with an acrylic membrane rather than laminate, so a standing drip at the edge cannot lift a seam.',
    highlights: ['Wall-hung, floor clear', 'BWP ply with acrylic membrane', 'Soft-close drawers', 'Moulded basin top included'],
    specs: [
      { label: 'Size', value: '900 × 480 × 500 mm' },
      { label: 'Carcass', value: 'BWP plywood, acrylic finish' },
      { label: 'Basin', value: 'Moulded solid surface' },
      { label: 'Drawers', value: '2, soft-close' },
      { label: 'Load Rating', value: '80 kg' },
    ],
    moq: '1 piece', warranty: '5 years', year: 2024,
  },
  {
    slug: 'single-lever-basin-mixer',
    title: 'Single Lever Basin Mixer',
    brand: 'aquaform',
    category: 'interior-products', subCategory: 'toilet-equipment',
    categoryLabel: 'Interior Products', subCategoryLabel: 'Toilet Equipment and Fittings',
    price: 4650, unit: '/piece', rating: 0, reviews: 0,
    material: 'Chrome-plated Brass', colour: 'Matte Black', colourSlug: 'black',
    application: 'Bathroom', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'basin', views: 2940,
    description: 'A tall single-lever basin mixer in matte black PVD, with a 35 mm ceramic cartridge and a flow-limited aerator.',
    body: 'PVD is a vacuum-deposited coating rather than a paint, so the matte black cannot chip at the spout the way a lacquered finish does. The aerator is limited to six litres a minute, which is enough for a basin and a third off the water bill.',
    highlights: ['PVD matte black, chip resistant', '35 mm ceramic cartridge', '6 l/min flow-limited aerator', 'Tall spout for vessel basins'],
    specs: [
      { label: 'Spout Height', value: '210 mm' },
      { label: 'Cartridge', value: '35 mm ceramic disc' },
      { label: 'Flow Rate', value: '6 l/min at 3 bar' },
      { label: 'Finish', value: 'PVD matte black' },
      { label: 'Connection', value: 'Two 450 mm flexible hoses' },
    ],
    moq: '1 piece', warranty: '7 years on cartridge', year: 2025,
  },
  {
    slug: 'wall-mounted-water-closet',
    title: 'Wall Mounted Water Closet',
    brand: 'puresan',
    category: 'services-products', subCategory: 'plumbing-sanitary',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Plumbing & Sanitary',
    price: 14500, unit: '/piece', rating: 0, reviews: 0,
    material: 'Ceramic Sanitaryware', colour: 'White', colourSlug: 'white',
    application: 'Bathroom', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'sanitaryware', views: 2050,
    description: 'A rimless wall-hung WC with a soft-close seat, 3/6 litre dual flush, and a concealed cistern carrier frame.',
    body: 'Rimless means there is no shelf under the rim for anything to sit in, and the flush sweeps the full bowl from a single lip — the single biggest hygiene improvement in sanitaryware in twenty years. Carrier frame is rated for 400 kg.',
    highlights: ['Rimless bowl', '3/6 litre dual flush', 'Soft-close quick-release seat', 'Carrier frame included'],
    specs: [
      { label: 'Size', value: '525 × 360 × 350 mm' },
      { label: 'Flush', value: '3 / 6 litre dual' },
      { label: 'Trap', value: 'P-trap, horizontal outlet' },
      { label: 'Frame Load Rating', value: '400 kg' },
      { label: 'Seat', value: 'Soft-close, quick release' },
    ],
    moq: '1 piece', warranty: '10 years on ceramic', year: 2025,
  },
  {
    slug: 'terracotta-facade-cladding-panels',
    title: 'Terracotta Facade Cladding Panels',
    brand: 'brickfield',
    category: 'exterior-products', subCategory: 'facade-materials',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Facade Materials',
    price: 480, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Terracotta Clay', colour: 'Terracotta', colourSlug: 'terracotta',
    application: 'Facade', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'decor', views: 1720,
    description: 'Extruded terracotta baguettes and panels on an aluminium rail system, for a ventilated rainscreen facade.',
    body: 'Extruded clay is dimensionally consistent enough to hang on a rail with a 10 mm open joint, which drains and back-ventilates the cavity behind. The colour is the fired body itself, so it does not fade — a painted metal panel on the same building will need recoating twice before this needs washing.',
    highlights: ['Ventilated rainscreen', 'Through-body colour, fade proof', 'Aluminium rail system', 'A1 non-combustible'],
    specs: [
      { label: 'Panel Size', value: '600 × 300 mm' },
      { label: 'Thickness', value: '30 mm' },
      { label: 'Joint', value: '10 mm open, drained' },
      { label: 'Fire Class', value: 'A1 non-combustible' },
      { label: 'Lead Time', value: '6 – 8 weeks' },
    ],
    moq: '1000 sq.ft', warranty: '10 years on colour fastness', year: 2024,
  },
  {
    slug: 'clay-roofing-tiles',
    title: 'Clay Roofing Tiles',
    brand: 'brickfield',
    category: 'exterior-products', subCategory: 'roofing-materials',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Roofing Materials',
    price: 68, unit: '/piece', rating: 0, reviews: 0,
    material: 'Terracotta Clay', colour: 'Brick Red', colourSlug: 'red',
    application: 'Roofing', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'shelving', // stand-in — no roofing photograph in the library
    views: 1290,
    description: 'Interlocking clay roof tiles with a double water channel, rated to 200 km/h wind uplift with clips.',
    body: 'The double channel at the side lap is what keeps wind-driven rain out of a low-pitch roof — a single-channel tile needs a steeper pitch to do the same job. Frost resistant and rated for a 16° minimum pitch.',
    highlights: ['Double water channel', '16° minimum pitch', 'Frost resistant', 'Wind uplift 200 km/h with clips'],
    specs: [
      { label: 'Tile Size', value: '440 × 265 mm' },
      { label: 'Coverage', value: '13 tiles per sq.m' },
      { label: 'Minimum Pitch', value: '16°' },
      { label: 'Weight', value: '3.2 kg per tile' },
      { label: 'Water Absorption', value: '< 6%' },
    ],
    moq: '500 pieces', warranty: '30 years frost resistance', year: 2024,
  },
  {
    slug: 'cobble-paving-blocks',
    title: 'Cobble Paving Blocks',
    brand: 'tessella',
    category: 'exterior-products', subCategory: 'paving-materials',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Paving Materials',
    price: 42, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Precast Concrete', colour: 'Charcoal', colourSlug: 'charcoal',
    application: 'Paving', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', // stand-in — no paving photograph in the library
    views: 1180,
    description: 'Interlocking 80 mm concrete cobbles rated M40, for driveways and heavy pedestrian paving.',
    body: 'Eighty millimetres is the driveway thickness — a 60 mm block is for footpaths and will rock loose under a car within a season. Laid on a 30 mm sand bed with a compacted sub-base and an edge restraint.',
    highlights: ['80 mm driveway grade', 'M40 compressive strength', 'Interlocking profile', 'Colour through full depth'],
    specs: [
      { label: 'Block Size', value: '200 × 100 × 80 mm' },
      { label: 'Grade', value: 'M40' },
      { label: 'Coverage', value: '50 blocks per sq.m' },
      { label: 'Water Absorption', value: '< 6%' },
      { label: 'Bedding', value: '30 mm sharp sand' },
    ],
    moq: '500 sq.ft', warranty: '2 years', year: 2024,
  },
  {
    slug: 'vertical-green-wall-system',
    title: 'Vertical Green Wall System',
    brand: 'greenscape', brandLabel: 'Greenscape Systems',
    category: 'exterior-products', subCategory: 'landscape-products',
    categoryLabel: 'Exterior Products', subCategoryLabel: 'Landscape Products',
    price: 1450, unit: '/sq.ft', rating: 0, reviews: 0, badge: 'new',
    material: 'Polymer', colour: 'Sage Green', colourSlug: 'green',
    application: 'Landscape', availability: 'Made to Order',
    isOriginal: false, isBmfListed: true,
    photo: 'decor', views: 980,
    description: 'A modular vertical green wall with UV-stable planter cassettes, drip irrigation and a two-year plant maintenance contract.',
    body: 'Cassettes clip to a rail off the wall face, so the structure never sits in wet soil and a failed plant is swapped in a minute rather than replanted. Priced inclusive of the irrigation line, the timer, the initial planting and two years of maintenance visits.',
    highlights: ['Modular clip-in cassettes', 'Drip irrigation with timer', 'Off-wall drained rail', '2 years maintenance included'],
    specs: [
      { label: 'Cassette Size', value: '500 × 500 mm' },
      { label: 'Plant Density', value: '36 plants per sq.m' },
      { label: 'Irrigation', value: 'Drip line, timer controlled' },
      { label: 'Wall Offset', value: '75 mm drained cavity' },
      { label: 'Lead Time', value: '4 – 5 weeks' },
    ],
    moq: '100 sq.ft', warranty: '2 years including plant replacement', year: 2025,
  },
  {
    slug: 'ready-mix-concrete-m25',
    title: 'Ready Mix Concrete M25',
    brand: 'bedrock',
    category: 'structural-products', subCategory: 'cement-concrete',
    categoryLabel: 'Structural Products', subCategoryLabel: 'Cement & Concrete',
    price: 4650, unit: '/cu.m', rating: 0, reviews: 0,
    material: 'Concrete', colour: 'Grey', colourSlug: 'grey',
    application: 'Structural', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', // stand-in — no concrete photograph in the library
    views: 2380,
    description: 'Design-mix M25 ready mix concrete delivered by transit mixer, with a 120 mm slump and cube tests on every batch.',
    body: 'A design mix is proportioned in a laboratory against the actual aggregate and cement being used, which is why it hits M25 reliably where a nominal site mix does not. Delivered within ninety minutes of batching; a retarder is added for longer hauls.',
    highlights: ['Laboratory design mix', '120 ± 25 mm slump', 'Cube tested per batch', 'Pumpable to 60 m'],
    specs: [
      { label: 'Grade', value: 'M25' },
      { label: 'Slump', value: '120 ± 25 mm' },
      { label: 'Maximum Aggregate', value: '20 mm' },
      { label: 'Placing Window', value: '90 minutes from batching' },
      { label: 'Minimum Load', value: '6 cu.m per mixer' },
    ],
    moq: '6 cu.m', warranty: 'Cube test certificate per batch', year: 2025,
  },
  {
    slug: 'tmt-steel-bars-fe500d',
    title: 'TMT Steel Bars Fe500D',
    brand: 'ironspan',
    category: 'structural-products', subCategory: 'steel-reinforcement',
    categoryLabel: 'Structural Products', subCategoryLabel: 'Steel & Reinforcement',
    price: 62500, unit: '/tonne', rating: 0, reviews: 0,
    material: 'TMT Steel', colour: 'Grey', colourSlug: 'grey',
    application: 'Structural', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'shelving', // stand-in — no reinforcement photograph in the library
    views: 3110,
    description: 'IS 1786 Fe500D thermo-mechanically treated reinforcement bars, 8 mm to 32 mm, with mill test certificates.',
    body: 'The D grade carries a higher elongation than plain Fe500, which is what a seismic detail needs — a bar that yields and stretches rather than snapping. Every bundle is tagged and traceable back to a heat number on the mill certificate.',
    highlights: ['IS 1786 Fe500D', 'High elongation, seismic grade', 'Mill test certificate per heat', '8 – 32 mm diameters'],
    specs: [
      { label: 'Grade', value: 'Fe500D' },
      { label: 'Standard', value: 'IS 1786 : 2008' },
      { label: 'Diameters', value: '8, 10, 12, 16, 20, 25, 32 mm' },
      { label: 'Elongation', value: '≥ 16%' },
      { label: 'Bar Length', value: '12 m standard' },
    ],
    moq: '2 tonnes', warranty: 'Mill test certified', year: 2025,
  },
  {
    slug: 'aac-lightweight-blocks',
    title: 'AAC Lightweight Blocks',
    brand: 'aeroblock',
    category: 'structural-products', subCategory: 'bricks-blocks',
    categoryLabel: 'Structural Products', subCategoryLabel: 'Bricks & Blocks',
    price: 52, unit: '/piece', rating: 0, reviews: 0,
    material: 'AAC Concrete', colour: 'White', colourSlug: 'white',
    application: 'Structural', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'shelving', // stand-in — no block photograph in the library
    views: 2270,
    description: 'Autoclaved aerated concrete blocks at 600 × 200 × 200 mm, roughly a third the dead weight of a clay brick wall.',
    body: 'A third of the weight takes real load off the frame, and the closed-cell structure gives a wall a thermal resistance a solid brick cannot approach — which shows up in the air-conditioning load for the life of the building. Laid in thin-bed adhesive, not sand-cement mortar.',
    highlights: ['⅓ the dead weight of clay brick', 'Thermal conductivity 0.16 W/mK', 'Thin-bed adhesive laid', 'Fire rating 4 hours'],
    specs: [
      { label: 'Block Size', value: '600 × 200 × 200 mm' },
      { label: 'Dry Density', value: '551 – 650 kg/cu.m' },
      { label: 'Compressive Strength', value: '≥ 3.5 N/sq.mm' },
      { label: 'Thermal Conductivity', value: '0.16 W/mK' },
      { label: 'Fire Rating', value: '4 hours' },
    ],
    moq: '500 pieces', warranty: 'IS 2185 Part 3 certified', year: 2024,
  },
  {
    slug: 'crystalline-waterproofing-compound',
    title: 'Crystalline Waterproofing Compound',
    brand: 'sealright',
    category: 'structural-products', subCategory: 'waterproofing',
    categoryLabel: 'Structural Products', subCategoryLabel: 'Waterproofing',
    price: 2180, unit: '/20kg', rating: 0, reviews: 0,
    material: 'Cementitious Compound', colour: 'Grey', colourSlug: 'grey',
    application: 'Waterproofing', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'bathTub', // stand-in — a bathroom, not the compound
    views: 1830,
    description: 'A cementitious crystalline slurry for basements, water tanks and terraces, which grows crystals into the concrete pore structure.',
    body: 'Crystalline waterproofing reacts with free lime and moisture inside the concrete rather than sitting on top of it, so it cannot be punctured, and it re-seals a hairline crack that opens later. Potable-water approved once cured.',
    highlights: ['Crystalline, integral to the slab', 'Self-heals hairline cracks', 'Negative-side capable', 'Potable water approved'],
    specs: [
      { label: 'Pack Size', value: '20 kg' },
      { label: 'Coverage', value: '1.2 kg per sq.m, two coats' },
      { label: 'Crack Bridging', value: 'Up to 0.4 mm' },
      { label: 'Cure Time', value: '7 days' },
      { label: 'Application', value: 'Positive or negative side' },
    ],
    moq: '5 packs', warranty: '10 years system warranty', year: 2025,
  },
  {
    slug: 'modular-switch-plate-set',
    title: 'Modular Switch Plate Set',
    brand: 'voltline',
    category: 'services-products', subCategory: 'electrical-fittings',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Electrical Fittings',
    price: 1290, unit: '/set', rating: 0, reviews: 0,
    material: 'Polycarbonate', colour: 'Matte Black', colourSlug: 'black',
    application: 'Electrical', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'livingPendants', views: 2610,
    description: 'A modular switch and socket set on an 8-module plate, with silver-alloy contacts and a soft-touch matte finish.',
    body: 'Silver-alloy contacts are what separate a switch that lasts a decade from one that pits and arcs in eighteen months. The plate is a screwless snap-on over a metal grid frame, so there is no visible fixing and no plastic thread to strip.',
    highlights: ['Silver-alloy contacts', 'Screwless snap-on plate', '16 A shuttered sockets', 'Soft-touch matte finish'],
    specs: [
      { label: 'Plate', value: '8 module' },
      { label: 'Switch Rating', value: '6 A / 16 A' },
      { label: 'Contacts', value: 'Silver alloy' },
      { label: 'Life Cycles', value: '100,000 operations' },
      { label: 'Finish', value: 'Soft-touch matte' },
    ],
    moq: '5 sets', warranty: '5 years', year: 2025,
  },
  {
    slug: 'recessed-cob-spotlight',
    title: 'Recessed COB Spotlight',
    brand: 'lumenworks',
    category: 'services-products', subCategory: 'lighting-fixtures',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Lighting Fixtures',
    price: 1150, unit: '/piece', rating: 0, reviews: 0,
    material: 'Die-cast Aluminium', colour: 'White', colourSlug: 'white',
    application: 'Lighting', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'livingPendants', views: 2490,
    description: 'A 10 W deep-recessed COB downlight with a 38° beam, CRI 95 and a 30° tilt, for accent lighting in a false ceiling.',
    body: 'Deep recessing and a black internal baffle are what stop a downlight glaring at a seated person — the difference between a room that feels lit and one that feels interrogated. CRI 95 renders timber and fabric honestly, which matters over a dining table.',
    highlights: ['CRI 95 colour rendering', 'Deep anti-glare baffle', '30° adjustable tilt', 'Integrated driver'],
    specs: [
      { label: 'Wattage', value: '10 W' },
      { label: 'Beam Angle', value: '38°' },
      { label: 'Colour Temperature', value: '3000 K' },
      { label: 'Cut-out', value: '75 mm' },
      { label: 'Rated Life', value: '25,000 hours' },
    ],
    moq: '10 pieces', warranty: '3 years', year: 2025,
  },
  {
    slug: 'inverter-split-air-conditioner',
    title: 'Inverter Split Air Conditioner 1.5T',
    brand: 'coolcore',
    category: 'services-products', subCategory: 'hvac',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'HVAC',
    price: 42990, unit: '/piece', rating: 0, reviews: 0,
    material: 'Copper', colour: 'White', colourSlug: 'white',
    application: 'HVAC', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'living', views: 3860,
    description: 'A 1.5 tonne 5-star inverter split with a 100% copper condenser, R32 refrigerant and a 4-in-1 convertible mode.',
    body: 'An inverter compressor modulates rather than cycling on and off, which is where the running-cost saving comes from — and why the room does not swing three degrees either side of the setpoint. R32 has roughly a third the global warming potential of R410A.',
    highlights: ['5-star inverter, ISEER 5.2', '100% copper condenser', 'R32 refrigerant', '4-in-1 convertible cooling'],
    specs: [
      { label: 'Capacity', value: '1.5 tonne (5100 W)' },
      { label: 'Star Rating', value: '5 star (ISEER 5.2)' },
      { label: 'Refrigerant', value: 'R32' },
      { label: 'Condenser', value: '100% copper' },
      { label: 'Noise (indoor)', value: '34 dB on low' },
    ],
    moq: '1 piece', warranty: '1 year unit, 10 years compressor', year: 2025,
  },
  {
    slug: 'video-door-phone-system',
    title: 'Video Door Phone System',
    brand: 'safehold',
    category: 'services-products', subCategory: 'security-automation',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Security & Automation',
    price: 18900, unit: '/set', rating: 0, reviews: 0,
    material: 'Polycarbonate', colour: 'Charcoal', colourSlug: 'charcoal',
    application: 'Security', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', // stand-in — shelving, not the panel
    views: 1360,
    description: 'A 7-inch video door phone with a wide-angle outdoor panel, night vision, and snapshot capture to an SD card.',
    body: 'The outdoor panel covers 120° so a visitor standing to one side is still in frame, and every call is captured to the card whether or not anyone answers — which is the feature people actually use. Wired, not Wi-Fi, so it does not drop when the router does.',
    highlights: ['7-inch indoor monitor', '120° wide-angle outdoor panel', 'IR night vision', 'Snapshot capture on missed call'],
    specs: [
      { label: 'Monitor', value: '7 inch, 800 × 480' },
      { label: 'Camera', value: '120° wide angle, IR' },
      { label: 'Storage', value: 'microSD up to 32 GB' },
      { label: 'Wiring', value: '4-wire, up to 50 m' },
      { label: 'Outdoor Rating', value: 'IP54' },
    ],
    moq: '1 set', warranty: '2 years', year: 2024,
  },
  {
    slug: 'passenger-elevator-8-person',
    title: 'Passenger Elevator 8 Person',
    brand: 'vertirise',
    category: 'services-products', subCategory: 'elevators-lifts',
    categoryLabel: 'Building Services Products', subCategoryLabel: 'Elevators & Lifts',
    price: 1250000, unit: '/unit', rating: 0, reviews: 0,
    material: 'Stainless Steel', colour: 'Chrome', colourSlug: 'chrome',
    application: 'Vertical Transport', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'shelving', // stand-in — no elevator photograph in the library
    views: 1120,
    description: 'A machine-room-less gearless passenger elevator, 8 person / 544 kg, 1.0 m/s, with automatic rescue and a hairline steel car.',
    body: 'Machine-room-less puts the gearless drive inside the shaft head, which removes an entire room from the terrace plan. The automatic rescue device brings the car to the nearest floor and opens the doors on a power failure rather than leaving anyone in it.',
    highlights: ['Machine-room-less gearless', 'Automatic rescue device', 'Regenerative drive', 'Hairline stainless car'],
    specs: [
      { label: 'Capacity', value: '8 persons / 544 kg' },
      { label: 'Speed', value: '1.0 m/s' },
      { label: 'Travel', value: 'Up to 6 floors' },
      { label: 'Shaft Size', value: '1700 × 1750 mm' },
      { label: 'Lead Time', value: '12 – 14 weeks' },
    ],
    moq: '1 unit', warranty: '1 year plus 5-year AMC option', year: 2024,
  },
  {
    slug: 'solid-core-flush-door',
    title: 'Solid Core Flush Door',
    brand: 'timberply',
    category: 'doors-windows', subCategory: 'doors',
    categoryLabel: 'Doors, Windows & Glazing', subCategoryLabel: 'Doors',
    price: 6450, unit: '/piece', rating: 0, reviews: 0,
    material: 'Solid Wood', colour: 'Walnut', colourSlug: 'walnut',
    application: 'Doors', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', // stand-in — an interior, not the door leaf
    views: 2320,
    description: 'A 35 mm BWP solid-core flush door with a hardwood frame, veneered both faces and factory lipped on all four edges.',
    body: 'Solid core rather than hollow is the difference between a door that closes with a thud and one that rattles, and it is also what carries a mortice lock without the case working loose. Boiling-water-proof bonding, so a bathroom door does not delaminate at the bottom rail.',
    highlights: ['35 mm solid core', 'BWP boiling-water-proof bonding', 'Hardwood lipping all four edges', 'Veneered both faces'],
    specs: [
      { label: 'Size', value: '2100 × 900 × 35 mm' },
      { label: 'Core', value: 'Solid block board' },
      { label: 'Bonding', value: 'BWP, IS 2202' },
      { label: 'Face', value: 'Natural veneer, unfinished' },
      { label: 'Lipping', value: '12 mm hardwood, four edges' },
    ],
    moq: '5 pieces', warranty: '7 years against delamination', year: 2025,
  },
  {
    slug: 'upvc-sliding-window',
    title: 'uPVC Sliding Window',
    brand: 'clearspan',
    category: 'doors-windows', subCategory: 'windows',
    categoryLabel: 'Doors, Windows & Glazing', subCategoryLabel: 'Windows',
    price: 780, unit: '/sq.ft', rating: 0, reviews: 0, badge: 'top-rated',
    material: 'uPVC', colour: 'White', colourSlug: 'white',
    application: 'Windows', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'living', views: 2870,
    description: 'A two-track uPVC sliding window with a galvanised steel-reinforced profile, 5 mm toughened glass and EPDM gaskets.',
    body: 'The steel reinforcement inside the profile is what stops a large sliding sash bowing in the sun and jamming — the single most common failure in cheap uPVC. EPDM gaskets rather than felt brush keep the rain and the traffic noise out.',
    highlights: ['Galvanised steel reinforced', '5 mm toughened glass', 'EPDM gaskets, not brush', 'Multi-point locking'],
    specs: [
      { label: 'Profile', value: '2 track, 60 mm' },
      { label: 'Reinforcement', value: 'Galvanised steel, 1.2 mm' },
      { label: 'Glazing', value: '5 mm toughened' },
      { label: 'Air Tightness', value: 'Class 4' },
      { label: 'Lead Time', value: '3 weeks from survey' },
    ],
    moq: '80 sq.ft', warranty: '10 years on profile', year: 2025,
  },
  {
    slug: 'toughened-glass-partition',
    title: 'Toughened Glass Partition',
    brand: 'glasscraft',
    category: 'doors-windows', subCategory: 'glass-glazing',
    categoryLabel: 'Doors, Windows & Glazing', subCategoryLabel: 'Glass & Glazing',
    price: 420, unit: '/sq.ft', rating: 0, reviews: 0,
    material: 'Toughened Glass', colour: 'Chrome', colourSlug: 'chrome',
    application: 'Glazing', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'shower', views: 1940,
    description: '12 mm toughened glass partitions with polished edges and slim anodised channels, for offices and shower enclosures.',
    body: 'Twelve millimetres is thick enough to stand as a frameless partition on a floor channel alone, which is what gives an office its clean line. Every panel is heat-soak tested — the process that catches the nickel sulphide inclusions responsible for spontaneous breakage.',
    highlights: ['12 mm frameless', 'Heat-soak tested', 'Polished flat edges', 'Slim anodised channel'],
    specs: [
      { label: 'Thickness', value: '12 mm' },
      { label: 'Maximum Panel', value: '3000 × 1200 mm' },
      { label: 'Edge', value: 'Flat polished' },
      { label: 'Treatment', value: 'Toughened + heat-soak tested' },
      { label: 'Lead Time', value: '2 – 3 weeks' },
    ],
    moq: '100 sq.ft', warranty: '5 years', year: 2024,
  },
  {
    slug: 'concealed-door-hinge-set',
    title: 'Concealed Door Hinge Set',
    brand: 'fittwell',
    category: 'doors-windows', subCategory: 'hardware-fittings',
    categoryLabel: 'Doors, Windows & Glazing', subCategoryLabel: 'Hardware & Fittings',
    price: 950, unit: '/set', rating: 0, reviews: 0,
    material: 'Stainless Steel', colour: 'Antique Brass', colourSlug: 'brass',
    application: 'Hardware', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'kitchenIsland', views: 1540,
    description: 'A three-way adjustable concealed hinge set rated for a 60 kg leaf, invisible when the door is shut.',
    body: 'Three-way adjustment means a door that has settled can be brought back to a parallel shadow gap with an allen key rather than a chisel. Invisible when closed, which is the point of a flush door detail.',
    highlights: ['Invisible when closed', 'Three-way adjustment', '60 kg leaf rating', '180° opening'],
    specs: [
      { label: 'Load Rating', value: '60 kg per leaf' },
      { label: 'Opening Angle', value: '180°' },
      { label: 'Adjustment', value: '±3 mm in three axes' },
      { label: 'Set Contents', value: '3 hinges + fixings' },
      { label: 'Finish', value: 'Antique brass PVD' },
    ],
    moq: '5 sets', warranty: '5 years', year: 2025,
  },
  {
    slug: 'modular-wardrobe-system',
    title: 'Modular Wardrobe System',
    brand: 'fittwell',
    category: 'furniture-furnishing', subCategory: 'modular-furniture',
    categoryLabel: 'Furniture & Furnishing', subCategoryLabel: 'Modular Furniture',
    price: 85000, unit: '/set', rating: 0, reviews: 0,
    material: 'Marine Plywood', colour: 'Ivory / Cream', colourSlug: 'ivory',
    application: 'Furniture', availability: 'Made to Order',
    isOriginal: true, isBmfListed: false,
    photo: 'storage', views: 2010,
    description: 'An eight-foot sliding-door wardrobe in BWP ply with soft-close runners, internal drawers, a pull-down rail and a mirror panel.',
    body: 'Sliding doors give back the 600 mm of floor a hinged wardrobe needs to open into, which usually decides the layout of a small bedroom. The top-hung track carries the weight so the bottom guide never grinds a groove into the floor.',
    highlights: ['Top-hung sliding track', 'BWP marine ply carcass', 'Soft-close internal drawers', 'Pull-down hanging rail'],
    specs: [
      { label: 'Size', value: '2400 × 2400 × 650 mm' },
      { label: 'Carcass', value: '18 mm BWP plywood' },
      { label: 'Doors', value: '2 sliding, top hung' },
      { label: 'Internals', value: '3 drawers, 2 rails, mirror' },
      { label: 'Lead Time', value: '3 – 4 weeks' },
    ],
    moq: '1 set', warranty: '10 years on hardware', year: 2024,
  },
  {
    slug: 'three-seater-fabric-sofa',
    title: 'Three Seater Fabric Sofa',
    brand: 'woodnest',
    category: 'furniture-furnishing', subCategory: 'loose-furniture',
    categoryLabel: 'Furniture & Furnishing', subCategoryLabel: 'Loose Furniture',
    price: 64900, unit: '/piece', rating: 0, reviews: 0,
    material: 'Fabric', colour: 'Indigo Blue', colourSlug: 'blue',
    application: 'Furniture', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'furniture', views: 2680,
    description: 'A three-seater on a kiln-dried hardwood frame with high-resilience foam, pocket-sprung seats and a removable washable cover.',
    body: 'Kiln-dried hardwood is what stops a frame creaking after two Indian summers, and pocket springs under high-resilience foam keep the seat from flattening into a hollow. Covers unzip and go into a machine, which is the difference between a sofa that survives a family and one that does not.',
    highlights: ['Kiln-dried hardwood frame', 'Pocket-sprung seats', 'HR 32-density foam', 'Removable washable covers'],
    specs: [
      { label: 'Size', value: '2100 × 900 × 850 mm' },
      { label: 'Frame', value: 'Kiln-dried hardwood' },
      { label: 'Seat', value: 'Pocket spring + HR32 foam' },
      { label: 'Upholstery', value: 'Polyester blend, removable' },
      { label: 'Seat Height', value: '430 mm' },
    ],
    moq: '1 piece', warranty: '5 years on frame', year: 2024,
  },
  {
    slug: 'blackout-window-curtains',
    title: 'Blackout Window Curtains',
    brand: 'draperie',
    category: 'furniture-furnishing', subCategory: 'soft-furnishing',
    categoryLabel: 'Furniture & Furnishing', subCategoryLabel: 'Soft Furnishing',
    price: 1850, unit: '/metre', rating: 0, reviews: 0,
    material: 'Fabric', colour: 'Charcoal', colourSlug: 'charcoal',
    application: 'Furnishing', availability: 'In Stock',
    isOriginal: true, isBmfListed: false,
    photo: 'furnishing', views: 1770,
    description: 'A triple-weave blackout curtain fabric at 280 cm drop, blocking 98% of light with no separate lining.',
    body: 'The triple weave puts an opaque black yarn between two coloured faces, so the fabric blacks out on its own — no rubber-backed lining to crack, and it still drapes. Two hundred and eighty centimetres wide, railroaded, so a tall window needs no horizontal seam.',
    highlights: ['98% light blocking', 'Triple weave, no lining needed', '280 cm railroaded width', 'Thermal and acoustic gain'],
    specs: [
      { label: 'Width', value: '280 cm railroaded' },
      { label: 'Composition', value: '100% polyester triple weave' },
      { label: 'Light Blocking', value: '98%' },
      { label: 'Care', value: 'Machine washable, 30 °C' },
      { label: 'Fire Behaviour', value: 'Inherently flame retardant' },
    ],
    moq: '5 metres', warranty: '2 years on colour fastness', year: 2025,
  },
  {
    slug: 'handcrafted-ceramic-vases',
    title: 'Handcrafted Ceramic Vases',
    brand: 'artisan', brandLabel: 'Artisan Collective',
    category: 'furniture-furnishing', subCategory: 'art-artefacts',
    categoryLabel: 'Furniture & Furnishing', subCategoryLabel: 'Art & Artefacts',
    price: 2400, unit: '/set', rating: 0, reviews: 0, badge: 'new',
    material: 'Ceramic', colour: 'Beige', colourSlug: 'beige',
    application: 'Decor', availability: 'Made to Order',
    isOriginal: false, isBmfListed: true,
    photo: 'decor', views: 1090,
    description: 'A set of three wheel-thrown stoneware vases in a matte sand glaze, fired to 1250 °C and food-safe.',
    body: 'Thrown by hand in Jaipur, so no two in a set are identical — the variation is the point. Stoneware fired to 1250 °C is vitrified all the way through, which means the vase holds water without a liner and will not craze in a year.',
    highlights: ['Wheel-thrown by hand', 'Vitrified stoneware, 1250 °C', 'Matte sand glaze', 'Set of three heights'],
    specs: [
      { label: 'Heights', value: '180 / 240 / 320 mm' },
      { label: 'Body', value: 'Stoneware, vitrified' },
      { label: 'Glaze', value: 'Matte sand, food safe' },
      { label: 'Set Contents', value: '3 vases' },
      { label: 'Lead Time', value: '2 – 3 weeks' },
    ],
    moq: '1 set', warranty: 'Replacement on transit damage', year: 2025,
  },
]

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/** "Italian Marble" → "italian-marble" */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * ⚠️ Format-valid PLACEHOLDERS, generated from the row index. Not anybody's
 *    real registration — see the warning above BRANDS.
 */
const gstFor = (i: number) => `27AAAAA${String(1000 + i)}A1Z${i % 10}`
const panFor = (i: number) => `AAAAA${String(1000 + i)}A`

/**
 * Publish timestamps run backwards from today, three hours apart, so no two
 * products share an instant.
 *
 * ★ Index 0 is the newest, deliberately: the default sort is "Latest First",
 *   and the twelve products the design names are the first twelve in the array
 *   — so an unfiltered /products opens on exactly the grid the comp draws,
 *   in the comp's order.
 */
function publishedAt(index: number): Date {
  const d = new Date()
  d.setHours(10, 0, 0, 0)
  d.setHours(d.getHours() - index * 3)
  return d
}

async function main() {
  console.log('\n── Brands ──')

  const brandIds: Record<string, string> = {}

  for (const [i, b] of BRANDS.entries()) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      create: {
        email: b.email, name: b.name,
        role: b.kind === 'BMF' ? 'BMF' : 'CORPORATE',
        status: 'ACTIVE', emailVerified: new Date(),
        profilePhoto: b.photo ? unsplash(b.photo, { w: 200, h: 200 }) : null,
        city: b.city, state: b.state, pincode: b.pincode,
      },
      update: {
        name: b.name, profilePhoto: b.photo ? unsplash(b.photo, { w: 200, h: 200 }) : null,
        city: b.city, state: b.state, pincode: b.pincode,
      },
    })

    if (b.kind === 'CORPORATE') {
      await prisma.corporateProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id, companyName: b.name,
          gstNumber: gstFor(i), panNumber: panFor(i),
          productCategories: [], isVerified: true,
        },
        update: { companyName: b.name, isVerified: true },
      })
    } else {
      await prisma.bmfProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id, designaType: 'DESIGNI', businessName: b.name,
          gstNumber: gstFor(i), productCategories: [], isVerified: true,
        },
        update: { businessName: b.name, isVerified: true },
      })
    }

    brandIds[b.key] = user.id
    console.log(`  ✓ ${b.name.padEnd(30)} ${b.kind.padEnd(10)} ${b.city}, ${b.state}`)
  }

  console.log('\n── Products ──')

  for (const [i, p] of PRODUCTS.entries()) {
    const brand = BRANDS.find((b) => b.key === p.brand)
    if (!brand) throw new Error(`Product "${p.slug}" names an unknown brand: ${p.brand}`)

    const brandLabel = p.brandLabel ?? brand.name

    const meta = {
      kind: 'product',

      brand: brandLabel,
      brandSlug: slugify(brandLabel),
      badge: p.badge ?? null,

      price: p.price,
      unit: p.unit,
      rating: p.rating,
      reviews: p.reviews,

      material: p.material,
      materialSlug: slugify(p.material),
      colour: p.colour,
      colourSlug: p.colourSlug,
      application: p.application,
      applicationSlug: slugify(p.application),
      availability: p.availability,

      isOriginal: p.isOriginal,
      isBmfListed: p.isBmfListed,
      verifiedBrand: true,

      coverImage: cover(p.photo),
      gallery: galleryFor(p.photo),

      categoryLabel: p.categoryLabel,
      subCategoryLabel: p.subCategoryLabel,

      highlights: p.highlights,
      specs: p.specs,
      moq: p.moq,
      warranty: p.warranty,
      detailBody: p.body,

      brandCard: {
        name: brand.name,
        tagline: brand.tagline,
        verified: true,
        rating: brand.rating,
        reviews: brand.reviews,
        photo: brand.photo,
        initials: brand.initials,
      },
    }

    const data = {
      status: 'PUBLISHED' as const,
      authorId: brandIds[p.brand],
      title: p.title,
      description: p.description,
      category: p.category,
      subCategory: p.subCategory,
      city: brand.city,
      state: brand.state,
      pincode: brand.pincode,
      year: p.year,
      publishedAt: publishedAt(i),
      viewCount: 0, // counts real visits only
      meta: meta as Prisma.InputJsonValue,
    }

    await prisma.post.upsert({
      where: { slug: p.slug },
      create: { ...data, type: 'PRODUCT', slug: p.slug },
      update: { ...data, type: 'PRODUCT' },
    })

    console.log(
      `  ✓ ${p.title.slice(0, 34).padEnd(36)} ${brandLabel.padEnd(24)} ₹${p.price.toLocaleString('en-IN').padStart(10)} ${p.unit.padEnd(8)} ${p.subCategoryLabel}`
    )
  }

  const total = await prisma.post.count({
    where: { type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null },
  })

  const corporate = BRANDS.filter((b) => b.kind === 'CORPORATE').length
  const bmf = BRANDS.length - corporate

  console.log(
    `\n${corporate} corporate brands · ${bmf} BMF members · ${PRODUCTS.length} products seeded · ${total} published products in total\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
