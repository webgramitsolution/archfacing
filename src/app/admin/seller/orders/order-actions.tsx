'use client'

import { useState, useTransition } from 'react'
import { setOrderStatusAction } from '../actions'
import { Button, Alert, Input } from '@/components/form'
import { ConfirmDialog } from '@/components/confirm-dialog'

/** §— an order moves in one direction only, never backwards */
const NEXT: Record<string, { to: string; label: string; needsTracking?: boolean }[]> = {
  PAID: [{ to: 'PACKED', label: 'Mark packed' }, { to: 'CANCELLED', label: 'Cancel order' }],
  PACKED: [{ to: 'SHIPPED', label: 'Mark shipped', needsTracking: true }, { to: 'CANCELLED', label: 'Cancel order' }],
  SHIPPED: [{ to: 'DELIVERED', label: 'Mark delivered' }],
}

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState('')
  const [asking, setAsking] = useState<string | null>(null)
  // Cancelling an order asks first — it used to happen on a single click.
  const [confirmCancel, setConfirmCancel] = useState(false)

  const options = NEXT[status] ?? []
  if (options.length === 0) return null

  return (
    <div className="border-t border-line bg-paper-3 px-4 py-3.5">
      {confirmCancel && (
        <ConfirmDialog
          confirm={{
            title: 'Cancel this order?',
            body: 'The order is cancelled and the buyer is notified. This cannot be undone from here.',
            confirmLabel: 'Cancel Order',
            cancelLabel: 'Keep Order',
            tone: 'danger',
            run: () => setOrderStatusAction(orderId, 'CANCELLED' as never),
          }}
          busy={pending}
          error={null}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false)
            start(async () => {
              const r = await setOrderStatusAction(orderId, 'CANCELLED' as never)
              if (!r.ok) setError(r.error ?? 'Could not update the order')
            })
          }}
        />
      )}
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {asking ? (
        <div className="flex flex-wrap items-end gap-3">
          <span className="min-w-[12rem] flex-1">
            <label htmlFor={`t-${orderId}`} className="mb-1 block text-[12.5px] font-semibold text-ink">
              Tracking number
            </label>
            <Input
              id={`t-${orderId}`}
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. DTDC1234567"
            />
          </span>
          <Button
            type="button"
            disabled={pending || !tracking.trim()}
            onClick={() =>
              start(async () => {
                const r = await setOrderStatusAction(orderId, asking as never, tracking.trim())
                if (!r.ok) setError(r.error ?? 'Could not update the order')
                else setAsking(null)
              })
            }
          >
            Mark shipped
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAsking(null)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {options.map((opt) => (
            <Button
              key={opt.to}
              type="button"
              variant={opt.to === 'CANCELLED' ? 'ghost' : 'primary'}
              disabled={pending}
              onClick={() => {
                setError(null)
                if (opt.to === 'CANCELLED') { setConfirmCancel(true); return }
                if (opt.needsTracking) setAsking(opt.to)
                else start(async () => {
                  const r = await setOrderStatusAction(orderId, opt.to as never)
                  if (!r.ok) setError(r.error ?? 'Could not update the order')
                })
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
