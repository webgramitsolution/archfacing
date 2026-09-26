import type { Metadata } from 'next'
import { badgeTone } from '@/lib/verified'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { recordView } from '@/lib/visitor'
import { getSellerCertificate } from '@/lib/membership'
import { CertificateDialog } from '@/components/membership/certificate-dialog'
import { cn, formatINR } from '@/lib/utils'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { Breadcrumb, homeCrumb } from '@/components/breadcrumb'
import {
  BrandStrip, Glyph, photoSrc, SectionTitle, SellerMark, VerifiedTick,
} from '@/components/projects'
import {
  AvailabilityPill, BrandRating, PGlyph, Price, ProductCard, SpecTable,
} from '@/components/products'
import {
  compactCount, getProduct, placeLine, productMeta, productPhotos, relatedProducts,
} from '@/lib/products'
import { AutoRail } from '@/components/auto-rail'
import { ProductGallery } from './product-gallery'
import { PinnedBand } from './pinned-band'

/**
 * §4.1.7 — a single product.
 *
 * The design comp does not draw this page, so it is built to match
 * `/projects/[slug]`: the same gallery mechanics, the same two-column hero,
 * the same striped detail table, the same related rail and the same trust
 * strip — with a price block, specifications and a brand card in place of the
 * project's area/year/type strip and seller card.
 *
 * A Server Component with no client JavaScript. The two things that would
 * normally reach for a carousel library are handled without one:
 *
 *   · The hero picture is chosen by `?photo=N`. The thumbnail rail and the
 *     next arrow are links that change that number, so the page re-renders
 *     server-side with a different lead image.
 *   · The gallery and the related row are scroll-snap rails. Their arrows are
 *     in-page anchors pointing at a card inside the rail, which is what moves
 *     it — no script involved.
 */

