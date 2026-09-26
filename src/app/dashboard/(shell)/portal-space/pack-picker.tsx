'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import type { PortalSpacePack } from '@/config/portal-space'
import { startPortalSpaceAction, confirmMockPortalSpaceAction } from './actions'

/**
 * The pack grid, plus the checkout panel that replaces it once a pack is
 * chosen. Prices are recomputed on the server before anything is charged —
 * what is shown here is only for the buyer's benefit.
 */
export function PackPicker({
  packs,
  taxPercent,
}: {
  packs: PortalSpacePack[]
  taxPercent: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<{
    paymentId: string
    packName: string
    extraMb: number
    amount: number
    isMock: boolean
  } | null>(null)

  function choose(slug: string) {
    setError(null)
    startTransition(async () => {
      const res = await startPortalSpaceAction(slug)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCheckout({
        paymentId: res.paymentId,
        packName: res.packName,
        extraMb: res.extraMb,
        amount: res.amount,
        isMock: res.isMock,
      })
    })
  }

  function confirmMock() {
    if (!checkout) return
    setError(null)
    startTransition(async () => {
      const res = await confirmMockPortalSpaceAction(checkout.paymentId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCheckout(null)
      router.refresh()
    })
  }

  if (checkout) {
    return (
      <div className="card max-w-lg p-7">
        <span className="chip-icon mb-4 bg-brand-soft text-brand">
          <Icon name="box" />
        </span>

        <h3 className="font-display text-[20px] font-bold text-ink">
          {checkout.packName} of extra space
        </h3>
        <p className="mt-1 text-[14px] text-ink-2">
          Valid for 5 years from the day it is added.
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

        <div className="mt-5 rounded-lg border border-warn/25 bg-warn-soft p-3.5">
          <p className="text-[13px] leading-relaxed text-ink-2">
            <strong className="font-semibold text-ink">Please note.</strong>{' '}
            Portal Space is <strong>non-refundable</strong> once purchased —
            see the{' '}
            <a href="/legal/refund" className="font-semibold text-brand hover:underline">
              refund policy
            </a>
            .
          </p>
        </div>

        {checkout.isMock ? (
          <>
            <div className="mt-3 rounded-lg border border-info/25 bg-info-soft p-3.5">
              <p className="text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Test mode.</strong>{' '}
                No payment gateway is connected yet, so no money changes hands.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmMock}
              disabled={pending}
              className="btn-primary mt-4 w-full"
            >
              {pending ? 'Adding space…' : 'Confirm and add space'}
            </button>
          </>
        ) : (
          <p className="mt-5 text-[13.5px] text-ink-2">Opening the payment window…</p>
        )}

        <button
          type="button"
          onClick={() => setCheckout(null)}
          disabled={pending}
          className="btn-ghost mt-2 w-full"
        >
          Back to packs
        </button>
      </div>
    )
  }

  return (
    <>
      {error && (
        <p className="mb-5 rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-ink">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {packs.map((pack) => (
          <div
            key={pack.slug}
            className={
              pack.isPopular
                ? 'card relative flex flex-col p-6 ring-2 ring-brand'
                : 'card flex flex-col p-6'
            }
          >
            {pack.isPopular && (
              <span className="pill-brand absolute -top-2.5 left-6">Most chosen</span>
            )}

            <p className="font-display text-[24px] font-bold leading-none text-ink">
              {pack.name}
            </p>
            <p className="mt-2 flex-1 text-[13px] leading-snug text-ink-3">
              {pack.blurb}
            </p>

            <div className="mt-5 border-t border-line pt-4">
              <span className="tabular font-display text-[22px] font-bold text-ink">
                {formatINR(pack.price)}
              </span>
              <span className="ml-1.5 text-[12.5px] text-ink-3">+ {taxPercent}% GST</span>
            </div>

            <button
              type="button"
              onClick={() => choose(pack.slug)}
              disabled={pending}
              className={pack.isPopular ? 'btn-primary mt-4 w-full' : 'btn-outline mt-4 w-full'}
            >
              Add {pack.name}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
