import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { formatINR } from '@/lib/utils'
import { unroutedLeads } from '../actions'
import { LeadAssigner } from './lead-assigner'
import { MyLeadControl } from './my-lead-control'

export const metadata: Metadata = { title: 'Assigned Leads' }
export const dynamic = 'force-dynamic'

/**
 * Three views:
 *   Assigned to me — leads an admin handed this RM (Enquiry.employeeId),
 *                    worked from here: status and notes.
 *   Unrouted       — enquiries in the RM's territory with no PACT holder;
 *                    the RM assigns each to a registrant nearby.
 *   Done           — what this RM converted or closed.
 */
const TABS = [
  { key: 'mine', label: 'Assigned to me' },
  { key: 'unrouted', label: 'Unrouted in my area' },
  { key: 'done', label: 'Done' },
] as const

export default async function EmployeeLeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireRole('RM_EMPLOYEE')
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? 'mine'

  const [mineCount, doneCount, unrouted, rows] = await Promise.all([
    prisma.enquiry.count({ where: { employeeId: me.id, status: { notIn: ['CONVERTED', 'CLOSED'] } } }),
    prisma.enquiry.count({ where: { employeeId: me.id, status: { in: ['CONVERTED', 'CLOSED'] } } }),
    unroutedLeads(),
    tab === 'unrouted'
      ? Promise.resolve([])
      : prisma.enquiry.findMany({
          where: { employeeId: me.id, status: tab === 'done' ? { in: ['CONVERTED', 'CLOSED'] } : { notIn: ['CONVERTED', 'CLOSED'] } },
          orderBy: { updatedAt: 'desc' },
          take: 100,
          select: { id: true, subject: true, message: true, pincode: true, city: true, serviceType: true, subCategory: true, contactName: true, contactPhone: true, contactEmail: true, budget: true, status: true, createdAt: true },
        }),
  ])
  const count = { mine: mineCount, unrouted: unrouted.length, done: doneCount }
  const list = tab === 'unrouted' ? unrouted : rows

  return (
    <div className="space-y-4">
      <PageHeading title="Leads" />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === 'mine' ? '/dashboard/employee/leads' : `/dashboard/employee/leads?tab=${t.key}`}
            className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium ' + (tab === t.key ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4')}>
            {t.label} <span className={tab === t.key ? 'text-white/70' : 'text-ink-4'}>{count[t.key]}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium">All caught up</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {tab === 'mine' ? 'No leads are assigned to you.' : tab === 'unrouted' ? 'No enquiries in your area are waiting for a holder.' : 'Nothing converted or closed yet.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((lead) => (
            <li key={lead.id} className="overflow-hidden rounded-card border border-line border-l-[3px] border-l-brand bg-paper-2">
              <div className="p-5">
                <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-[14px] font-semibold">{lead.pincode}</span>
                  <h2 className="font-display text-[15px] font-semibold">{lead.subject}</h2>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink-3">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="mb-3 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{lead.message}</p>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                  <span>{lead.serviceType}</span>
                  {lead.subCategory && <span>{lead.subCategory.replace(/-/g, ' ')}</span>}
                  <span>{lead.contactName}</span>
                  <a href={`tel:${lead.contactPhone}`} className="text-brand">{lead.contactPhone}</a>
                  {'contactEmail' in lead && lead.contactEmail && <span className="normal-case">{lead.contactEmail}</span>}
                  {lead.budget != null && <span className="text-ink-2">{formatINR(Number(lead.budget))}</span>}
                  {tab !== 'unrouted' && <span className="text-ink-2">{lead.status.replace('_', ' ')}</span>}
                </dl>
              </div>
              {tab === 'unrouted' ? <LeadAssigner enquiryId={lead.id} /> : tab === 'mine' ? <MyLeadControl id={lead.id} status={lead.status} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
