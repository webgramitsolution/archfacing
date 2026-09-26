import type { Metadata } from 'next'
import { platformStats, statValue } from '@/lib/platform-stats'
import Image from 'next/image'
import Link from 'next/link'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Icon, type IconName } from '@/components/ui'
import { PERSON_PHOTOS, unsplash } from '@/config/content-media'
import { MembershipPhone } from '@/components/mobile/pages/membership-phone'
import { subscriptionPlans } from '@/lib/membership'
import { publicHref } from '@/lib/visitor'

/**
 * ArchFacing Membership — the public "become a Verified Member" page.
 *
 * ★ Server Component, no client JavaScript. The two carousels are scroll-snap
 *   rails moved by `#id` anchors and the FAQ is a run of `<details>`, so
 *   nothing here ships a bundle.
 *
 * ★ Wired to the real account state. `auth()` plus one profile read decide
 *   which of three states the page speaks in — signed out, signed in but not
 *   yet verified, or already verified — and every call to action points at
 *   the step that account actually needs next. Verification itself is the
 *   existing admin flow (`verifyUserAction` sets `status: ACTIVE` and
 *   `profile.isVerified`), so "How Membership Works" describes what the code
 *   really does.
 *
 * ★ The ONLY thing this page reads from the database is the viewer's own
 *   account state. Every figure, quote and photograph is hard-coded, and the
 *   four blocks that a reader could mistake for real data are each marked
 *   where they are defined: MARKETING (the headline member count),
 *   DEMO_STORIES (the two testimonials), DEMO_FACES (the avatar row) and the
 *   Free-member quota column inside COMPARE, which is a published offer the
 *   code does not yet enforce. All four need replacing before launch.
 */

/** The deep navy of the supplied design — bluer than the site's `navy` token. */
const NAVY = '#0B2545'

export const metadata: Metadata = {
  title: 'Membership',
  description:
    'Become a Verified ArchFacing Member. Publish unlimited projects, products, ' +
    'artistry, blogs and updates, rank higher in search and grow your business ' +
    'on India’s architecture and design platform.',
}

/** The client's own membership banner. */
const HERO_BANNER =
  'https://ik.imagekit.io/archfacing/membership%20banner%20002.png?updatedAt=1784623300050'

/**
 * MARKETING — the headline network size from the design. This is a claim about
 * the platform, not a row count; the live figures live on each listing page.
 */

const HERO_FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'user', title: 'Build Your Identity', body: 'Create a professional presence' },
  { icon: 'eye', title: 'Gain Visibility', body: 'Get discovered by the right audience' },
  { icon: 'image', title: 'Publish & Showcase', body: 'Share your work, ideas & achievements' },
  { icon: 'trending', title: 'Grow Your Business', body: 'Generate leads & expand your network' },
]

const WHY_JOIN: { icon: IconName; tint: string; title: string; body: string }[] = [
  { icon: 'shield', tint: 'bg-[#EAF2FF] text-[#2563EB]', title: 'Verified Profile Badge', body: 'Get a blue verified badge and build trust instantly.' },
  { icon: 'trending', tint: 'bg-[#EAF2FF] text-[#2563EB]', title: 'Better Visibility', body: 'Rank higher in search and get more profile views.' },
  { icon: 'image', tint: 'bg-brand-soft text-brand', title: 'Publish Unlimited', body: 'Post Artistry, Blogs, Around Us, Projects & Products.' },
  { icon: 'bag', tint: 'bg-brand-soft text-brand', title: 'Build Portfolio', body: 'Showcase your best work, awards & achievements.' },
  { icon: 'chart', tint: 'bg-brand-soft text-brand', title: 'Advanced Analytics', body: 'Track profile views, leads and engagement.' },
  { icon: 'users', tint: 'bg-brand-soft text-brand', title: 'Connect & Grow', body: 'Connect with clients, get enquiries and grow business.' },
]

/**
 * The five things a member can publish. The photographs are the client's own
 * artwork on ImageKit; they load `unoptimized` because the source PNGs are
 * large and time the Next image optimizer out.
 */
