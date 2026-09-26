'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import type { Role } from '@prisma/client'
import {
  checkAvailabilityAction,
  reservePactAction,
  confirmMockPaymentAction,
  cancelReservationAction,
  type AvailabilityState,
  type ReserveState,
} from './pact-actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { formatINR } from '@/lib/utils'
import { BUSINESS_RULES, termYears } from '@/config/permissions'

/** Which service types this role is allowed to purchase */
function serviceTypesFor(role: Role, designaType?: string | null) {
  switch (role) {
    case 'PROFESSIONAL':
      return designaType === 'DESIGNI'
        ? ([{ value: 'DESIGNI', label: 'DESIGNI — Interior' }] as const)
        : ([{ value: 'DESIGNA', label: 'DESIGNA — Architecture' }] as const)
    case 'CONSULTANT':
      return [{ value: 'CONSULTANT', label: 'Consultant' }] as const
    case 'BMF':
      return [{ value: 'BMF', label: 'Building Materials Facilitator' }] as const
    default:
      return [] as const
  }
}

export function PactBrowser({
  role,
  designaType,
  lockedSubCategory,
  homePincode,
  canBuy,
  blockedReason,
}: {
  role: Role
  designaType?: string | null
  /** A consultant's seat is tied to the sub-category chosen at registration */
  lockedSubCategory?: string | null
  homePincode?: string | null
  canBuy: boolean
  blockedReason?: string
}) {
  const types = serviceTypesFor(role, designaType)
  const [serviceType, setServiceType] = useState<string>(types[0]?.value ?? '')
  const [pincode, setPincode] = useState(homePincode ?? '')

  const [availState, doCheck, checking] = useActionState<
    AvailabilityState | null,
    FormData
  >(checkAvailabilityAction, null)

  const [resState, doReserve, reserving] = useActionState<ReserveState | null, FormData>(
    reservePactAction,
    null
  )

  const subCategory = lockedSubCategory ?? null

  return (
    <div className="flex flex-col gap-8">
      {!canBuy && blockedReason && <Alert tone="info">{blockedReason}</Alert>}

      {/* ── search ── */}
      <form action={doCheck} className="flex flex-col gap-5">
        <input type="hidden" name="serviceType" value={serviceType} />
        {subCategory && (
          <input type="hidden" name="subCategory" value={subCategory} />
        )}

        <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <Field
            label="PIN code"
            name="pincode"
            required
            hint="The area you want the franchise for"
          >
            <Input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              maxLength={6}
              placeholder="110005"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              className="font-mono"
            />
          </Field>

          <Field label="Seat category" name="serviceTypePicker">
            <Select
              id="serviceTypePicker"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              disabled={types.length <= 1}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" disabled={checking || pincode.length !== 6}>
            {checking ? 'Checking…' : 'Check availability'}
          </Button>
        </div>

        {subCategory && (
          <p className="text-[13px] text-ink-3">
            Your seat is tied to{' '}
            <strong className="font-mono text-ink">{subCategory}</strong> — the
            sub-category you selected at registration.
          </p>
        )}
      </form>

      {availState?.error && <Alert tone="error">{availState.error}</Alert>}

      {/* ── result ── */}
      {availState?.result && !('error' in availState.result) && (
        <SeatResult
          result={availState.result}
          canBuy={canBuy}
          onReserve={doReserve}
          reserving={reserving}
          resState={resState}
        />
      )}

      {/* ── map of the entire PIN ── */}
      {availState?.seatMap && <SeatMap map={availState.seatMap} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

function SeatResult({
  result,
  canBuy,
  onReserve,
  reserving,
  resState,
}: {
  result: NonNullable<AvailabilityState['result']> & { seat: { available: boolean } }
  canBuy: boolean
  onReserve: (fd: FormData) => void
  reserving: boolean
  resState: ReserveState | null
}) {
  const r = result as Extract<typeof result, { pincode: string }>
  const seat = r.seat as
    | { available: true }
    | { available: false; reason: string; holderName?: string; expiresAt?: Date | null; freesAt?: Date | null }

  return (
    <section className="rounded-card border border-line bg-paper-2 p-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-3 border-b border-line pb-3">
        <span className="font-mono text-xl font-semibold">{r.pincode}</span>
        <span className="text-[14px] text-ink-2">
          {r.district} · {r.state}
        </span>
        <span className="eyebrow ml-auto">{r.serviceType}</span>
      </div>

      {seat.available ? (
        <div>
          <p className="mb-1 text-[15px] font-semibold text-ok">
            This seat is available
          </p>
          <p className="mb-5 text-[13.5px] text-ink-2">
            Once purchased, every enquiry from this PIN code comes to you for
            the next {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)} — renewable before it ends.
          </p>

          {r.price && (
            <dl className="mb-5 max-w-xs overflow-hidden rounded-card border border-line text-[13.5px]">
              <Row k="PACT fee" v={formatINR(r.price.amount)} />
              <Row k="GST (18%)" v={formatINR(r.price.tax)} />
              <Row k="Total" v={formatINR(r.price.total)} strong />
            </dl>
          )}

          {resState?.error && (
            <div className="mb-4">
              <Alert tone="error">{resState.error}</Alert>
            </div>
          )}

          {resState?.ok ? (
            <PaymentStep state={resState} />
          ) : (
            <form action={onReserve}>
              <input type="hidden" name="pincode" value={r.pincode} />
              <input type="hidden" name="serviceType" value={r.serviceType} />
              <input type="hidden" name="subCategory" value={r.subCategory} />
              <Button type="submit" disabled={!canBuy || reserving}>
                {reserving ? 'Holding your seat…' : 'Purchase this PACT'}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-1 text-[15px] font-semibold text-brand">
            {seat.reason === 'TAKEN'
              ? 'This seat has already been taken'
              : seat.reason === 'RESERVED'
                ? 'This seat is currently on hold for someone else'
                : 'This category is not available yet'}
          </p>
          <p className="text-[13.5px] text-ink-2">
            {seat.reason === 'TAKEN' && (
              <>
                Held by {seat.holderName}
                {seat.expiresAt &&
                  ` · until ${new Date(seat.expiresAt).getFullYear()}`}
                . Try another PIN code.
              </>
            )}
            {seat.reason === 'RESERVED' &&
              'If that payment is not completed, the seat reopens within 15 minutes.'}
            {seat.reason === 'NOT_OFFERED' &&
              'Corporate PACT will open at a later stage.'}
          </p>
        </div>
      )}
    </section>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between border-b border-line-soft px-3.5 py-2 last:border-0 ${
        strong ? 'bg-paper-2 font-semibold' : ''
      }`}
    >
      <dt className="text-ink-3">{k}</dt>
      <dd className="tabular font-mono text-ink">{v}</dd>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

function PaymentStep({ state }: { state: ReserveState }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState<number>(0)

  // 15-minute countdown
  useEffect(() => {
    if (!state.reservedTill) return
    const till = new Date(state.reservedTill).getTime()
    const tick = () => setLeft(Math.max(0, Math.floor((till - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state.reservedTill])

  if (done) {
    return (
      <Alert tone="success">
        <strong>Your PACT is now active.</strong> Enquiries from this PIN code
        will appear under “My Enquiry”.{' '}
        <a href="/dashboard" className="font-medium text-brand hover:underline">
          Go to dashboard →
        </a>
      </Alert>
    )
  }

  const mins = Math.floor(left / 60)
  const secs = String(left % 60).padStart(2, '0')

  return (
    <div className="rounded-card border border-brand bg-brand-soft p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold">
          This seat is on hold for you
        </p>
        <p className="tabular font-mono text-[13px] text-brand">
          {left > 0 ? `${mins}:${secs} left` : 'Time expired'}
        </p>
      </div>

      <p className="mb-4 text-[13px] leading-relaxed text-ink-2">
        Complete the payment within this time, or the seat reopens for someone
        else.
      </p>

      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {state.isMock ? (
        <>
          <div className="mb-4 rounded border border-line bg-paper-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            <strong className="text-ink">Test mode</strong> — Razorpay is not
            connected yet, so no real money will be charged. The button below
            marks the payment as successful so the full flow can be tested.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending || left === 0}
              onClick={() =>
                start(async () => {
                  const res = await confirmMockPaymentAction(state.paymentId!)
                  if (res.ok) setDone(true)
                  else setError(res.error ?? 'The payment could not be confirmed')
                })
              }
            >
              {pending
                ? 'Activating…'
                : `₹${state.amount?.toLocaleString('en-IN')} — mark payment as complete`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await cancelReservationAction(state.paymentId!)
                  window.location.reload()
                })
              }
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-ink-2">
          Opening Razorpay checkout…
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

function SeatMap({ map }: { map: NonNullable<AvailabilityState['seatMap']> }) {
  const [showAll, setShowAll] = useState(false)
  const m = map as NonNullable<typeof map>

  const groups = [
    { title: 'Main categories', rows: m.rows.filter((r) => r.serviceType !== 'CONSULTANT') },
    { title: 'Consultants — 24 seats', rows: m.rows.filter((r) => r.serviceType === 'CONSULTANT') },
  ]

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-line pb-2">
        <h2 className="font-display text-lg font-semibold">
          All seats in PIN {m.pincode}
        </h2>
        <span className="eyebrow">
          {m.takenSeats} / {m.totalSeats} taken
        </span>
      </div>

      {groups.map((g) => {
        const rows = g.rows.length > 8 && !showAll ? g.rows.slice(0, 8) : g.rows
        return (
          <div key={g.title} className="mb-5">
            <p className="eyebrow mb-2">{g.title}</p>
            <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <li
                  key={`${r.serviceType}-${r.subCategory}`}
                  className="flex items-center justify-between gap-2 bg-paper-2 px-3 py-2 text-[13px]"
                >
                  <span className="truncate text-ink-2">{r.label}</span>
                  <span
                    className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${
                      r.taken ? 'text-brand' : 'text-ok'
                    }`}
                  >
                    {r.taken ? (r.status === 'RESERVED' ? 'On hold' : 'Taken') : 'Open'}
                  </span>
                </li>
              ))}
            </ul>
            {g.rows.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="mt-2 text-[13px] font-medium text-brand hover:underline"
              >
                {showAll ? 'Show fewer' : `Show all ${g.rows.length}`}
              </button>
            )}
          </div>
        )
      })}
    </section>
  )
}
