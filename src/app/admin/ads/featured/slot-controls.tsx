'use client'

import { useState, useTransition } from 'react'
import { Button, Alert } from '@/components/form'
import {
  assignFeaturedAction,
  toggleFeaturedSlotAction,
  moveFeaturedSlotAction,
} from './actions'

export type Featurable = {
  id: string
  label: string
  window: string
  status: string
}

/**
 * The controls on one featured slot.
 *
 * Assigning, clearing, enabling and reordering all run through server actions,
 * so the slot's state is never decided in the browser. The select lists only
 * campaigns the server has already judged featurable.
 */
export function SlotControls({
  position,
  isEnabled,
  isFilled,
  isFirst,
  isLast,
  options,
}: {
  position: number
  isEnabled: boolean
  isFilled: boolean
  isFirst: boolean
  isLast: boolean
  options: Featurable[]
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState('')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? 'That change could not be saved.')
    })

  return (
    <div className="border-t border-line bg-paper-2 px-5 py-4">
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={pending || options.length === 0}
          className="input h-9 w-full py-0 text-[13px] sm:w-auto sm:min-w-[19rem]"
        >
          <option value="">
            {options.length === 0
              ? 'No approved campaign is free to feature'
              : isFilled
                ? 'Replace with…'
                : 'Assign a campaign…'}
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} · {o.window} · {o.status}
            </option>
          ))}
        </select>

        <Button
          type="button"
          disabled={pending || !choice}
          onClick={() => run(() => assignFeaturedAction(position, choice))}
        >
          {pending ? 'Saving…' : isFilled ? 'Replace' : 'Assign'}
        </Button>

        {isFilled && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => assignFeaturedAction(position, null))}
          >
            Remove from featured
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => toggleFeaturedSlotAction(position, !isEnabled))}
        >
          {isEnabled ? 'Disable slot' : 'Enable slot'}
        </Button>

        <span className="ml-auto flex gap-1.5">
          <Button
            type="button"
            variant="ghost"
            disabled={pending || isFirst}
            onClick={() => run(() => moveFeaturedSlotAction(position, -1))}
          >
            ↑ Move up
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || isLast}
            onClick={() => run(() => moveFeaturedSlotAction(position, 1))}
          >
            ↓ Move down
          </Button>
        </span>
      </div>
    </div>
  )
}
