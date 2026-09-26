'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  withdrawCampaignAction, pauseCampaignAction, resumeCampaignAction,
  cancelCampaignAction, duplicateCampaignAction, deleteDraftAction,
} from './actions'
import type { CampaignAction } from './permissions'

/**
 * The buttons on a campaign, and the confirmations in front of the dangerous
 * ones — §8, §9.
 *
 * Which buttons exist is decided on the server (`ALLOWED`) and handed in as
 * `allowed`; this component only draws them. Nothing destructive happens on a
 * single click: delete, cancel, pause and withdraw all open a dialog that says
 * what is about to happen and what it cannot undo.
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

export function CampaignActions({
  id,
  allowed,
  className,
}: {
  id: string
  allowed: readonly CampaignAction[]
  className?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [ask, setAsk] = useState<Confirm | null>(null)
  const [error, setError] = useState<string | null>(null)

  const can = (a: CampaignAction) => allowed.includes(a)

  const go = (c: Confirm) => setAsk(c)

  const confirm = () => {
    if (!ask) return
    const c = ask

    start(async () => {
      setError(null)
      const r = await c.run()
      if (!r.ok) {
        setError(r.error ?? 'That could not be done.')
        return
      }
      setAsk(null)
      // A duplicate opens the new draft; a delete goes back to the list.
      if (r.id) router.push(`/dashboard/advertisements/create?draft=${r.id}`)
      else if (c.then) router.push(c.then)
      else router.refresh()
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {can('edit') && (
        <Link
          href={`/dashboard/advertisements/create?draft=${id}`}
          className="btn-primary gap-2 px-5 text-[13px]"
        >
          <Icon name="file" className="h-4 w-4" />
          {allowed.includes('withdraw') ? 'Continue Editing' : 'Edit & Resubmit'}
        </Link>
      )}

      {can('analytics') && (
        <Link
          href={`/dashboard/advertisements/${id}#performance`}
          className="flex items-center gap-2 rounded-card border border-line bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
        >
          <Icon name="chart" className="h-4 w-4" />
          View Analytics
        </Link>
      )}

      {can('pause') && (
        <Secondary
          icon="clock"
          label="Pause Campaign"
          onClick={() =>
            go({
              title: 'Pause this campaign?',
              body: 'It will stop appearing on ArchFacing straight away. Its slot is kept, so you can resume it at any time before the end date.',
              confirmLabel: 'Pause Campaign',
              cancelLabel: 'Keep Running',
              tone: 'warn',
              run: () => pauseCampaignAction(id),
            })
          }
        />
      )}

      {can('resume') && (
        <Secondary
          icon="bolt"
          label="Resume Campaign"
          onClick={() =>
            start(async () => {
              const r = await resumeCampaignAction(id)
              if (!r.ok) setError(r.error)
              else router.refresh()
            })
          }
        />
      )}

      {can('withdraw') && (
        <Secondary
          icon="arrow"
          label="Withdraw"
          onClick={() =>
            go({
              title: 'Withdraw from review?',
              body: 'The campaign goes back to your drafts and leaves the review queue. You can edit it and submit again whenever you are ready.',
              confirmLabel: 'Withdraw',
              cancelLabel: 'Leave in Review',
              tone: 'warn',
              run: () => withdrawCampaignAction(id),
              then: '/dashboard/advertisements/drafts',
            })
          }
        />
      )}

      {can('duplicate') && (
        <Secondary
          icon="grid"
          label="Duplicate"
          onClick={() =>
            go({
              title: 'Duplicate this campaign?',
              body: 'A new draft is created with the same creative, placements and audience. The dates, payment, analytics and approval history are not copied.',
              confirmLabel: 'Create Duplicate',
              cancelLabel: 'Cancel',
              tone: 'warn',
              run: () => duplicateCampaignAction(id),
            })
          }
        />
      )}

      {can('cancel') && (
        <Danger
          label="Cancel Campaign"
          onClick={() =>
            go({
              title: 'Cancel this campaign?',
              body: 'The campaign is ended and will not run. This cannot be undone — you would need to create and submit a new campaign.',
              confirmLabel: 'Cancel Campaign',
              cancelLabel: 'Keep Campaign',
              tone: 'danger',
              run: () => cancelCampaignAction(id),
            })
          }
        />
      )}

      {can('delete') && (
        <Danger
          label="Delete Draft"
          onClick={() =>
            go({
              title: 'Delete this draft?',
              body: 'This draft will be permanently removed, along with everything you have filled in so far.',
              confirmLabel: 'Delete Draft',
              cancelLabel: 'Cancel',
              tone: 'danger',
              run: () => deleteDraftAction(id),
              then: '/dashboard/advertisements/drafts',
            })
          }
        />
      )}

      {error && !ask && (
        <p className="w-full text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      {ask && (
        <ConfirmDialog
          confirm={ask}
          busy={pending}
          error={error}
          onCancel={() => {
            setAsk(null)
            setError(null)
          }}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}

function Secondary({
  icon,
  label,
  onClick,
}: {
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-card border border-line bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand"
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  )
}

function Danger({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-card border border-line bg-paper px-4 py-2.5 text-[13px] font-semibold text-danger transition-colors hover:border-danger hover:bg-danger-soft"
    >
      <Icon name="alert" className="h-4 w-4" />
      {label}
    </button>
  )
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
