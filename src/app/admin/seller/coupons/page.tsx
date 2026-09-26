import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { AdminPageHead } from '@/components/admin/parts'
import { listCoupons } from '../actions'
import { CouponsManager } from './coupons-manager'

export const metadata: Metadata = { title: 'Coupon Codes' }
export const dynamic = 'force-dynamic'

export default async function CouponsPage() {
  await requirePermission('seller:merchandise')
  const coupons = await listCoupons()

  const initial = coupons.map((c) => ({
    id: c.id, code: c.code, type: c.type as 'PERCENT' | 'FLAT', value: Number(c.value),
    minOrder: c.minOrder ? Number(c.minOrder) : null, maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
    usageLimit: c.usageLimit, usedCount: c.usedCount, isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
  }))

  return (
    <div className="space-y-5">
      <div className="rise">
        <AdminPageHead title="Coupon Codes">
          Create discount codes buyers can apply at checkout — a percentage off or a flat ₹ amount, with optional minimum order, cap and usage limit.
        </AdminPageHead>
      </div>
      <CouponsManager initial={initial} />
    </div>
  )
}
