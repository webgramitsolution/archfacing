'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { addVariantAction, updateVariantAction, deleteVariantAction } from '../../actions'

type Variant = { id: string; label: string | null; price: number; mrp: number | null; stock: number; isActive: boolean; sku: string }

/**
 * Manage a product's variations — add, edit inline, toggle active, delete.
 * Every action hits a server action and refreshes the server-rendered page.
 */
export function VariationsManager({ postId, initial, defaultTax }: { postId: string; initial: Variant[]; defaultTax: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [add, setAdd] = useState({ label: '', price: '', mrp: '', stock: '' })

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) setErr(r.error ?? 'Something went wrong.')
      else { setEditing(null); router.refresh() }
    })
  }

  const onAdd = () => {
    const price = Number(add.price)
    if (!price || price < 1) { setErr('Enter a valid price for the new variation.'); return }
    run(async () => {
      const r = await addVariantAction(postId, { label: add.label, price, mrp: add.mrp ? Number(add.mrp) : undefined, stock: Number(add.stock) || 0, taxPercent: defaultTax })
      if (r.ok) setAdd({ label: '', price: '', mrp: '', stock: '' })
      return r
    })
  }

  return (
    <div className="rise rise-1 rounded-card border border-line bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink">Product Variations</h2>
          <p className="text-[11.5px] text-ink-3">Sizes, colours or packs — each with its own price &amp; stock ({initial.length})</p>
        </div>
      </div>

      {err && <p className="mx-4 mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">{err}</p>}

      <div className="overflow-x-auto p-2">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-ink-4">
              <th className="px-2 py-2 font-semibold">Variation</th>
              <th className="px-2 py-2 font-semibold">Price (₹)</th>
              <th className="px-2 py-2 font-semibold">MRP (₹)</th>
              <th className="px-2 py-2 font-semibold">Stock</th>
              <th className="px-2 py-2 font-semibold">Active</th>
              <th className="px-2 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {initial.map((v) => (
              <VariantRow key={v.id} v={v} editing={editing === v.id} pending={pending}
                onEdit={() => setEditing(v.id)} onCancel={() => setEditing(null)}
                onSave={(d) => run(() => updateVariantAction(v.id, d))}
                onDelete={() => run(() => deleteVariantAction(v.id))} />
            ))}

            {/* add row */}
            <tr className="bg-paper-2/60 text-[12.5px]">
              <td className="px-2 py-2.5"><input value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} placeholder="e.g. M / Blue" className={inp} /></td>
              <td className="px-2 py-2.5"><input value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value })} inputMode="numeric" placeholder="0" className={`${inp} w-[80px]`} /></td>
              <td className="px-2 py-2.5"><input value={add.mrp} onChange={(e) => setAdd({ ...add, mrp: e.target.value })} inputMode="numeric" placeholder="—" className={`${inp} w-[80px]`} /></td>
              <td className="px-2 py-2.5"><input value={add.stock} onChange={(e) => setAdd({ ...add, stock: e.target.value })} inputMode="numeric" placeholder="0" className={`${inp} w-[70px]`} /></td>
              <td className="px-2 py-2.5 text-ink-4">—</td>
              <td className="px-2 py-2.5 text-right">
                <button type="button" onClick={onAdd} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"><Icon name="plus" className="h-3.5 w-3.5" /> Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inp = 'h-8 rounded-lg border border-line bg-white px-2.5 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'

function VariantRow({ v, editing, pending, onEdit, onCancel, onSave, onDelete }: {
  v: Variant; editing: boolean; pending: boolean
  onEdit: () => void; onCancel: () => void
  onSave: (d: { label?: string; price: number; mrp?: number; stock: number; isActive: boolean }) => void
  onDelete: () => void
}) {
  const [f, setF] = useState({ label: v.label ?? '', price: String(v.price), mrp: v.mrp ? String(v.mrp) : '', stock: String(v.stock), isActive: v.isActive })

  if (!editing) {
    return (
      <tr className="text-[12.5px] row-hover">
        <td className="px-2 py-2.5"><span className="font-semibold text-ink">{v.label || 'Default'}</span><span className="block text-[10px] text-ink-4">{v.sku}</span></td>
        <td className="px-2 py-2.5 font-semibold text-ink">₹{v.price.toLocaleString('en-IN')}</td>
        <td className="px-2 py-2.5 text-ink-3">{v.mrp ? `₹${v.mrp.toLocaleString('en-IN')}` : '—'}</td>
        <td className={`px-2 py-2.5 font-semibold ${v.stock === 0 ? 'text-danger' : v.stock <= 3 ? 'text-warn' : 'text-ink-2'}`}>{v.stock}</td>
        <td className="px-2 py-2.5"><span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${v.isActive ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3'}`}>{v.isActive ? 'Active' : 'Hidden'}</span></td>
        <td className="px-2 py-2.5">
          <div className="flex items-center justify-end gap-1 text-ink-4">
            <button type="button" onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-paper-3 hover:text-brand"><Icon name="settings" className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={onDelete} disabled={pending} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-danger-soft hover:text-danger disabled:opacity-50"><Icon name="alert" className="h-3.5 w-3.5" /></button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="bg-brand-soft/40 text-[12.5px]">
      <td className="px-2 py-2.5"><input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Label" className={inp} /></td>
      <td className="px-2 py-2.5"><input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="numeric" className={`${inp} w-[80px]`} /></td>
      <td className="px-2 py-2.5"><input value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} inputMode="numeric" className={`${inp} w-[80px]`} /></td>
      <td className="px-2 py-2.5"><input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} inputMode="numeric" className={`${inp} w-[70px]`} /></td>
      <td className="px-2 py-2.5">
        <button type="button" onClick={() => setF({ ...f, isActive: !f.isActive })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${f.isActive ? 'bg-brand' : 'bg-[#CBD5E1]'}`}><span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${f.isActive ? 'left-[18px]' : 'left-0.5'}`} /></button>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:border-ink-4">Cancel</button>
          <button type="button" disabled={pending} onClick={() => onSave({ label: f.label, price: Number(f.price), mrp: f.mrp ? Number(f.mrp) : undefined, stock: Number(f.stock) || 0, isActive: f.isActive })} className="rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60">Save</button>
        </div>
      </td>
    </tr>
  )
}
