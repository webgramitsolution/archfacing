'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startRenewalAction, confirmMockPaymentAction, type RenewState } from './pact-actions'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Renew one PACT: start → (test-mode) confirm → refresh. The server decides
 * eligibility and price; this only shows what it returns.
 */
export function RenewPactButton({ pactId, className, label = 'Renew' }: { pactId: string; className?: string; label?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [order, setOrder] = useState<Extract<RenewState, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (done) return <span role="status" className="text-[12px] font-semibold text-ok">Renewed · valid until {done}</span>

  if (!order) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => {
            setError(null)
            const r = await startRenewalAction(pactId)
            if (r.ok) setOrder(r)
            else setError(r.error)
          })}
          className={className ?? 'btn-primary px-3 py-1.5 text-[12px] disabled:opacity-60'}
        >
          {pending ? 'Preparing…' : label}
        </button>
        {error && <span role="alert" className="max-w-[240px] text-[11.5px] text-danger">{error}</span>}
      </span>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-line bg-paper-2 p-3 text-left">
      <p className="text-[12.5px] text-ink-2">
        Renew <strong className="tabular text-ink">{order.pincode}</strong> for{' '}
        <strong className="tabular text-ink">₹{order.amount.toLocaleString('en-IN')}</strong> — new expiry{' '}
        <strong className="text-ink">{fmt(order.newExpiry)}</strong>.
      </p>
      {order.isMock ? (
        <>
          <p className="mt-1.5 text-[11px] text-ink-3">Test mode — no real money is charged until the payment gateway is connected.</p>
          {error && <p role="alert" className="mt-1.5 text-[11.5px] text-danger">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => {
                const r = await confirmMockPaymentAction(order.paymentId)
                if (r.ok) { setDone(fmt(order.newExpiry)); router.refresh() }
                else setError(r.error ?? 'The renewal could not be completed.')
              })}
              className="btn-primary flex-1 px-3 py-1.5 text-[12px] disabled:opacity-60"
            >
              {pending ? 'Renewing…' : 'Mark payment complete'}
            </button>
            <button type="button" disabled={pending} onClick={() => setOrder(null)} className="rounded-lg border border-line px-3 text-[12px] text-ink-3 hover:text-ink">Cancel</button>
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-[12px] text-ink-2">Online checkout opens here once the payment gateway is connected.</p>
      )}
    </div>
  )
}
