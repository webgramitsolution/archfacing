import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { AdminPageHead } from '@/components/admin/parts'
import { EmptyState, SectionHead } from '@/components/ui'
import { listOrders } from '../actions'
import { OrderActions } from './order-actions'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'Orders' }

const PILL: Record<string, string> = {
  PENDING: 'pill-muted', PAID: 'pill-info', PACKED: 'pill-info',
  SHIPPED: 'pill-warn', DELIVERED: 'pill-ok',
  CANCELLED: 'pill-brand', REFUNDED: 'pill-brand',
}

const LABEL: Record<string, string> = {
  PENDING: 'Payment pending', PAID: 'Paid', PACKED: 'Packed',
  SHIPPED: 'Shipped', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled', REFUNDED: 'Refunded',
}

export default async function SellerOrdersPage() {
  await requirePermission('seller:merchandise')
  const orders = await listOrders()

  const active = orders.filter((o) => ['PAID','PACKED','SHIPPED'].includes(o.status))

  return (
    <div>
      <AdminPageHead title="Orders">
        Pack and ship the orders that have already been paid for.
      </AdminPageHead>

      {orders.length === 0 ? (
        <EmptyState icon="box" title="No orders yet" />
      ) : (
        <>
          <SectionHead title={`${active.length} need action`}>
            {orders.length} orders in total
          </SectionHead>

          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li key={o.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[14px] font-bold text-ink">
                      {o.orderNumber}
                    </span>
                    <span className={PILL[o.status] ?? 'pill-muted'}>
                      {LABEL[o.status] ?? o.status}
                    </span>
                    {Number(o.discount) > 0 && (
                      <span className="ml-auto text-[11.5px] text-ok">Coupon {o.couponCode} · −{formatINR(Number(o.discount))}</span>
                    )}
                    <span className={'tabular font-display text-[16px] font-bold text-ink ' + (Number(o.discount) > 0 ? '' : 'ml-auto')}>
                      {formatINR(Number(o.total))}
                    </span>
                  </div>

                  <ul className="mb-3 flex flex-col gap-1">
                    {o.items.map((it) => (
                      <li key={it.id} className="text-[13px] text-ink-2">
                        {it.quantity} × {it.title}
                        {it.variant && ` (${it.variant})`}
                        <span className="tabular ml-2 text-ink-3">
                          {formatINR(Number(it.lineTotal))}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-[12.5px] leading-relaxed text-ink-3">
                    <span className="font-medium text-ink-2">{o.shippingName}</span>
                    {' · '}{o.shippingPhone}
                    <br />
                    {o.shippingAddress}, {o.shippingCity}, {o.shippingState} — {o.shippingPincode}
                    {o.trackingNumber && (
                      <>
                        <br />
                        <span className="font-mono">Tracking: {o.trackingNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                <OrderActions orderId={o.id} status={o.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
