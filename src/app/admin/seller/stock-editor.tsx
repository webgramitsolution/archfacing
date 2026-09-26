'use client'

import { useState, useTransition } from 'react'
import { updateStockAction, toggleProductAction } from './actions'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'

type V = {
  id: string
  sku: string
  label: string | null
  price: number
  stock: number
}

export function StockEditor({
  postId,
  published,
  variants,
}: {
  postId: string
  published: boolean
  variants: V[]
}) {
  const [pending, start] = useTransition()
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(variants.map((v) => [v.id, v.stock]))
  )
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="border-t border-line bg-paper-3 px-4 py-3.5">
      {error && (
        <p className="mb-2 text-[12.5px] font-medium text-brand">{error}</p>
      )}

      <ul className="mb-3 flex flex-col gap-2">
        {variants.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink">
                {v.label ?? 'Single variant'}
              </span>
              <span className="block text-[11.5px] text-ink-3">{v.sku}</span>
            </span>

            <span className="tabular shrink-0 text-[13px] font-semibold text-ink">
              {formatINR(v.price)}
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <label className="text-[12px] text-ink-3" htmlFor={`stock-${v.id}`}>
                stock
              </label>
              <input
                id={`stock-${v.id}`}
                type="number"
                min={0}
                value={stocks[v.id]}
                onChange={(e) =>
                  setStocks({ ...stocks, [v.id]: Math.max(0, Number(e.target.value)) })
                }
                className="tabular w-20 rounded-lg border border-line bg-paper-2 px-2.5 py-1 text-[13px] focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                disabled={pending || stocks[v.id] === v.stock}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const r = await updateStockAction(v.id, stocks[v.id])
                    if (r.ok) {
                      setSaved(v.id)
                      setTimeout(() => setSaved(null), 2000)
                    } else {
                      setError(r.error ?? 'Could not save stock')
                    }
                  })
                }
                className="rounded-lg border border-line p-1.5 text-ink-3 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                title="Save stock"
                aria-label={`Save stock for ${v.label || "default"} variation`}
              >
                <Icon
                  name={saved === v.id ? 'check' : 'plus'}
                  className={`h-3.5 w-3.5 ${saved === v.id ? 'text-ok' : ''}`}
                />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await toggleProductAction(postId, !published)
            if (!r.ok) setError(r.error ?? 'Could not change this item')
          })
        }
        className="text-[12.5px] font-medium text-ink-3 transition-colors hover:text-brand disabled:opacity-50"
      >
        {published ? 'Remove from sale' : 'Put back on sale'}
      </button>
    </div>
  )
}
