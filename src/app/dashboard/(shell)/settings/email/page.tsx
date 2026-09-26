import { ManagedElsewhere } from '../settings-parts'

export const metadata = { title: 'Email Preferences · ArchFacing' }

export default function Page() {
  return (
    <ManagedElsewhere
      icon="mail"
      title="Email Preferences"
      subtitle="Manage marketing and promotional emails"
      points={[
        'Membership & plan updates, promotional offers and announcements',
        'These are the Email column of your notification grid',
        'Turn any of them off without affecting SMS, WhatsApp or in-app alerts',
      ]}
      href="/dashboard/settings/notifications"
      cta="Open Notification Settings"
    />
  )
}
