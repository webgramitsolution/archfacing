'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelOrderAction } from '@/app/(public)/merchandise/actions'

/**
 * "Cancel order" for the buyer's own order — only rendered while the order is
 * still cancellable (PENDING or PAID, i.e. not yet packed for dispatch). Asks
 * for a one-tap confirmation first so a stray click can't cancel an order, then
 * refreshes so the row flips to Cancelled and the stock returns to the shelf.
 */
export function OrderCancelButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancel() {
    setError(null)
    start(async () => {
      const r = await cancelOrderAction(orderId)
      if (r.ok) router.refresh()
      else {
        setError(r.error ?? 'Could not cancel this order.')
        setConfirming(false)
      }
    })
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      {error && <p className="mb-2 text-[12px] font-medium text-brand">{error}</p>}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12.5px] text-ink-2">Cancel this order?</span>
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
          >
            {pending ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="text-[12.5px] font-medium text-ink-3 hover:text-ink"
          >
            Keep order
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-brand"
        >
          Cancel order
        </button>
      )}
    </div>
  )
}