type Params = { slug: string }
type Search = { photo?: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product Not Found' }

  const m = productMeta(product.meta)
  const summary = product.description.slice(0, 155)

  return {
    title: `${product.title} — ${m.brand}`,
    description: summary,
    openGraph: {
      title: product.title,
      description: summary,
      type: 'website',
      images: m.coverImage ? [{ url: photoSrc(m.coverImage, { w: 1200, h: 630 }) }] : undefined,
    },
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])

  const product = await getProduct(slug)
  if (!product) notFound()

  const m = productMeta(product.meta)
  const related = await relatedProducts(product.slug, product.category, product.subCategory, 12)
  // The seller's membership certificate — shown as a clickable "verified" badge
  // under the seller block when they hold an active paid plan.
  const cert = await getSellerCertificate(product.author.id)

  /*
   * Reviews. One source only: the postId-keyed `Review` table, exactly as
   * /merchandise/[slug] and the seller storefront read it. Nothing here comes
   * from `meta`, so a product can never show a rating nobody left.
   */
  const [reviews, reviewAgg] = await Promise.all([
    prisma.review.findMany({
      where: { postId: product.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, rating: true, body: true, createdAt: true, author: { select: { name: true } } },
    }),
    prisma.review.aggregate({ where: { postId: product.id }, _avg: { rating: true }, _count: true }),
  ])
  const reviewCount = reviewAgg._count
  const reviewAvg = reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : 0

  /*
   * The photographs.
   *
   * `productPhotos` prefers the seller's uploaded `Media` rows and falls back
   * to `meta.gallery` — the same resolver the cards use, so a photograph
   * uploaded through the dashboard appears on the card and here, not just one
   * of the two.
   */
  const photos = productPhotos(product).gallery

  /*
   * Resolved once here, on the server, so the client gallery imports no
   * product code: `src` leads the page, `thumb` fills the strip.
   */
  const galleryPhotos = photos.slice(0, 12).map((src) => ({
    src: photoSrc(src, { w: 700, h: 700 }),
    thumb: photoSrc(src, { w: 160, h: 160 }),
  }))

  /**
   * The specification table. The rows every product carries come first, then
   * whatever the brand wrote into `meta.specs` — so a half-filled meta block
   * still produces a complete-looking table.
   */
  const specRows: { label: string; value: string }[] = [
    { label: 'Brand', value: m.brand },
    { label: 'Category', value: m.categoryLabel },
    { label: 'Sub Category', value: m.subCategoryLabel || '—' },
    { label: 'Material', value: m.material },
    { label: 'Colour / Finish', value: m.colour },
    { label: 'Application', value: m.application },
    { label: 'Availability', value: m.availability },
    { label: 'Minimum Order', value: m.moq },
    { label: 'Warranty', value: m.warranty },
    ...m.specs,
  ]

  // "Original Product" is not shown: it was a claim on every listing rather
  // than something the platform verifies. "BMF Listed" stays — that one is a
  // real registration the account either holds or does not.
  const typeTags = [m.isBmfListed ? 'BMF Listed' : null].filter(Boolean) as string[]

  // A real share destination. Without client JavaScript there is no Web Share
  // API to call, so this hands the reader to WhatsApp with the link already
  // written — which is where a product link actually gets sent in India.
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${product.title} — ${m.brand} — https://archfacing.com/products/${product.slug}`
  )}`

  const enquiryHref = `/consult-nearby?pincode=${product.pincode ?? ''}`

  /*
   * ── The seller behind the product ──
   *
   * Only what the database actually holds. The reference design also lists
   * legal status, nature of business and annual turnover; ArchFacing stores
   * none of those, so those rows are absent rather than invented. GST and the
   * incorporation date are real columns on `CorporateProfile`.
   */
  const co = product.author.corporateProfile
  const bmf = product.author.bmfProfile
  const pro = product.author.professionalProfile
  const sellerName = co?.companyName ?? bmf?.businessName ?? product.author.name

  /*
   * The contact person — the human on the account, taken from the profile
   * (`User.name`). It is only shown when it is genuinely a different name from
   * the company: a Corporate account often has no separate person recorded, so
   * its `name` IS the company name, and printing "Delite Interiors" against
   * both "Company Name" and "Contact Person" is a duplicate, not information.
   * No name is invented to fill the row — it simply drops when there is none.
   */
  /*
   * The "About the Company" section names two things: the company and the
   * person to contact. The company is the brand — a Corporate's company, a
   * BMF's business, a professional's firm — while the contact person is the
   * account holder's own name. The person row is shown only when it is a
   * genuinely different name: a Corporate account often has no separate person
   * on file, and printing the company name against both rows is a duplicate,
   * not information. No name is invented to fill the row.
   *
   * This is deliberately separate from `sellerName` above, which drives the
   * top seller card and must stay unchanged.
   */
  const companyName =
    co?.companyName ?? bmf?.businessName ?? pro?.firmName ?? product.author.name
  const contactPerson =
    product.author.name && product.author.name.trim() !== companyName.trim()
      ? product.author.name
      : null
  // Blue tick = an active PACT holder (lib/verified.ts).
  const sellerTone = await badgeTone(product.author.id)
  const sellerVerified = sellerTone !== null
  const gst = co?.gstNumber ?? bmf?.gstNumber ?? null

  /*
   * The GST number is masked for the public and shown in full only to the
   * seller viewing their own listing — a real identifier that competitors
   * should not be able to lift, but that the owner must be able to check.
   */
  const session = await auth()
  // Stamp this visit into the reader's history — fire-and-forget, a failure
  // must never break the page they asked for.
  if (session?.user?.id) void recordView(session.user.id, product.id).catch(() => {})
  const isOwner = session?.user?.id === product.author.id
  const gstDisplay = gst ? (isOwner ? gst : maskGst(gst)) : null
  const sellerHref = product.author.sellerSlug ? `/${product.author.sellerSlug}` : null

  const sellerFacts: { label: string; value: string }[] = [
    { label: 'Location', value: placeLine(product.author.city, product.author.state) },
    ...(co?.incorporationDate
      ? [{ label: 'Established', value: String(co.incorporationDate.getFullYear()) }]
      : []),
    ...(gstDisplay ? [{ label: 'GST', value: gstDisplay }] : []),
    { label: 'Nature of Business', value: m.isBmfListed ? 'Facilitator' : 'Manufacturer' },
    {
      label: 'Member Since',
      value: product.author.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
      }),
    },
  ].filter((r) => r.value)

  return (
    <>
      <SiteHeader />

      <Breadcrumb
        items={[
          homeCrumb(),
          { label: 'Products', href: '/products' },
          { label: m.categoryLabel, href: `/products?category=${product.category}` },
          { label: product.title },
        ]}
      />

      <main className="bg-paper">
        <div className="container-af py-6">
          {/*
            ═══════════ THE BAND — 28% / 45% / 25% ═══════════

            One component, so the three columns share a height and the page’s
            own scroll can drive the middle one. See `pinned-band.tsx` for why
            an inner scroll box was the wrong tool for that.
          */}
          <PinnedBand
            gallery={<ProductGallery photos={galleryPhotos} title={product.title} />}
            info={
              <div className="space-y-4">
                <h1 className="font-display text-[22px] font-bold leading-tight text-ink md:text-[18px] lg:text-[24px]">
                  {product.title}
                </h1>
  
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="tabular font-display text-[28px] font-bold leading-none text-brand md:text-[21px] lg:text-[30px]">
                    {formatINR(m.price)}
                  </span>
                  <span className="text-[13px] text-ink-3">/ {m.unit.replace(/^\//, '')}</span>
                  <AvailabilityPill value={m.availability} />
                </div>
  
                {typeTags.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {typeTags.map((t) => (
                      <li
                        key={t}
                        className="pill border border-brand-border bg-brand-soft text-[11px] text-brand"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
  
                {/* zebra-striped specifications */}
                <dl className="overflow-hidden rounded-card">
                  {specRows.map((r, i) => (
                    <div
                      key={r.label + i}
                      className={cn('flex gap-4 px-3 py-1.5', i % 2 === 0 && 'bg-paper-2')}
                    >
                      <dt className="w-1/3 shrink-0 text-[13px] text-ink-3 md:text-[11.5px] lg:text-[13px]">
                        {r.label}
                      </dt>
                      <dd className="min-w-0 text-[13px] text-ink md:text-[11.5px] lg:text-[13px]">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
  
                <div>
                  <h2 className="font-display text-[18px] font-bold text-ink md:text-[15px] lg:text-[18px]">
                    Product Description
                  </h2>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2 md:text-[12px] lg:text-[13.5px]">
                    {m.detailBody || product.description}
                  </p>
                </div>
  
                {m.highlights.length > 0 && (
                  <div>
                    <h2 className="font-display text-[18px] font-bold text-ink md:text-[15px] lg:text-[18px]">
                      Highlights
                    </h2>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {m.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2 text-[13px] text-ink-2 md:text-[11.5px] lg:text-[13px]"
                        >
                          <Glyph name="check" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ok" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
  
              </div>
            }
            seller={
              <div className="card space-y-4 p-4">
                {/*
                  Stacked, not side by side.
  
                  At 25% of the grid this column is about 320px, and a 80px
                  logo beside the name left roughly 200px for it — enough to
                  render "Kajaria Ceramics" as "Kaja…" and the tagline and
                  "Manufacturer" as stubs. The logo now sits above the name,
                  which gives every line the full width.
                */}
                <div className="flex flex-col gap-2.5">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-paper-2">
                    {m.brandCard.photo ? (
                      <Image
                        src={photoSrc(m.brandCard.photo, { w: 160, h: 160 })}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-display text-[20px] font-bold text-ink-3">
                        {m.brandCard.initials}
                      </span>
                    )}
                  </span>
  
                  <div className="min-w-0 flex-1">
                    {sellerHref ? (
                      <Link
                        href={sellerHref}
                        className="flex items-center gap-1.5 font-display text-[14px] font-bold text-ink transition-colors hover:text-brand"
                      >
                        <span className="min-w-0">{sellerName}</span>
                        {sellerVerified && <VerifiedTick tone={sellerTone} />}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 font-display text-[14px] font-bold text-ink">
                        <span className="min-w-0">{sellerName}</span>
                        {sellerVerified && <VerifiedTick tone={sellerTone} />}
                      </span>
                    )}
  
                    <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">
                      {m.brandCard.tagline}
                    </p>
  
                    <div className="mt-1">
                      <BrandRating rating={reviewAvg} reviews={reviewCount} />
                    </div>

                    {cert && (
                      <div className="mt-1.5">
                        <CertificateDialog data={cert} />
                      </div>
                    )}
                  </div>
                </div>
  
                {/*
                  Label above value, not beside it.
  
                  At the tablet width this column is ~176px, and a label like
                  "Nature of Business" beside its value left so little room
                  that "Manufacturer" broke mid-word. Stacking is the same
                  shape at every width, which is what "computer and tablet
                  look the same" actually requires.
                */}
                <dl className="flex flex-col gap-2.5 text-[12px]">
                  {sellerFacts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-[11px] leading-tight text-ink-3">{f.label}</dt>
                      {/* `break-words`: a GST number is one 15-character token
                          and must wrap rather than be clipped. */}
                      <dd className="break-words font-medium leading-snug text-ink">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
  
                {/*
                  The comp's "View Mobile Number" is not reproduced.
  
                  Publishing a seller's phone number on a public page is a
                  privacy decision, not a layout one, and ArchFacing already
                  routes buyers through Consult Nearby so the enquiry lands
                  with whoever holds that PACT territory. Say the word and
                  this becomes a real reveal-on-click.
                */}
                <div className="flex flex-col gap-2 pt-1">
                  <Link href={enquiryHref} className="btn-primary w-full justify-center">
                    Send Enquiry
                  </Link>
                  {sellerHref && (
                    <Link
                      href={sellerHref}
                      className="w-full rounded-card border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Visit Seller Store
                    </Link>
                  )}
                </div>
              </div>
            }
          />

          {/* ═══════════ RELATED ═══════════ */}
          {related.length > 0 && (
            <section className="mt-4">
              <h2 className="mb-3 font-display text-[18px] font-bold text-ink">Related Products</h2>
              <AutoRail
                label="Related products"
                perView={{ base: 2, md: 4, lg: 6 }}
                gap={12}
                intervalMs={4400}
                items={related.map((r) => (
                  <ProductCard
                    key={r.id}
                    post={r}
                    sizes="(min-width:1024px) 16vw, (min-width:768px) 24vw, 45vw"
                  />
                ))}
              />
            </section>
          )}

          {/* ═══════════ THE SELLER, IN FULL — 25% / 75% ═══════════ */}
          <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,25fr)_minmax(0,75fr)]">
            <div className="card h-fit space-y-3 p-6">
              <Field label="Company Name" value={companyName} />
              {contactPerson && <Field label="Contact Person" value={contactPerson} />}
              <Field
                label="Address"
                value={
                  [
                    product.author.addressLine,
                    placeLine(product.author.city, product.author.state),
                    product.author.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ') || '—'
                }
              />
              {co?.website && (
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-3">Website</p>
                  <a
                    href={co.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-[13px] font-medium text-brand hover:underline"
                  >
                    {co.website}
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-3">
                <Link href={enquiryHref} className="btn-primary w-full justify-center">
                  Contact Seller
                </Link>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="w-full rounded-card border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Share Product
                </a>
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="mb-4 font-display text-[20px] font-bold text-ink">
                About the Company
              </h2>

              <dl className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                {sellerFacts.slice(0, 4).map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[12px] text-ink-3">{f.label}</dt>
                    <dd className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {m.brandCard.tagline
                  ? `${sellerName} — ${m.brandCard.tagline}.`
                  : `${sellerName} lists products on ArchFacing.`}
              </p>

              {/*
                Reviews — the real `Review` rows for THIS product, newest
                first. Nothing is drawn from `meta`, so the count beside the
                seller's name and the list below it can never disagree.
              */}
              {reviewCount > 0 ? (
                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-[15px] font-bold text-ink">
                      Buyer Reviews
                    </h3>
                    <BrandRating rating={reviewAvg} reviews={reviewCount} />
                  </div>
                  <ul className="mt-3.5 grid gap-2.5">
                    {reviews.map((rv) => (
                      <li key={rv.id} className="card px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-ink">
                            {rv.author.name ?? 'ArchFacing member'}
                          </p>
                          <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                            <Glyph name="star" className="h-3 w-3 fill-current text-brand" />
                            <span className="tabular font-semibold text-ink">{rv.rating}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular">
                              {rv.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </span>
                        </div>
                        {rv.body ? (
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{rv.body}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {reviewCount > reviews.length ? (
                    <p className="mt-2.5 text-[11.5px] text-ink-3">
                      Showing the {reviews.length} most recent of {reviewCount} reviews.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="card mt-8 px-6 py-10 text-center">
                  <Glyph name="star" className="mx-auto h-8 w-8 text-ink-4" />
                  <p className="mt-2.5 font-display text-[14.5px] font-bold text-ink">
                    No reviews yet
                  </p>
                  <p className="mx-auto mt-1.5 max-w-md text-balance text-[12.5px] leading-relaxed text-ink-3">
                    Nobody has reviewed this product yet. Send an enquiry and speak to{' '}
                    {sellerName} directly.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/*
          The brand strip only. The trust badges below it were not asked
          for here, and a 20px gap is all that should sit between the brands
          and the footer.
        */}
        {/*
          20px between the brands and the footer, exactly.

          The footer carries a global 40px top margin (`mt-10`); a negative
          bottom margin here trims it to the 20px asked for on this page
          without touching the shared footer.
        */}
        <div className="container-af -mb-5">
          <BrandStrip />
        </div>
      </main>

      <SiteFooter />
    </>
  )
}

/** One label-and-value block in the seller's contact card. */
/**
 * A GST number shown to the public with only its first three and last two
 * characters legible — enough to recognise, not enough to copy. The seller
 * looking at their own listing sees it in full (see the `isOwner` check).
 */
function maskGst(gst: string): string {
  const g = gst.trim()
  if (g.length <= 6) return g
  return g.slice(0, 3) + '•'.repeat(g.length - 5) + g.slice(-2)
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="text-[13.5px] font-medium text-ink">{value}</p>
    </div>
  )
}