const PUBLISH: {
  icon: IconName
  title: string
  body: string
  points: string[]
  photo: string
  href: string
}[] = [
  {
    icon: 'image',
    title: 'Artistry',
    body: 'Showcase your creative side with artwork, sketches, installations, sculptures, photography and more.',
    points: ['Unlimited Image Galleries', 'Detailed Descriptions', 'Share with Community'],
    photo: 'https://ik.imagekit.io/archfacing/Artistry.png?updatedAt=1784627525459',
    href: '/artistry',
  },
  {
    icon: 'file',
    title: 'Blog',
    body: 'Share knowledge, ideas and insights through blogs, articles and case studies.',
    points: ['Write Articles & Guides', 'Add Images & Videos', 'Build Your Authority'],
    photo: 'https://ik.imagekit.io/archfacing/Blog.png?updatedAt=1784627692749',
    href: '/blog',
  },
  {
    icon: 'building',
    title: 'Around Us',
    body: 'Keep your audience updated with events, site visits, achievements, CSR activities and more.',
    points: ['Company Updates', 'Event & Activity Posts', 'Build Public Trust'],
    photo: 'https://ik.imagekit.io/archfacing/Around%20us.png?updatedAt=1784627693948',
    href: '/around-us',
  },
  {
    icon: 'bag',
    title: 'Projects',
    body: 'Showcase your completed and ongoing projects with detailed information and media.',
    points: ['Unlimited Projects', 'Project Galleries', 'Project Highlights'],
    photo: 'https://ik.imagekit.io/archfacing/Projects.png?updatedAt=1784627693352',
    href: '/projects',
  },
  {
    icon: 'box',
    title: 'Products',
    body: 'List your products and materials with specifications, images and benefits.',
    points: ['Unlimited Products', 'Product Catalogs', 'Get More Leads'],
    photo: 'https://ik.imagekit.io/archfacing/Products.png?updatedAt=1784627693496',
    href: '/products',
  },
]

/**
 * The published membership terms, exactly as the design states them.
 *
 * ⚠️ These are the OFFER, not an enforced rule: the codebase has no per-tier
 *    posting quota yet (`src/config/permissions.ts` gates by role only, and
 *    `CorporateProfile.freePostingsUsed` is never incremented against
 *    `freePostingsTotal`). Wire the limits in before promising them in writing.
 */
const COMPARE: { feature: string; free: string | false; verified: string }[] = [
  { feature: 'Profile', free: 'Basic Profile', verified: 'Premium Verified Profile' },
  { feature: 'Verified Badge', free: false, verified: 'Blue Verified Badge' },
  { feature: 'Products Upload', free: 'Up to 10', verified: 'Unlimited' },
  { feature: 'Projects Upload', free: 'Up to 5', verified: 'Unlimited' },
  { feature: 'Artistry Upload', free: 'Up to 2', verified: 'Unlimited' },
  { feature: 'Around Us Posts', free: 'Up to 1', verified: 'Unlimited' },
  { feature: 'Blog Posts', free: 'Up to 1', verified: 'Unlimited' },
  { feature: 'Portfolio Gallery', free: 'Basic', verified: 'Premium Portfolio' },
  { feature: 'Profile Views & Analytics', free: 'Basic', verified: 'Advanced Analytics' },
  { feature: 'Search Ranking', free: 'Normal', verified: 'Priority Ranking' },
  { feature: 'Lead Enquiries', free: 'Limited', verified: 'Unlimited' },
  { feature: 'Custom Profile Links', free: false, verified: 'Custom Branded Link' },
  { feature: 'Customer Support', free: 'Email Support', verified: 'Priority Support' },
]

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'user', title: 'Create Account', body: 'Sign up and create your profile on ArchFacing.' },
  { icon: 'file', title: 'Complete Profile', body: 'Fill in your details, add portfolio, experience and documents.' },
  { icon: 'shield', title: 'Verify Your Profile', body: 'Our team will verify your details and approve your profile.' },
  { icon: 'award', title: 'Become a Verified Member', body: 'Unlock premium features and start publishing content.' },
  { icon: 'bell', title: 'Publish & Get Discovered', body: 'Share your work, get visibility and receive quality leads.' },
]

