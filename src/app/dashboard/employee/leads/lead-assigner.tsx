'use client'

import { useState, useTransition } from 'react'
import { candidatesFor, assignLeadAction } from '../actions'
import { Button, Alert } from '@/components/form'

type Candidate = Awaited<ReturnType<typeof candidatesFor>>[number]

export function LeadAssigner({ enquiryId }: { enquiryId: string }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Candidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <div className="border-t border-line bg-ok-soft px-5 py-3">
        <p className="text-[13.5px] text-ink">
          ✓ This lead has been assigned — the registrant has been notified.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-line bg-paper-2 px-5 py-4">
      {error && (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {!open ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null)
              const c = await candidatesFor(enquiryId)
              setList(c)
              setOpen(true)
            })
          }
        >
          {pending ? 'Searching…' : 'Assign to someone'}
        </Button>
      ) : (
        <div>
          <p className="eyebrow mb-2">
            Active registrants in this state
          </p>

          {list?.length ? (
            <ul className="mb-3 flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {list.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 rounded border border-line bg-paper-2 px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {c.name}
                    </span>
                    <span className="block font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                      {c.pincode ?? '—'}
                      {c.city ? ` · ${c.city}` : ''}
                      {` · ${c._count.pacts} PACT · ${c._count.enquiriesRecvd} enquiries`}
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        setError(null)
                        const r = await assignLeadAction(enquiryId, c.id)
                        if (r.ok) setDone(true)
                        else setError(r.error ?? 'The assignment could not be completed')
                      })
                    }
                    className="shrink-0 rounded bg-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-paper transition-colors hover:bg-brand disabled:opacity-60"
                  >
                    Assign
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-[13.5px] text-ink-2">
              No active registrant for this service was found in this state.
              Let the client know that nobody is available in their area yet.
            </p>
          )}

          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
