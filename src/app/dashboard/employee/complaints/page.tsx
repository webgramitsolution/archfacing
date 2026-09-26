import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { openComplaintsIn, territoryOf } from '@/lib/employee-panel'
import { PageHeading } from '@/components/dashboard-shell'
import { ReviewForm } from './review-form'

export const metadata: Metadata = { title: 'Complaints' }
export const dynamic = 'force-dynamic'

/**
 * Open complaints about PACT holders in this RM's territory. The RM looks
 * into each and records a finding; the admins resolve or dismiss them on the
 * Trust page, because complaints count towards PACT cessation.
 */
export default async function EmployeeComplaintsPage() {
  const me = await requireRole('RM_EMPLOYEE')
  const t = await territoryOf(me.id)
  const list = await openComplaintsIn(t)

  return (
    <div className="space-y-4">
      <PageHeading title="Complaints" />
      <p className="text-[12.5px] text-ink-3">Territory: <strong className="text-ink">{t.label}</strong> · {list.length} open</p>
      {list.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center text-[13.5px] text-ink-2">No open complaints in your area.</div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((c) => (
            <li key={c.id} className="overflow-hidden rounded-card border border-line border-l-[3px] border-l-danger bg-paper-2">
              <div className="p-5">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-display text-[15px] font-semibold">{c.reason}</h2>
                  <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (c.status === 'OPEN' ? 'bg-warn-soft text-warn' : 'bg-info-soft text-info')}>{c.status === 'OPEN' ? 'Open' : 'Under review'}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink-3">{c.createdAt.toLocaleDateString('en-IN')}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{c.details}</p>
                <p className="mt-2 text-[12px] text-ink-3">
                  About <strong className="text-ink">{c.against.name}</strong>
                  {c.against.mobile ? <> · <a href={`tel:${c.against.mobile}`} className="text-brand">{c.against.mobile}</a></> : ` · ${c.against.email}`}
                  {' · '}raised by {c.by.name}
                </p>
              </div>
              {c.status === 'OPEN' && <ReviewForm id={c.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
