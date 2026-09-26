'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import {
  bookAdvertisementAction,
  checkAdSlotsAction,
  confirmMockAdPaymentAction,
  type SlotsState,
} from './actions'

export type PlacementCard = {
  slug: string
  name: string
  size: string
  weeklyPrice: number
  taxPercent: number
  maxSlots: number
}

type Checkout = {
  paymentId: string
  placementName: string
  title: string
  weeks: number
  amount: number
  endsAt: string
  isMock: boolean
}

/** Today as "YYYY-MM-DD" in the browser's own timezone. */
function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The same arithmetic as `bookingTotal` in `src/lib/ads.ts`, repeated here so
 * the price can move as the advertiser types. It is a preview only — the
 * amount actually charged is the one the server computes from the placement
 * row, never a number posted from this form.
 */
function previewPrice(placement: PlacementCard, weeks: number) {
  const amount = Math.round(placement.weeklyPrice * weeks * 100) / 100
  const tax = Math.round(amount * placement.taxPercent) / 100
  return { amount, tax, total: Math.round((amount + tax) * 100) / 100 }
}

export function BookingForm({
  placements,
  minWeeks,
  maxWeeks,
}: {
  placements: PlacementCard[]
  minWeeks: number
  maxWeeks: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [slug, setSlug] = useState(placements[0]?.slug ?? '')
  const [startDate, setStartDate] = useState(todayISO())
  const [weeks, setWeeks] = useState(minWeeks)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('')

  const [slots, setSlots] = useState<SlotsState | null>(null)
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<Checkout | null>(null)

  const placement = placements.find((p) => p.slug === slug) ?? placements[0]
  const price = placement ? previewPrice(placement, Math.max(weeks || 0, 0)) : null
  const min = todayISO()

  /**
   * Availability is refreshed whenever the placement or the dates change,
   * rather than behind a button, because it is the one answer that decides
   * whether the rest of the form is worth filling in. The delay keeps it from
   * firing on every keystroke in the weeks field.
   */
  useEffect(() => {
    if (checkout) return
    if (!slug || !startDate || !Number.isInteger(weeks) || weeks < minWeeks || weeks > maxWeeks) {
      setSlots(null)
      return
    }

    let cancelled = false
    setCheckingSlots(true)

    const timer = setTimeout(async () => {
      const res = await checkAdSlotsAction(slug, startDate, weeks)
      if (cancelled) return
      setSlots(res)
      setCheckingSlots(false)
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slug, startDate, weeks, minWeeks, maxWeeks, checkout])

  const soldOut = slots?.ok === true && slots.free < 1

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const res = await bookAdvertisementAction({
        placementSlug: slug,
        startDate,
        weeks,
        title,
        imageUrl,
        targetUrl,
      })

      if (!res.ok) {
        setError(res.error)
        return
      }

      setCheckout({
        paymentId: res.paymentId,
        placementName: res.placementName,
        title: res.title,
        weeks: res.weeks,
        amount: res.amount,
        endsAt: res.endsAt,
        isMock: res.isMock,
      })
    })
  }

  function confirmMock() {
    if (!checkout) return
    setError(null)

    startTransition(async () => {
      const res = await confirmMockAdPaymentAction(checkout.paymentId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCheckout(null)
      setTitle('')
      setImageUrl('')
      setTargetUrl('')
      setSlots(null)
      router.refresh()
    })
  }

  // ─── checkout panel ───
  if (checkout) {
    return (
      <div className="card p-7">
        <span className="chip-icon mb-4 bg-brand-soft text-brand">
          <Icon name="rupee" />
        </span>

        <h2 className="font-display text-[20px] font-bold text-ink">{checkout.title}</h2>
        <p className="mt-1 text-[14px] text-ink-2">
          {checkout.placementName} · {checkout.weeks}{' '}
          {checkout.weeks === 1 ? 'week' : 'weeks'}, ending{' '}
          {new Date(checkout.endsAt).toLocaleDateString('en-IN')}
        </p>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-[14px] text-ink-2">Total payable, including GST</span>
          <span className="tabular font-display text-[24px] font-bold text-ink">
            {formatINR(checkout.amount)}
          </span>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
          Your slot is held from now. Once payment lands, the ad goes to our
          review queue — it is not published by paying.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-brand-border bg-brand-soft px-3.5 py-2.5 text-[13px] text-ink">
            {error}
          </p>
        )}

        {checkout.isMock ? (
          <>
            <div className="mt-5 rounded-lg border border-warn/25 bg-warn-soft p-3.5">
              <p className="text-[13px] leading-relaxed text-ink-2">
                <strong className="font-semibold text-ink">Test mode.</strong> No
                payment gateway is connected yet, so no money changes hands.
                Confirming here marks the booking as paid so you can see the
                whole flow, review included.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmMock}
              disabled={pending}
              className="btn-primary mt-4 w-full"
            >
              {pending ? 'Confirming…' : 'Confirm payment'}
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
          Back to the booking form
        </button>
      </div>
    )
  }

  // ─── booking form ───
  if (!placement) {
    return (
      <div className="card p-7">
        <p className="text-[14px] text-ink-2">
          No placements are on sale at the moment. Please check back shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">Placement</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="input"
          >
            {placements.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} — {p.size} px · {formatINR(p.weeklyPrice)}/week
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Start date</span>
          <input
            type="date"
            value={startDate}
            min={min}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Number of weeks</span>
          <input
            type="number"
            value={weeks}
            min={minWeeks}
            max={maxWeeks}
            step={1}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="input"
            required
          />
          <span className="text-[12px] text-ink-3">
            Whole weeks, from {minWeeks} to {maxWeeks}.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[13px] font-medium text-ink">Ad title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monsoon range — waterproof cladding"
            className="input"
            required
          />
          <span className="text-[12px] text-ink-3">
            For your own records and for our reviewers. Visitors do not see it.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Banner image URL</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…/banner.jpg"
            className="input"
            required
          />
          <span className="text-[12px] text-ink-3">
            Hosted by you, at {placement.size} px.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Landing page URL</span>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://your-site.com/offer"
            className="input"
            required
          />
          <span className="text-[12px] text-ink-3">
            Where a click takes the visitor.
          </span>
        </label>
      </div>

      {/* ─── availability ─── */}
      <div className="mt-6 rounded-lg border border-line bg-paper-3 px-4 py-3">
        {checkingSlots ? (
          <p className="text-[13px] text-ink-3">Checking availability…</p>
        ) : slots === null ? (
          <p className="text-[13px] text-ink-3">
            Choose a placement and dates to see what is free.
          </p>
        ) : slots.ok ? (
          <p className="text-[13px] leading-relaxed text-ink-2">
            <strong
              className={
                slots.free > 0 ? 'font-semibold text-ok' : 'font-semibold text-brand'
              }
            >
              {slots.free} of {slots.total}{' '}
              {slots.total === 1 ? 'slot' : 'slots'} free
            </strong>{' '}
            on {placement.name} from{' '}
            {new Date(startDate).toLocaleDateString('en-IN')} to{' '}
            {new Date(slots.endsAt).toLocaleDateString('en-IN')}.
            {slots.free < 1 &&
              ' Try a different start date, fewer weeks, or another placement.'}
          </p>
        ) : (
          <p className="text-[13px] text-ink-2">{slots.error}</p>
        )}
      </div>

      {/* ─── price ─── */}
      {price && (
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4">
          <span className="text-[13px] text-ink-2">
            {formatINR(placement.weeklyPrice)} × {weeks || 0}{' '}
            {weeks === 1 ? 'week' : 'weeks'} = {formatINR(price.amount)} +{' '}
            {formatINR(price.tax)} GST
          </span>
          <span className="tabular font-display text-[22px] font-bold text-ink">
            {formatINR(price.total)}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-brand-border bg-brand-soft px-3.5 py-2.5 text-[13px] text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || soldOut}
        className="btn-primary mt-5 w-full sm:w-auto"
      >
        {pending
          ? 'Creating your booking…'
          : soldOut
            ? 'No slots for those dates'
            : 'Book and pay'}
      </button>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
        Booking holds the slot immediately. After payment your creative goes to
        our review queue, and it only appears on the site once it is approved.
      </p>
    </form>
  )
}
