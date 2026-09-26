import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { EmptyState, PageTitle, Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { OrderCancelButton } from './order-cancel-button'

export const metadata: Metadata = { title: 'My Orders' }

const STEPS = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED']

const LABEL: Record<string, string> = {
  PENDING: 'Payment pending',
  PAID: 'Paid',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

export default async function MyOrdersPage() {
  const user = await requireAuth()

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <>

      <div>
        <PageTitle title="My Orders">
          All of your ArchFacing Merchandise orders.
        </PageTitle>

        {orders.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No orders yet"
            action={
              <Link href="/merchandise" className="btn-primary">
                Browse Merchandise
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((o) => {
              const step = STEPS.indexOf(o.status)
              const dead = o.status === 'CANCELLED' || o.status === 'REFUNDED'

              return (
                <li key={o.id} className="card p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[14px] font-bold text-ink">
                      {o.orderNumber}
                    </span>
                    <span
                      className={
                        dead ? 'pill-brand' : step === 3 ? 'pill-ok' : 'pill-info'
                      }
                    >
                      {LABEL[o.status] ?? o.status}
                    </span>
                    {Number(o.discount) > 0 && (
                      <span className="ml-auto text-[11.5px] text-ok">Coupon {o.couponCode} · −{formatINR(Number(o.discount))}</span>
                    )}
                    <span className={'tabular font-display text-[16px] font-bold text-ink ' + (Number(o.discount) > 0 ? '' : 'ml-auto')}>
                      {formatINR(Number(o.total))}
                    </span>
                  </div>

                  {!dead && step >= 0 && (
                    <ol className="mb-4 flex items-center gap-1.5">
                      {STEPS.map((s, i) => (
                        <li key={s} className="flex flex-1 items-center gap-1.5">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                              i <= step ? 'bg-ok text-white' : 'bg-paper-3 text-ink-4'
                            }`}
                          >
                            {i <= step ? <Icon name="check" className="h-3 w-3" /> : i + 1}
                          </span>
                          <span
                            className={`hidden text-[11.5px] sm:inline ${
                              i <= step ? 'text-ink-2' : 'text-ink-4'
                            }`}
                          >
                            {LABEL[s]}
                          </span>
                          {i < STEPS.length - 1 && (
                            <span
                              className={`h-px flex-1 ${i < step ? 'bg-ok' : 'bg-line'}`}
                            />
                          )}
                        </li>
                      ))}
                    </ol>
                  )}

                  <ul className="flex flex-col gap-1">
                    {o.items.map((it) => (
                      <li key={it.id} className="text-[13px] text-ink-2">
                        {it.quantity} × {it.title}
                        {it.variant && ` (${it.variant})`}
                      </li>
                    ))}
                  </ul>

                  {o.trackingNumber && (
                    <p className="mt-3 text-[12.5px] text-ink-3">
                      Tracking —{' '}
                      <span className="font-mono text-ink">{o.trackingNumber}</span>
                    </p>
                  )}

                  <p className="mt-3 text-[12px] text-ink-3">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>

                  {/* The buyer can still call it off while it is unpaid or paid
                      but not yet packed for dispatch. */}
                  {(o.status === 'PENDING' || o.status === 'PAID') && (
                    <OrderCancelButton orderId={o.id} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </>
  )
}
