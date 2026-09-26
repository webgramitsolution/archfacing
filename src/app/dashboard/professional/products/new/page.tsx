import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { PostForm } from '../../../post-form'
import { categoriesFor } from '../../../post-actions'
import { POST_TYPES } from '@/config/post-types'

const config = POST_TYPES.PRODUCT

export const metadata: Metadata = { title: 'Add New Product' }
export const dynamic = 'force-dynamic'

export default async function AddProductPage() {
  const user = await requireRole('PROFESSIONAL')
  const [categories, me] = await Promise.all([
    categoriesFor(config),
    prisma.user.findUnique({ where: { id: user.id }, select: { pincode: true, state: true } }),
  ])

  return (
    <div>
      <Link href="/dashboard/professional/products" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-brand">
        <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Back to My Products
      </Link>
      <div className="mb-5 flex items-center gap-2.5 border-b border-line-soft pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="plus" className="h-5 w-5" /></span>
        <h1 className="font-display text-[20px] font-bold tracking-tight text-ink">Add New Product</h1>
      </div>
      <PostForm config={config} categories={categories} defaultPincode={me?.pincode} defaultState={me?.state} />
    </div>
  )
}
