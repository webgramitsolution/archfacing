/**
 * The complete ArchFacing category taxonomy — taken directly from the PDF.
 * Source: Archfacing.pdf (Reg. L-92657/2020)
 *
 * This file is the foundation of the entire platform. PACT seats, registration
 * forms, posting forms and search filters are all built from it.
 * Make changes here, then re-run the seed.
 */

export type TaxonomyNode = {
  slug: string
  name: string
  children?: TaxonomyNode[]
}

// ═══════════════════════════════════════════════════════════
//  DESIGNA — Architecture (PDF §4.1.3) · 8 categories
// ═══════════════════════════════════════════════════════════
export const DESIGNA_CATEGORIES: TaxonomyNode[] = [
  { slug: 'architecture-services', name: 'Architecture Services' },
  { slug: 'urban-planning', name: 'Urban Planning' },
  { slug: 'town-planning', name: 'Town Planning' },
  { slug: 'landscaping', name: 'Landscaping (Indoor & Outdoor)' },
  { slug: 'project-management', name: 'Project Management' },
  { slug: 'exterior-lighting', name: 'Exterior Lighting Consultant' },
  { slug: 'building-services', name: 'Building Services' },
  { slug: 'building-materials', name: 'Building Materials' },
]

// ═══════════════════════════════════════════════════════════
//  DESIGNI — Interior (PDF §4.1.4) · 6 categories
// ═══════════════════════════════════════════════════════════
export const DESIGNI_CATEGORIES: TaxonomyNode[] = [
  { slug: 'interior-designing', name: 'Interior Designing' },
  { slug: 'vaastu-consultation', name: 'Vaastu Consultation' },
  { slug: 'colour-scheme', name: 'Colour Scheme Consultation' },
  { slug: 'furniture-consultation', name: 'Furniture Consultation' },
  { slug: 'interior-lighting', name: 'Interior Lighting Consultant' },
  { slug: 'interior-materials', name: 'Interior Materials Consultation' },
]

// ═══════════════════════════════════════════════════════════
//  CONSULTANTS (PDF §4.1.5) · 4 groups → 24 sub-categories
//
//  ★ This is the "24 heads per PACT" rule (§7.4.2).
//    Each sub-category = one PACT seat.
// ═══════════════════════════════════════════════════════════
export const CONSULTANT_GROUPS: TaxonomyNode[] = [
  {
    slug: 'engineering',
    name: 'Engineering Consultants',
    children: [
      { slug: 'civil-engineer', name: 'Civil Engineers' },
      { slug: 'value-engineer', name: 'Value Engineers' },
      { slug: 'property-valuer', name: 'Property Valuers' },
      { slug: 'structure-engineer', name: 'Structure Engineers' },
      { slug: 'electrical-engineer', name: 'Electrical Engineers' },
      { slug: 'mechanical-engineer', name: 'Mechanical Engineers' },
      { slug: 'mep-consultant', name: 'MEP Consultants' },
      { slug: 'lighting-consultant', name: 'Lighting Consultants' },
      { slug: 'document-writer', name: 'Document Writers (Advocate)' },
    ],
  },
  {
    slug: 'real-estate',
    name: 'Real Estate Consultants',
    children: [
      { slug: 'builder', name: 'Builders' },
      { slug: 'broker', name: 'Brokers' },
      { slug: 'renting-services', name: 'Renting Services' },
    ],
  },
  {
    slug: 'financial',
    name: 'Financial Consultants',
    children: [
      { slug: 'loan-facilitator', name: 'Loan Facilitators' },
      { slug: 'banking-institution', name: 'Banking Institutions' },
      { slug: 'insurance-company', name: 'Insurance Companies' },
      { slug: 'nbfc', name: 'NBFC' },
      { slug: 'payment-realiser', name: 'Payment Realisers' },
      { slug: 'cibil-clearing-agent', name: 'CIBIL Clearing Agents' },
    ],
  },
  {
    slug: 'indian-traditional',
    name: 'Indian Traditional Sciences',
    children: [
      { slug: 'astrologer', name: 'Astrologers' },
      { slug: 'signature-reader', name: 'Signature Readers' },
      { slug: 'punchange-reader', name: 'Punchange Readers' },
      { slug: 'kundli-reader', name: 'Kundli Readers and Makers' },
      { slug: 'numerologist', name: 'Numerologists' },
      { slug: 'lal-kitabh', name: 'Lal Kitabh' },
    ],
  },
]

