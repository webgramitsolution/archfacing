import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { ProfilePage } from '../../profile-page'

export const metadata: Metadata = { title: 'Edit Profile' }

export default async function Page() {
  const user = await requireRole('CLIENT')
  return <ProfilePage userId={user.id} pdfRef="5.1.1" />
}
