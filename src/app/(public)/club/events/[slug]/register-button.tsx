'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelMyRegistrationAction, confirmMockEventPaymentAction, registerForEventAction } from './register-actions'

export type MyRegistration = { id: string; status: string; ticketCode: string; paymentId: string | null } | null

/**
 * The "Register Now" control for a signed-in member.
 *
 * · not registered  → Register Now (free: confirms at once; paid: opens payment)
 * · pending payment → Complete payment (dev: a mock confirm, like Club Membership)
 * · confirmed       → your ticket code, and a Cancel link that returns the seat
 */
export function EventRegisterButton({
  eventId, slug, soldOut, mine, compact = false,
}: { eventId: string; slug: string; soldOut: boolean; mine: MyRegistration; compact?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pay, setPay] = useState<{ paymentId: string; total: number } | null>(
    mine?.status === 'PENDING_PAYMENT' && mine.paymentId ? { paymentId: mine.paymentId, total: 0 } : null,
  )
  const [confirmCancel, setConfirmCancel] = useState(false)
  const btn = compact
    ? 'btn-gold btn-shine rounded-[5px] px-4 py-[5px] text-[12px]'
    : 'btn-gold btn-shine w-full'

  if (mine?.status === 'CONFIRMED' || mine?.status === 'ATTENDED') {
    return (
      <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-1.5 text-center'}>
        <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-ok-soft px-3 py-1.5 text-[12px] font-semibold text-ok">
          ✓ Registered · <span className="font-mono">{mine.ticketCode}</span>
        </span>
        {mine.status === 'CONFIRMED' && (
          confirmCancel ? (
            <span className="text-[11.5px] text-ink-3">
              Give up your seat?{' '}
              <button type="button" disabled={pending} className="font-semibold text-danger" onClick={() => start(async () => {
                const r = await cancelMyRegistrationAction(mine.id, slug)
                if (!r.ok) setError(r.error); else router.refresh()
              })}>Yes, cancel</button>{' · '}
              <button type="button" className="text-ink-3" onClick={() => setConfirmCancel(false)}>Keep it</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className="text-[11.5px] text-ink-3 underline-offset-2 hover:text-danger hover:underline">Cancel registration</button>
          )
        )}
        {error && <p role="alert" className="text-[11px] text-danger">{error}</p>}
      </div>
    )
  }

  if (pay) {
    return (
      <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-1.5'}>
        <button type="button" disabled={pending} className={btn} onClick={() => start(async () => {
          setError(null)
          const r = await confirmMockEventPaymentAction(pay.paymentId, slug)
          if (!r.ok) setError(r.error); else router.refresh()
        })}>
          {pending ? 'Confirming…' : `Complete payment${pay.total ? ` · ₹${pay.total.toLocaleString('en-IN')}` : ''}`}
        </button>
        <p className="text-[10.5px] text-ink-4">Your seat is held while you pay. (Test mode — no money is taken.)</p>
        {error && <p role="alert" className="text-[11px] text-danger">{error}</p>}
      </div>
    )
  }

  if (soldOut) return <span className={`${btn} pointer-events-none opacity-60`}>Sold out</span>

  return (
    <div className={compact ? 'inline-flex flex-col' : 'space-y-1.5'}>
      <button type="button" disabled={pending} className={btn} onClick={() => start(async () => {
        setError(null)
        const r = await registerForEventAction(eventId, slug)
        if (!r.ok) { setError(r.error); return }
        if (r.free) router.refresh()
        else setPay({ paymentId: r.paymentId, total: r.total })
      })}>
        {pending ? 'Registering…' : 'Register Now'}
      </button>
      {error && <p role="alert" className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
