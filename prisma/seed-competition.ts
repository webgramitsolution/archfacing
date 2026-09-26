/**
 * Design Competitions.
 *
 *   pnpm db:competition
 *
 * Competitions live in the shared `Post` table as `type: 'DESIGN_COMPETITION'`.
 *
 * ─── which column holds what ─────────────────────────────────────────────
 * Everything the listing filters or sorts on sits in a REAL column, so the
 * work happens in SQL rather than in JavaScript after the fact:
 *
 *   prizeMoney         → Prize Pool           (§5.2.4.1.2 column)
 *   eventDate          → Registration Ends    ← the date the listing sorts by
 *   submissionDeadline → Submission Ends      (§5.2.4.1.2 column)
 *   entryFee           → Registration Fee     (null / 0 means free)
 *   isPaidCategory     → the Free / Paid pill
 *   attendeeCount      → Participants
 *   juryRequired       → how many jury seats  (§5.2.4.1.2 column)
 *   category           → the taxonomy slug from COMPETITION_CATEGORIES
 *
 * Everything else — the about copy, the deliverables, the jury, the prize
 * split, the FAQs — goes in `meta`, which is a Json column. `src/lib/
 * competition.ts` is the only place that shape is trusted, and every read
 * there is defaulted so a malformed block can never take a page down.
 *
 * ★ There is deliberately no `status` string anywhere below. "Open for
 *   Registration" / "Closing Soon" / "Closed" is computed from the two real
 *   dates at render time — a stored status goes stale the moment a deadline
 *   passes and then the page lies to the reader.
 *
 * ─── the year ────────────────────────────────────────────────────────────
 * ★ The design sheet dates every competition to 2024. The day and month are
 *   kept exactly as supplied, but the year is moved to NEXT calendar year.
 *   Seeded with 2024 the whole listing would render "Closed" and the hero
 *   would advertise a page with nothing open on it — the opposite of what the
 *   design shows. Next year (rather than this one) is used so the seed still
 *   reads as open no matter which month it is run in.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { PROJECT_PHOTOS, ARTICLE_PHOTOS, PERSON_PHOTOS } from '../src/config/content-media'
import { unsplash } from '../src/config/club-media'

const prisma = new PrismaClient()

/** ★ see the note above — day and month from the design, year moved forward. */
const YEAR = new Date().getFullYear() + 1

/**
 * A date in the seed year.
 *
 * The `hour` argument exists so no two competitions share a timestamp —
 * "Ending Soon" orders by `eventDate`, and ties there make the order between
 * two rows arbitrary and different on every request.
 */
const on = (month: number, day: number, hour = 9) =>
  new Date(YEAR, month - 1, day, hour, 0, 0, 0)

// ═══════════════════════════════════════════════════════════
//  Jury — real User rows, so a portrait is a person on the
//  platform rather than a name typed into a JSON blob
// ═══════════════════════════════════════════════════════════

/*
 * No seeded jury.
 *
 * These were invented architects, created as real ACTIVE User rows with stock
 * portraits, and presented publicly as the panel judging live entries. A jury
 * is a claim about who is assessing someone's work, so it stays empty until
 * named jurors have agreed to serve. The detail page's "Expert Jury" section
 * self-hides when `meta.jury` is empty.
 */
const JURY: {
  name: string; role: string; email: string; firm: string
  city: string; state: string; pincode: string; photo: string; bio: string
}[] = []

// ═══════════════════════════════════════════════════════════
//  The reference competition's detail payload
// ═══════════════════════════════════════════════════════════