const SUITABLE: { icon: IconName; tint: string; title: string; body: string; href: string }[] = [
  { icon: 'building', tint: 'text-[#2563EB]', title: 'Architects', body: 'Create your professional identity', href: '/register?type=professional' },
  { icon: 'sofa', tint: 'text-[#7C3AED]', title: 'Interior Designers', body: 'Showcase your creative projects', href: '/register?type=professional' },
  { icon: 'box', tint: 'text-brand', title: 'Manufacturers', body: 'List your products & get more leads', href: '/register?type=corporate' },
  { icon: 'chart', tint: 'text-[#7C3AED]', title: 'Consultants', body: 'Share your expertise and knowledge', href: '/register?type=consultant' },
  { icon: 'wrench', tint: 'text-[#2563EB]', title: 'Builders & Contractors', body: 'Display your work and get more projects', href: '/register?type=bmf' },
  { icon: 'award', tint: 'text-brand', title: 'Students & Enthusiasts', body: 'Learn, share & grow with the community', href: '/register?type=professional' },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is ArchFacing Membership?',
    a: 'Membership is your verified identity on ArchFacing. A verified member gets the blue badge, priority placement in search, and the ability to publish projects, products, artistry, blogs and Around Us updates that clients and other professionals can find.',
  },
  {
    q: 'How can I become a verified member?',
    a: 'Register with your professional details, complete your profile and upload your documents. Our team checks them and approves the account — you are notified the moment the badge is live.',
  },
  {
    q: 'What documents are required for verification?',
    a: 'Your identity proof and the registration that applies to your work — a COA number for architects, a firm or GST registration for companies and material facilitators, or a student ID. The exact list is shown on your dashboard while you complete the profile.',
  },
  {
    q: 'How can I publish Artistry, Blog or Around Us post?',
    a: 'Every publishing form lives in your dashboard under the matching section. Write the post, add images, and submit — approved posts appear on the public pages under your name.',
  },
  {
    q: 'Can I upgrade or downgrade my membership later?',
    a: 'Yes. Your account keeps working either way, and nothing you have already published is removed. Changes take effect from your dashboard.',
  },
]

/*
 * No success stories yet.
 *
 * This held four invented members — names, firms, five-star ratings and stock
 * portraits of real strangers — recommending a plan on the page where people
 * decide to pay for it. Quotes go back in only when they are real, attributed
 * to a consenting member, in their own words. The section below hides itself
 * while this is empty.
 */
const DEMO_STORIES: { quote: string; name: string; role: string; photo: string }[] = []

/*
 * No stock faces.
 *
 * Five Unsplash portraits of real strangers stood in for members beside the
 * verified-member count. The row renders only when this holds real member
 * photographs.
 */
const DEMO_FACES: string[] = []

