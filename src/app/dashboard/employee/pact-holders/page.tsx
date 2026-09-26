import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { pinWhere, territoryOf } from '@/lib/employee-panel'
import { PageHeading } from '@/components/dashboard-shell'

export const metadata: Metadata = { title: 'PACT Holders' }
export const dynamic = 'force-dynamic'

/** The PACT seats in this RM's territory — who holds them and until when. */
export default async function EmployeePactHoldersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole('RM_EMPLOYEE')
  const q = ((await searchParams).q ?? '').trim().slice(0, 60)
  const t = await territoryOf(me.id)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86_400_000)

  const pacts = await prisma.pact.findMany({
    where: {
      status: { in: ['ACTIVE', 'SUSPENDED'] },
      ...pinWhere(t),
      ...(q ? { OR: [{ pincode: { startsWith: q } }, { city: { contains: q, mode: 'insensitive' } }, { holder: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
    },
    orderBy: [{ pincode: 'asc' }],
    take: 300,
    select: {
      id: true, pincode: true, city: true, serviceType: true, subCategory: true, status: true, expiresAt: true, complaintCount: true,
      holder: { select: { name: true, email: true, mobile: true } },
      _count: { select: { leadRecipients: true } },
    },
  })

  return (
    <div className="space-y-4">
      <PageHeading title="PACT Holders" />
      <form method="get" className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-ink-3">Territory: <strong className="text-ink">{t.label}</strong> · {pacts.length} seat{pacts.length === 1 ? '' : 's'}</span>
        <input name="q" defaultValue={q} placeholder="PIN, city or holder…" className="input ml-auto h-9 w-[220px] py-0 text-[12.5px]" />
        <button type="submit" className="btn-primary px-4 py-2 text-[12.5px]">Search</button>
      </form>

      {pacts.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center text-[13.5px] text-ink-2">No PACT seats in your territory{q ? ' match' : ''}.</div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                <th className="px-4 py-2.5 font-semibold">PIN</th><th className="px-4 py-2.5 font-semibold">Service</th>
                <th className="px-4 py-2.5 font-semibold">Holder</th><th className="px-4 py-2.5 font-semibold">Leads</th>
                <th className="px-4 py-2.5 font-semibold">Valid until</th><th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {pacts.map((p) => (
                <tr key={p.id} className="text-[12.5px]">
                  <td className="px-4 py-2.5"><span className="font-mono font-semibold text-ink">{p.pincode}</span><span className="block text-[11px] text-ink-3">{p.city ?? ''}</span></td>
                  <td className="px-4 py-2.5 text-ink-2">{p.serviceType}{p.subCategory !== '-' ? ` · ${p.subCategory.replace(/-/g, ' ')}` : ''}</td>
                  <td className="px-4 py-2.5">
                    <span className="block font-medium text-ink">{p.holder?.name ?? '—'}</span>
                    <span className="block text-[11px] text-ink-3">{p.holder?.mobile ? <a href={`tel:${p.holder.mobile}`} className="text-brand">{p.holder.mobile}</a> : p.holder?.email}</span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-ink-2">{p._count.leadRecipients}{p.complaintCount > 0 && <span className="ml-1 text-[11px] text-danger">· {p.complaintCount} complaint{p.complaintCount === 1 ? '' : 's'}</span>}</td>
                  <td className={'px-4 py-2.5 ' + (p.expiresAt && p.expiresAt <= in30 ? 'font-semibold text-warn' : 'text-ink-2')}>{p.expiresAt ? p.expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                  <td className="px-4 py-2.5"><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (p.status === 'ACTIVE' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')}>{p.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
