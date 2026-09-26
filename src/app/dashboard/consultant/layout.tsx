import { requireRole } from '@/lib/guard'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardHeaderSlot } from '@/components/dashboard-header-slot'
import { DASHBOARD_NAV } from '@/config/dashboard-nav'

export default async function ConsultantDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('CONSULTANT')

  return (
    <DashboardShell user={user} nav={DASHBOARD_NAV.CONSULTANT} header={<DashboardHeaderSlot user={user} />}>
      {children}
    </DashboardShell>
  )
}
