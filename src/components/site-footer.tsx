import { Logo } from './logo'
import { Icon } from './ui'
import { NewsletterForm } from './newsletter-form'
import { FooterColumn } from './footer-column'
import { getStringSetting } from '@/lib/settings'
import { MobileTabBar } from './mobile/mobile-tab-bar'
import { mobileSession } from '@/lib/mobile-shell'

/** §6.1.2 — footer columns, as laid out in the design */
const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'Projects', href: '/projects' },
      { label: 'Products', href: '/products' },
      { label: 'Around Us', href: '/around-us' },
      { label: 'Artistry', href: '/artistry' },
      { label: 'Blog', href: '/blog' },
      { label: 'Consult Nearby', href: '/consult-nearby' },
    ],
  },
  {
    title: 'Membership',
    links: [
      { label: 'Membership Plans', href: '/membership' },
      { label: 'PACT', href: '/pact' },
      { label: 'Club', href: '/club' },
      { label: 'Designers Associates', href: '/designers-associates' },
      { label: 'Merchandise', href: '/merchandise' },
      { label: 'Advertisement', href: '/advertisements' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/legal/need-help' },
      { label: 'Terms & Conditions', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Refund Policy', href: '/legal/refund' },
      { label: 'Contact Us', href: '/legal/contact' },
      { label: 'About Us', href: '/legal/about' },
    ],
  },
]

/** The Contact column is a list of facts rather than links — read from Website Settings → Contact. */
async function contactFacts() {
  const [email, phone, address] = await Promise.all([
    getStringSetting('contact.supportEmail'),
    getStringSetting('contact.supportPhone'),
    getStringSetting('contact.officeAddress'),
  ])
  const digits = phone.replace(/\D/g, '')
  return [
    ...(email ? [{ icon: 'mail' as const, text: email, href: `mailto:${email}` }] : []),
    ...(digits ? [{ icon: 'phone' as const, text: phone, href: `tel:+${digits.length === 10 ? '91' + digits : digits}` }] : []),
    { icon: 'map' as const, text: address || 'New Delhi, India' },
  ]
}

/**
 * §6.1.2.1 / §7.11.1.10 — the four social plugs. The URLs come from Website
 * Settings (admin-controlled); an icon whose URL is blank simply does not
 * render.
 */
const SOCIAL_ICONS = [
  { key: 'social.facebook' as const, label: 'Facebook', d: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
  { key: 'social.instagram' as const, label: 'Instagram', d: 'M16 11.4A4 4 0 1112.6 8 4 4 0 0116 11.4zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z' },
  { key: 'social.twitter' as const, label: 'X (Twitter)', d: 'M4 4l7.1 9.3L4.4 20h2.2l5.5-5.4L16.8 20H20l-7.4-9.7L18.9 4h-2.2l-4.9 4.9L8.2 4z' },
  { key: 'social.linkedin' as const, label: 'LinkedIn', d: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM6 9H2v12h4zM4 2a2 2 0 100 4 2 2 0 000-4z' },
]

/**
 * The site footer.
 *
 * Passing variant="club" swaps the last column for the ArchFacing Club crest,
 * as the Club pages show it. The crest is a Club mark, so it never appears
 * anywhere else.
 */
export async function SiteFooter({ variant = 'default' }: { variant?: 'default' | 'club' } = {}) {
  const [CONTACT, phone] = await Promise.all([contactFacts(), mobileSession()])
  const socialUrls = await Promise.all(SOCIAL_ICONS.map((s) => getStringSetting(s.key, '')))
  const social = SOCIAL_ICONS
    .map((s, i) => ({ ...s, href: socialUrls[i].trim() }))
    .filter((s) => s.href !== '')

  return (
    <footer className={variant === 'club' ? 'mt-10 bg-navy-deep text-white' : 'mt-10 bg-navy text-white'}>
      <div className="container-af py-10 lg:py-12">
        {/*
          The columns open at `md`, not `lg`: a tablet gets the same footer a
          desktop does, only tighter — the type and the gaps step down rather
          than the layout collapsing into one stack. Below `md` the columns
          become accordions, which is the only way six links times four columns
          fits a phone without burying the copyright.
        */}
        <div
          className={
            variant === 'club'
              ? 'grid gap-x-6 gap-y-2 md:gap-y-8 lg:gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]'
              : 'grid gap-x-6 gap-y-2 md:gap-y-8 lg:gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]'
          }
        >
          {/* ─── brand ─── */}
          <div>
            {/* No white plate behind it — the mark sits straight on the
                navy, as the design shows. */}
            <Logo size="sm" />

            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-white/60 lg:text-[13px]">
              ArchFacing is India&apos;s largest design marketplace — connecting
              professionals, materials, brands and people. Serving 19,000+ PIN
              codes across India through PACT.
            </p>

            {social.length > 0 && (
              <ul className="mt-5 flex gap-3">
                {social.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-colors hover:bg-gold hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={s.d} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ─── link columns ─── */}
          {/* A white hairline stands to the left of every column from `md` up,
              separating Explore · Membership · Support · Contact vertically. */}
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links}
              className="md:border-l md:border-white/25 md:pl-6 lg:pl-10" />
          ))}

          {/* ─── contact ─── */}
          <FooterColumn title="Contact" className="md:border-l md:border-white/25 md:pl-6 lg:pl-10">
            <ul className="flex flex-col gap-2.5">
              {CONTACT.map((c) => (
                <li
                  key={c.text}
                  className="flex items-start gap-2 text-[12.5px] text-white/60 lg:text-[13px]"
                >
                  <Icon name={c.icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" />
                  {c.href ? (
                    <a href={c.href} className="min-w-0 break-all transition-colors hover:text-gold">
                      {c.text}
                    </a>
                  ) : (
                    <span className="min-w-0">{c.text}</span>
                  )}
                </li>
              ))}
            </ul>

            {variant === 'default' && (
              <div className="mt-6">
                <p className="mb-2.5 text-[12.5px] text-white/60 lg:text-[13px]">
                  Subscribe to our newsletter
                </p>
                <NewsletterForm source="footer" />
              </div>
            )}
          </FooterColumn>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-af flex flex-wrap items-center justify-between gap-3 py-4">
          {/* The registration number is the copyright registration for the
              ArchFacing concept — Reg. No. L-92657/2020 — and belongs in the
              same line as the notice it qualifies. */}
          <p className="text-[11.5px] text-white/50 lg:text-[12px]">
            © {new Date().getFullYear()} ArchFacing. We The Designa &amp; Designi.
            All rights reserved. <span className="text-white/25">|</span>{' '}
            Reg. No. L-92657/2020
          </p>
          <p className="text-[11.5px] text-white/50 lg:text-[12px]">
            Development by :{' '}
            <span className={variant === 'club' ? 'text-gold' : 'text-brand'}>Webgram It Solution</span>
          </p>
        </div>
      </div>

      {/* Phones: room for the floating app bar, then the bar itself. */}
      <div aria-hidden className="h-[88px] md:hidden" />
      <MobileTabBar signedIn={phone.signedIn} dashboardHref={phone.dashboardHref} unread={phone.unread} />
    </footer>
  )
}
