import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { PostForm } from '@/app/dashboard/post-form'
import { categoriesFor } from '@/app/dashboard/post-actions'
import { POST_TYPES } from '@/config/post-types'

export const metadata: Metadata = { title: 'Add New Artwork' }
export const dynamic = 'force-dynamic'

const config = POST_TYPES.ARTISTRY

/** Admin → Add Artistry. Reuses the SAME shared dashboard PostForm. */
export default async function AddArtistryPage() {
  await requirePermission('admin:moderate')
  const categories = await categoriesFor(config)
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/artistry" className="hover:text-brand">Artistry</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Add New Artwork</span>
      </nav>
      <div>
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Add New Artwork</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">{config.description}</p>
      </div>
      <PostForm config={config} categories={categories} />
    </div>
  )
}
