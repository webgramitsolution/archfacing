import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAssociate } from '@/lib/design-associates'
import { Icon } from '@/components/ui'
import { SellerContactForm } from './contact-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return {}
  const who = a.firmName || a.name
  return {
    title: `Contact ${who}`,
    description: `Get in touch with ${who} on ArchFacing — send a message, find their location and contact details.`,
  }
}

/**
 * The storefront's Contact tab — a brand-coloured band with the form and the
 * seller's contact cards overlapping into it, per the reference design.
 *
 * The phone number is shown only to a signed-in reader, the same gate the
 * storefront header applies.
 */
export default async function SellerContactPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company } = await params
  const a = await getAssociate(company)
  if (!a) notFound()

  const who = a.firmName || a.name

  const [session, owner] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { id: a.id },
      select: { email: true, mobile: true },
    }),
  ])
  const signedIn = Boolean(session?.user?.id)

  const cards: { icon: 'phone' | 'mail' | 'map' | 'globe'; label: string; value: string; href?: string }[] = []

  if (owner?.mobile) {
    cards.push(
      signedIn
        ? { icon: 'phone', label: 'Phone', value: owner.mobile, href: `tel:${owner.mobile}` }
        : { icon: 'phone', label: 'Phone', value: 'Sign in to view number', href: `/login?next=/${a.slug}/contact` }
    )
  }
  if (owner?.email) {
    cards.push({ icon: 'mail', label: 'Email', value: owner.email, href: `mailto:${owner.email}` })
  }
  cards.push({ icon: 'map', label: 'Location', value: `${a.location || 'India'}` })
  if (a.company?.website) {
    cards.push({
      icon: 'globe',
      label: 'Website',
      value: a.company.website.replace(/^https?:\/\//, ''),
      href: a.company.website,
    })
  }

  return (
    <div className="pb-10">
      {/* ─── the brand band ─── */}
      <section className="bg-brand">
        <div className="container-af pb-20 pt-10 text-center md:pb-24 md:pt-12">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/80">
            Get In Touch
          </p>
          <h2 className="mt-1.5 font-display text-[24px] font-bold tracking-tight text-white md:text-[30px]">
            We&apos;d Love to Hear From You
          </h2>
        </div>
      </section>

      {/* ─── content overlapping the band ─── */}
      <div className="container-af -mt-12 md:-mt-16">
        <div className="grid gap-5 lg:grid-cols-5">
          {/* the form — 3 of 5 columns */}
          <div className="card min-w-0 p-5 md:p-6 lg:col-span-3">
            <h3 className="mb-4 font-display text-[16px] font-bold text-ink">
              Send {who} a message
            </h3>
            <SellerContactForm company={company} sellerName={who} />
          </div>

          {/* the info cards — 2 of 5 columns */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            {/* company card */}
            <div className="card flex min-w-0 items-center gap-3.5 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper">
                {a.logo || a.photo ? (
                  <Image
                    src={(a.logo || a.photo)!}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon name="building" className="h-6 w-6 text-brand" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[14.5px] font-bold text-ink">
                  {who}
                </span>
                <span className="block truncate text-[12px] text-ink-3">
                  {a.discipline || 'Verified Seller'}
                </span>
              </span>
            </div>

            {cards.map((c) => (
              <div key={c.label} className="card flex min-w-0 items-center gap-3.5 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon name={c.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block">{c.label}</span>
                  {c.href ? (
                    <a
                      href={c.href}
                      {...(c.icon === 'globe'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="mt-0.5 block break-words text-[13px] font-semibold text-ink hover:text-brand"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span className="mt-0.5 block break-words text-[13px] font-semibold text-ink">
                      {c.value}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