const REFERENCE_META = {
  kind: 'competition',
  categoryLabel: 'Architecture',
  featured: true,

  about: [
    'We invite architects, designers, and creative thinkers to design a visionary community center that fosters social interaction, sustainability, and inclusivity. The design should reflect innovation, functionality, and environmental responsibility.',
  ],
  focusTitle: 'Your design should focus on:',
  focus: [
    'Sustainable and eco-friendly design',
    'Community engagement and inclusivity',
    'Innovative use of space and materials',
    'Functional and aesthetic excellence',
  ],

  eligibility: [
    { icon: 'user', title: 'Students', body: 'Architecture & design students from recognized institutions' },
    { icon: 'shield', title: 'Professionals', body: 'Architects, designers & industry professionals' },
    { icon: 'users', title: 'Teams', body: 'Individual or team of maximum 4 members' },
  ],

  deliverables: [
    { icon: 'grid', title: 'Design Boards', body: '2 A1 size boards' },
    { icon: 'file', title: 'Concept Note', body: 'Max 500 words' },
    { icon: 'chart', title: 'Drawings', body: 'Plans, sections, elevations' },
    { icon: 'box', title: '3D Views', body: 'Min. 2 rendered perspectives' },
    { icon: 'inbox', title: 'Format', body: 'PDF (Max 20MB)' },
  ],

  warning:
    'All submissions must be original and unpublished work. Plagiarism will lead to immediate disqualification.',

  /** Referenced by email — the page reads the real User row for each. */
  jury: JURY.map((j) => ({
    name: j.name,
    role: j.role,
    email: j.email,
    photo: unsplash(j.photo, { w: 200, h: 200 }),
  })),

  /**
   * The two dates the reader acts on — Registration Ends and Submission Ends —
   * are real columns and are NOT repeated here. These are the three that
   * nothing filters or sorts on.
   */
  registrationStartsAt: on(4, 1, 9).toISOString(),
  queryDeadlineAt: on(5, 20, 18).toISOString(),
  resultsAt: on(6, 10, 17).toISOString(),

  /** The split of the ₹5,000 pool. The three must add up to the prizeMoney column. */
  prizes: [
    { place: 'Winner', label: '1st Prize', amount: 3000 },
    { place: '1st Runner Up', label: '2nd Prize', amount: 1500 },
    { place: '2nd Runner Up', label: '3rd Prize', amount: 500 },
  ],

  guidelines: [
    {
      title: 'Site and programme',
      points: [
        'The site is a 4,000 sq.m corner plot in a dense mixed-use neighbourhood. A measured survey and context plan are issued with the registration pack.',
        'The brief asks for a multipurpose hall, a reading room, two workshop studios, a community kitchen, and shaded outdoor gathering space.',
        'Built-up area must stay between 1,800 and 2,400 sq.m. Anything outside that range is treated as non-compliant.',
      ],
    },
    {
      title: 'Presentation',
      points: [
        'Two A1 boards, portrait, at 150 DPI, combined into a single PDF no larger than 20 MB.',
        'Every board must carry your registration number in the bottom-right corner and nothing else that identifies you.',
        'All drawings must be metric and to a stated scale. Use a graphic scale bar rather than a written ratio alone.',
      ],
    },
    {
      title: 'Anonymity',
      points: [
        'No name, firm name, logo, college name or watermark may appear anywhere in the submission.',
        'Entries carrying an identifying mark are withdrawn from judging without refund.',
      ],
    },
    {
      title: 'Rights',
      points: [
        'You keep the copyright in your entry.',
        'By entering you grant ArchFacing a non-exclusive right to publish the entry, with credit, in connection with this competition.',
      ],
    },
  ],

  evaluation: [
    { label: 'Concept & Originality', weight: 25, body: 'How clear and how genuinely new the central idea is.' },
    { label: 'Sustainability', weight: 25, body: 'Passive strategy, material choice, water and energy, and the honesty of the claims made.' },
    { label: 'Community & Inclusivity', weight: 20, body: 'How well the plan serves every age and ability that will use it.' },
    { label: 'Functionality & Planning', weight: 20, body: 'Circulation, servicing, daylight, and whether the brief is actually met.' },
    { label: 'Presentation', weight: 10, body: 'Legibility of the boards, the drawings, and the written concept note.' },
  ],

  timeline: [
    { label: 'Registration Opens', dateKey: 'registrationStartsAt', body: 'Entry opens to students, professionals and teams. The site pack is issued on registration.' },
    { label: 'Registration Closes', dateKey: 'registrationEnds', body: 'Last date to register and pay the entry fee. No late registrations are taken.' },
    { label: 'Query Deadline', dateKey: 'queryDeadlineAt', body: 'Last date to send questions about the brief. A consolidated answer sheet goes to every registrant.' },
    { label: 'Submission Deadline', dateKey: 'submissionEnds', body: 'Boards and the concept note are due, in one PDF, by 23:59 IST.' },
    { label: 'Results Announced', dateKey: 'resultsAt', body: 'Winners are published on this page and notified by email. Certificates follow within two weeks.' },
  ],

  faqs: [
    {
      question: 'Who can enter this competition?',
      answer:
        'Architecture and design students from recognized institutions, and practising architects, designers and industry professionals. You may enter alone or as a team of up to four people.',
    },
    {
      question: 'Can I submit more than one entry?',
      answer:
        'Yes. Each entry needs its own registration and its own fee, and each is judged independently of the others.',
    },
    {
      question: 'What exactly do I have to submit?',
      answer:
        'Two A1 boards carrying your plans, sections, elevations and at least two rendered perspectives, plus a concept note of no more than 500 words. Everything goes in a single PDF of 20 MB or less.',
    },
    {
      question: 'Is the registration fee refundable?',
      answer:
        'No. The fee covers the site pack, the query round and the jury process, all of which begin as soon as you register.',
    },
    {
      question: 'Does my entry have to be anonymous?',
      answer:
        'Yes. Nothing on the boards may identify you — no name, firm, logo, college or watermark. Your registration number is the only mark that belongs on the sheet.',
    },
    {
      question: 'Who owns the design after the competition?',
      answer:
        'You do. Entering grants ArchFacing a non-exclusive right to publish your entry with credit alongside this competition; the copyright stays with you.',
    },
  ],
}

