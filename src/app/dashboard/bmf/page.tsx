import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { BmfOverview } from '@/components/dashboard/bmf-overview'

export const metadata: Metadata = { title: 'BMF Dashboard' }

export default async function BMFDashboardPage() {
  const user = await requireRole('BMF')
  return <BmfOverview userId={user.id} />
}
