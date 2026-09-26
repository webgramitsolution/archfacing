/**
 * ArchFacing Club events.
 *
 *   pnpm db:club
 *
 * The five events from the design, upserted by slug so re-running updates
 * rather than duplicating.
 *
 * Dates keep the day and month from the design (24 May, 5 Jun, 15 Jun,
 * 28 Jun, 10 Jul) so the date badges read as designed, but sit in the next
 * calendar year — a page of events that have all already happened is not a
 * working "Upcoming Events" section. The weekday is computed from the real
 * date, never hard-coded, so it can't drift out of step.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { CLUB_PHOTOS, SPEAKER_PHOTOS, CLUB_GALLERY, unsplash } from '../src/config/club-media'

const prisma = new PrismaClient()

/** The year the seeded events fall in — next year, so they are upcoming. */
const YEAR = new Date().getFullYear() + 1

function at(month: number, day: number, hour: number, minute = 0): Date {
  return new Date(YEAR, month - 1, day, hour, minute, 0, 0)
}

const HIGHLIGHTS = [
  { title: 'Expert Insights', body: 'Learn from leading industry experts', icon: 'star' },
  { title: 'Latest Trends', body: 'Discover the latest in sustainable design', icon: 'chart' },
  { title: 'Case Studies', body: 'Real-world projects and solutions', icon: 'file' },
  { title: 'Networking', body: 'Connect with industry professionals', icon: 'users' },
  { title: 'Knowledge Sharing', body: 'Exchange ideas and best practices', icon: 'grid' },
]

