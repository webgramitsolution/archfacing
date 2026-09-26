import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { QualificationsView } from '../../qualifications-view'

export const metadata: Metadata = { title: 'Qualifications' }
export const dynamic = 'force-dynamic'

export default async function QualificationsPage() {
  const user = await requireRole('PROFESSIONAL')
  return <QualificationsView userId={user.id} />
}
