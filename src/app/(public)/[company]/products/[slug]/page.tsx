import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordView } from '@/lib/visitor'
import { cn, formatINR } from '@/lib/utils'
import { getProduct, productMeta, productPhotos } from '@/lib/products'
import { getAssociate } from '@/lib/design-associates'
import { photoSrc } from '@/components/projects'
import { AvailabilityPill } from '@/components/products'
import { Icon } from '@/components/ui'
import { ProductGallery } from '@/app/(public)/products/[slug]/product-gallery'

/**
 * A product opened INSIDE the seller's storefront — same data as
 * `/products/[slug]`, but the page keeps the seller chrome (identity row,
 * orange menu, seller footer) instead of jumping out to the main site.
 *
 * The one hard rule: the product must belong to THIS seller. A slug pasted
 * under someone else's storefront 404s rather than showing another seller's
 * listing under this seller's name.
 */

type Params = { company: string; slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { company, slug } = await params
  const [a, product] = await Promise.all([getAssociate(company), getProduct(slug)])
  if (!a || !product || product.author.id !== a.id) return { title: 'Product Not Found' }
  const m = productMeta(product.meta)
  return {
    title: `${product.title} — ${a.firmName || a.name}`,
    description: product.description.slice(0, 155),
    openGraph: {
      title: product.title,
      description: product.description.slice(0, 155),
      type: 'website',
      images: m.coverImage ? [{ url: photoSrc(m.coverImage, { w: 1200, h: 630 }) }] : undefined,
    },
  }
}

export default async function SellerProductPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { company, slug } = await params

  const [a, product] = await Promise.all([getAssociate(company), getProduct(slug)])
  if (!a || !product) notFound()
  // The ownership gate — this storefront shows only this seller's listings.
  if (product.author.id !== a.id) notFound()

  const who = a.firmName || a.name
  const base = `/${a.slug}`
  const m = productMeta(product.meta)

  const session = await auth()
  if (session?.user?.id) void recordView(session.user.id, product.id).catch(() => {})

  const photos = productPhotos(product).gallery
  const galleryPhotos = photos.slice(0, 12).map((src) => ({
    src: photoSrc(src, { w: 700, h: 700 }),
    thumb: photoSrc(src, { w: 160, h: 160 }),
  }))

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
  ].filter((r) => r.value && r.value !== '—')

  // The rest of this seller's shelf, minus the product being read.
  const more = await prisma.post.findMany({
    where: {
      authorId: a.id,
      type: 'PRODUCT',
      status: 'PUBLISHED',
      deletedAt: null,
      id: { not: product.id },
    },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: {
      id: true,
      slug: true,
      title: true,
      meta: true,
      media: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
    },
  })

  const enquiryHref = `/consult-nearby?pincode=${product.pincode ?? ''}`

  return (
    <div className="container-af flex flex-col gap-9 py-7">
      {/* in-store breadcrumb — stays inside the storefront */}
      <nav aria-label="Breadcrumb" className="-mb-4 text-[12px] text-ink-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={base} className="hover:text-brand">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`${base}/products`} className="hover:text-brand">
              Products
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="truncate font-medium text-ink" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* ═══════════ gallery + facts ═══════════ */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <div className="min-w-0 md:sticky md:top-16 md:self-start">
          <ProductGallery photos={galleryPhotos} title={product.title} />
        </div>

        <div className="min-w-0 space-y-4">
          <h1 className="font-display text-[22px] font-bold leading-tight text-ink lg:text-[24px]">
            {product.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="tabular font-display text-[28px] font-bold leading-none text-brand">
              {m.price > 0 ? formatINR(m.price) : 'Get Quote'}
            </span>
            {m.price > 0 && (
              <span className="text-[13px] text-ink-3">/ {m.unit.replace(/^\//, '')}</span>
            )}
            <AvailabilityPill value={m.availability} />
          </div>

          {/* zebra-striped specifications */}
          {specRows.length > 0 && (
            <dl className="overflow-hidden rounded-card border border-line-soft">
              {specRows.map((r, i) => (
                <div
                  key={r.label + i}
                  className={cn('flex gap-4 px-3 py-1.5', i % 2 === 0 && 'bg-paper-2')}
                >
                  <dt className="w-1/3 shrink-0 text-[13px] text-ink-3">{r.label}</dt>
                  <dd className="min-w-0 text-[13px] text-ink">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {product.description && (
            <div>
              <h2 className="font-display text-[14px] font-bold text-ink">Description</h2>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
            <Link href={enquiryHref} className="btn-primary justify-center sm:min-w-[180px]">
              Send Enquiry
            </Link>
            <Link
              href={`${base}/contact`}
              className="rounded-card border border-line px-5 py-2.5 text-center text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
            >
              Contact {who}
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ more from this seller ═══════════ */}
      {more.length > 0 && (
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-ink">More from {who}</h2>
            <Link
              href={`${base}/products`}
              className="shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
            >
              View All →
            </Link>
          </div>

          <ul className="grid grid-cols-2 gap-[7px] sm:grid-cols-3 sm:gap-[10px] md:grid-cols-4 lg:grid-cols-6 lg:gap-[15px]">
            {more.map((p) => {
              const pm = productMeta(p.meta)
              return (
                <li key={p.id} className="min-w-0">
                  <Link
                    href={`${base}/products/${p.slug}`}
                    className="card-hover group flex h-full min-w-0 flex-col overflow-hidden"
                  >
                    <span className="relative block aspect-square overflow-hidden bg-paper-3">
                      {p.media[0]?.url ? (
                        <Image
                          src={p.media[0].url}
                          alt=""
                          fill
                          sizes="(min-width:1024px) 16vw, (min-width:640px) 30vw, 46vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-ink-4">
                          <Icon name="box" className="h-6 w-6" />
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col p-2 sm:p-2.5">
                      <span className="line-clamp-2 text-[12px] font-medium leading-snug text-ink">
                        {p.title}
                      </span>
                      <span className="mt-1.5 block truncate text-[12px] font-bold text-brand">
                        {pm.price > 0 ? formatINR(pm.price) : 'Get Quote'}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
