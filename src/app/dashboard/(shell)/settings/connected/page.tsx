import { requireAuth } from '@/lib/guard'
import { ManagedElsewhere } from '../settings-parts'
import { profileEditHref } from '../hrefs'

export const metadata = { title: 'Connected Accounts · ArchFacing' }

export default async function Page() {
  const u = await requireAuth()
  return (
    <ManagedElsewhere
      icon="share"
      title="Connected Accounts"
      subtitle="Link your social media accounts"
      points={[
        'Website, LinkedIn, Instagram, Facebook and more',
        'Behance, Houzz, Pinterest and YouTube for your work',
        'Choose which links show on your public profile',
      ]}
      href={profileEditHref(u.role)}
      cta="Manage Social Links"
    />
  )
}
