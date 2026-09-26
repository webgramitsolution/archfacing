import { requireRole } from '@/lib/guard'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardHeaderSlot } from '@/components/dashboard-header-slot'
import { DASHBOARD_NAV } from '@/config/dashboard-nav'

export default async function ProfessionalDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('PROFESSIONAL')

  return (
    <DashboardShell user={user} nav={DASHBOARD_NAV.PROFESSIONAL} header={<DashboardHeaderSlot user={user} />}>
      {children}
    </DashboardShell>
  )
}
