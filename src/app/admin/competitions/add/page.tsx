import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { PostForm } from '@/app/dashboard/post-form'
import { categoriesFor } from '@/app/dashboard/post-actions'
import { POST_TYPES } from '@/config/post-types'

export const metadata: Metadata = { title: 'Post a Competition' }
export const dynamic = 'force-dynamic'

const config = POST_TYPES.DESIGN_COMPETITION

/** Admin → Post a Competition. Reuses the SAME shared dashboard PostForm. */
export default async function AddCompetitionPage() {
  await requirePermission('admin:moderate')
  const categories = await categoriesFor(config)
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/competitions" className="hover:text-brand">Design Competitions</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Post a Competition</span>
      </nav>
      <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Post a Competition</h1>
      <PostForm config={config} categories={categories} />
    </div>
  )
}
