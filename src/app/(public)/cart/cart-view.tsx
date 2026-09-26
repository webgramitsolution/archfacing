'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  updateCartAction,
  removeCartAction,
  checkoutAction,
  applyCouponAction,
  confirmMockOrderAction,
  cancelCheckoutAction,
  type CheckoutState,
} from '../merchandise/actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { Icon, EmptyState, Callout } from '@/components/ui'
import { INDIAN_STATES } from '@/config/states'
import { formatINR } from '@/lib/utils'

type Item = {
  id: string
  variantId: string
  quantity: number
  price: number
  lineTotal: number
  label: string | null
  stock: number
  isActive: boolean
  title: string
  slug: string
  image: string | null
}

export function CartView({
  items,
  subtotal,
  tax,
  total,
  address,
  freeShippingAbove,
  flatShipping,
}: {
  items: Item[]
  subtotal: number
  tax: number
  total: number
  /** ₹ — comes from Site Settings, so checkout and this panel always agree */
  freeShippingAbove: number
  flatShipping: number
  address: {
    name: string
    phone: string
    address: string
    pincode: string
    city: string
    state: string
  }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [state, submit, checkingOut] = useActionState<CheckoutState | null, FormData>(
    checkoutAction,
    null
  )

  const shipping =
    freeShippingAbove > 0 && subtotal >= freeShippingAbove ? 0 : flatShipping
  // A coupon checked against this cart; the checkout re-checks it on the server.
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponPending, startCoupon] = useTransition()
  // The cart changed — the quote no longer matches it, so it has to be applied again.
  useEffect(() => { setCoupon(null) }, [subtotal])
  const discount = coupon ? Math.min(coupon.discount, total) : 0
  const grand = total + shipping - discount
  const hasDead = items.some((i) => !i.isActive)

  if (state?.ok && state.paymentId) {
    return <PaymentStep state={state} />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="bag"
        title="Your cart is empty"
        action={
          <Link href="/merchandise" className="btn-primary">
            Browse Merchandise
          </Link>
        }
      >
        Find ArchFacing apparel, stationery and books here.
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_360px] lg:items-start">
      {/* ─── items ─── */}
      <section>
        {error && (
          <div className="mb-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li
              key={it.id}
              className={`card flex gap-4 p-4 ${!it.isActive ? 'opacity-60' : ''}`}
            >
              <Link
                href={`/merchandise/${it.slug}`}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper-3"
              >
                {it.image ? (
                  <Image src={it.image} alt={it.title} fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-ink-4">
                    <Icon name="bag" className="h-5 w-5" />
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/merchandise/${it.slug}`}
                  className="font-display text-[14.5px] font-semibold text-ink hover:text-brand"
                >
                  {it.title}
                </Link>
                {it.label && (
                  <p className="mt-0.5 text-[12.5px] text-ink-3">{it.label}</p>
                )}

                {!it.isActive ? (
                  <p className="mt-1 text-[12.5px] font-medium text-brand">
                    No longer on sale — please remove
                  </p>
                ) : it.stock <= 3 ? (
                  <p className="mt-1 text-[12.5px] text-brand">
                    Only {it.stock} left
                  </p>
                ) : null}

                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await updateCartAction(it.id, it.quantity - 1)
                          if (!r.ok) setError(r.error ?? null)
                          router.refresh()
                        })
                      }
                      className="px-2.5 py-1 text-ink-2 hover:text-brand disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="tabular w-8 text-center text-[13px] font-semibold">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={pending || it.quantity >= Math.min(it.stock, 10)}
                      onClick={() =>
                        start(async () => {
                          const r = await updateCartAction(it.id, it.quantity + 1)
                          if (!r.ok) setError(r.error ?? null)
                          router.refresh()
                        })
                      }
                      className="px-2.5 py-1 text-ink-2 hover:text-brand disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await removeCartAction(it.id)
                        setError(null)
                        router.refresh()
                      })
                    }
                    className="text-[12.5px] font-medium text-ink-3 hover:text-brand"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <span className="tabular shrink-0 font-display text-[15px] font-bold text-ink">
                {formatINR(it.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── checkout ─── */}
      <aside className="card p-6">
        <h2 className="mb-4 font-display text-[16px] font-bold text-ink">
          Order Summary
        </h2>

        <dl className="mb-5 flex flex-col gap-2 border-b border-line pb-5 text-[13.5px]">
          <Row k="Subtotal" v={formatINR(subtotal)} />
          <Row k="GST" v={formatINR(tax)} />
          {coupon && <Row k={`Coupon ${coupon.code} (${coupon.label})`} v={`− ${formatINR(discount)}`} green />}
          <Row
            k="Shipping"
            v={shipping === 0 ? 'Free' : formatINR(shipping)}
            green={shipping === 0}
          />
        </dl>

        <div className="mb-5 flex items-baseline justify-between">
          <span className="font-display text-[15px] font-bold text-ink">Total</span>
          <span className="tabular font-display text-[22px] font-bold text-ink">
            {formatINR(grand)}
          </span>
        </div>

        {/* coupon */}
        <div className="mb-5">
          {coupon ? (
            <p className="flex items-center justify-between gap-2 rounded-card bg-ok-soft px-3 py-2 text-[12.5px] text-ok">
              <span><strong className="font-mono">{coupon.code}</strong> applied — you save {formatINR(discount)}</span>
              <button type="button" onClick={() => { setCoupon(null); setCouponInput('') }} className="text-[12px] font-semibold text-ink-3 hover:text-danger">Remove</button>
            </p>
          ) : (
            <div className="flex gap-2">
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" maxLength={40} className="input h-10 flex-1 font-mono text-[13px] uppercase" />
              <button
                type="button"
                disabled={couponPending || !couponInput.trim()}
                onClick={() => startCoupon(async () => {
                  setCouponError(null)
                  const r = await applyCouponAction(couponInput)
                  if (r.ok) setCoupon({ code: r.code, discount: r.discount, label: r.label })
                  else setCouponError(r.error)
                })}
                className="btn-outline h-10 px-4 text-[13px] disabled:opacity-50"
              >
                {couponPending ? 'Checking…' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p role="alert" className="mt-1.5 text-[12px] text-danger">{couponError}</p>}
        </div>

        {freeShippingAbove > 0 && subtotal < freeShippingAbove && (
          <div className="mb-5">
            <Callout tone="info">
              Add {formatINR(freeShippingAbove - subtotal)} more and shipping is free.
            </Callout>
          </div>
        )}

        {hasDead ? (
          <Alert tone="error">
            Remove the discontinued items from your cart first.
          </Alert>
        ) : (
          <form action={submit} className="flex flex-col gap-4">
            {coupon && <input type="hidden" name="couponCode" value={coupon.code} />}
            {state?.error && <Alert tone="error">{state.error}</Alert>}

            <p className="eyebrow">Delivery Address</p>

            <Field label="Name" name="name" required error={state?.fieldErrors?.name}>
              <Input
                id="name" name="name" required
                defaultValue={state?.values?.name ?? address.name}
                error={!!state?.fieldErrors?.name}
              />
            </Field>

            <Field label="Mobile" name="phone" required error={state?.fieldErrors?.phone}>
              <Input
                id="phone" name="phone" inputMode="numeric" maxLength={10} required
                defaultValue={state?.values?.phone ?? address.phone}
                error={!!state?.fieldErrors?.phone}
              />
            </Field>

            <Field label="Address" name="address" required error={state?.fieldErrors?.address}>
              <textarea
                id="address" name="address" rows={2} required
                defaultValue={state?.values?.address ?? address.address}
                className={`input ${state?.fieldErrors?.address ? 'input-error' : ''}`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="PIN code" name="pincode" required error={state?.fieldErrors?.pincode}>
                <Input
                  id="pincode" name="pincode" inputMode="numeric" maxLength={6} required
                  defaultValue={state?.values?.pincode ?? address.pincode}
                  error={!!state?.fieldErrors?.pincode}
                  className="font-mono"
                />
              </Field>
              <Field label="City" name="city" required error={state?.fieldErrors?.city}>
                <Input
                  id="city" name="city" required
                  defaultValue={state?.values?.city ?? address.city}
                  error={!!state?.fieldErrors?.city}
                />
              </Field>
            </div>

            <Field label="State" name="state" required error={state?.fieldErrors?.state}>
              <Select
                id="state" name="state" required
                defaultValue={state?.values?.state ?? address.state}
                error={!!state?.fieldErrors?.state}
              >
                <option value="">Select…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>

            <Button type="submit" disabled={checkingOut}>
              {checkingOut ? 'Creating order…' : `${formatINR(grand)} — Continue`}
            </Button>
          </form>
        )}
      </aside>
    </div>
  )
}

function Row({ k, v, green }: { k: string; v: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-2">{k}</dt>
      <dd className={`tabular font-medium ${green ? 'text-ok' : 'text-ink'}`}>{v}</dd>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════

function PaymentStep({ state }: { state: CheckoutState }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <Callout tone="ok" icon="check" title="Order confirmed">
        <p>
          <strong className="font-mono">{state.orderNumber}</strong> — we will ship
          it shortly. You will get updates by email.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/orders" className="btn-primary">
            View your orders
          </Link>
          <Link href="/merchandise" className="btn-outline">
            Continue shopping
          </Link>
        </div>
      </Callout>
    )
  }

  return (
    <Callout
      tone="brand"
      icon="rupee"
      title={`Order ${state.orderNumber} — payment pending`}
    >
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {state.isMock ? (
        <>
          <p className="mb-4 rounded-lg border border-line bg-paper-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            <strong className="text-ink">Test mode</strong> — Razorpay is not
            connected yet, so no real money will be charged. The button below
            marks the payment as successful so the full flow can be tested.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await confirmMockOrderAction(state.paymentId!)
                  if (r.ok) setDone(true)
                  else setError(r.error ?? 'Something went wrong')
                })
              }
            >
              {formatINR(state.amount ?? 0)} — Mark payment complete
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await cancelCheckoutAction(state.paymentId!)
                  router.refresh()
                })
              }
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className="text-[13.5px]">Opening Razorpay checkout…</p>
      )}
    </Callout>
  )
}