// ═══════════════════════════════════════════════════════════
//  The four competitions, exactly as the listing design names them
// ═══════════════════════════════════════════════════════════

type Seed = {
  slug: string
  title: string
  description: string
  /** taxonomy slug from COMPETITION_CATEGORIES */
  category: string
  /** the label the design prints under the title */
  categoryLabel: string
  prizeMoney: number
  /** → Post.eventDate */
  registrationEnds: Date
  /** → Post.submissionDeadline */
  submissionEnds: Date
  participants: number
  /** null means free entry */
  entryFee: number | null
  juryRequired: number
  image: string
  /** extra photographs behind the hero's "View Gallery" button */
  gallery?: string[]
  featured?: boolean
  detail?: typeof REFERENCE_META
}

const COMPETITIONS: Seed[] = [
  {
    slug: 'future-community-center-design',
    title: 'Future Community Center Design',
    description:
      'Design a sustainable community center that brings people together and promotes environmental responsibility.',
    category: 'designa',
    categoryLabel: 'Designa',
    prizeMoney: 5000,
    registrationEnds: on(5, 15, 18),
    submissionEnds: on(5, 30, 23),
    participants: 120,
    entryFee: 1500,
    juryRequired: 4,
    image: ARTICLE_PHOTOS.greenBuilding,
    // Context photographs issued with the brief, not photographs of entries —
    // there are no entries yet. The gallery caption says as much.
    gallery: [
      ARTICLE_PHOTOS.urbanDesign,
      ARTICLE_PHOTOS.collaboration,
      ARTICLE_PHOTOS.construction,
      ARTICLE_PHOTOS.biophilic,
    ],
    featured: true,
    detail: REFERENCE_META,
  },
  {
    slug: 'modern-minimalist-interior',
    title: 'Modern Minimalist Interior',
    description:
      'Reimagine a compact urban apartment where every surface earns its place — light, storage and calm, with nothing spare.',
    category: 'designi',
    categoryLabel: 'Designi',
    prizeMoney: 3000,
    registrationEnds: on(5, 10, 18),
    submissionEnds: on(5, 25, 23),
    participants: 85,
    entryFee: null,
    juryRequired: 3,
    image: ARTICLE_PHOTOS.interiorTrends,
  },
  {
    slug: 'sustainable-urban-housing',
    title: 'Sustainable Urban Housing',
    description:
      'Propose a mid-rise housing block for an Indian metro that stays cool without mechanical help and still feels generous to live in.',
    category: 'designa',
    categoryLabel: 'Designa',
    prizeMoney: 7500,
    registrationEnds: on(5, 20, 18),
    submissionEnds: on(6, 10, 23),
    participants: 210,
    entryFee: 1000,
    juryRequired: 5,
    image: ARTICLE_PHOTOS.urbanDesign,
  },
  {
    slug: 'landscape-design-challenge',
    title: 'Landscape Design Challenge',
    description:
      'Turn a neglected two-acre city edge into a public landscape that holds water, shade and people through every season.',
    category: 'designa',
    categoryLabel: 'Designa',
    prizeMoney: 2000,
    registrationEnds: on(5, 5, 18),
    submissionEnds: on(5, 20, 23),
    participants: 60,
    entryFee: null,
    juryRequired: 3,
    // ⚠️ `PROJECT_PHOTOS.gardenHouse` reads as a bedroom now rather than the
    //    planted house its comment describes — the resort pool between palms
    //    is the one in the library that actually looks like landscape work.
    image: PROJECT_PHOTOS.resort,
  },
]

