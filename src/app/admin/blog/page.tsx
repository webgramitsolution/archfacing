import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { ContentListing, type ContentSP } from '@/components/admin/content-listing'
import { CONTENT } from '@/lib/admin-content'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage({ searchParams }: { searchParams: Promise<ContentSP> }) {
  await requirePermission('admin:moderate')
  const sp = await searchParams
  return <ContentListing cfg={CONTENT.BLOG} sp={sp} />
}
