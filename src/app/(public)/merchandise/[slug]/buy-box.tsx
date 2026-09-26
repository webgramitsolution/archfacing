'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { addToCartAction, deliveryCheckAction } from '../actions'
import { Icon } from '@/components/ui'
import { PaymentTrust } from '@/components/payment-trust'
import { formatINR } from '@/lib/utils'

export type Variant = { id: string; label: string | null; price: number; mrp: number | null; stock: number; lowStockAt: number }
export type Coupon = { code: string; label: string } | null

export function BuyBox({
  title, variants, images, rating, reviewCount, coupon,
}: {
  title: string
  variants: Variant[]
  images: string[]
  rating: number
  reviewCount: number
  coupon: Coupon
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Variant>(variants.find((v) => v.stock > 0) ?? variants[0])
  const [qty, setQty] = useState(1)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [pin, setPin] = useState('')
  const [pinMsg, setPinMsg] = useState<string | null>(null)

  const out = selected.stock === 0
  const max = Math.min(selected.stock, 10)
  const off = selected.mrp && selected.mrp > selected.price ? Math.round(((selected.mrp - selected.price) / selected.mrp) * 100) : 0
  const img = images[0]

  const doAdd = (then?: () => void) =>
    start(async () => {
      setMsg(null)
      const r = await addToCartAction(selected.id, qty)
      if (r.ok) { then ? then() : setMsg({ tone: 'success', text: 'Added to cart.' }) }
      else if (r.needsLogin) router.push('/login?next=/merchandise/')
      else setMsg({ tone: 'error', text: r.error ?? 'Something went wrong' })
    })

  const checkPin = () => {
    if (!/^[1-9]\d{5}$/.test(pin)) { setPinMsg('Enter a valid 6-digit PIN code.'); return }
    start(async () => {
      const r = await deliveryCheckAction(pin)
      setPinMsg(r.message)
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[22px] font-bold leading-snug tracking-tight text-ink lg:text-[24px]">{title}</h1>

      {/* price + rating */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="tabular font-display text-[26px] font-extrabold text-brand">{formatINR(selected.price)}</span>
        {selected.mrp && selected.mrp > selected.price && (
          <>
            <span className="tabular text-[15px] text-ink-4 line-through">{formatINR(selected.mrp)}</span>
            <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-[12px] font-bold text-ok">{off}% OFF</span>
          </>
        )}
        <span className="mx-1 h-4 w-px bg-line" />
        <span className="flex items-center gap-1">
          <Stars value={rating} />
          <span className="text-[12.5px] font-semibold text-ink">{rating}/5</span>
          <span className="text-[12px] text-ink-3">· {reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
        </span>
      </div>

      {/* variant cards — Select Best Offer (only when there is a real choice) */}
      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">Select Best Offer: <span className="text-brand">{selected.label ?? 'Standard'}</span></p>
          {/* one swipeable row: 3 tiles in view on phones, 4 on desktop */}
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin]">
            {variants.map((v) => {
              const on = selected.id === v.id
              return (
                <button key={v.id} type="button" disabled={v.stock === 0}
                  onClick={() => { setSelected(v); setQty(1); setMsg(null) }}
                  className={`relative shrink-0 basis-[calc((100%-20px)/3)] snap-start overflow-hidden rounded-xl border-2 p-1.5 text-left transition-colors lg:basis-[calc((100%-30px)/4)] ${on ? 'border-brand bg-brand-soft/40' : v.stock === 0 ? 'cursor-not-allowed border-line opacity-50' : 'border-line hover:border-brand/50'}`}>
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-paper-2">
                    {img && <Image src={img} alt="" fill sizes="104px" className="object-cover" />}
                  </span>
                  <span className="mt-1 block text-center text-[12px] font-bold text-ink">{v.label ?? 'Standard'}</span>
                  <span className="block text-center text-[12px] font-bold text-brand">{formatINR(v.price)}{v.mrp && v.mrp > v.price ? <span className="ml-1 text-[10px] font-medium text-ink-4 line-through">{formatINR(v.mrp)}</span> : null}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* coupon */}
      {coupon && (
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dotted border-ok/50 bg-ok-soft/50 px-3 py-2.5">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ok"><Icon name="tag" className="h-4 w-4" /> {coupon.label} <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold text-ink">{coupon.code}</span></span>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(coupon.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:border-ink-4">
            <Icon name="file" className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      )}

      {msg && <p className={`rounded-lg px-3 py-2 text-[12.5px] ${msg.tone === 'success' ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>{msg.text}</p>}

      {/* qty + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-line">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || out} className="px-3 py-2 text-ink-2 hover:text-brand disabled:opacity-40">−</button>
          <span className="tabular w-9 text-center text-[14px] font-semibold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max || out} className="px-3 py-2 text-ink-2 hover:text-brand disabled:opacity-40">+</button>
        </div>
        <button type="button" disabled={out || pending} onClick={() => doAdd()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-5 py-2.5 text-[13.5px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
          <Icon name="cart" className="h-4 w-4" /> {pending ? '…' : 'ADD TO CART'}
        </button>
        <button type="button" disabled={out || pending} onClick={() => doAdd(() => router.push('/cart'))}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-[13.5px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
          <Icon name="bolt" className="h-4 w-4" /> BUY NOW
        </button>
      </div>
      {out && <p className="text-[12.5px] font-medium text-danger">This option is out of stock.</p>}

      {/* secure payment strip */}
      <PaymentTrust />

      {/* check delivery */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink"><Icon name="map" className="h-3.5 w-3.5 text-brand" /> Check Delivery Details</p>
        <div className="flex gap-2">
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Enter 6-digit Pincode"
            className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-[13px] focus:border-brand focus:outline-none" />
          <button type="button" onClick={checkPin} className="rounded-lg bg-danger px-5 text-[13px] font-bold text-white hover:opacity-90">Check</button>
        </div>
        {pinMsg && <p className="mt-1.5 text-[12px] text-ink-2">{pinMsg}</p>}
      </div>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill={i <= Math.round(value) ? '#F59E0B' : '#E2E8F0'}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  )
}
