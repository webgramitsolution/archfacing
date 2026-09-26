import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { CorporateOverview } from '@/components/dashboard/corporate-overview'

export const metadata: Metadata = { title: 'Corporate Dashboard' }

export default async function CorporateDashboardPage() {
  const user = await requireRole('CORPORATE')
  return <CorporateOverview userId={user.id} />
}