const EVENTS = [
  {
    slug: 'future-of-sustainable-architecture',
    title: 'Future of Sustainable Architecture',
    type: 'SEMINAR' as const,
    summary:
      'Explore latest trends and innovations in sustainable architecture and green building.',
    description: [
      "The architecture industry is changing rapidly, and sustainability is no longer an option—it's a responsibility. This seminar brings together industry leaders, architects, designers, and sustainability experts to discuss innovative solutions and the future of green building.",
      'Join us for an insightful session packed with expert talks, real-world case studies, and networking opportunities.',
    ].join('\n\n'),
    heroImage: unsplash(CLUB_PHOTOS.seminar, { w: 1600, h: 900 }),
    startsAt: at(5, 24, 10, 0),
    endsAt: at(5, 24, 13, 0),
    isOnline: false,
    venueName: 'India Habitat Centre',
    venueAddress: 'Lodhi Road, New Delhi - 110003',
    city: 'New Delhi',
    contactPhone: '+91 96679 87129',
    contactEmail: 'club@archfacing.com',
    totalSeats: 200,
    seatsTaken: 72,
    earlyBirdPrice: 499,
    earlyBirdTill: at(5, 15, 23, 59),
    standardPrice: 699,
    spotPrice: 899,
    audience: [
      'Architects', 'Interior Designers', 'Engineers', 'Urban Planners',
      'Students', 'Developers', 'Manufacturers', 'Academicians',
      'Researchers', 'Sustainability Enthusiasts',
    ],
    includes: [
      'Access to all sessions', 'Event Kit & Materials', 'Networking Lunch',
      'Certificate of Participation', 'Q&A with Speakers', 'Exclusive Networking',
    ],
    highlights: HIGHLIGHTS,
    sponsors: [] as { name: string; tier: string }[],
    speakers: [] as { name: string; role: string; company: string; photo: string; bio: string }[],
    agenda: [
      { startTime: '10:00 AM', endTime: '10:30 AM', title: 'Registration & Welcome Tea', detail: 'Collect your event kit and badge.' },
      { startTime: '10:30 AM', endTime: '11:00 AM', title: 'Opening Address', detail: 'Where Indian practice stands on sustainability today.', speaker: 'Ar. Karan Grover' },
      { startTime: '11:00 AM', endTime: '11:45 AM', title: 'Certification, Honestly', detail: 'What IGBC and LEED actually change on site, and what they do not.', speaker: 'Ar. Ritu Sharma' },
      { startTime: '11:45 AM', endTime: '12:15 PM', title: 'Adaptive Reuse: Three Projects', detail: 'Keeping the structure and changing everything else.', speaker: 'Ar. Sameer Puri' },
      { startTime: '12:15 PM', endTime: '01:00 PM', title: 'Passive Cooling Panel & Q&A', detail: 'An open panel with all speakers.', speaker: 'Dr. Meera Sinha' },
      { startTime: '01:00 PM', endTime: '02:00 PM', title: 'Networking Lunch', detail: 'Continue the conversation over lunch.' },
    ],
    faqs: [
      { question: 'Do I need to be a Club member to attend?', answer: 'No. The seminar is open to everyone. Club members pay a lower rate and get priority registration, but anyone may buy a pass.' },
      { question: 'Will I get a certificate?', answer: 'Yes. A Certificate of Participation is issued to every attendee who checks in at the venue, and is emailed within three working days of the event.' },
      { question: 'Can I transfer my pass to a colleague?', answer: 'Yes, up to 48 hours before the event. Write to club@archfacing.com with the new attendee’s name and email and we will reissue the ticket.' },
      { question: 'Is there a group discount?', answer: 'Yes, for three or more attendees from the same firm. Contact us before booking and we will share a group code.' },
      { question: 'What is the refund policy?', answer: 'Cancellations are considered within 15 days of payment, and any approved refund is capped at 25% of the amount paid, as set out in our Return, Refund & Cancellation Policy.' },
      { question: 'Is parking available?', answer: 'India Habitat Centre has paid basement parking, which fills up by mid-morning. The venue is a ten-minute walk from Jor Bagh metro station.' },
    ],
  },

  {
    slug: 'buildtech-expo-2024',
    title: 'BuildTech Expo',
    type: 'EXHIBITION' as const,
    summary:
      "India's leading exhibition on building materials, products & interior solutions.",
    description: [
      'BuildTech brings the supply side of the industry under one roof — materials, fittings, surfaces, systems and the people who make them.',
      'Three halls, more than two hundred exhibitors, and a full programme of product demonstrations running through the day.',
    ].join('\n\n'),
    heroImage: unsplash(CLUB_PHOTOS.exhibition, { w: 1600, h: 900 }),
    startsAt: at(6, 5, 10, 0),
    endsAt: at(6, 5, 18, 0),
    isOnline: false,
    venueName: 'Bombay Exhibition Centre',
    venueAddress: 'Goregaon East, Mumbai - 400063',
    city: 'Mumbai',
    contactPhone: '+91 96679 87129',
    contactEmail: 'club@archfacing.com',
    totalSeats: 1200,
    seatsTaken: 640,
    earlyBirdPrice: 299,
    earlyBirdTill: at(5, 25, 23, 59),
    standardPrice: 499,
    spotPrice: 699,
    audience: ['Architects', 'Interior Designers', 'Contractors', 'Developers', 'Dealers', 'Manufacturers', 'Students'],
    includes: ['Entry to all three halls', 'Exhibitor directory', 'Product demonstrations', 'Networking Lounge access'],
    highlights: HIGHLIGHTS,
    speakers: [] as { name: string; role: string; company: string; photo: string; bio: string }[],
    agenda: [
      { startTime: '10:00 AM', endTime: '11:00 AM', title: 'Doors Open — Hall 1, 2 and 3' },
      { startTime: '11:30 AM', endTime: '12:30 PM', title: 'Facade Systems Demonstration', speaker: 'Ar. Rohan Mehta' },
      { startTime: '02:00 PM', endTime: '03:00 PM', title: 'Surfaces & Finishes Walkthrough', speaker: 'Ar. Priya Desai' },
      { startTime: '04:00 PM', endTime: '06:00 PM', title: 'Open Floor & Dealer Meetings' },
    ],
    faqs: [
      { question: 'Can I attend for only part of the day?', answer: 'Yes. Your pass is valid for the whole day and you may come and go as you like.' },
      { question: 'Is the exhibitor list published in advance?', answer: 'Yes, a directory goes out by email one week before the event and is handed out at the entrance.' },
      { question: 'Can I exhibit at the next edition?', answer: 'Write to club@archfacing.com and we will send the exhibitor pack for the next edition.' },
    ],
  },

  {
    slug: 'webinar-design-to-delivery',
    title: 'Webinar: Design to Delivery',
    type: 'WEBINAR' as const,
    summary:
      'Learn how to streamline your design to delivery process with digital tools.',
    description: [
      'The gap between a drawing set and what actually gets built is where most practices lose time and money.',
      'This one-hour session walks through a working digital pipeline — model to tender to site — using tools most studios already own.',
    ].join('\n\n'),
    heroImage: unsplash(CLUB_PHOTOS.webinar, { w: 1600, h: 900 }),
    startsAt: at(6, 15, 16, 0),
    endsAt: at(6, 15, 17, 0),
    isOnline: true,
    venueName: 'Online',
    venueAddress: 'Joining link is emailed an hour before the session',
    city: null,
    contactPhone: '+91 96679 87129',
    contactEmail: 'club@archfacing.com',
    totalSeats: 500,
    seatsTaken: 180,
    earlyBirdPrice: null,
    earlyBirdTill: null,
    standardPrice: 0,
    spotPrice: null,
    audience: ['Architects', 'Interior Designers', 'Project Managers', 'Students'],
    includes: ['Live session', 'Recording for 30 days', 'Slide deck', 'Q&A with the speaker'],
    highlights: HIGHLIGHTS.slice(0, 4),
    speakers: [] as { name: string; role: string; company: string; photo: string; bio: string }[],
    agenda: [
      { startTime: '04:00 PM', endTime: '04:10 PM', title: 'Introduction' },
      { startTime: '04:10 PM', endTime: '04:40 PM', title: 'Model to Tender in One Pipeline', speaker: 'Ar. Vikram Nair' },
      { startTime: '04:40 PM', endTime: '05:00 PM', title: 'Live Q&A' },
    ],
    faqs: [
      { question: 'Is the webinar really free?', answer: 'Yes. Webinars are free for everyone; Club members additionally get the recording library.' },
      { question: 'Will I get the recording?', answer: 'Yes, a link is emailed within 24 hours and stays available for 30 days.' },
      { question: 'What if I cannot attend live?', answer: 'Register anyway. The recording goes to everyone who registered, whether or not they attended.' },
    ],
  },

  {
    slug: 'architects-networking-meet',
    title: 'Architects Networking Meet',
    type: 'NETWORKING' as const,
    summary:
      'Meet, connect and collaborate with architects, designers and industry experts.',
    description: [
      'An evening built for conversation rather than presentations. No stage, no slide decks.',
      'Come with work to show and questions to ask. We keep the group deliberately small so everyone actually gets talked to.',
    ].join('\n\n'),
    heroImage: unsplash(CLUB_PHOTOS.networking, { w: 1600, h: 900 }),
    startsAt: at(6, 28, 18, 0),
    endsAt: at(6, 28, 21, 0),
    isOnline: false,
    venueName: 'The Leela Palace',
    venueAddress: 'Old Airport Road, Bengaluru - 560008',
    city: 'Bengaluru',
    contactPhone: '+91 96679 87129',
    contactEmail: 'club@archfacing.com',
    totalSeats: 120,
    seatsTaken: 94,
    earlyBirdPrice: 799,
    earlyBirdTill: at(6, 15, 23, 59),
    standardPrice: 999,
    spotPrice: 1299,
    audience: ['Architects', 'Interior Designers', 'Consultants', 'Developers', 'Manufacturers'],
    includes: ['Evening refreshments', 'Curated introductions', 'Member directory access', 'Portfolio display table'],
    highlights: HIGHLIGHTS.slice(0, 4),
    speakers: [] as { name: string; role: string; company: string; photo: string; bio: string }[],
    agenda: [
      { startTime: '06:00 PM', endTime: '06:30 PM', title: 'Arrival & Registration' },
      { startTime: '06:30 PM', endTime: '07:00 PM', title: 'Introductions Round', detail: 'Two minutes each — who you are and what you are working on.' },
      { startTime: '07:00 PM', endTime: '09:00 PM', title: 'Open Networking & Dinner' },
    ],
    faqs: [
      { question: 'How many people attend?', answer: 'We cap it at 120 so the room stays workable. It usually sells out two weeks ahead.' },
      { question: 'Can I bring printed work?', answer: 'Yes, please do. There are display tables along one wall, first come first served.' },
      { question: 'Is there a dress code?', answer: 'Smart casual. Nobody will turn you away for it.' },
    ],
  },

  {
    slug: 'archfacing-annual-conference',
    title: 'ArchFacing Annual Conference',
    type: 'CONFERENCE' as const,
    summary:
      'A day of insights, inspiration and innovation with industry leaders.',
    description: [
      'Our largest event of the year — a full day across two tracks, closing with the ArchFacing Design Awards.',
      'Practice owners, material brands, students and policy voices in one building, once a year.',
    ].join('\n\n'),
    heroImage: unsplash(CLUB_PHOTOS.conference, { w: 1600, h: 900 }),
    startsAt: at(7, 10, 9, 0),
    endsAt: at(7, 10, 17, 0),
    isOnline: false,
    venueName: 'To be announced',
    venueAddress: 'Mathura Road, New Delhi - 110001',
    city: 'New Delhi',
    contactPhone: '+91 96679 87129',
    contactEmail: 'club@archfacing.com',
    totalSeats: 800,
    seatsTaken: 310,
    earlyBirdPrice: 1499,
    earlyBirdTill: at(6, 20, 23, 59),
    standardPrice: 1999,
    spotPrice: 2499,
    audience: ['Architects', 'Interior Designers', 'Engineers', 'Urban Planners', 'Developers', 'Manufacturers', 'Students', 'Academicians'],
    includes: ['Both conference tracks', 'Lunch & refreshments', 'Conference kit', 'Design Awards evening', 'Certificate of Participation', 'Recording library access'],
    highlights: HIGHLIGHTS,
    sponsors: [] as { name: string; tier: string }[],
    speakers: [] as { name: string; role: string; company: string; photo: string; bio: string }[],
    agenda: [
      { startTime: '09:00 AM', endTime: '09:45 AM', title: 'Registration & Breakfast' },
      { startTime: '09:45 AM', endTime: '10:30 AM', title: 'Opening Keynote', speaker: 'Ar. Karan Grover' },
      { startTime: '10:30 AM', endTime: '01:00 PM', title: 'Track A: Practice · Track B: Policy', detail: 'Two parallel tracks; move between them freely.' },
      { startTime: '01:00 PM', endTime: '02:00 PM', title: 'Lunch' },
      { startTime: '02:00 PM', endTime: '04:00 PM', title: 'Track A: Interiors · Track B: Materials', speaker: 'Ar. Priya Desai' },
      { startTime: '04:00 PM', endTime: '05:00 PM', title: 'ArchFacing Design Awards', speaker: 'Ar. Ritu Sharma' },
    ],
    faqs: [
      { question: 'Can I switch between tracks?', answer: 'Yes. Both halls are open all day and your pass covers both.' },
      { question: 'Are the sessions recorded?', answer: 'Yes. Attendees get access to the full recording library for twelve months.' },
      { question: 'How do I enter the Design Awards?', answer: 'Entries open three months before the conference and are announced to Club members first.' },
      { question: 'Is accommodation included?', answer: 'No, but we hold a block of rooms at a nearby hotel at a reduced rate. Ask us for the code after you register.' },
    ],
  },
]