export default async function MembershipPage() {
  const [stats, phone] = await Promise.all([platformStats(), phoneData()])
  /* ── who is reading this page? ── */
  const session = await auth()

  let state: 'guest' | 'no-profile' | 'incomplete' | 'pending' | 'verified' = 'guest'

  /*
   * Only these four roles own a profile table, so only they have a
   * verification to chase. A CLIENT — the role the register form preselects —
   * and every staff/advertiser account have no profile row by design, and
   * `verifyUserAction` has nothing to flip for them. Branching on the role
   * first keeps those accounts out of the "complete your profile" state, which
   * they could never leave.
   */
  const VERIFIABLE_ROLES = ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE']

  if (session?.user?.id) {
    if (!VERIFIABLE_ROLES.includes(session.user.role)) {
      state = 'no-profile'
    } else {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          status: true,
          professionalProfile: { select: { isVerified: true } },
          consultantProfile: { select: { isVerified: true } },
          bmfProfile: { select: { isVerified: true } },
          corporateProfile: { select: { isVerified: true } },
        },
      })

      const profile =
        me?.professionalProfile ??
        me?.consultantProfile ??
        me?.bmfProfile ??
        me?.corporateProfile ??
        null

      if (!profile) state = 'incomplete'
      else if (profile.isVerified && me?.status === 'ACTIVE') state = 'verified'
      else state = 'pending'
    }
  }

  const cta = {
    /* The design's wording, kept verbatim for the view everyone lands on. */
    guest: { label: 'Upgrade to Verified Membership', href: '/register?type=professional' },
    'no-profile': { label: 'Register as a Professional', href: '/register?type=professional' },
    incomplete: { label: 'Complete Your Profile', href: '/dashboard' },
    pending: { label: 'Check Verification Status', href: '/dashboard' },
    verified: { label: 'Publish Your Work', href: '/dashboard' },
  }[state]

  return (
    <>
      <SiteHeader phone={{ search: false, location: false, tone: 'light' }} />

      {/* ─── phones ─── */}
      <div className="md:hidden">
        <MembershipPhone
          heroFeatures={HERO_FEATURES}
          why={WHY_JOIN}
          publish={PUBLISH}
          steps={STEPS}
          suitable={SUITABLE}
          faq={FAQ}
          plans={phone.plans}
          verifiedCount={phone.verifiedCount}
          faces={phone.faces}
          stories={phone.stories}
          ctaHref={session?.user?.id ? '/dashboard/membership' : '/register'}
          isVerified={state === 'verified'}
        />
      </div>

      <main className="hidden bg-paper md:block">
        {/* ══════════════════════ §1 — HERO ══════════════════════ */}
        <section className="relative isolate overflow-hidden" style={{ backgroundColor: NAVY }}>
          {/* The client's banner on the right, washed into the navy on the left
              so the headline keeps its contrast. */}
          <span aria-hidden className="absolute inset-y-0 right-0 w-full lg:w-[78%]">
            <Image
              src={HERO_BANNER}
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-center"
            />
            {/*
              One wash per layout, each stopping where that layout's copy stops.
              Computer: the columns are wide, so the wash clears by 46% and most
              of the banner is untouched. Tablet: the same two columns in less
              room, so it has to run further. Phone: the copy sits over the whole
              photograph, so the whole photograph is washed.
            */}
            <span
              className="absolute inset-0 md:hidden"
              style={{ backgroundColor: `${NAVY}BD` }}
            />
            <span
              className="absolute inset-0 hidden md:block lg:hidden"
              style={{
                backgroundImage: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY} 38%, ${NAVY}CC 54%, transparent 74%)`,
              }}
            />
            <span
              className="absolute inset-0 hidden lg:block"
              style={{
                backgroundImage: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY} 22%, ${NAVY}B3 32%, transparent 46%)`,
              }}
            />
          </span>

          {/* The trail is kept in the markup for search engines but clipped out
              of sight — the page opens straight on the headline. */}
          <nav aria-label="Breadcrumb" className="container-af relative sr-only">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <span aria-current="page">Membership</span>
              </li>
            </ol>
          </nav>

          {/* The tablet keeps the computer's two columns — copy on the left,
              Verified Member card on the right — just with the type stepped
              down so both halves still fit 768px. */}
          <div className="container-af relative grid items-center gap-6 pb-8 pt-8 md:grid-cols-[minmax(0,1fr)_224px] lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-8 lg:pb-10">
            <div className="min-w-0">
              <h1 className="font-display text-[32px] font-bold leading-[1.08] tracking-tight text-white sm:text-[38px] md:text-[28px] lg:text-[42px]">
                Become a Verified
                <br />
                <span className="text-brand">ArchFacing</span> Member
              </h1>

              <p className="mt-4 max-w-[44ch] text-[13.5px] leading-relaxed text-white/75 md:mt-3 md:text-[11.5px] lg:mt-4 lg:text-[13.5px]">
                India’s most trusted architecture and design platform. Showcase your
                work, share your ideas and grow your business with unlimited
                opportunities.
              </p>

              <ul className="mt-7 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-5 md:mt-5 md:grid-cols-4 md:gap-x-2.5 md:gap-y-0 lg:mt-7 lg:gap-x-4">
                {/* The divider only earns its place once the four sit in ONE row;
                    on a phone they wrap to 2×2 and it would fall mid-row. */}
                {HERO_FEATURES.map((f) => (
                  <li key={f.title} className="min-w-0 md:border-l md:border-white/15 md:pl-2.5 md:first:border-l-0 md:first:pl-0 lg:pl-3.5">
                    <Icon name={f.icon} className="h-[22px] w-[22px] text-brand md:h-[17px] md:w-[17px] lg:h-[22px] lg:w-[22px]" />
                    <p className="mt-2 text-[12.5px] font-bold leading-tight text-white md:mt-1.5 md:text-[10.5px] lg:mt-2 lg:text-[12.5px]">
                      {f.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-white/60 md:mt-0.5 md:text-[9.5px] lg:mt-1 lg:text-[11px]">
                      {f.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* the verified-member card */}
            <aside
              className="rounded-card border border-white/12 p-4 text-center shadow-lift backdrop-blur-sm lg:p-5"
              style={{ backgroundColor: 'rgba(8,26,52,0.82)' }}
            >
              <Image
                src="https://ik.imagekit.io/archfacing/Icon/Troffe.png?updatedAt=1784751906761"
                alt=""
                width={112}
                height={112}
                unoptimized
                className="mx-auto h-11 w-auto object-contain lg:h-14"
              />

              <h2 className="mt-2.5 font-display text-[14.5px] font-bold text-white lg:mt-3 lg:text-[17px]">
                {state === 'verified' ? 'You’re Verified' : 'Verified Member'}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-white/85 lg:text-[12.5px]">
                Trusted. Recognized. Preferred.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-white/60 lg:mt-2.5 lg:text-[11.5px]">
                {state === 'verified'
                  ? 'Your badge is live. Publish your work and let clients find you across the platform.'
                  : 'Stand out in the community of architects, designers, manufacturers and industry professionals.'}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 border-t border-white/10 pt-3 lg:mt-4 lg:gap-2.5 lg:pt-4">
                {DEMO_FACES.length > 0 && (
                <span className="flex -space-x-2.5">
                  {DEMO_FACES.map((id) => (
                    <span
                      key={id}
                      className="relative h-6 w-6 overflow-hidden rounded-full ring-2 lg:h-8 lg:w-8"
                      style={{ ['--tw-ring-color' as string]: NAVY }}
                    >
                      <Image
                        src={unsplash(id, { w: 80, h: 80 })}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                  ))}
                </span>
                )}
                <span className="text-left">
                  <span className="tabular block font-display text-[13px] font-bold leading-none text-white lg:text-[16px]">
                    {statValue(stats.members)}
                  </span>
                  <span className="block text-[9.5px] text-white/60 lg:text-[11px]">Verified Members</span>
                </span>
              </div>
            </aside>
          </div>
        </section>

        {/* ══════════════════════ §2 — WHY JOIN ══════════════════════ */}
        <section className="container-af py-7">
          <h2 className="mb-5 text-center font-display text-[20px] font-bold tracking-tight text-ink">
            Why Join ArchFacing Membership?
          </h2>

          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {WHY_JOIN.map((b) => (
              <li key={b.title}>
                <div className="flex h-full min-w-0 flex-col rounded-card border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-lift">
                  <span className={`chip-icon ${b.tint}`}>
                    <Icon name={b.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3 font-display text-[13px] font-bold leading-tight text-ink">
                    {b.title}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ══════════════════════ §3 — WHAT YOU CAN PUBLISH ══════════════════════ */}
        <section className="container-af py-7">
          <h2 className="mb-5 text-center font-display text-[20px] font-bold tracking-tight text-ink">
            What You Can Publish as a Member?
          </h2>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {PUBLISH.map((p) => (
              <li key={p.title}>
                {/* The whole card is the link, so it is named explicitly —
                    otherwise its accessible name is the title plus the body
                    plus all three bullets run together. */}
                <Link
                  href={p.href}
                  aria-label={p.title}
                  className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-all hover:border-brand-border hover:shadow-lift"
                >
                  <span className="relative block aspect-[16/10] overflow-hidden bg-paper-3">
                    <Image
                      src={p.photo}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 19vw, (min-width: 640px) 45vw, 92vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </span>

                  <span className="relative block flex-1 px-4 pb-4 pt-5">
                    {/* the icon badge straddling the photo's lower-left corner */}
                    <span className="absolute -top-5 left-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white shadow-lift">
                      <Icon name={p.icon} className="h-5 w-5" />
                    </span>

                    <span className="block font-display text-[15px] font-bold text-ink transition-colors group-hover:text-brand">
                      {p.title}
                    </span>
                    <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-3">
                      {p.body}
                    </span>

                    <span className="mt-3 block border-t border-line-soft pt-3">
                      {p.points.map((pt) => (
                        <span key={pt} className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-ink-2 first:mt-0">
                          <Icon name="check" className="mt-px h-3.5 w-3.5 shrink-0 text-ok" />
                          {pt}
                        </span>
                      ))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ══════════════ §4 — COMPARE + HOW IT WORKS ══════════════ */}
        <section className="container-af py-7">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            {/* ─── the comparison table ─── */}
            <div className="min-w-0">
              <h2 id="compare-heading" className="mb-4 text-center font-display text-[17px] font-bold tracking-tight text-ink">
                Membership Features Compare
              </h2>

              {/* tabIndex makes the scroller reachable by keyboard — the table
                  holds no focusable cells, so without it the Free/Verified
                  columns are unreachable once it scrolls sideways. */}
              <div
                role="region"
                aria-labelledby="compare-heading"
                tabIndex={0}
                className="overflow-x-auto rounded-card border border-line bg-white shadow-card"
              >
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead>
                    <tr className="bg-paper-3">
                      <th scope="col" className="px-4 py-2.5 text-[12px] font-bold text-ink">
                        Features
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-center text-[12px] font-bold text-ink">
                        Free Member
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-[12px] font-bold text-white"
                        style={{ backgroundColor: NAVY }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Verified Member
                          <span className="rounded-[4px] bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            Recommended
                          </span>
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {COMPARE.map((row, i) => (
                      <tr
                        key={row.feature}
                        className={`border-t border-line-soft ${i % 2 === 1 ? 'bg-paper-2' : 'bg-white'}`}
                      >
                        <th scope="row" className="px-4 py-2 text-[11.5px] font-medium text-ink-2">
                          {row.feature}
                        </th>
                        <td className="px-4 py-2 text-center text-[11.5px] text-ink-3">
                          {row.free === false ? (
                            <>
                              {/* The glyph carries the meaning visually; the
                                  sr-only text carries it to a screen reader,
                                  because a bare span cannot take aria-label. */}
                              <span aria-hidden className="text-[13px] font-bold text-danger">
                                ✕
                              </span>
                              <span className="sr-only">Not included</span>
                            </>
                          ) : (
                            row.free
                          )}
                        </td>
                        <td className="bg-brand-soft/45 px-4 py-2 text-[11.5px] font-medium text-ink">
                          <span className="flex items-center gap-2">
                            <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-ok" />
                            {row.verified}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── how membership works ─── */}
            <div className="min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[15px] font-bold tracking-tight text-ink">
                How Membership Works?
              </h2>

              <ol className="mt-4 flex flex-col">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3">
                    {/* icon rail */}
                    <div className="flex flex-col items-center">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: NAVY }}
                      >
                        <Icon name={s.icon} className="h-[18px] w-[18px]" />
                      </span>
                      {i < STEPS.length - 1 && (
                        <span aria-hidden className="flex flex-1 items-center py-1 text-ink-4">
                          <svg viewBox="0 0 8 22" className="h-full w-2" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M4 0v16" />
                            <path d="M1 13l3 4 3-4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>

                    <div className={i < STEPS.length - 1 ? 'pb-4' : ''}>
                      <span className="tabular block text-[10.5px] font-bold text-brand">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="mt-0.5 font-display text-[12.5px] font-bold leading-tight text-ink">
                        {s.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ══════════════ §5 — SUITABLE FOR + FAQ ══════════════ */}
        <section className="container-af py-7">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            {/* ─── suitable for (rail) ─── */}
            <div className="min-w-0">
              <h2 className="mb-4 font-display text-[15px] font-bold tracking-tight text-ink">
                Membership Suitable For
              </h2>

              <div className="relative">
                <RailArrow dir="prev" target="suitable-first" label="Scroll to the first card" />
                <ul className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scroll-smooth">
                  {SUITABLE.map((s, i) => (
                    <li
                      key={s.title}
                      id={i === 0 ? 'suitable-first' : i === SUITABLE.length - 1 ? 'suitable-last' : undefined}
                      /* gap-3 is 0.75rem, so five gaps = 3.75rem — that makes all
                         SIX cards fit the row on a computer, as the design shows. */
                      className="w-[44%] shrink-0 snap-start scroll-mt-24 sm:w-[30%] md:w-[22%] lg:w-[calc((100%-2.25rem)/4)] xl:w-[calc((100%-3.75rem)/6)]"
                    >
                      <Link
                        href={s.href}
                        className="group flex h-full flex-col items-center rounded-card border border-line bg-white px-3 py-4 text-center shadow-card transition-all hover:border-brand-border hover:shadow-lift"
                      >
                        <Icon name={s.icon} className={`h-6 w-6 ${s.tint}`} />
                        <span className="mt-2.5 block text-[11.5px] font-bold leading-tight text-ink transition-colors group-hover:text-brand">
                          {s.title}
                        </span>
                        <span className="mt-1 block text-[10px] leading-snug text-ink-3">{s.body}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <RailArrow dir="next" target="suitable-last" label="Scroll to the last card" />
              </div>
            </div>

            {/* ─── FAQ ─── */}
            <div className="min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-display text-[14px] font-bold tracking-tight text-ink">
                  Frequently Asked Questions
                </h2>
                <Link href="/legal/need-help" className="shrink-0 text-[11px] font-semibold text-brand hover:underline">
                  View All FAQs →
                </Link>
              </div>

              <div className="flex flex-col">
                {FAQ.map((f) => (
                  <details key={f.q} className="group border-b border-line-soft last:border-b-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[11.5px] font-medium text-ink-2 transition-colors hover:text-brand">
                      {f.q}
                      <span
                        aria-hidden
                        className="shrink-0 text-[15px] font-bold leading-none text-ink-3 transition-transform group-open:rotate-45 group-open:text-brand"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-3 pr-6 text-[11px] leading-relaxed text-ink-3">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ §6 — SUCCESS STORIES ══════════════════════ */}
        {DEMO_STORIES.length > 0 && (
        <section className="container-af py-7">
          <h2 className="mb-4 font-display text-[15px] font-bold tracking-tight text-ink">
            Success Stories
          </h2>

          <div className="relative">
            <RailArrow dir="prev" target="story-first" label="Scroll to the first story" />
            {/* The cards hold no links, so the rail itself takes the tab stop —
                otherwise a keyboard user cannot scroll to the second story. */}
            <ul
              tabIndex={0}
              aria-label="Success stories"
              className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 scroll-smooth"
            >
              {DEMO_STORIES.map((s, i) => (
                <li
                  key={s.name}
                  id={i === 0 ? 'story-first' : i === DEMO_STORIES.length - 1 ? 'story-last' : undefined}
                  /* Both stories sit side by side from the tablet up, as they do
                     on a computer. */
                  className="w-[88%] shrink-0 snap-start scroll-mt-24 sm:w-[60%] md:w-[calc((100%-1rem)/2)]"
                >
                  <figure className="flex h-full min-w-0 items-start gap-4 rounded-card border border-line bg-white p-4 shadow-card">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                      <Image
                        src={unsplash(s.photo, { w: 160, h: 160 })}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </span>

                    <div className="min-w-0">
                      <span aria-hidden className="font-display text-[22px] font-bold leading-none text-brand">
                        “
                      </span>
                      <blockquote className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                        {s.quote}
                      </blockquote>
                      <figcaption className="mt-2">
                        <span className="block text-[12px] font-bold text-ink">{s.name}</span>
                        <span className="block text-[10.5px] text-ink-3">{s.role}</span>
                        <span aria-hidden className="mt-1 flex gap-0.5 text-brand">
                          {Array.from({ length: 5 }).map((_, n) => (
                            <Icon key={n} name="star" className="h-3.5 w-3.5" />
                          ))}
                        </span>
                      </figcaption>
                    </div>
                  </figure>
                </li>
              ))}
            </ul>
            <RailArrow dir="next" target="story-last" label="Scroll to the last story" />
          </div>
        </section>
        )}

        {/* ══════════════════════ §7 — CTA ══════════════════════ */}
        {/* -mb-5 offsets the footer's own mt-10 so only a 20px gap remains. */}
        <section className="container-af -mb-5 pb-0 pt-3">
          <div
            className="flex flex-col items-center gap-4 rounded-card px-5 py-5 md:flex-row md:gap-6 md:px-7"
            style={{ backgroundColor: NAVY }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Icon name="trophy" className="h-6 w-6" />
            </span>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <h2 className="font-display text-[16px] font-bold leading-tight text-white sm:text-[18px]">
                Ready to Build Your Identity &amp; Grow Your Business?
              </h2>
              <p className="mt-1 text-[12px] text-white/65">
                Join thousands of professionals who are already growing with ArchFacing.
              </p>
            </div>

            <Link href={cta.href} className="btn-primary shrink-0 px-6">
              {cta.label}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

/**
 * The phone layout's live data.
 *
 *  · Verified members — everyone who shows a tick under lib/verified.ts: an
 *    active, unexpired PACT (blue) or an active subscription to the most
 *    expensive paid plan (gold). Faces are real profile photos of those members.
 *  · Plans — the SubscriptionPlan rows, for the compare table.
 *  · Stories — real Review rows that carry written text, best first.
 */
async function phoneData() {
  const now = new Date()
  const [plans, pactHolders, topPlan, reviews] = await Promise.all([
    subscriptionPlans().catch(() => []),
    prisma.pact
      .findMany({
        where: { status: 'ACTIVE', holderId: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { holderId: true },
        distinct: ['holderId'],
      })
      .catch(() => [] as { holderId: string | null }[]),
    prisma.subscriptionPlan
      .findFirst({ where: { isActive: true, price: { gt: 0 } }, orderBy: { price: 'desc' }, select: { id: true } })
      .catch(() => null),
    prisma.review
      .findMany({
        // Real members only — never test / preview / demo accounts on a public page.
        where: {
          body: { not: null },
          rating: { gte: 4 },
          author: {
            deletedAt: null,
            NOT: [{ email: { endsWith: '.test' } }, { email: { startsWith: 'preview.' } }],
          },
        },
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        take: 12,
        select: {
          id: true,
          rating: true,
          body: true,
          author: { select: { name: true, profilePhoto: true } },
          post: {
            select: {
              title: true, slug: true, type: true, status: true, deletedAt: true,
              author: { select: { name: true } },
            },
          },
        },
      })
      .catch(() => []),
  ])

  const gold = topPlan
    ? await prisma.subscription
        .findMany({
          where: { planId: topPlan.id, status: 'ACTIVE', expiresAt: { gt: now } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .catch(() => [] as { userId: string }[])
    : []

  const ids = [...new Set([...pactHolders.map((p) => p.holderId), ...gold.map((g) => g.userId)])].filter(
    (x): x is string => Boolean(x)
  )

  const faceRows = ids.length
    ? await prisma.user
        .findMany({
          where: { id: { in: ids }, profilePhoto: { not: null }, deletedAt: null },
          select: { profilePhoto: true },
          take: 4,
        })
        .catch(() => [] as { profilePhoto: string | null }[])
    : []

  const stories = reviews
    .filter((r) => r.body && r.body.trim().length >= 20 && r.post.status === 'PUBLISHED' && !r.post.deletedAt)
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      quote: (r.body ?? '').trim(),
      rating: r.rating,
      name: r.author.name,
      photo: r.author.profilePhoto,
      about: `Reviewed “${r.post.title}” by ${r.post.author.name}`,
      href: publicHref(r.post.type, r.post.slug),
    }))

  return {
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      months: p.months,
      isPopular: p.isPopular,
      pactTerritories: p.pactTerritories,
      maxProjects: p.maxProjects,
      maxProducts: p.maxProducts,
      maxAroundUs: p.maxAroundUs,
      maxArtistry: p.maxArtistry,
    })),
    verifiedCount: ids.length,
    faces: faceRows.map((f) => f.profilePhoto).filter((x): x is string => Boolean(x)),
    stories,
  }
}

/**
 * A rail arrow.
 *
 * An anchor, not a button — it jumps the scroll-snap rail to its first or last
 * card, which keeps both carousels on this page free of client JavaScript.
 */
function RailArrow({
  dir,
  target,
  label,
}: {
  dir: 'prev' | 'next'
  target: string
  label: string
}) {
  return (
    <a
      href={`#${target}`}
      aria-label={label}
      className={`absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-2 shadow-card transition-colors hover:border-brand hover:text-brand md:flex ${
        dir === 'prev' ? '-left-3' : '-right-3'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </a>
  )
}
