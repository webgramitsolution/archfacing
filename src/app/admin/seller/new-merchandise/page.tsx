import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { AdminPageHead } from '@/components/admin/parts'
import { MerchForm } from './merch-form'

export const metadata: Metadata = { title: 'New Merchandise' }

export default async function NewMerchandisePage() {
  await requirePermission('seller:merchandise')
  return (
    <div className="max-w-3xl">
      <AdminPageHead title="New Merchandise">
        ArchFacing&rsquo;s own products — apparel, stationery, books or gifts.
      </AdminPageHead>
      <MerchForm />
    </div>
  )
}