/** All 24 consultant sub-category slugs — used for PACT seat allocation */
export const CONSULTANT_SUBCATEGORY_SLUGS: string[] = CONSULTANT_GROUPS.flatMap(
  (g) => (g.children ?? []).map((c) => c.slug)
)

// ═══════════════════════════════════════════════════════════
//  PROJECTS (PDF §5.2.2.1)
// ═══════════════════════════════════════════════════════════
export const PROJECT_CATEGORIES: TaxonomyNode[] = [
  {
    slug: 'residential',
    name: 'Residential',
    children: [
      { slug: 'apartments', name: 'Apartments' },
      { slug: 'group-housing', name: 'Group Housing' },
      { slug: 'plotted-housing', name: 'Plotted Housing' },
      { slug: 'villas', name: 'Villas' },
      { slug: 'high-end-projects', name: 'High End Projects' },
      { slug: 'penthouses', name: 'Penthouses' },
      { slug: 'community-shelters', name: 'Community Shelters' },
    ],
  },
  {
    slug: 'interior',
    name: 'Interior',
    children: [
      { slug: 'int-residential', name: 'Residential' },
      { slug: 'int-commercial-offices', name: 'Commercial & Offices' },
      { slug: 'int-education-sports', name: 'Education & Sports' },
      { slug: 'int-recreations', name: 'Recreations' },
      { slug: 'int-industrials', name: 'Industrial & Factories' },
      { slug: 'int-medical', name: 'Medical & Health Care' },
      { slug: 'int-hospitalities', name: 'Hospitalities' },
      { slug: 'int-public-buildings', name: 'Public Buildings' },
      { slug: 'int-renovations', name: 'Renovations' },
      { slug: 'int-religious', name: 'Religious Buildings' },
    ],
  },
  {
    slug: 'landscaped',
    name: 'Landscaped',
    children: [
      { slug: 'ls-group-housing', name: 'Group Housing' },
      { slug: 'ls-residences', name: 'Residences' },
      { slug: 'ls-factories', name: 'Factories' },
      { slug: 'ls-farm-houses', name: 'Farm Houses' },
      { slug: 'ls-gardens', name: 'Gardens' },
      { slug: 'ls-vertical-green-walls', name: 'Vertical Green Walls' },
      { slug: 'ls-commercial-public', name: 'Commercial & Public Building' },
    ],
  },
  {
    slug: 'commercial-offices',
    name: 'Commercial & Offices',
    children: [
      { slug: 'broadcasting-stations', name: 'Broadcasting Stations' },
      { slug: 'it-parks', name: 'IT Parks' },
      { slug: 'business-parks', name: 'Business Parks' },
      { slug: 'shopping-malls', name: 'Shopping Malls' },
      { slug: 'street-markets', name: 'Big Street Markets' },
      { slug: 'private-offices', name: 'Private Offices' },
      { slug: 'showrooms', name: 'Showrooms' },
      { slug: 'exhibition-centers', name: 'Exhibition Centers' },
    ],
  },
  {
    slug: 'education-sports',
    name: 'Education & Sports',
    children: [
      { slug: 'institutional-building', name: 'Institutional Building' },
      { slug: 'universities', name: 'Universities' },
      { slug: 'colleges', name: 'Colleges' },
      { slug: 'schools', name: 'Schools' },
      { slug: 'hostels', name: 'Hostels' },
      { slug: 'academies', name: 'Academies' },
      { slug: 'stadiums', name: 'Stadiums' },
      { slug: 'playground', name: 'Playground' },
      { slug: 'gymnasiums', name: 'Gymnasiums' },
      { slug: 'swimming-pools', name: 'Swimming Pools' },
      { slug: 'lawns', name: 'Lawns' },
    ],
  },
  {
    slug: 'recreation',
    name: 'Recreation',
    children: [
      { slug: 'community-halls', name: 'Community Halls' },
      { slug: 'banquet-halls', name: 'Banquet Halls' },
      { slug: 'theatres', name: 'Theatres' },
      { slug: 'cinema', name: 'Cinema' },
      { slug: 'clubs', name: 'Clubs' },
      { slug: 'nights-life', name: 'Night Life' },
      { slug: 'pubs-bars', name: 'Pubs & Bars' },
      { slug: 'dance-houses', name: 'Dance Houses' },
      { slug: 'theme-parks', name: 'Theme Parks' },
      { slug: 'water-parks', name: 'Water Parks' },
      { slug: 'night-safari', name: 'Night Safari' },
    ],
  },
  {
    slug: 'industrials-factories',
    name: 'Industrial & Factories',
    children: [
      { slug: 'plotted-factories', name: 'Plotted Factories' },
      { slug: 'big-industries', name: 'Big Industries' },
      { slug: 'ware-house', name: 'Ware House' },
      { slug: 'small-setups', name: 'Small Setups' },
      { slug: 'make-in-india-setups', name: 'Make in India Setups' },
    ],
  },
  {
    slug: 'mixed-use-buildings',
    name: 'Mixed Use Buildings',
    children: [
      { slug: 'mixed-residential-commercial', name: 'Residential & Commercial' },
      { slug: 'mixed-residential-hotel', name: 'Residential & Hotel' },
      { slug: 'mixed-commercial-hotel', name: 'Commercial & Hotel' },
    ],
  },
  {
    slug: 'medical-health-care',
    name: 'Medical & Health Care',
    children: [
      { slug: 'hospitals', name: 'Hospitals' },
      { slug: 'polyclinics', name: 'Polyclinics' },
      { slug: 'dispensaries', name: 'Dispensaries' },
      { slug: 'mohalla-clinics', name: 'Mohalla Clinics' },
      { slug: 'public-toilets', name: 'Public Toilets' },
      { slug: 'rehabilitation-centres', name: 'Rehabilitation Centres' },
      { slug: 'de-addiction-centres', name: 'De-addiction Centres' },
      { slug: 'small-clinics', name: 'Small Clinics' },
      { slug: 'aroma-centres', name: 'Aroma Centres' },
      { slug: 'dental-clinics', name: 'Dental Clinics' },
      { slug: 'rnd-labs', name: 'Research & Development Labs' },
      { slug: 'pathological-labs', name: 'Pathological Labs' },
      { slug: 'pharmaceutical-setups', name: 'Pharmaceutical Setups' },
    ],
  },
  {
    slug: 'hospitality',
    name: 'Hospitality',
    children: [
      { slug: 'restaurants', name: 'Restaurants' },
      { slug: 'coffee-tea-houses', name: 'Coffee & Tea Houses' },
      { slug: 'parlours', name: 'Parlours' },
      { slug: 'hotels', name: 'Hotels' },
      { slug: 'motels', name: 'Motels' },
      { slug: 'lodges', name: 'Lodges' },
      { slug: 'govt-guest-houses', name: 'Govt Guest Houses' },
      { slug: 'private-guest-houses', name: 'Private Guest Houses' },
    ],
  },
  {
    slug: 'innovative-conceptual',
    name: 'Innovative & Conceptual',
    children: [
      { slug: 'space-cities', name: 'Space Cities' },
      { slug: 'other-planet-cities', name: 'Other Planet Cities' },
      { slug: 'floating-cities', name: 'Floating Cities' },
      { slug: 'biological-weapon-proof', name: 'Biological Weapon Proof' },
      { slug: 'earthquake-safe', name: 'Earthquake Safe' },
      { slug: 'earth-scaped-building', name: 'Earth-scaped Building' },
      { slug: 'under-sea', name: 'Under Sea' },
    ],
  },
  {
    slug: 'public-buildings',
    name: 'Public Buildings',
    children: [
      { slug: 'govt-offices', name: 'Govt Offices' },
      { slug: 'dmrc-rly-projects', name: 'DMRC & Rly Projects' },
      { slug: 'dams-highways', name: 'Dams & Highways' },
      { slug: 'police-station', name: 'Police Station' },
      { slug: 'sbt-terminals', name: 'SBT Terminals' },
      { slug: 'bus-stands', name: 'Bus Stands' },
      { slug: 'rly-stations', name: 'Rly Stations' },
      { slug: 'airports', name: 'Airports' },
      { slug: 'control-rooms', name: 'Control Rooms' },
      { slug: 'courts', name: 'Courts' },
      { slug: 'exhibition-centres', name: 'Exhibition Centres' },
    ],
  },
  {
    slug: 'renovation-retrofitting',
    name: 'Renovation & Retrofitting',
    children: [
      { slug: 'buildings-conservation', name: 'Buildings Conservation' },
      { slug: 'heritage-buildings', name: 'Heritage Buildings' },
      { slug: 'disaster-affected-building', name: 'Disaster Affected Building' },
      { slug: 'revamping-face-lifting', name: 'Revamping & Face Lifting' },
      { slug: 'carbon-wrapping', name: 'Carbon Wrapping' },
    ],
  },
  {
    slug: 'religious-buildings',
    name: 'Religious Buildings',
    children: [
      { slug: 'indian-heritage', name: 'Indian Heritage' },
      { slug: 'temples', name: 'Temples' },
      { slug: 'gurudwara', name: 'Gurudwara' },
      { slug: 'church', name: 'Church' },
      { slug: 'mosques', name: 'Mosques' },
      { slug: 'other-spiritual-centres', name: 'Other Spiritual Centres' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════
//  PRODUCTS (PDF §4.1.7.1) — product categories for Corporate / BMF
// ═══════════════════════════════════════════════════════════
export const PRODUCT_CATEGORIES: TaxonomyNode[] = [
  // PDF §4.1.7.1 — Primary → Secondary (4.1.7.1.x) → Tertiary (4.1.7.1.x.y)
  {
    slug: 'buildings-products',
    name: "Building's Products",
    children: [
      {
        slug: 'interior-products',
        name: 'Interior Products',
        children: [
          { slug: 'floor-materials', name: 'Floors Materials and Decors' },
          { slug: 'wall-materials', name: 'Wall Materials and Decors' },
          { slug: 'ceiling-materials', name: 'Ceiling Materials and Decors' },
          { slug: 'cladding-materials', name: 'Cladding Materials and Decors' },
          { slug: 'kitchen-equipment', name: 'Kitchen Equipment and Fitting' },
          { slug: 'toilet-equipment', name: 'Toilet Equipment and Fitting' },
          { slug: 'partition-zalli-works', name: 'Partition and Zalli Works' },
          { slug: 'stone-inlay-works', name: 'Stone and Inlay Works' },
          { slug: 'wooden-material', name: 'Wooden Material' },
          { slug: 'int-doors-windows', name: 'Doors and Window' },
          { slug: 'furniture-artefact', name: 'Furniture and Artefact' },
          { slug: 'fabric-carpets-blinds', name: 'Fabric, Carpets and Blinds' },
          { slug: 'paint-polishing', name: 'Paint and Polishing' },
          { slug: 'glass-film', name: 'Glass and Film' },
          { slug: 'int-hardware-fitting', name: 'Hardware and Fitting' },
          { slug: 'fasteners-screws-nail', name: 'Fasteners, Screws and Nail' },
          { slug: 'int-cnc-works', name: 'CNC Works' },
        ],
      },
      {
        slug: 'exterior-products',
        name: 'Exterior Products',
        children: [
          { slug: 'landscape-products', name: 'Landscaped Materials and Products' },
          { slug: 'facade-materials', name: 'Wall Cladding and Decors' },
          { slug: 'glass-works', name: 'Glass Works' },
          { slug: 'paint-textures', name: 'Paint and Textures' },
          { slug: 'outdoor-furniture', name: 'Outdoor Furniture' },
          { slug: 'gates-doors', name: 'Gates and Doors' },
          { slug: 'swings-gyms', name: 'Swings and Gyms' },
          { slug: 'exterior-art-artefacts', name: 'Exterior Art and Artefacts' },
          { slug: 'stone-inlays-zalli-works', name: 'Stone, Inlays and Zalli Works' },
          { slug: 'metal-works', name: 'Metal Works' },
          { slug: 'ext-hardware-fittings', name: 'Hardware and Fittings' },
          { slug: 'ext-cnc-works', name: 'CNC Works' },
        ],
      },
      {
        slug: 'machines-tools',
        name: 'Machines and Tools',
        children: [
          { slug: 'hand-tools', name: 'Hand Tools' },
          { slug: 'mechanical-tools', name: 'Mechanical Tools' },
          { slug: 'construction-equipment', name: 'Construction Equipment' },
          { slug: 'big-machines-tools', name: 'Big Scale Machines and Tools' },
        ],
      },
      {
        slug: 'innovative-products',
        name: 'Innovative Products',
        children: [
          { slug: 'vertical-garden', name: 'Vertical Garden' },
          { slug: 'physically-challenged-persons', name: 'Physically Challenged Persons' },
        ],
      },
      {
        slug: 'construction-materials',
        name: 'Construction Materials',
        children: [
          { slug: 'soil', name: 'Soil' },
          { slug: 'red-bricks', name: 'Red Bricks' },
          { slug: 'modern-bricks', name: 'Modern Bricks' },
          { slug: 'stones', name: 'Stones' },
          { slug: 'artificial-stones', name: 'Artificial Stones' },
          { slug: 'metals-rods', name: 'Metals and Rods' },
          { slug: 'concretes', name: 'Concretes' },
          { slug: 'cementing-pasting-materials', name: 'Cementing and Pasting Materials' },
          { slug: 'sand-dust', name: 'Sand and Dust' },
          { slug: 'premixed-materials', name: 'Premixed Materials' },
        ],
      },
      {
        slug: 'structural-materials',
        name: 'Structural Materials',
        children: [
          { slug: 'rcc', name: 'RCC' },
          { slug: 'precast', name: 'Precast' },
          { slug: 'steel', name: 'Steel' },
          { slug: 'cements-admixtures', name: 'Cements and Admixtures' },
          { slug: 'composite-materials', name: 'Composite Materials' },
        ],
      },
      {
        slug: 'modern-materials',
        name: 'Modern Materials',
        children: [
          { slug: 'plastic-concrete', name: 'Plastic Concrete' },
          { slug: 'metal-coating-works', name: 'Metal Coating Works' },
          { slug: 'waterproofing-compounds', name: 'Water Proofing Compounds' },
          { slug: 'green-building-needs', name: 'Green Building Needs' },
          { slug: 'disaster-management-saver', name: 'Disasters Management and Saver' },
          { slug: 'carbon-wrapping', name: 'Carbon Wrapping' },
          { slug: 'heat-resistant-paints', name: 'Heat Resistant Paints' },
        ],
      },
      {
        slug: 'mep-equipment-products',
        name: 'MEP Equipment and Products',
        children: [
          { slug: 'plumbing-sanitary', name: 'Plumbing and Sanitary' },
          { slug: 'lifts-escalators', name: 'Lifts and Escalators' },
          { slug: 'electric-electronics', name: 'Electric and Electronics' },
          { slug: 'cctv-communication', name: 'CCTV and Communication' },
          { slug: 'security-automation', name: 'Security and Automation' },
          { slug: 'hvac', name: 'HVAC' },
        ],
      },
      {
        slug: 'graphic-designs-signage',
        name: 'Graphic Designs and Signage',
        children: [
          { slug: 'gs-roads-transportation', name: 'Roads and Transportation' },
          { slug: 'gs-airports-rly-stations', name: 'Airports and Rly Station' },
          { slug: 'gs-hospitals', name: 'Hospitals' },
          { slug: 'gs-commercial-buildings', name: 'Commercial Buildings' },
          { slug: 'gs-residential-buildings', name: 'Residential Building' },
          { slug: 'gs-advertisement', name: 'Advertisement' },
          { slug: 'gs-exhibition', name: 'Exhibition' },
        ],
      },
      {
        slug: '3d-model-makers',
        name: '3-D and Model Makers',
        children: [
          { slug: '3d-walkthrough-developers', name: '3-D and Walkthrough Developers' },
          { slug: '3d-printers', name: '3-D Printers' },
          { slug: 'animation-developers', name: 'Animation Developers' },
          { slug: 'hard-model-makers', name: 'Hard Model Makers' },
        ],
      },
      {
        slug: 'renders-artists-products',
        name: 'Renders and Artist\'s Products',
        children: [
          { slug: 'flat-plain-surfaces', name: 'Flat and Plain Surfaces' },
          { slug: '3d-surfaces', name: '3-D Surfaces' },
        ],
      },
      {
        slug: 'software-hardware-products',
        name: 'Software and Hardware Products',
        children: [
          { slug: 'designing-software', name: 'Designing Software' },
          { slug: 'structural-software', name: 'Structural Software' },
          { slug: 'services-software', name: 'Services Software' },
          { slug: 'computers-for-designers', name: 'Computers for Designers' },
          { slug: 'printers', name: 'Printers' },
          { slug: 'scanners', name: 'Scanners' },
        ],
      },
    ],
  },
  {
    slug: 'engineering-products',
    name: 'Engineering Products',
    children: [
      { slug: 'civil-engineers', name: 'Civil Engineers' },
      { slug: 'value-engineers', name: 'Value Engineers' },
      { slug: 'property-valuers', name: 'Property Valuers' },
      { slug: 'structure-engineers', name: 'Structure Engineers' },
      { slug: 'electrical-engineers', name: 'Electrical Engineers' },
      { slug: 'mechanical-engineers', name: 'Mechanical Engineers' },
      { slug: 'mep-consultants', name: 'MEP Consultants' },
      { slug: 'lighting-consultants', name: 'Lighting Consultants' },
      { slug: 'document-writers', name: 'Document Writers' },
    ],
  },
  {
    slug: 'real-estate-products',
    name: 'Real Estate Products',
    children: [
      { slug: 'builders', name: 'Builders' },
      { slug: 'brokers', name: 'Brokers' },
      { slug: 'renting', name: 'Renting' },
    ],
  },
  {
    slug: 'financial-products',
    name: 'Financial Products',
    children: [
      { slug: 'loans', name: 'Loans' },
      { slug: 'banking', name: 'Banking' },
      { slug: 'insurance', name: 'Insurance' },
      { slug: 'nbfc', name: 'NBFC' },
      { slug: 'payment-realisers', name: 'Payment Realisers' },
      { slug: 'settlements', name: 'Settlements' },
      { slug: 'cibil-clearance', name: 'CIBIL Clearance' },
    ],
  },
  {
    slug: 'indian-traditional-science',
    name: 'Indian Traditional Sciences Products',
    children: [
      { slug: 'astrologers', name: 'Astrologers' },
      { slug: 'kundli-making-reading', name: 'Kundli Making & Reading' },
      { slug: 'signature-reading-correction', name: 'Signature Reading & Correction' },
      { slug: 'punchange-readers', name: 'Punchange Readers' },
      { slug: 'numerologist', name: 'Numerologist' },
      { slug: 'lal-kitabh', name: 'Lal Kitabh' },
    ],
  },
  // NOT in the PDF — added at the client's request (Sept 2026). Keep it.
  {
    slug: 'photo-videography',
    name: 'Photo and Videography',
    children: [
      { slug: 'architecture', name: 'Architecture' },
      { slug: 'building-and-interior', name: 'Building and Interior' },
      { slug: 'events', name: 'Events' },
      { slug: 'products-photography', name: 'Products Photography' },
      { slug: 'glamorous-photography', name: 'Glamorous Photography' },
      { slug: 'construction-photography', name: 'Construction Photography' },
      { slug: 'photojournalism', name: 'Photojournalism' },
      { slug: 'portraiture', name: 'Portraiture' },
      { slug: 'landscape', name: 'Landscape' },
      { slug: 'commercial', name: 'Commercial' },
      { slug: 'food', name: 'Food' },
      { slug: 'wildlife', name: 'Wildlife' },
      { slug: 'fashion', name: 'Fashion' },
      { slug: 'sports', name: 'Sports' },
      { slug: 'macro-photography', name: 'Macro Photography' },
      { slug: 'aerial-drone', name: 'Aerial/Drone' },
      { slug: 'fine-arts', name: 'Fine Arts' },
      { slug: 'astrophotography', name: 'Astrophotography' },
      { slug: 'documentary', name: 'Documentary' },
      { slug: 'life-photography', name: 'Life Photography' },
      { slug: 'wedding', name: 'Wedding' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════
//  AROUND US (PDF §5.2.4.1)
//  Free: Design Competition, New Development, Social Welfare · Paid: Reporting & Publication
// ═══════════════════════════════════════════════════════════
export const AROUND_US_CATEGORIES: TaxonomyNode[] = [
  {
    slug: 'design-competition',
    name: 'Design Competition',
    children: [
      { slug: 'au-designa', name: 'DESIGNA' },
      { slug: 'au-designi', name: 'DESIGNI' },
    ],
  },
  {
    slug: 'new-development',
    name: 'New Development',
    children: [
      { slug: 'news', name: 'News' },
      { slug: 'government-policies', name: 'Government Policies' },
      { slug: 'e-tender', name: 'E-Tender' },
      { slug: 'designers-awards', name: 'Designers Awards' },
      { slug: 'media', name: 'Media' },
    ],
  },
  {
    slug: 'social-welfare',
    name: 'Social Welfare',
    children: [
      { slug: 'need-help', name: 'Need Help' },
      { slug: 'extend-help', name: 'Extend Help' },
      { slug: 'medical-help', name: 'Medical Help' },
      { slug: 'job-help', name: 'Job Help' },
      { slug: 'group-travelling', name: 'Group Travelling' },
      { slug: 'community-invitation', name: 'Community Invitation' },
    ],
  },
  {
    slug: 'reporting-publication',
    name: 'Reporting & Publication',
    children: [
      { slug: 'new-book-magazine', name: 'New Book & Magazine' },
      { slug: 'exhibition', name: 'Exhibition' },
      { slug: 'interviews', name: 'Interviews' },
      { slug: 'seminars', name: 'Seminars' },
      { slug: 'conferences', name: 'Conferences' },
    ],
  },
]

/**
 * The chip strip on `/around-us`, in the order the design draws it.
 *
 * A chip is a filter, not a category: some point at a parent and some at a
 * child, because the design's eight labels sit at both levels of the tree
 * above. `href` is built from these by the page.
 */
export const AROUND_US_CHIPS: {
  key: string
  name: string
  icon: string
  category?: string
  sub?: string
}[] = [
  { key: 'all', name: 'All', icon: 'grid' },
  { key: 'events', name: 'Events', icon: 'calendar', category: 'reporting-publication', sub: 'seminars' },
  { key: 'exhibitions', name: 'Exhibitions', icon: 'box', category: 'reporting-publication', sub: 'exhibition' },
  { key: 'awards', name: 'Awards', icon: 'award', category: 'new-development', sub: 'designers-awards' },
  { key: 'competition', name: 'Design Competition', icon: 'trophy', category: 'design-competition' },
  { key: 'welfare', name: 'Social Welfare', icon: 'heart', category: 'social-welfare' },
  { key: 'policies', name: 'Government Policies', icon: 'shield', category: 'new-development', sub: 'government-policies' },
  { key: 'industry', name: 'Industry News', icon: 'file', category: 'new-development', sub: 'news' },
]

/** §5.2.4.1 — the Free section; everything else (Reporting & Publication) is paid */
export const AROUND_US_FREE_PARENTS: readonly string[] = ['design-competition', 'new-development', 'social-welfare']
/** @deprecated kept for callers that only need Social Welfare */
export const AROUND_US_FREE_PARENT = 'social-welfare'

// ═══════════════════════════════════════════════════════════
//  ARTISTRY (PDF §5.2.5.1) — clients can post here as well
// ═══════════════════════════════════════════════════════════
/**
 * Artistry is grouped, not flat — the mega-menu shows five columns.
 *
 * ⚠️ These slugs are stored on every Artistry posting and appear in URLs.
 *    Renaming one orphans existing content; add new ones instead.
 */
export const ARTISTRY_CATEGORIES: TaxonomyNode[] = [
  {
    slug: 'environments',
    name: 'Environments',
    children: [
      { slug: 'land', name: 'Land' },
      { slug: 'rivers', name: 'Rivers' },
      { slug: 'air', name: 'Air' },
      { slug: 'global-warming', name: 'Global Warming' },
    ],
  },
  {
    slug: 'design-integration',
    name: 'Design Integration',
    children: [
      { slug: 'with-earth', name: 'With Earth' },
      { slug: 'with-water', name: 'With Water' },
      { slug: 'with-fire', name: 'With Fire' },
      { slug: 'with-air', name: 'With Air' },
      { slug: 'with-space', name: 'With Space' },
    ],
  },
  {
    slug: 'arts',
    name: 'Arts',
    children: [
      { slug: 'sculptures', name: 'Sculptures' },
      { slug: 'murals', name: 'Murals' },
      { slug: 'painting', name: 'Painting' },
      { slug: 'graphics', name: 'Graphics' },
      { slug: 'artefacts', name: 'Artefacts' },
      { slug: 'apparels', name: 'Apparels' },
    ],
  },
  {
    slug: 'indian-culture',
    name: 'Indian Culture',
    children: [
      { slug: 'dresses', name: 'Dresses' },
      { slug: 'ceremonies', name: 'Ceremonies' },
      { slug: 'language', name: 'Language' },
    ],
  },
  {
    slug: 'heritage',
    name: 'Heritage',
    children: [
      { slug: 'heritage-buildings', name: 'Heritage Building' },
      { slug: 'lord-shiva', name: 'Lord Shiva' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════
//  BLOG (PDF §5.2.6.1)
// ═══════════════════════════════════════════════════════════
export const BLOG_CATEGORIES: TaxonomyNode[] = [
  { slug: 'technical-papers', name: 'Technical Papers' },
  { slug: 'research-development', name: 'Research and Development' },
  { slug: 'legends-autobiographies', name: "Legend's Autobiographies" },
  { slug: 'learning-reading', name: 'Learning and Reading' },
  { slug: 'lectures', name: 'Lectures' },
  { slug: 'photo-blog', name: 'Photo Blog' },
  { slug: 'webinars', name: 'Webinars' },
  { slug: 'famous-recording', name: 'Famous Recording' },
  { slug: 'copyrights-patents', name: 'Copy Rights and Patents Items' },
]

// ═══════════════════════════════════════════════════════════
//  DESIGN COMPETITION (PDF §5.2.7.1)
// ═══════════════════════════════════════════════════════════
export const COMPETITION_CATEGORIES: TaxonomyNode[] = [
  { slug: 'designa', name: 'Designa' },
  { slug: 'designi', name: 'Designi' },
]

// ═══════════════════════════════════════════════════════════
//  MERCHANDISE + PODCAST — Admin-Seller panel
// ═══════════════════════════════════════════════════════════
export const MERCHANDISE_CATEGORIES: TaxonomyNode[] = [
  { slug: 'apparel', name: 'Apparel' },
  { slug: 'stationery', name: 'Stationery & Drafting' },
  { slug: 'books', name: 'Books & Magazines' },
  { slug: 'accessories', name: 'Accessories' },
  { slug: 'gifts', name: 'Gifts & Collectibles' },
]

export const PODCAST_CATEGORIES: TaxonomyNode[] = [
  { slug: 'legend-interviews', name: 'Interviews with Legends' },
  { slug: 'design-talks', name: 'Design Talks' },
  { slug: 'industry-insights', name: 'Industry Insights' },
  { slug: 'student-corner', name: 'Student Corner' },
  { slug: 'diy', name: 'Do It Yourself (DIY)' },
]
