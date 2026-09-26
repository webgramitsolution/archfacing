import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { VisitorOverview } from '@/components/dashboard/visitor-overview'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function ClientDashboardPage() {
  const user = await requireRole('CLIENT')
  return <VisitorOverview userId={user.id} />
}
