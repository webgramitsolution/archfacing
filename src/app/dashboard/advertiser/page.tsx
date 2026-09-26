import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { DashboardOverview } from '@/components/dashboard-overview'

export const metadata: Metadata = { title: 'Advertiser Dashboard' }

export default async function AdvertiserDashboardPage() {
  const user = await requireRole('EXTERNAL_ADVERTISER')
  return <DashboardOverview userId={user.id} role={user.role} />
}
