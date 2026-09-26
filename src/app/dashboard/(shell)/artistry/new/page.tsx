import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { ArtistryForm, EMPTY_DRAFT } from '../artistry-form'

export const metadata: Metadata = { title: 'Create New Artistry' }

export default async function Page() {
  // A Client cannot post artistry; the guard sends them back to their own
  // dashboard rather than showing a 404 for a page that exists.
  await requirePermission('post:artistry')

  return <ArtistryForm initial={EMPTY_DRAFT} />
}
