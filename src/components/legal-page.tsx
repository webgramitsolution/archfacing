import Image from 'next/image'
import Link from 'next/link'
import { Breadcrumb, homeCrumb } from './breadcrumb'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Icon, type IconName } from './ui'

/**
 * Shared shell for the legal pages.
 *
 * The hero uses the Design Competition banner (the lit glass building at
 * dusk) as its background, shared by every legal and help page, with a
 * left-side wash so the title stays readable over the sky.
 *
 * The content below is wrapped in `prose-legal`, where h2/h3/ul/ol/table
 * are already styled — so no page has to repeat the styling.
 */

export type LegalSection = { id: string; title: string }

/** The Design Competition banner supplied by the client (2000×415) — the lit glass office at dusk. */
const HERO_BANNER = '/img/banners/design-competition-banner.webp'

export function LegalPage({
  eyebrow,
  title,
  subtitle,
  image,
  pdfRef,
  updated,
  sections,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle: string
  /** name inside public/img/legal/ — without .svg */
  image: string
  pdfRef?: string
  updated?: string
  /** the list on the right — what this page contains */
  sections?: LegalSection[]
  children: React.ReactNode
}) {
  // `image` (the old per-page illustration) is kept in the signature so pages
  // need no change, but every hero now shares the one banner.
  void image
  // `pdfRef` / `eyebrow` stay in the source as a trace back to the PDF, but
  // are never rendered — the client does not want section numbers on screen.
  void pdfRef
  void eyebrow

  return (
    <>
      <SiteHeader />

      <main className="bg-paper">
        {/* ═══════════ hero ═══════════ */}
        <section className="relative overflow-hidden bg-navy">
          {/* the banner, full bleed */}
          <span aria-hidden className="absolute inset-0">
            <Image
              src={HERO_BANNER}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[62%_center]"
            />
            <span className="absolute inset-0 bg-gradient-to-r from-navy/75 via-navy/35 to-transparent" />
          </span>

          <div className="container-af relative py-12 lg:py-16">
            {/* Kept for SEO, hidden from sight — see components/breadcrumb.tsx */}
            <Breadcrumb items={[homeCrumb(), { label: title }]} />

            <div className="max-w-2xl [text-shadow:0_2px_14px_rgba(0,0,0,0.45)]">
              {/* left — title */}
              <div>
                <h1 className="font-display text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[42px]">
                  {title}
                </h1>

                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/90">
                  {subtitle}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/75">
                  {updated && (
                    <span className="flex items-center gap-1.5">
                      <Icon name="clock" className="h-3.5 w-3.5" />
                      Last updated — {updated}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════ content ═══════════ */}
        <div className="container-af py-10">
          <div className="grid gap-8 md:grid-cols-[1fr_240px] lg:items-start">
            <article className="prose-legal card min-w-0 p-7 lg:p-9">{children}</article>

            {sections && sections.length > 0 && (
              <aside className="hidden md:block">
                <nav className="card sticky top-[92px] p-5">
                  <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink">
                    On this page
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block text-[12.5px] leading-snug text-ink-2 transition-colors hover:text-brand"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-[12px] leading-snug text-ink-3">
                      Questions? Write to us —
                    </p>
                    <a
                      href="mailto:support@archfacing.com"
                      className="mt-1 block break-all text-[12.5px] font-semibold text-brand hover:underline"
                    >
                      support@archfacing.com
                    </a>
                  </div>
                </nav>
              </aside>
            )}
          </div>

          <LegalFooterNav current={image} />
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

// ═══════════════════════════════════════════════════════════
//  links to the other legal pages
// ═══════════════════════════════════════════════════════════

const ALL_LEGAL: { href: string; label: string; image: string; icon: IconName }[] = [
  { href: '/legal/about', label: 'About Us', image: 'about', icon: 'grid' },
  { href: '/legal/privacy', label: 'Privacy Policy', image: 'privacy', icon: 'shield' },
  { href: '/legal/cookies', label: 'Cookies Policy', image: 'cookies', icon: 'settings' },
  { href: '/legal/terms', label: 'Terms & Conditions', image: 'terms', icon: 'file' },
  { href: '/legal/refund', label: 'Return & Refund', image: 'refund', icon: 'rupee' },
  { href: '/legal/need-help', label: 'Need Help', image: 'help', icon: 'help' },
  { href: '/legal/contact', label: 'Contact Us', image: 'contact', icon: 'mail' },
]

function LegalFooterNav({ current }: { current: string }) {
  const others = ALL_LEGAL.filter((l) => l.image !== current)

  return (
    <section className="mt-10 border-t border-line pt-8">
      <h2 className="mb-4 font-display text-[15px] font-bold text-ink">
        More policies
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="card-hover group flex items-center gap-3 p-3.5">
              <span className="chip-icon h-9 w-9 bg-paper-3 text-ink-2 transition-colors group-hover:bg-brand-soft group-hover:text-brand">
                <Icon name={l.icon} className="h-[17px] w-[17px]" />
              </span>
              <span className="flex-1 text-[13.5px] font-semibold text-ink transition-colors group-hover:text-brand">
                {l.label}
              </span>
              <Icon name="arrow" className="h-4 w-4 text-ink-4 group-hover:text-brand" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Content pieces
// ═══════════════════════════════════════════════════════════

/** one section — the id is required so the sidebar list can link to it */
export function LegalSectionBlock({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** callout box for emphasis — e.g. "no refund after 15 days" */
export function LegalNote({
  tone = 'brand',
  title,
  children,
}: {
  tone?: 'brand' | 'warn' | 'info' | 'ok'
  title?: string
  children: React.ReactNode
}) {
  const tones = {
    brand: 'border-brand-border bg-brand-soft',
    warn: 'border-warn/25 bg-warn-soft',
    info: 'border-info/25 bg-info-soft',
    ok: 'border-ok/25 bg-ok-soft',
  }

  return (
    <div className={`not-prose my-5 rounded-card border-l-[3px] p-4 ${tones[tone]}`}>
      {title && (
        <p className="mb-1 font-display text-[14px] font-bold text-ink">{title}</p>
      )}
      <div className="text-[13.5px] leading-relaxed text-ink-2">{children}</div>
    </div>
  )
}
