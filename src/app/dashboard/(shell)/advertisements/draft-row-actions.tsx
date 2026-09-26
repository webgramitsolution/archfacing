'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { duplicateCampaignAction, deleteDraftAction } from './[id]/actions'
import { ConfirmDialog, type Confirm } from './[id]/campaign-actions'

/**
 * Duplicate / Delete on a draft card. They used to link to the detail page
 * with `?duplicate=1` / `?delete=1`, which nothing read — so they did nothing.
 * They now run the same server actions, behind the same confirmation, as the
 * buttons on the campaign's own page.
 */
export function DraftRowActions({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [ask, setAsk] = useState<Confirm | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      // A duplicate opens the new draft; a delete stays on the list.
      if (r.id) router.push(`/dashboard/advertisements/create?draft=${r.id}`)
      else router.refresh()
    })
  }

  return (
    <>
      <RowButton
        icon="file"
        label="Duplicate"
        onClick={() =>
          setAsk({
            title: 'Duplicate this campaign?',
            body: 'A new draft is created with the same creative, placements and audience. The dates, payment, analytics and approval history are not copied.',
            confirmLabel: 'Create Duplicate',
            cancelLabel: 'Cancel',
            tone: 'warn',
            run: () => duplicateCampaignAction(id),
          })
        }
      />
      <RowButton
        icon="alert"
        label="Delete"
        danger
        onClick={() =>
          setAsk({
            title: 'Delete this draft?',
            body: 'This draft will be permanently removed, along with everything you have filled in so far.',
            confirmLabel: 'Delete Draft',
            cancelLabel: 'Cancel',
            tone: 'danger',
            run: () => deleteDraftAction(id),
          })
        }
      />

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
    </>
  )
}

/** Same look as the card's other action rows. */
function RowButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: IconName
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-card border px-3 py-2 text-[12px] font-medium transition-colors',
        danger
          ? 'border-line text-danger hover:border-danger hover:bg-danger-soft'
          : 'border-line text-ink-2 hover:border-brand hover:text-brand'
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
