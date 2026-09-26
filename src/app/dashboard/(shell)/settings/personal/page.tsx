import { requireAuth } from '@/lib/guard'
import { ManagedElsewhere } from '../settings-parts'
import { profileEditHref } from '../hrefs'

export const metadata = { title: 'Personal Information · ArchFacing' }

export default async function Page() {
  const u = await requireAuth()
  return (
    <ManagedElsewhere
      icon="edit"
      title="Personal Information"
      subtitle="Update your name, email, phone and profile details"
      points={[
        'Your display name, headline and short bio',
        'Profile photo and contact details',
        'Areas of expertise shown on your public profile',
      ]}
      href={profileEditHref(u.role)}
      cta="Open Profile Editor"
    />
  )
}
