'use client'

import { useState, useTransition } from 'react'
import { replyAction, closeEnquiryAction } from '@/app/dashboard/enquiry-actions'
import { Button, Alert } from '@/components/form'
import { formatINR } from '@/lib/utils'

type Response = {
  id: string
  senderId: string
  message: string
  createdAt: Date
}

export type ThreadEnquiry = {
  id: string
  pincode: string
  serviceType: string
  subCategory: string | null
  subject: string
  message: string
  /**
   * A plain number, never a Prisma `Decimal` — the queries convert it before
   * the row crosses into this component. React cannot serialise a Decimal.
   */
  budget: number | null
  contactName: string
  contactPhone: string
  contactEmail: string | null
  status: string
  createdAt: Date
  responses: Response[]
}

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  NEW: { text: 'New', tone: 'text-brand' },
  ASSIGNED: { text: 'Assigned', tone: 'text-info' },
  IN_PROGRESS: { text: 'In progress', tone: 'text-info' },
  RESPONDED: { text: 'Replied', tone: 'text-ok' },
  CONVERTED: { text: 'Won', tone: 'text-ok' },
  CLOSED: { text: 'Closed', tone: 'text-ink-3' },
  UNROUTED: { text: 'Unassigned', tone: 'text-brand' },
}

export function EnquiryThread({
  enquiry,
  myId,
  /** whether we are viewing from the holder's side or the client's */
  side,
  counterpartName,
}: {
  enquiry: ThreadEnquiry
  myId: string
  side: 'holder' | 'client'
  counterpartName?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const status = STATUS_LABEL[enquiry.status] ?? {
    text: enquiry.status,
    tone: 'text-ink-3',
  }
  const isClosed = enquiry.status === 'CLOSED' || enquiry.status === 'CONVERTED'

  return (
    <li className="overflow-hidden rounded-card border border-line bg-paper-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-paper-2"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[13px] font-semibold">
            {enquiry.pincode}
          </span>
          <span className="font-display text-[15px] font-semibold">
            {enquiry.subject}
          </span>
          <span
            className={`ml-auto font-mono text-[10px] uppercase tracking-wider ${status.tone}`}
          >
            {status.text}
          </span>
        </div>

        <p className="line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
          {enquiry.message}
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
          <span>{enquiry.serviceType}</span>
          {enquiry.subCategory && (
            <span>{enquiry.subCategory.replace(/-/g, ' ')}</span>
          )}
          {counterpartName && <span>{counterpartName}</span>}
          <span>{new Date(enquiry.createdAt).toLocaleDateString('en-IN')}</span>
          {enquiry.responses.length > 0 && (
            <span className="text-brand">{enquiry.responses.length} replies</span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-paper-2 p-4">
          {/* contact — visible to the holder only */}
          {side === 'holder' && (
            <dl className="mb-4 overflow-hidden rounded border border-line bg-paper-2 text-[13px]">
              <Row k="Name" v={enquiry.contactName} />
              <Row k="Mobile" v={enquiry.contactPhone} mono />
              {enquiry.contactEmail && <Row k="Email" v={enquiry.contactEmail} />}
              {enquiry.budget != null && (
                <Row k="Budget" v={formatINR(Number(enquiry.budget))} mono />
              )}
            </dl>
          )}

          {/* conversation */}
          <ul className="mb-4 flex flex-col gap-2">
            <li className="rounded border border-line bg-paper-2 px-3.5 py-2.5">
              <p className="eyebrow mb-1">
                {side === 'holder' ? 'Client' : 'You'}
              </p>
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                {enquiry.message}
              </p>
            </li>

            {enquiry.responses.map((r) => (
              <li
                key={r.id}
                className={`rounded border px-3.5 py-2.5 ${
                  r.senderId === myId
                    ? 'border-brand bg-brand-soft'
                    : 'border-line bg-paper-2'
                }`}
              >
                <p className="eyebrow mb-1">
                  {r.senderId === myId ? 'You' : (counterpartName ?? 'Other party')}
                  {' · '}
                  {new Date(r.createdAt).toLocaleDateString('en-IN')}
                </p>
                <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                  {r.message}
                </p>
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {isClosed ? (
            <p className="text-[13px] text-ink-3">This enquiry has been closed.</p>
          ) : (
            <>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your reply…"
                className="mb-3 w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={pending || !text.trim()}
                  onClick={() =>
                    start(async () => {
                      setError(null)
                      const r = await replyAction(enquiry.id, text)
                      if (r.ok) setText('')
                      else setError(r.error ?? 'Could not send')
                    })
                  }
                >
                  {pending ? 'Sending…' : 'Send reply'}
                </Button>

                {side === 'holder' && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await closeEnquiryAction(enquiry.id, true)
                        })
                      }
                    >
                      Mark as won
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await closeEnquiryAction(enquiry.id, false)
                        })
                      }
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-4 border-b border-line-soft px-3.5 py-2 last:border-0">
      <dt className="w-20 shrink-0 text-ink-3">{k}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink'}>{v}</dd>
    </div>
  )
}
