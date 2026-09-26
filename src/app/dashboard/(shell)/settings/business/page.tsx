import { requireAuth } from '@/lib/guard'
import { ManagedElsewhere } from '../settings-parts'
import { profileEditHref } from '../hrefs'

export const metadata = { title: 'Business Information · ArchFacing' }

export default async function Page() {
  const u = await requireAuth()
  return (
    <ManagedElsewhere
      icon="building"
      title="Business Information"
      subtitle="Manage your company details"
      points={[
        'Firm / company name, tagline and business type',
        'Year established, team size and service areas',
        'GST details and business contact',
      ]}
      href={profileEditHref(u.role)}
      cta="Open Profile Editor"
    />
  )
}
