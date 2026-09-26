import type { Metadata } from 'next'
import Link from 'next/link'

import { requireRole } from '@/lib/guard'
import { listSaved } from '@/lib/visitor'
import { PageHeading } from '@/components/dashboard-shell'
import { EmptyState } from '@/components/ui'
import { VisitorCardGrid } from '@/components/dashboard/visitor-cards'

export const metadata: Metadata = { title: 'Saved Items' }

export default async function SavedItemsPage() {
  const user = await requireRole('CLIENT')
  const items = await listSaved(user.id, 48)

  return (
    <>
      <PageHeading title="Saved Items">
        Everything you have bookmarked across projects, products, artistry and more.
      </PageHeading>

      {items.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Nothing saved yet"
          action={
            <Link href="/projects" className="btn-primary">
              Browse projects
            </Link>
          }
        >
          Tap the save button on any project, product or artwork and it will wait for
          you here.
        </EmptyState>
      ) : (
        <VisitorCardGrid items={items} />
      )}
    </>
  )
}
