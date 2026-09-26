import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead } from '@/components/admin/parts'
import { Icon } from '@/components/ui'

export const metadata: Metadata = { title: 'Product Categories' }
export const dynamic = 'force-dynamic'

export default async function SellerCategoriesPage() {
  await requirePermission('seller:merchandise')

  const [grouped, cats] = await Promise.all([
    prisma.post.groupBy({ by: ['category'], where: { type: 'MERCHANDISE', deletedAt: null }, _count: true }),
    prisma.category.findMany({ where: { type: 'MERCHANDISE' }, select: { slug: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ])
  const countBy = new Map(grouped.map((g) => [g.category, g._count]))
  const catName = new Map(cats.map((c) => [c.slug, c.name]))

  // union of catalogue categories + defined merchandise categories
  const slugs = Array.from(new Set([...cats.map((c) => c.slug), ...grouped.map((g) => g.category)]))
  const rows = slugs
    .map((slug) => ({ slug, name: catName.get(slug) ?? slug.replace(/-/g, ' '), count: countBy.get(slug) ?? 0 }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-5">
      <div className="rise flex items-start justify-between gap-4">
        <AdminPageHead title="Product Categories">
          The categories your merchandise is organised under. Every product is filed into one of these on the storefront.
        </AdminPageHead>
        <Link href="/admin/categories" className="shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Manage in Admin →</Link>
      </div>

      {rows.length === 0 ? (
        <div className="rise rise-1 rounded-card border border-line bg-white p-16 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name="tag" className="h-6 w-6" /></span>
          <p className="mt-3 text-[13px] font-semibold text-ink">No categories yet</p>
        </div>
      ) : (
        <section className="rise rise-1 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((c) => (
            <Link key={c.slug} href={`/admin/seller/products`} className="group rounded-card border border-line bg-white p-4 shadow-card transition-colors hover:border-brand/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="tag" className="h-5 w-5" /></span>
              <p className="mt-3 truncate font-display text-[14px] font-bold capitalize text-ink group-hover:text-brand">{c.name}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-3">{c.count} product{c.count === 1 ? '' : 's'}</p>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