// ═══════════════════════════════════════════════════════════

async function main() {
  console.log(`\n── Design Competitions · seed year ${YEAR} ──\n`)

  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!admin) throw new Error('No SUPER_ADMIN found — run `pnpm db:seed` first.')

  // ─── jury members ───
  console.log('── Jury ──')
  for (const j of JURY) {
    const user = await prisma.user.upsert({
      where: { email: j.email },
      create: {
        email: j.email,
        name: j.name,
        role: 'PROFESSIONAL',
        status: 'ACTIVE',
        emailVerified: new Date(),
        profilePhoto: unsplash(j.photo, { w: 200, h: 200 }),
        city: j.city,
        state: j.state,
        pincode: j.pincode,
      },
      update: { name: j.name, profilePhoto: unsplash(j.photo, { w: 200, h: 200 }) },
    })

    await prisma.professionalProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        designaType: 'DESIGNA',
        tier: 'PROFESSIONAL',
        firmName: j.firm,
        bio: `${j.role} at ${j.firm}.`,
        isVerified: true,
        verifiedAt: new Date(),
        categories: [],
      },
      update: { firmName: j.firm, bio: `${j.role} at ${j.firm}.`, isVerified: true },
    })

    console.log(`  ✓ ${j.name.padEnd(18)} ${j.role}`)
  }

  // ─── competitions ───
  console.log('\n── Competitions ──')
  for (const c of COMPETITIONS) {
    const meta = {
      ...(c.detail ?? { kind: 'competition' }),
      categoryLabel: c.categoryLabel,
      featured: c.featured ?? false,
      heroImage: unsplash(c.image, { w: 1200, h: 900 }),
      cardImage: unsplash(c.image, { w: 600, h: 450 }),
    }

    const data = {
      type: 'DESIGN_COMPETITION' as const,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      title: c.title,
      description: c.description,
      category: c.category,
      year: YEAR,
      publishedAt: new Date(),

      // ─── real columns, because the listing filters and sorts on them ───
      prizeMoney: new Prisma.Decimal(c.prizeMoney),
      eventDate: c.registrationEnds, // Registration Ends
      submissionDeadline: c.submissionEnds, // Submission Ends
      entryFee: c.entryFee === null ? null : new Prisma.Decimal(c.entryFee),
      isPaidCategory: c.entryFee !== null,
      attendeeCount: c.participants,
      juryRequired: c.juryRequired,
      needsDesignAssociate: false,
      visibleToDesigna: true,
      visibleToDesigni: true,

      meta: meta as unknown as Prisma.InputJsonValue,
    }

    const post = await prisma.post.upsert({
      where: { slug: c.slug },
      create: { ...data, slug: c.slug },
      update: data,
    })

    // The hero image first, then the gallery, so `post.media` matches the rest
    // of the app and the detail page's "View Gallery" has somewhere real to go.
    await prisma.media.deleteMany({ where: { postId: post.id } })
    const photos = [c.image, ...(c.gallery ?? [])]
    for (const [i, photo] of photos.entries()) {
      await prisma.media.create({
        data: {
          postId: post.id,
          type: 'IMAGE',
          url: unsplash(photo, { w: 1200, h: 900 }),
          thumbnailUrl: unsplash(photo, { w: 600, h: 450 }),
          fileName: `${c.slug}-${i + 1}.jpg`,
          mimeType: 'image/jpeg',
          sortOrder: i,
        },
      })
    }

    const fee = c.entryFee === null ? 'Free' : `₹${c.entryFee}`
    console.log(
      `  ✓ ${c.title.padEnd(32)} ₹${String(c.prizeMoney).padEnd(6)} ` +
        `reg ${c.registrationEnds.toDateString().slice(4, 10)} · ` +
        `sub ${c.submissionEnds.toDateString().slice(4, 10)} · ` +
        `${c.participants}+ · ${fee}`
    )
  }

  console.log(
    `\n${COMPETITIONS.length} competitions · ${JURY.length} jury members · ` +
      `1 with the full detail payload\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
