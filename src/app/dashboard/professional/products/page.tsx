import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { categoryPathLabeller } from '@/lib/category-path'
import { productMeta } from '@/lib/products'
import { Icon } from '@/components/ui'
import { ProductsTable, type ProductRow, type ProductKpis } from './products-table'

const ADD_HREF = '/dashboard/professional/products/new'

export const metadata: Metadata = { title: 'My Products' }
export const dynamic = 'force-dynamic'

function stockOf(availability: string | undefined): ProductRow['stock'] {
  const a = (availability ?? '').toLowerCase()
  if (a.includes('out')) return 'OUT'
  if (a.includes('low')) return 'LOW'
  return 'IN'
}
function skuOf(category: string | null, i: number): string {
  const p = (category ?? 'PRD').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PRD'
  return `${p}-${String(i + 1).padStart(3, '0')}`
}
function badgeOf(b: string | null): string | null {
  if (!b) return null
  return b.split(/[-_\s]/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default async function Page() {
  const user = await requireRole('PROFESSIONAL')

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, type: 'PRODUCT', deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, description: true, slug: true, category: true, subCategory: true, tertiaryCategory: true, status: true,
      viewCount: true, featured: true, meta: true,
      media: { where: { type: 'IMAGE' }, take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true, thumbnailUrl: true } },
    },
  })

  const ids = posts.map((p) => p.id)
  const enqRows = ids.length
    ? await prisma.enquiry.groupBy({ by: ['sourceId'], where: { sourceId: { in: ids } }, _count: { _all: true } })
    : []
  const enqBy = new Map(enqRows.map((r) => [r.sourceId, r._count._all]))

  const pathOf = await categoryPathLabeller('PRODUCT')
  const products: ProductRow[] = posts.map((p, i) => {
    const m = productMeta(p.meta)
    const path = pathOf(p.category, p.subCategory, p.tertiaryCategory)
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? '',
      slug: p.slug,
      sku: skuOf(p.category, i),
      category: path[0] ?? p.category,
      categoryPath: path,
      price: m.price ?? 0,
      unit: m.unit ?? '',
      stock: stockOf(m.availability as unknown as string),
      badge: badgeOf(m.badge as unknown as string | null),
      status: p.status,
      views: p.viewCount,
      enquiries: enqBy.get(p.id) ?? 0,
      featured: p.featured,
      image: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
    }
  })

  const kpis: ProductKpis = {
    total: products.length,
    published: products.filter((p) => p.status === 'PUBLISHED').length,
    drafts: products.filter((p) => p.status === 'DRAFT').length,
    outOfStock: products.filter((p) => p.stock === 'OUT').length,
    views: products.reduce((s, p) => s + p.views, 0),
    enquiries: products.reduce((s, p) => s + p.enquiries, 0),
  }

  return (
    <div>
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="box" className="h-5 w-5" /></span>
          <div>
            <h1 className="font-display text-[20px] font-bold tracking-tight text-ink">My Products</h1>
            <p className="text-[12.5px] text-ink-3">Manage your product listings, update details, track performance and reach more buyers.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href={ADD_HREF} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
            <Icon name="download" className="h-4 w-4" /> Import Products
          </Link>
          <Link href={ADD_HREF} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90">
            <Icon name="plus" className="h-4 w-4" /> Add New Product
          </Link>
        </div>
      </div>

      <ProductsTable products={products} kpis={kpis} addHref={ADD_HREF} />
    </div>
  )
}
