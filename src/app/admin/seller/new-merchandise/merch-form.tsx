'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { createMerchandiseAction, type SellerState } from '../actions'
import { Field, Input, Select, Textarea, Button, Alert } from '@/components/form'
import { Callout, Icon } from '@/components/ui'
import { MERCHANDISE_CATEGORIES } from '@/config/taxonomy'

type Row = { label: string; price: string; mrp: string; stock: string }

const emptyRow: Row = { label: '', price: '', mrp: '', stock: '' }

export function MerchForm() {
  const [state, submit, pending] = useActionState<SellerState | null, FormData>(
    createMerchandiseAction,
    null
  )

  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }])
  const [images, setImages] = useState<File[]>([])

  const err = (k: string) => state?.fieldErrors?.[k]
  const prev = (k: string) => state?.values?.[k] ?? ''

  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state && !state.ok) setFormKey((k) => k + 1)
  }, [state])

  if (state?.ok && state.createdSlug) {
    return (
      <Callout tone="ok" icon="check" title="Now on sale">
        <p>This item is live in the store.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/merchandise/${state.createdSlug}`} className="btn-primary">
            View in store
          </Link>
          <Link href="/admin/seller" className="btn-outline">
            Seller panel
          </Link>
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            Add another
          </Button>
        </div>
      </Callout>
    )
  }

  return (
    <form key={formKey} action={submit} className="flex flex-col gap-6">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field label="Name" name="title" required error={err('title')}>
        <Input
          id="title" name="title" required maxLength={180}
          placeholder="e.g. ArchFacing Drafting Notebook"
          defaultValue={prev('title')} error={!!err('title')}
        />
      </Field>

      <Field label="Description" name="description" required error={err('description')}>
        <Textarea
          id="description" name="description" rows={4} required
          defaultValue={prev('description')} error={!!err('description')}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" name="category" required error={err('category')}>
          <Select id="category" name="category" required
            defaultValue={prev('category')} error={!!err('category')}>
            <option value="">Select…</option>
            {MERCHANDISE_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="GST %" name="taxPercent" hint="Usually 12% on apparel">
          <Input
            id="taxPercent" name="taxPercent" type="number" min={0} max={28}
            defaultValue={prev('taxPercent') || '12'}
          />
        </Field>
      </div>

      {/* ── images ── */}
      <Field
        label="Images"
        name="images"
        required
        hint="JPG · up to 2 MB · landscape 5:3"
        error={err('images')}
      >
        <input
          id="images" name="images" type="file" multiple required
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => setImages([...(e.target.files ?? [])])}
          className="input file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:bg-brand"
        />
      </Field>

      {images.length > 0 && (
        <ul className="-mt-3 flex flex-col gap-1">
          {images.map((f, i) => (
            <li key={i} className={`flex justify-between text-[12px] ${
              f.size > 2 * 1024 * 1024 ? 'text-brand' : 'text-ink-3'
            }`}>
              <span className="truncate">{f.name}</span>
              <span className="tabular shrink-0">
                {(f.size / 1024 / 1024).toFixed(2)} MB
                {f.size > 2 * 1024 * 1024 && ' — too large'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── pricing and stock ── */}
      <fieldset className="rounded-card border border-line bg-paper-3 p-5">
        <legend className="eyebrow px-1">Pricing and stock</legend>
        <p className="mb-4 text-[13px] text-ink-2">
          Add a separate row for each size or colour — stock is counted separately
          for each. If there is only one variant, leave the size blank.
        </p>

        {err('variants') && (
          <p className="mb-3 text-[12.5px] font-medium text-brand">{err('variants')}</p>
        )}

        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
              <input
                name={`variant-${i}-label`} value={row.label}
                onChange={(e) => {
                  const next = [...rows]; next[i] = { ...row, label: e.target.value }; setRows(next)
                }}
                placeholder="Size / colour" className="input"
              />
              <input
                name={`variant-${i}-price`} value={row.price} type="number" min={1}
                onChange={(e) => {
                  const next = [...rows]; next[i] = { ...row, price: e.target.value }; setRows(next)
                }}
                placeholder="Price ₹"
                className={`input ${err(`variant-${i}-price`) ? 'input-error' : ''}`}
              />
              <input
                name={`variant-${i}-mrp`} value={row.mrp} type="number" min={0}
                onChange={(e) => {
                  const next = [...rows]; next[i] = { ...row, mrp: e.target.value }; setRows(next)
                }}
                placeholder="MRP (struck through)" className="input"
              />
              <input
                name={`variant-${i}-stock`} value={row.stock} type="number" min={0}
                onChange={(e) => {
                  const next = [...rows]; next[i] = { ...row, stock: e.target.value }; setRows(next)
                }}
                placeholder="stock" className="input"
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, x) => x !== i))}
                disabled={rows.length === 1}
                className="rounded-lg border border-line px-3 text-ink-3 hover:border-brand hover:text-brand disabled:opacity-40"
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {rows.length < 8 && (
          <button
            type="button"
            onClick={() => setRows([...rows, { ...emptyRow }])}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add another variant
          </button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Put on sale'}
        </Button>
        <p className="text-[12.5px] text-ink-3">
          This goes live in the store immediately — no moderation required.
        </p>
      </div>
    </form>
  )
}
