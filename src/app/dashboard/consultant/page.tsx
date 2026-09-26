import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { consultantOverviewData } from '@/lib/consultant-overview'
import { ConsultantOverview } from '@/components/consultant-overview'

export const metadata: Metadata = { title: 'Consultant Dashboard' }
export const dynamic = 'force-dynamic'

export default async function ConsultantDashboardPage() {
  const user = await requireRole('CONSULTANT')
  // Scoped to the signed-in consultant — the id never comes from the client.
  const d = await consultantOverviewData(user.id)
  return <ConsultantOverview user={{ name: user.name }} d={d} />
}
