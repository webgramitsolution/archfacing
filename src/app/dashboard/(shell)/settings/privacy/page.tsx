import { requireAuth } from '@/lib/guard'
import { ManagedElsewhere } from '../settings-parts'
import { profileEditHref } from '../hrefs'

export const metadata = { title: 'Privacy & Security · ArchFacing' }

export default async function Page() {
  const u = await requireAuth()
  return (
    <ManagedElsewhere
      icon="eye"
      title="Privacy & Security"
      subtitle="Control your privacy and security preferences"
      points={[
        'Show or hide your phone and email on your public profile',
        'Choose whether buyers can call, email or WhatsApp you',
        'Set your preferred contact time',
      ]}
      href={profileEditHref(u.role)}
      cta="Manage Contact Visibility"
    />
  )
}
