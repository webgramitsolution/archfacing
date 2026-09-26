import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead, MiniStat, Panel, ago } from '@/components/admin/parts'
import { DataTable, Td, EmptyState } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { DaDecision } from './da-controls'

export const metadata: Metadata = { title: 'Design Associates' }
export const dynamic = 'force-dynamic'

/** §3.1.7 — applications waiting on KYC, and every approved associate with their earnings. */
export default async function AdminDesignAssociatesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePermission('admin:users')
  const tab = (await searchParams).tab === 'approved' ? 'approved' : 'pending'

  const [pending, approved, invoiceAgg, rows] = await Promise.all([
    prisma.designAssociate.count({ where: { approvedAt: null } }),
    prisma.designAssociate.count({ where: { approvedAt: { not: null } } }),
    prisma.daInvoice.aggregate({ _sum: { grossAmount: true, afShare: true } }),
    prisma.designAssociate.findMany({
      where: tab === 'pending' ? { approvedAt: null } : { approvedAt: { not: null } },
      orderBy: tab === 'pending' ? { createdAt: 'asc' } : { approvedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, city: true, state: true, professionalProfile: { select: { firmName: true, isVerified: true } }, _count: { select: { pacts: { where: { status: 'ACTIVE' } } } } } },
        _count: { select: { invoices: true } },
      },
    }),
  ])

  return (
    <div className="space-y-5">
      <AdminPageHead title="Design Associates" />
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat icon="clock" label="Waiting for KYC" value={pending} tint={pending ? { bg: '#FEF2E2', fg: '#EA9412' } : { bg: '#E7F7EE', fg: '#16A34A' }} />
        <MiniStat icon="shield" label="Approved associates" value={approved} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} />
        <MiniStat icon="rupee" label="Project value invoiced" value={formatINR(Number(invoiceAgg._sum.grossAmount ?? 0))} tint={{ bg: '#EAF2FF', fg: '#2563EB' }} />
        <MiniStat icon="coins" label="ArchFacing share" value={formatINR(Number(invoiceAgg._sum.afShare ?? 0))} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} />
      </section>

      <nav className="flex gap-1.5">
        {(['pending', 'approved'] as const).map((t) => (
          <Link key={t} href={t === 'pending' ? '/admin/design-associates' : '/admin/design-associates?tab=approved'} className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium ' + (tab === t ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2')}>
            {t === 'pending' ? `Pending ${pending}` : `Approved ${approved}`}
          </Link>
        ))}
      </nav>

      <Panel title={tab === 'pending' ? 'Applications — oldest first' : 'Approved associates'}>
        {rows.length === 0 ? (
          <EmptyState icon="shield" title={tab === 'pending' ? 'No applications waiting' : 'No approved associates yet'}>
            Verified professionals with an active PACT apply from their dashboard.
          </EmptyState>
        ) : (
          <DataTable bare head={['Professional', 'DA code', 'PAN / GST', 'Checks', tab === 'pending' ? 'Applied' : 'Invoices', '']}>
            {rows.map((d) => (
              <tr key={d.id} className="row-hover">
                <Td>
                  <Link href={`/admin/users/${d.user.id}`} className="block text-[13px] font-medium text-ink hover:text-brand">{d.user.name}</Link>
                  <span className="block text-[11.5px] text-ink-3">{d.user.professionalProfile?.firmName ?? d.user.email}{d.user.city ? ` · ${d.user.city}` : ''}</span>
                </Td>
                <Td className="tabular font-mono text-[12px] text-ink-2">{d.daCode}</Td>
                <Td className="tabular font-mono text-[11.5px] text-ink-2">{d.panNumber ?? '—'}<span className="block text-ink-4">{d.gstNumber ?? 'no GST'}</span></Td>
                <Td className="text-[11.5px]">
                  <span className={d.user.professionalProfile?.isVerified ? 'text-ok' : 'text-danger'}>{d.user.professionalProfile?.isVerified ? '✓ verified' : '✗ not verified'}</span>
                  <span className={'block ' + (d.user._count.pacts ? 'text-ok' : 'text-danger')}>{d.user._count.pacts ? `✓ ${d.user._count.pacts} active PACT` : '✗ no active PACT'}</span>
                </Td>
                <Td className="text-[12px] text-ink-3">{tab === 'pending' ? ago(d.createdAt) : d._count.invoices}</Td>
                <Td>
                  {tab === 'pending' ? <DaDecision id={d.id} /> : d.slug ? (
                    <Link href={`/designers-associates/${d.slug}`} className="text-[12px] font-semibold text-brand hover:underline">Public page</Link>
                  ) : null}
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  )
}
