import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatINR } from '@/lib/utils'
import { productMeta } from '@/lib/products'
import { getAssociate } from '@/lib/design-associates'
import { isUsableSellerSlug } from '@/config/reserved-slugs'
import { Icon } from '@/components/ui'
import { VerifiedTick } from '@/components/blog'
import { SellerSearch, type SearchProduct } from '@/components/seller/seller-search'
import { getSellerCertificate } from '@/lib/membership'
import { CertificateDialog } from '@/components/membership/certificate-dialog'
import { SellerFooter } from '@/components/seller/seller-footer'
import { StorefrontMenu } from './storefront-menu'
import { recordProfileView } from '@/lib/profile-views'

/**
 * The chrome around a seller's storefront — the B2B-directory treatment:
 *
 *   · a WHITE identity row — logo, company name with the verified tick,
 *     city/state, the seller's own product search, and a facts card with the
 *     real rating, the phone (signed-in readers only) and the membership;
 *   · a BRAND-ORANGE menu bar whose active tab carries a white underline,
 *     with the GST number and "Since {year}" on its right;
 *   · every tab is a real route under `/{slug}` — server-rendered pages, not
 *     client tabs — and the shared dark footer closes each of them.
 *
 * ★ Nothing on this bar is invented: the rating is the average of real
 *   `Review` rows on this seller's posts (or "New Seller" when there are
 *   none), the phone is the seller's own `User.mobile`, and the GST comes off
 *   their registered company — masked, the same courtesy the product page
 *   already extends.
 *
 * ★ This route sits at the ROOT — `archfacing.com/<sellerSlug>` — and
 *   `isUsableSellerSlug` refuses reserved words before the database is
 *   touched.
 */

/** GST for the public: first three + last two, the middle starred out. */
function maskGst(gst: string): string {
  if (gst.length <= 5) return gst
  return `${gst.slice(0, 3)}${'•'.repeat(Math.max(0, gst.length - 5))}${gst.slice(-2)}`
}

export default async function AssociateLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ company: string }>
}) {
  const { company } = await params

  if (!isUsableSellerSlug(company)) notFound()

  const a = await getAssociate(company)
  if (!a) notFound()

  const who = a.firmName || a.name
  const base = `/${a.slug}`

  const [session, owner, rating, productRows, cert] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { id: a.id },
      select: { email: true, mobile: true },
    }),
    prisma.review.aggregate({
      where: { post: { authorId: a.id, deletedAt: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // This seller's published products, for the header search.
    prisma.post.findMany({
      where: { authorId: a.id, type: 'PRODUCT', status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        meta: true,
        media: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    }),
    getSellerCertificate(a.id),
  ])

  const signedIn = Boolean(session?.user?.id)

  // Profile Views — counted after the response is sent; renders nothing.
  const h = await headers()
  after(() =>
    recordProfileView({
      profileUserId: a.id,
      viewerId: session?.user?.id ?? null,
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip'),
      userAgent: h.get('user-agent'),
    }).catch(() => {})
  )
  const phone = owner?.mobile ?? null

  const searchProducts: SearchProduct[] = productRows.map((p) => {
    const m = productMeta(p.meta)
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      image: p.media[0]?.url ?? null,
      price: m.price > 0 ? formatINR(m.price) : null,
    }
  })

  const avg = rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null
  const reviewCount = rating._count._all

  const initials = who
    .replace(/^(ar|er|dr)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const memberSince = a.memberSince.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <>
      <main className="bg-paper">
        {/* ═══════════ WHITE IDENTITY ROW ═══════════ */}
        <div className="border-b border-line bg-paper">
          <div className="container-af flex items-center justify-between gap-3 py-2.5">
            {/* logo + name */}
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper lg:h-12 lg:w-12">
                {a.logo || a.photo ? (
                  <Image
                    src={(a.logo || a.photo)!}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-[15px] font-bold text-brand">{initials}</span>
                )}
              </span>

              <div className="hidden min-w-0 sm:block">
                <h1 className="flex items-center gap-1.5 truncate font-display text-[15px] font-bold leading-tight text-ink lg:text-[17px]">
                  <span className="truncate">{who}</span>
                  {a.isVerified && <VerifiedTick className="h-4 w-4 shrink-0" tone={a.badgeTone} />}
                </h1>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3">
                  <Icon name="map" className="h-3 w-3 shrink-0" />
                  <span className="truncate">{a.location || 'India'}</span>
                </p>
              </div>
            </div>

            {/* this seller's product search */}
            <SellerSearch base={base} products={searchProducts} />

            {/* facts card — rating · phone · membership */}
            <div className="hidden shrink-0 items-center divide-x divide-line overflow-hidden rounded-card border border-line bg-paper shadow-card sm:flex">
              <Link
                href={`${base}/reviews`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-paper-3 sm:px-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warn-soft">
                  <Icon name="star" className="h-3.5 w-3.5 text-warn" />
                </span>
                <span className="text-left">
                  {avg ? (
                    <>
                      <span className="tabular block text-[11.5px] font-bold text-warn">
                        {avg} Rating
                      </span>
                      <span className="block text-[9px] text-ink-4">
                        {reviewCount} review{reviewCount === 1 ? '' : 's'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-[11.5px] font-bold text-ink-2">New Seller</span>
                      <span className="block text-[9px] text-ink-4">No reviews yet</span>
                    </>
                  )}
                </span>
              </Link>

              {phone &&
                (signedIn ? (
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-paper-3 sm:px-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-soft">
                      <Icon name="phone" className="h-3.5 w-3.5 text-info" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[9px] text-ink-4">Call Now</span>
                      <span className="tabular block text-[11.5px] font-bold text-info">{phone}</span>
                    </span>
                  </a>
                ) : (
                  <Link
                    href={`/login?next=${base}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-paper-3 sm:px-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-soft">
                      <Icon name="phone" className="h-3.5 w-3.5 text-info" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[9px] text-ink-4">Phone</span>
                      <span className="block text-[11.5px] font-bold text-info">Sign in to view</span>
                    </span>
                  </Link>
                ))}

              {cert ? (
                <CertificateDialog
                  data={cert}
                  trigger={
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-paper-3 sm:px-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-warn to-amber-500 text-white shadow-sm">
                        <Icon name="trophy" className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-left">
                        <span className="block text-[9px] font-medium text-ink-4">Member</span>
                        <span className="block text-[11.5px] font-bold text-warn">{cert.membershipLevel}</span>
                      </span>
                    </span>
                  }
                />
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-3 text-ink-3">
                    <Icon name="award" className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-left">
                    <span className="block text-[9px] font-medium text-ink-4">Member</span>
                    <span className="block text-[11.5px] font-bold text-ink-2">Starter</span>
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ BRAND MENU BAR ═══════════ */}
        <StorefrontMenu
          base={base}
          counts={a.counts}
          gst={a.company ? maskGst(a.company.gstNumber) : null}
          since={a.memberSince.getFullYear()}
        />

        {children}
      </main>

      <SellerFooter
        base={base}
        name={who}
        logo={a.logo || a.photo}
        about={a.bio}
        location={a.location || 'India'}
        email={owner?.email ?? null}
        phone={phone}
        showPhone={signedIn}
        website={a.company?.website ?? null}
        links={a.links}
      />
    </>
  )
}
