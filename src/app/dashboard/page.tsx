import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/guard'
import { dashboardPathFor } from '@/lib/auth'

/**
 * /dashboard is only a switchboard — it reads the role and forwards to the
 * right place. Password login lands here because the client does not know
 * the user's role.
 */
export default async function DashboardIndex() {
  const user = await requireAuth()
  redirect(dashboardPathFor(user.role))
}
