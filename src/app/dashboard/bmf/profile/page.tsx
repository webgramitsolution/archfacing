import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { ProfilePage } from '../../profile-page'

export const metadata: Metadata = { title: 'Edit Profile' }

export default async function Page() {
  const user = await requireRole('BMF')
  return <ProfilePage userId={user.id} pdfRef="5.3.1" />
}
