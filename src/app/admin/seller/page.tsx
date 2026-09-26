import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel } from '@/components/admin/parts'
import { EmptyState, Icon } from '@/components/ui'
import { sellerCatalogue } from './actions'
import { StockEditor } from './stock-editor'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Merchandise & Podcast' }

export default async function SellerHome() {
  await requirePermission('seller:merchandise')

  const [catalogue, podcasts, orders, revenue] = await Promise.all([
    sellerCatalogue(),
    prisma.post.count({ where: { type: 'PODCAST', deletedAt: null } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'PACKED', 'SHIPPED'] } } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', purpose: 'MERCHANDISE_ORDER' },
      _sum: { totalAmount: true },
    }),
  ])

  const lowStock = catalogue.flatMap((p) =>
    p.variants
      .filter((v) => v.isActive && v.stock <= v.lowStockAt)
      .map((v) => ({ product: p.title, slug: p.slug, variant: v }))
  )

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Merchandise & Podcast"
        action={
          <>
            <Link href="/admin/seller/new-merchandise" className="btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Merchandise
            </Link>
            <Link href="/admin/seller/new-podcast" className="btn-outline">
              <Icon name="plus" className="h-4 w-4" />
              Podcast
            </Link>
          </>
        }
      >
        ArchFacing&rsquo;s own Merchandise catalogue and Podcast episodes are posted from here.
      </AdminPageHead>

      <section className="grid grid-cols-4 gap-4">
        <MiniStat icon="bag" label="Merchandise" value={catalogue.length} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} />
        <MiniStat icon="inbox" label="Podcast episodes" value={podcasts} tint={{ bg: '#E4EEFF', fg: '#2563EB' }} />
        <MiniStat icon="box" label="Open orders" value={orders} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} />
        <MiniStat icon="rupee" label="Sales" value={formatINR(Number(revenue._sum.totalAmount ?? 0))} tint={{ bg: '#FFEEE0', fg: '#F97316' }} />
      </section>

      {lowStock.length > 0 && (
        <Panel title="Running low on stock" subtitle="restock these, or sales will stall">
          <ul className="grid grid-cols-3 gap-2">
            {lowStock.map(({ product, variant }) => (
              <li
                key={variant.id}
                className="card flex items-center gap-3 border-l-[3px] border-l-brand p-3.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">
                    {product}
                  </span>
                  <span className="block text-[12px] text-ink-3">
                    {variant.label ?? 'Single variant'} · {variant.sku}
                  </span>
                </span>
                <span
                  className={variant.stock === 0 ? 'pill-brand' : 'pill-warn'}
                >
                  {variant.stock === 0 ? 'Out of stock' : `${variant.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Catalogue"
        action={
          <Link href="/admin/seller/orders" className="text-[11.5px] font-semibold text-brand hover:underline">
            View orders ›
          </Link>
        }
      >
        {catalogue.length === 0 ? (
          <EmptyState
            icon="bag"
            title="Nothing listed yet"
            action={
              <Link href="/admin/seller/new-merchandise" className="btn-primary">
                Add the first item
              </Link>
            }
          >
            Apparel, stationery, books — whatever you want to sell.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {catalogue.map((p) => (
              <li key={p.id} className="card overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper-3">
                    {p.media[0] ? (
                      <Image
                        src={p.media[0].url}
                        alt={p.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-4">
                        <Icon name="bag" className="h-5 w-5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/merchandise/${p.slug}`}
                        className="font-display text-[15px] font-semibold text-ink hover:text-brand"
                      >
                        {p.title}
                      </Link>
                      <span className={p.status === 'PUBLISHED' ? 'pill-ok' : 'pill-muted'}>
                        {p.status === 'PUBLISHED' ? 'On sale' : 'Delisted'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {p.category} · {p.variants.length} variants
                    </p>
                  </div>
                </div>

                <StockEditor
                  postId={p.id}
                  published={p.status === 'PUBLISHED'}
                  variants={p.variants.map((v) => ({
                    id: v.id,
                    sku: v.sku,
                    label: v.label,
                    price: Number(v.price),
                    stock: v.stock,
                  }))}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
