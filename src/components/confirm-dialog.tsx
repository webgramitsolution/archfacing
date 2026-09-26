'use client'

import { cn } from '@/lib/utils'
import { Icon } from './ui'

/**
 * The shared confirmation dialog — moved here unchanged from the campaign
 * actions so every destructive action (ads, coupons, variations, orders,
 * employees, qualifications, documents) uses the same dialog.
 */

export type Confirm = {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  tone: 'danger' | 'warn'
  run: () => Promise<{ ok: boolean; error?: string; id?: string }>
  /** Where to go afterwards. Staying put is right for pause/resume. */
  then?: string
}

/**
 * The confirmation.
 *
 * A real dialog rather than `window.confirm`: it can say what will happen in
 * the platform's own words, it can show the error if the action is refused,
 * and Escape closes it. The backdrop click cancels, and focus is put on the
 * safe button so a stray Enter does not confirm a deletion.
 */
export function ConfirmDialog({
  confirm,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  confirm: Confirm
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md rounded-card border border-line bg-paper p-6 shadow-lift">
        <span
          className={cn(
            'mb-4 flex h-11 w-11 items-center justify-center rounded-card',
            confirm.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
          )}
        >
          <Icon name="alert" className="h-5 w-5" />
        </span>

        <h2 id="confirm-title" className="font-display text-[17px] font-bold text-ink">
          {confirm.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{confirm.body}</p>

        {error && (
          <p className="mt-3 rounded-card border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="rounded-card border border-line bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink-3"
          >
            {confirm.cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'rounded-card px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-60',
              confirm.tone === 'danger'
                ? 'bg-danger hover:bg-danger/90'
                : 'bg-brand hover:bg-brand-hover'
            )}
          >
            {busy ? 'Working…' : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
