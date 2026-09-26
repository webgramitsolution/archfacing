'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { ConfirmDialog, type Confirm } from '@/components/confirm-dialog'
import { createCouponAction, toggleCouponAction, deleteCouponAction } from '../actions'

type Coupon = {
  id: string; code: string; type: 'PERCENT' | 'FLAT'; value: number
  minOrder: number | null; maxDiscount: number | null; usageLimit: number | null
  usedCount: number; isActive: boolean; expiresAt: string | null
}

const inp = 'h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const lbl = 'mb-1 block text-[11.5px] font-medium text-ink-2'

export function CouponsManager({ initial }: { initial: Coupon[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  // Delete asks first — it used to fire on a single click.
  const [ask, setAsk] = useState<Confirm | null>(null)
  const [f, setF] = useState({ code: '', type: 'PERCENT' as 'PERCENT' | 'FLAT', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expiresAt: '' })

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) => {
    setErr(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) setErr(r.error ?? 'Something went wrong.')
      else { onOk?.(); router.refresh() }
    })
  }

  const create = () =>
    run(
      () => createCouponAction({
        code: f.code, type: f.type, value: Number(f.value),
        minOrder: f.minOrder ? Number(f.minOrder) : undefined,
        maxDiscount: f.maxDiscount ? Number(f.maxDiscount) : undefined,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : undefined,
        expiresAt: f.expiresAt || undefined,
      }),
      () => setF({ code: '', type: 'PERCENT', value: '', minOrder: '', maxDiscount: '', usageLimit: '', expiresAt: '' })
    )

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      {ask && (
        <ConfirmDialog
          confirm={ask}
          busy={pending}
          error={null}
          onCancel={() => setAsk(null)}
          onConfirm={() => { const a = ask; setAsk(null); run(a.run) }}
        />
      )}
      {/* create form */}
      <div className="rise rise-1 w-full shrink-0 rounded-card border border-line bg-white p-4 shadow-card md:w-[320px]">
        <h2 className="font-display text-[15px] font-bold text-ink">New Coupon</h2>
        <p className="mb-3 text-[11.5px] text-ink-3">Create a code buyers apply at checkout.</p>
        {err && <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">{err}</p>}

        <div className="space-y-3">
          <div>
            <label htmlFor="coupon-code" className={lbl}>Coupon Code</label>
            <input id="coupon-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="ARCH20" className={`${inp} font-mono tracking-wide`} />
          </div>
          <div>
            <label className={lbl}>Discount Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['PERCENT', 'FLAT'] as const).map((t) => (
                <button key={t} type="button" aria-pressed={f.type === t} onClick={() => setF({ ...f, type: t })}
                  className={'rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors ' + (f.type === t ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2 hover:border-ink-4')}>
                  {t === 'PERCENT' ? '% Off' : '₹ Flat'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="coupon-value" className={lbl}>{f.type === 'PERCENT' ? 'Percent (%)' : 'Amount (₹)'}</label>
              <input id="coupon-value" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} inputMode="numeric" placeholder={f.type === 'PERCENT' ? '20' : '500'} className={inp} />
            </div>
            <div>
              <label htmlFor="coupon-min" className={lbl}>Min. Order (₹)</label>
              <input id="coupon-min" value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} inputMode="numeric" placeholder="—" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {f.type === 'PERCENT' && (
              <div>
                <label htmlFor="coupon-max" className={lbl}>Max Discount (₹)</label>
                <input id="coupon-max" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} inputMode="numeric" placeholder="cap" className={inp} />
              </div>
            )}
            <div>
              <label htmlFor="coupon-usage" className={lbl}>Usage Limit</label>
              <input id="coupon-usage" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} inputMode="numeric" placeholder="∞" className={inp} />
            </div>
          </div>
          <div>
            <label htmlFor="coupon-expires" className={lbl}>Expires On (optional)</label>
            <input id="coupon-expires" type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className={inp} />
          </div>
          <button type="button" onClick={create} disabled={pending} className="btn-primary w-full justify-center disabled:opacity-60">
            <Icon name="plus" className="h-4 w-4" /> {pending ? 'Saving…' : 'Create Coupon'}
          </button>
        </div>
      </div>

      {/* list */}
      <div className="rise rise-2 min-w-0 flex-1 rounded-card border border-line bg-white p-4 shadow-card">
        <h2 className="mb-3 font-display text-[15px] font-bold text-ink">All Coupons ({initial.length})</h2>
        {initial.length === 0 ? (
          <div className="py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name="star" className="h-6 w-6" /></span>
            <p className="mt-3 text-[13px] font-semibold text-ink">No coupons yet</p>
            <p className="mt-1 text-[12px] text-ink-3">Create your first discount code on the left.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                  <th className="px-2 py-2.5 font-semibold">Code</th>
                  <th className="px-2 py-2.5 font-semibold">Discount</th>
                  <th className="px-2 py-2.5 font-semibold">Min Order</th>
                  <th className="px-2 py-2.5 font-semibold">Used</th>
                  <th className="px-2 py-2.5 font-semibold">Expires</th>
                  <th className="px-2 py-2.5 font-semibold">Active</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {initial.map((c) => (
                  <tr key={c.id} className="text-[12.5px] row-hover">
                    <td className="px-2 py-3"><span className="rounded-md bg-paper-2 px-2 py-1 font-mono text-[12px] font-bold tracking-wide text-ink">{c.code}</span></td>
                    <td className="px-2 py-3 font-semibold text-ink">{c.type === 'PERCENT' ? `${c.value}% off${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}` : `₹${c.value.toLocaleString('en-IN')} off`}</td>
                    <td className="px-2 py-3 text-ink-2">{c.minOrder ? `₹${c.minOrder.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="px-2 py-3 text-ink-2">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                    <td className="px-2 py-3 text-ink-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No expiry'}</td>
                    <td className="px-2 py-3">
                      <button type="button" role="switch" aria-checked={c.isActive} aria-label={`Coupon ${c.code} active`} onClick={() => run(() => toggleCouponAction(c.id, !c.isActive))} disabled={pending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.isActive ? 'bg-ok' : 'bg-[#CBD5E1]'}`}>
                        <span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${c.isActive ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button type="button" aria-label={`Delete coupon ${c.code}`} onClick={() => setAsk({ title: `Delete coupon ${c.code}?`, body: 'Buyers will no longer be able to apply this code. This cannot be undone.', confirmLabel: 'Delete Coupon', cancelLabel: 'Cancel', tone: 'danger', run: () => deleteCouponAction(c.id) })} disabled={pending} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-4 hover:bg-danger-soft hover:text-danger disabled:opacity-50"><Icon name="alert" className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
