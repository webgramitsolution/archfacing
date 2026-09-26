import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/ui'

/**
 * The dark footer at the foot of a seller's storefront.
 *
 * The seller's own identity leads; the utility columns link back into their
 * storefront tabs and ArchFacing's own policies. Branding is ArchFacing's —
 * this is a shopfront ON the platform, not a separate site.
 */
export function SellerFooter({
  base,
  name,
  logo,
  about,
  location,
  email,
  phone,
  showPhone,
  website,
  links,
}: {
  base: string
  name: string
  logo: string | null
  about: string | null
  location: string
  email: string | null
  /** Already gated by the caller — only a signed-in reader gets a number. */
  phone: string | null
  showPhone: boolean
  website: string | null
  links: { facebook: string | null; instagram: string | null; linkedin: string | null }
}) {
  const blurb = about
    ? about.length > 150
      ? `${about.slice(0, 150)}…`
      : about
    : `${name} is a verified seller on ArchFacing, offering quality work and services to the building industry.`

  const services = [
    { label: 'Products & Services', href: `${base}/products` },
    { label: 'Projects', href: `${base}/projects` },
    { label: 'About Company', href: `${base}/about` },
    { label: 'Gallery', href: `${base}/gallery` },
    { label: 'Contact Us', href: `${base}/contact` },
  ]

  const quick = [
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Terms & Conditions', href: '/legal/terms' },
    { label: 'Refund Policy', href: '/legal/refund' },
    { label: 'Help Center', href: '/legal/need-help' },
  ]

  const socials = [
    { name: 'Facebook', href: links.facebook },
    { name: 'Instagram', href: links.instagram },
    { name: 'LinkedIn', href: links.linkedin },
  ].filter((s): s is { name: string; href: string } => Boolean(s.href))

  return (
    <footer className="bg-navy text-white/70">
      <div className="container-af grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4 md:py-12 lg:gap-10">
        {/* identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
              {logo ? (
                <Image src={logo} alt="" width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <Icon name="building" className="h-5 w-5 text-brand" />
              )}
            </span>
            <span className="min-w-0 font-display text-[15px] font-bold text-white">{name}</span>
          </div>

          <p className="mt-3.5 text-[12px] leading-relaxed">{blurb}</p>

          {socials.length > 0 && (
            <ul className="mt-4 flex gap-2.5">
              {socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold text-white/80 transition-colors hover:bg-brand hover:text-white"
                  >
                    {s.name[0]}
                    <span className="sr-only">{s.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* services */}
        <nav aria-label="Storefront sections" className="min-w-0">
          <h2 className="eyebrow text-white/50">Our Services</h2>
          <ul className="mt-3.5 flex flex-col gap-2">
            {services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="text-[12.5px] transition-colors hover:text-brand">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* policies */}
        <nav aria-label="Policies" className="min-w-0">
          <h2 className="eyebrow text-white/50">Quick Links</h2>
          <ul className="mt-3.5 flex flex-col gap-2">
            {quick.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="text-[12.5px] transition-colors hover:text-brand">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* contact */}
        <div className="min-w-0">
          <h2 className="eyebrow text-white/50">Contact Info</h2>
          <ul className="mt-3.5 flex flex-col gap-2.5 text-[12.5px]">
            <li className="flex items-start gap-2">
              <Icon name="map" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              {location || 'India'}
            </li>
            {showPhone && phone && (
              <li className="flex items-start gap-2">
                <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-brand">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li className="flex min-w-0 items-start gap-2">
                <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <a href={`mailto:${email}`} className="min-w-0 break-words hover:text-brand">
                  {email}
                </a>
              </li>
            )}
            {website && (
              <li className="flex min-w-0 items-start gap-2">
                <Icon name="globe" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 break-words hover:text-brand"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-af flex flex-wrap items-center justify-between gap-2 py-4 text-[11.5px] text-white/50">
          <p>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <p>
            Storefront by{' '}
            <Link href="/" className="font-semibold text-white/70 hover:text-brand">
              ArchFacing
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
