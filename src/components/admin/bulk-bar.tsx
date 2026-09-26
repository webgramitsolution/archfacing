'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ConfirmDialog } from '@/components/confirm-dialog'

/**
 * The bulk-action bar for an admin table.
 *
 * Render it INSIDE the table's <form>. Every row checkbox is a plain
 * `<input type="checkbox" name="ids" value={id}>`; this component finds them
 * through the form, keeps a real selected count, drives the select-all box
 * (including its indeterminate state) and disables its buttons until at least
 * one row is picked. Each button submits the form with `name="status"` and its
 * own value, so a single server action handles every choice.
 *
 * It replaces bars that printed a hardcoded "0 selected" beside <span>s that
 * looked like buttons and did nothing.
 */
export type BulkChoice = { value: string; label: string; tone: 'ok' | 'info' | 'danger' | 'warn' }

const TONE: Record<BulkChoice['tone'], string> = {
  ok: 'bg-ok-soft text-ok',
  info: 'bg-[#EAF2FF] text-[#2563EB]',
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
}

export function BulkBar({ choices, name = 'status' }: { choices: BulkChoice[]; name?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const [count, setCount] = useState(0)
  const [total, setTotal] = useState(0)

  const boxes = () =>
    Array.from(ref.current?.closest('form')?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="ids"]') ?? [])

  useEffect(() => {
    const form = ref.current?.closest('form')
    if (!form) return
    const sync = () => {
      const all = boxes()
      const on = all.filter((b) => b.checked).length
      setCount(on)
      setTotal(all.length)
      if (allRef.current) {
        allRef.current.checked = all.length > 0 && on === all.length
        allRef.current.indeterminate = on > 0 && on < all.length
      }
    }
    sync()
    form.addEventListener('change', sync)
    // After a submit the server re-renders the rows; clear stale ticks.
    form.addEventListener('submit', () => setTimeout(sync, 0))
    return () => form.removeEventListener('change', sync)
  }, [])

  const toggleAll = (on: boolean) => {
    for (const b of boxes()) b.checked = on
    setCount(on ? boxes().length : 0)
  }

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-[12px] text-ink-3">
        <input
          ref={allRef}
          type="checkbox"
          disabled={total === 0}
          onChange={(e) => toggleAll(e.currentTarget.checked)}
          aria-label="Select all rows on this page"
          className="h-3.5 w-3.5 rounded border-line accent-brand"
        />
        <span className="tabular font-medium">{count} selected</span>
      </label>
      {choices.map((c) => (
        <BulkButton key={c.value} choice={c} name={name} disabled={count === 0} count={count} />
      ))}
    </div>
  )
}

function BulkButton({ choice, name, disabled, count }: { choice: BulkChoice; name: string; disabled: boolean; count: number }) {
  const { pending } = useFormStatus()
  const btn = useRef<HTMLButtonElement>(null)
  // A danger choice (Suspend) asks first; the rest submit straight away.
  const [asking, setAsking] = useState(false)
  return (
    <>
      <button
        ref={btn}
        type="submit"
        name={name}
        value={choice.value}
        disabled={disabled || pending}
        onClick={(e) => {
          if (choice.tone === 'danger') {
            e.preventDefault()
            setAsking(true)
          }
        }}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${TONE[choice.tone]}`}
      >
        {choice.label}
      </button>
      {asking && (
        <ConfirmDialog
          confirm={{
            title: `${choice.label} ${count} selected account${count === 1 ? '' : 's'}?`,
            body: 'This applies to every ticked row. Accounts you are not allowed to change are skipped.',
            confirmLabel: choice.label,
            cancelLabel: 'Cancel',
            tone: 'danger',
            run: async () => ({ ok: true }),
          }}
          busy={pending}
          error={null}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            // requestSubmit(button) keeps the button's name/value in the form data.
            if (btn.current) btn.current.form?.requestSubmit(btn.current)
          }}
        />
      )}
    </>
  )
}