async function main() {
  console.log(`\n── ArchFacing Club events (${YEAR}) ──\n`)

  for (const e of EVENTS) {
    const { speakers, agenda, faqs, earlyBirdPrice, spotPrice, standardPrice, ...rest } = e

    const data = {
      ...rest,
      standardPrice: new Prisma.Decimal(standardPrice),
      earlyBirdPrice: earlyBirdPrice === null ? null : new Prisma.Decimal(earlyBirdPrice),
      spotPrice: spotPrice === null || spotPrice === undefined ? null : new Prisma.Decimal(spotPrice),
      gallery: CLUB_GALLERY.slice(0, 5).map((id) => unsplash(id, { w: 600, h: 400 })),
      status: 'PUBLISHED' as const,
    }

    const event = await prisma.clubEvent.upsert({
      where: { slug: e.slug },
      create: data,
      update: data,
    })

    // Children are replaced wholesale — simpler than diffing, and these
    // tables are only ever written by this seed.
    await prisma.clubEventSpeaker.deleteMany({ where: { eventId: event.id } })
    await prisma.clubAgendaItem.deleteMany({ where: { eventId: event.id } })
    await prisma.clubEventFaq.deleteMany({ where: { eventId: event.id } })

    await prisma.clubEventSpeaker.createMany({
      data: speakers.map((s, i) => ({
        eventId: event.id,
        ...s,
        photo: unsplash(s.photo, { w: 320, h: 320 }),
        sortOrder: i,
      })),
    })
    await prisma.clubAgendaItem.createMany({
      data: agenda.map((a, i) => ({ eventId: event.id, ...a, sortOrder: i })),
    })
    await prisma.clubEventFaq.createMany({
      data: faqs.map((f, i) => ({ eventId: event.id, ...f, sortOrder: i })),
    })

    const day = event.startsAt.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', weekday: 'short',
    })
    console.log(
      `  ✓ ${e.type.padEnd(11)} ${day.padEnd(26)} ${e.title}`
    )
    console.log(
      `    ${speakers.length} speakers · ${agenda.length} agenda items · ${faqs.length} FAQs · ${event.totalSeats - event.seatsTaken}/${event.totalSeats} seats left`
    )
  }

  console.log(`\n${EVENTS.length} events ready.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
