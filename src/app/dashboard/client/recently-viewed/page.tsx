import type { Metadata } from 'next'
import Link from 'next/link'

import { requireRole } from '@/lib/guard'
import { listRecentlyViewed } from '@/lib/visitor'
import { PageHeading } from '@/components/dashboard-shell'
import { EmptyState } from '@/components/ui'
import { VisitorCardGrid } from '@/components/dashboard/visitor-cards'

export const metadata: Metadata = { title: 'Recently Viewed' }

export default async function RecentlyViewedPage() {
  const user = await requireRole('CLIENT')
  const items = await listRecentlyViewed(user.id, 48)

  return (
    <>
      <PageHeading title="Recently Viewed">
        The projects, products and artworks you opened, newest first.
      </PageHeading>

      {items.length === 0 ? (
        <EmptyState
          icon="eye"
          title="No history yet"
          action={
            <Link href="/projects" className="btn-primary">
              Start exploring
            </Link>
          }
        >
          Open any project, product or artwork while signed in and it will appear
          here.
        </EmptyState>
      ) : (
        <VisitorCardGrid items={items} />
      )}
    </>
  )
}
