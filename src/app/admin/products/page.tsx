import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { ContentListing, type ContentSP } from '@/components/admin/content-listing'
import { CONTENT } from '@/lib/admin-content'

export const metadata: Metadata = { title: 'Products' }
export const dynamic = 'force-dynamic'

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ContentSP> }) {
  await requirePermission('admin:moderate')
  const sp = await searchParams
  return <ContentListing cfg={CONTENT.PRODUCT} sp={sp} />
}
