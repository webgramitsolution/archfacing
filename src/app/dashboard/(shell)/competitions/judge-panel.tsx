'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { Icon } from '@/components/ui'
import {
  judgeEntryAction,
  declareWinnerAction,
  reopenJudgingAction,
  type EntryState,
} from '../../competition-actions'
import { ENTRY_STATUS_LABEL, ENTRY_STATUS_TONE } from '@/lib/competition-entry-status'
import type { CompetitionEntryStatus } from '@prisma/client'

export type JudgeEntry = {
  id: string
  title: string
  concept: string
  status: CompetitionEntryStatus
  score: number | null
  remarks: string | null
  submittedAt: string
  designerName: string
  designerRole: string
  designerPlace: string
  media: { id: string; type: string; url: string; fileName: string }[]
}

/**
 * The owner's judging panel.
 *
 * Every entry can be shortlisted, set aside, or put back to undecided at any
 * point. Declaring a winner is the one irreversible-feeling step, so it asks
 * first and can still be undone from the header afterwards.
 */
export function JudgePanel({
  competitionId,
  entries,
  winnerAnnounced,
}: {
  competitionId: string
  entries: JudgeEntry[]
  winnerAnnounced: boolean
}) {
  const [state, judge, judging] = useActionState<EntryState, FormData>(judgeEntryAction, null)
  const [winState, declare, declaring] = useActionState<EntryState, FormData>(
    declareWinnerAction,
    null
  )
  const [reopenState, reopen, reopening] = useActionState<EntryState, FormData>(
    reopenJudgingAction,
    null
  )

  const [confirming, setConfirming] = useState<string | null>(null)
  const notice = winState ?? reopenState ?? state

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <p
          className={
            notice.ok
              ? 'rounded-lg border border-ok/25 bg-ok-soft px-4 py-3 text-[13.5px] text-ink-2'
              : 'rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-ink-2'
          }
        >
          {notice.ok ? notice.message : notice.error}
        </p>
      )}

      {winnerAnnounced && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ok/25 bg-ok-soft p-5">
          <p className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <Icon name="star" className="h-4 w-4 shrink-0 text-ok" />
            The result is out. Judging is closed for this competition.
          </p>
          <form action={reopen}>
            <input type="hidden" name="competitionId" value={competitionId} />
            <button type="submit" disabled={reopening} className="btn-outline px-4 py-2 text-[12.5px]">
              {reopening ? 'Reopening…' : 'Reopen judging'}
            </button>
          </form>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {entries.map((e) => (
          <li key={e.id} className="card overflow-hidden">
            <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr] lg:items-start">
              {/* ─── the drawings ─── */}
              <div className="flex flex-col gap-2">
                {e.media.filter((m) => m.type === 'IMAGE').slice(0, 1).map((m) => (
                  <span key={m.id} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-paper-3">
                    <Image src={m.url} alt="" fill sizes="220px" className="object-cover" />
                  </span>
                ))}
                {e.media.length > 1 && (
                  <p className="text-[11.5px] text-ink-4">
                    +{e.media.length - 1} more file{e.media.length - 1 === 1 ? '' : 's'}
                  </p>
                )}
                {e.media.filter((m) => m.type === 'PDF').map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
                  >
                    <Icon name="file" className="h-3.5 w-3.5" />
                    Proposal PDF
                  </a>
                ))}
              </div>

              {/* ─── the entry ─── */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[15.5px] font-bold text-ink">{e.title}</h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {e.designerName} · {e.designerRole}
                      {e.designerPlace ? ` · ${e.designerPlace}` : ''}
                    </p>
                  </div>
                  <span className={ENTRY_STATUS_TONE[e.status]}>
                    {ENTRY_STATUS_LABEL[e.status]}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                  {e.concept}
                </p>

                <p className="mt-2 text-[11.5px] text-ink-4">Submitted {e.submittedAt}</p>

                {/* ─── the decision ─── */}
                {!winnerAnnounced && (
                  <form action={judge} className="mt-4 flex flex-wrap items-end gap-3 border-t border-line-soft pt-4">
                    <input type="hidden" name="entryId" value={e.id} />

                    <div className="w-[90px]">
                      <label htmlFor={`score-${e.id}`} className="mb-1 block text-[11.5px] font-semibold text-ink-3">
                        Score
                      </label>
                      <input
                        id={`score-${e.id}`}
                        name="score"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={e.score ?? ''}
                        placeholder="0-100"
                        className="input px-2.5 py-1.5 text-[13px]"
                      />
                    </div>

                    <div className="min-w-[180px] flex-1">
                      <label htmlFor={`remarks-${e.id}`} className="mb-1 block text-[11.5px] font-semibold text-ink-3">
                        Remarks
                      </label>
                      <input
                        id={`remarks-${e.id}`}
                        name="remarks"
                        defaultValue={e.remarks ?? ''}
                        placeholder="What worked, what did not"
                        className="input px-2.5 py-1.5 text-[13px]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(['SHORTLISTED', 'SUBMITTED', 'REJECTED'] as const).map((s) => (
                        <button
                          key={s}
                          type="submit"
                          name="status"
                          value={s}
                          disabled={judging}
                          className={
                            e.status === s
                              ? 'btn-dark px-3 py-1.5 text-[12px]'
                              : 'btn-outline px-3 py-1.5 text-[12px]'
                          }
                        >
                          {s === 'SUBMITTED' ? 'Undecided' : ENTRY_STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </form>
                )}

                {/* ─── the winner ─── */}
                {!winnerAnnounced && (
                  <div className="mt-3">
                    {confirming === e.id ? (
                      <form action={declare} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-paper-3 px-4 py-3">
                        <input type="hidden" name="entryId" value={e.id} />
                        <p className="text-[12.5px] text-ink-2">
                          Declare <strong>{e.designerName}</strong> the winner? Every other
                          entry is marked not selected.
                        </p>
                        <button type="submit" disabled={declaring} className="btn-primary px-3.5 py-1.5 text-[12px]">
                          {declaring ? 'Declaring…' : 'Yes, declare winner'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="btn-ghost px-2.5 py-1.5 text-[12px]"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(e.id)}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
                      >
                        <Icon name="star" className="h-3.5 w-3.5" />
                        Declare this the winner
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
