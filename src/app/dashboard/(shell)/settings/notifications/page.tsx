import { requireAuth } from '@/lib/guard'
import { getUserNotifPrefs } from '@/lib/notification-prefs-data'
import { NotificationSettings } from './notification-settings'

export const metadata = { title: 'Notification Settings · ArchFacing' }

export default async function NotificationSettingsPage() {
  const user = await requireAuth()
  const prefs = await getUserNotifPrefs(user.id)
  return <NotificationSettings initial={prefs} />
}
