import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel, ago } from '@/components/admin/parts'
import { DataTable, Td, EmptyState } from '@/components/ui'
import { BUSINESS_RULES } from '@/config/permissions'
import { ComplaintDecision, FileComplaintForm } from './complaint-forms'

export const metadata: Metadata = { title: 'Trust & Safety' }
export const dynamic = 'force-dynamic'

/**
 * PDF §3.1.8.5 — cessation at 5 complaints. This page is where the Design
 * Cell's work lives: open complaints, PACT holders approaching the limit,
 * and territories already suspended.
 */

const COMPLAINT_PILL: Record<string, string> = {
  OPEN: 'pill-warn',
  UNDER_REVIEW: 'pill-info',
  RESOLVED: 'pill-ok',
  DISMISSED: 'pill-muted',
}

const MAX = BUSINESS_RULES.PACT_MAX_COMPLAINTS

export default async function TrustPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  await requirePermission('admin:audit')
  const ticketId = (await searchParams).ticket
  // "File as a complaint" from a support ticket prefills the form.
  const ticket = ticketId && /^[a-z0-9]{10,40}$/i.test(ticketId)
    ? await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, subject: true, message: true, user: { select: { email: true } } } })
    : null

  const [open, underReview, nearLimit, suspended, complaints, suspendedPacts] = await Promise.all([
    prisma.complaint.count({ where: { status: 'OPEN' } }),
    prisma.complaint.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.pact.count({ where: { status: 'ACTIVE', complaintCount: { gte: MAX - 1 } } }),
    prisma.pact.count({ where: { status: 'SUSPENDED' } }),
    prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        against: { select: { id: true, name: true, email: true } },
        by: { select: { name: true } },
      },
    }),
    prisma.pact.findMany({
      where: { status: 'SUSPENDED' },
      orderBy: { suspendedAt: 'desc' },
      take: 10,
      include: { holder: { select: { name: true, email: true } } },
    }),
  ])
  const pactIds = complaints.map((c) => c.pactId).filter((x): x is string => !!x)
  const pins = new Map(
    (pactIds.length ? await prisma.pact.findMany({ where: { id: { in: pactIds } }, select: { id: true, pincode: true, complaintCount: true } }) : [])
      .map((p) => [p.id, p]),
  )

  return (
    <div className="space-y-5">
      <div className="rise">
        <AdminPageHead title="Trust & safety">
          Complaints, the 5-complaint PACT cessation rule, and suspended
          territories — the Design Cell&rsquo;s desk.
        </AdminPageHead>
      </div>

      <section className="rise rise-1 grid grid-cols-4 gap-4">
        <MiniStat
          icon="alert" label="Open complaints" value={open}
          tint={open > 0 ? { bg: '#FEF2E2', fg: '#EA9412' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint={open > 0 ? 'waiting on the Design Cell' : 'nothing open'}
        />
        <MiniStat icon="eye" label="Under review" value={underReview} tint={{ bg: '#E4EEFF', fg: '#2563EB' }} />
        <MiniStat
          icon="shield" label="Holders near limit" value={nearLimit}
          tint={nearLimit > 0 ? { bg: '#FFE9EC', fg: '#E11D48' } : { bg: '#E7F7EE', fg: '#16A34A' }}
          hint={`at ${MAX - 1} of ${MAX} upheld complaints`}
        />
        <MiniStat icon="map" label="Suspended PACTs" value={suspended} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} />
      </section>

      <div className="rise rise-2 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <Panel title={`Complaints — ${complaints.length} shown, newest first`}>
            {complaints.length === 0 ? (
              <EmptyState icon="check" title="No complaints">
                Nothing has been filed against any seller or PACT holder. Log one from a support ticket or with the form on the right.
              </EmptyState>
            ) : (
              <DataTable bare head={['Against', 'Filed by', 'Reason', 'PACT', 'Status', 'When', 'Action']}>
                {complaints.map((c) => (
                  <tr key={c.id} className="row-hover">
                    <Td>
                      <a href={`/admin/users/${c.against.id}`} className="block text-[13px] font-medium text-ink hover:text-brand">{c.against.name}</a>
                      <span className="block text-[11.5px] text-ink-3">{c.against.email}</span>
                    </Td>
                    <Td className="text-[12.5px] text-ink-2">{c.by.name}</Td>
                    <Td>
                      <span className="block max-w-[240px] truncate text-[12.5px] text-ink-2" title={c.details}>{c.reason}</span>
                      {c.resolution && (
                        <span className="block max-w-[240px] truncate text-[11px] text-ink-4">→ {c.resolution}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-ink-2">
                      {c.pactId && pins.get(c.pactId) ? (
                        <><span className="tabular font-mono">{pins.get(c.pactId)!.pincode}</span> <span className="text-ink-4">· {pins.get(c.pactId)!.complaintCount}/{MAX}</span></>
                      ) : <span className="text-ink-4">All held</span>}
                    </Td>
                    <Td>
                      <span className={COMPLAINT_PILL[c.status] ?? 'pill-muted'}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-ink-3">{ago(c.createdAt)}</Td>
                    <Td><ComplaintDecision id={c.id} status={c.status} /></Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </div>

        <div className="w-[300px] shrink-0 space-y-5">
          <Panel title={ticket ? 'Log complaint from ticket' : 'Log a complaint'}>
            <FileComplaintForm prefill={ticket ? { ticketId: ticket.id, byEmail: ticket.user.email, reason: ticket.subject.slice(0, 150), details: ticket.message } : undefined} />
          </Panel>
          <Panel title="Suspended territories">
            {suspendedPacts.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-ink-3">No territory is suspended.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {suspendedPacts.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="tabular font-mono text-[12.5px] font-semibold text-ink">{p.pincode}</span>
                      <span className="text-[11px] text-ink-4">{p.serviceType}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-2">{p.holder?.name}</p>
                    {p.suspensionReason && (
                      <p className="mt-0.5 text-[11px] leading-snug text-warn">{p.suspensionReason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] leading-snug text-ink-3">
              A PACT suspends at {MAX} upheld complaints (immediately, when the
              deciding complaint is upheld) or after {BUSINESS_RULES.PACT_INACTIVITY_DAYS} days without a response. Dismissed complaints never count.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
