'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { startClubPurchaseAction, confirmMockClubPaymentAction } from './actions'

export type PlanCard = {
  slug: string
  name: string
  tagline: string | null
  months: number
  price: number
  taxPercent: number
  benefits: string[]
  isPopular: boolean
}

/**
 * The plan grid and the checkout panel that replaces it once a plan is
 * chosen. Kept as one client component so the chosen plan, the pending
 * payment and any error live in the same place.
 */
export function PlanPicker({
  plans,
  isSignedIn,
  hasActive,
}: {
  plans: PlanCard[]
  isSignedIn: boolean
  hasActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<{
    paymentId: string
    planName: string
    months: number
    amount: number
    isMock: boolean
  } | null>(null)

  function choose(slug: string) {
    setError(null)
    startTransition(async () => {
      const res = await startClubPurchaseAction(slug)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCheckout({
        paymentId: res.paymentId,
        planName: res.planName,
        months: res.months,
        amount: res.amount,
        isMock: res.isMock,
      })
    })
  }

  function confirmMock() {
    if (!checkout) return
    setError(null)
    startTransition(async () => {
      const res = await confirmMockClubPaymentAction(checkout.paymentId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push('/dashboard/club')
      router.refresh()
    })
  }

  // ─── checkout panel ───
  if (checkout) {
    return (
      <div className="card mx-auto max-w-lg p-7">
        <span className="chip-icon mb-4 bg-brand-soft text-brand">
          <Icon name="rupee" />
        </span>

        <h2 className="font-display text-[20px] font-bold text-ink">
          {checkout.planName}
        </h2>
        <p className="mt-1 text-[14px] text-ink-2">
          {checkout.months} months of Club Membership
        </p>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-[14px] text-ink-2">Total payable, including GST</span>
          <span className="tabular font-display text-[24px] font-bold text-ink">
            {formatINR(checkout.amount)}
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-brand-border bg-brand-soft px-3.5 py-2.5 text-[13px] text-ink">
            {error}
          </p>
        )}

        {checkout.isMock ? (
          <>
            <div className="mt-5 rounded-lg border border-warn/25 bg-warn-soft p-3.5">
              <p className="text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Test mode.</strong>{' '}
                No payment gateway is connected yet, so no money changes hands.
                Confirming here activates the membership so you can see the
                whole flow.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmMock}
              disabled={pending}
              className="btn-primary mt-4 w-full"
            >
              {pending ? 'Activating…' : 'Confirm and activate'}
            </button>
          </>
        ) : (
          <p className="mt-5 text-[13.5px] text-ink-2">
            Opening the payment window…
          </p>
        )}

        <button
          type="button"
          onClick={() => setCheckout(null)}
          disabled={pending}
          className="btn-ghost mt-2 w-full"
        >
          Back to plans
        </button>
      </div>
    )
  }

  // ─── plan grid ───
  return (
    <>
      {error && (
        <p className="mb-5 rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-ink">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const perMonth = Math.round(plan.price / plan.months)

          return (
            <div
              key={plan.slug}
              className={
                plan.isPopular
                  ? 'card relative flex flex-col p-6 ring-2 ring-brand'
                  : 'card flex flex-col p-6'
              }
            >
              {plan.isPopular && (
                <span className="pill-brand absolute -top-2.5 left-6">
                  Most chosen
                </span>
              )}

              <h3 className="font-display text-[17px] font-bold text-ink">
                {plan.name}
              </h3>
              {plan.tagline && (
                <p className="mt-1.5 text-[13px] leading-snug text-ink-3">
                  {plan.tagline}
                </p>
              )}

              <div className="mt-5">
                <span className="tabular font-display text-[30px] font-bold leading-none text-ink">
                  {formatINR(plan.price)}
                </span>
                <span className="ml-1.5 text-[13px] text-ink-3">
                  + {plan.taxPercent}% GST
                </span>
                <p className="mt-1.5 text-[12.5px] text-ink-3">
                  {formatINR(perMonth)} a month · {plan.months} months
                </p>
              </div>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-line pt-5">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <Icon name="check" className="mt-px h-4 w-4 shrink-0 text-ok" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => choose(plan.slug)}
                  disabled={pending}
                  className={plan.isPopular ? 'btn-primary mt-6 w-full' : 'btn-outline mt-6 w-full'}
                >
                  {hasActive ? 'Extend with this plan' : 'Choose this plan'}
                </button>
              ) : (
                <Link
                  href={`/login?next=/club`}
                  className={plan.isPopular ? 'btn-primary mt-6 w-full' : 'btn-outline mt-6 w-full'}
                >
                  Sign in to join
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
