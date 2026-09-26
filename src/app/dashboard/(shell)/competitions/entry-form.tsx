'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { submitEntryAction, type EntryState } from '../../competition-actions'

const MAX_WORDS = 200
const MAX_IMAGES = 4

export type ExistingEntry = {
  title: string
  concept: string
  media: { id: string; type: string; url: string; fileName: string }[]
}

/**
 * The designer's answer to a brief.
 *
 * Kept deliberately short — a title, the concept, and the drawings. Everything
 * else about the designer is already on their profile, and asking for it again
 * is how a submission form stops being submitted.
 */
export function EntryForm({
  competitionId,
  competitionTitle,
  backHref,
  existing,
}: {
  competitionId: string
  competitionTitle: string
  backHref: string
  existing: ExistingEntry | null
}) {
  const [state, submit, pending] = useActionState<EntryState, FormData>(
    submitEntryAction,
    null
  )

  const [concept, setConcept] = useState(existing?.concept ?? '')
  const words = concept.trim() ? concept.trim().split(/\s+/).length : 0
  const over = words > MAX_WORDS

  const v = state?.values ?? {}
  const err = state?.fieldErrors ?? {}

  if (state?.ok) {
    return (
      <div className="card p-6">
        <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
          <Icon name="check" className="h-5 w-5 text-ok" />
          {state.message}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href={backHref} className="btn-primary">
            Back to my competitions
          </Link>
          <Link href="/competition" className="btn-outline">
            Browse other competitions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      <input type="hidden" name="competitionId" value={competitionId} />

      {state?.error && (
        <p className="rounded-lg border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-ink-2">
          {state.error}
        </p>
      )}

      <div className="card p-5 lg:p-6">
        <p className="eyebrow mb-1">Answering</p>
        <p className="font-display text-[15px] font-semibold text-ink">
          {competitionTitle}
        </p>
      </div>

      <div className="card flex flex-col gap-4 p-5 lg:p-6">
        <div>
          <label htmlFor="e-title" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Title of your design <span className="text-brand">*</span>
          </label>
          <input
            id="e-title"
            name="title"
            required
            maxLength={160}
            defaultValue={v.title ?? existing?.title ?? ''}
            placeholder="e.g. Courtyard Light — a 3BHK around a central void"
            className={err.title ? 'input input-error' : 'input'}
          />
          {err.title && <p className="mt-1 text-[12px] text-brand">{err.title}</p>}
        </div>

        <div>
          <label htmlFor="e-concept" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Your concept <span className="text-brand">*</span>
          </label>
          <textarea
            id="e-concept"
            name="concept"
            required
            rows={7}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="How you have read the brief, and what your design does about it."
            className={err.concept ? 'input input-error' : 'input'}
          />
          <p className="mt-1 flex justify-between text-[12px]">
            <span className={err.concept ? 'text-brand' : 'text-ink-4'}>
              {err.concept ?? `Up to ${MAX_WORDS} words.`}
            </span>
            <span className={over ? 'tabular font-semibold text-brand' : 'tabular text-ink-4'}>
              {words} / {MAX_WORDS}
            </span>
          </p>
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-5 lg:p-6">
        <div>
          <label htmlFor="e-images" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Drawings and views {!existing && <span className="text-brand">*</span>}
          </label>
          <input
            id="e-images"
            name="images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="w-full text-[13px] text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-paper-3 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-ink-2 hover:file:bg-line"
          />
          <p className="mt-1 text-[12px] text-ink-4">
            {err.images ? (
              <span className="text-brand">{err.images}</span>
            ) : (
              <>Up to {MAX_IMAGES} images, 2 MB each, landscape.</>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="e-pdf" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Proposal (PDF, optional)
          </label>
          <input
            id="e-pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            className="w-full text-[13px] text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-paper-3 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-ink-2 hover:file:bg-line"
          />
          {err.pdf && <p className="mt-1 text-[12px] text-brand">{err.pdf}</p>}
        </div>

        {existing && existing.media.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-info/25 bg-info-soft px-4 py-3 text-[12.5px] text-ink-2">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              {existing.media.length} file
              {existing.media.length === 1 ? '' : 's'} already attached. Choosing
              new files replaces them; leaving these boxes empty keeps them.
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || over} className="btn-primary">
          {pending ? 'Submitting…' : existing ? 'Update my entry' : 'Submit my design'}
        </button>
        <Link href={backHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  )
}
