import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { ProOverview } from '@/components/dashboard/pro-overview'

export const metadata: Metadata = { title: 'Professional Dashboard' }

export default async function ProfessionalDashboardPage() {
  const user = await requireRole('PROFESSIONAL')
  return <ProOverview userId={user.id} role={user.role} />
}
