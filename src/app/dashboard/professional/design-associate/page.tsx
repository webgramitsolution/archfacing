import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { BUSINESS_RULES } from '@/config/permissions'
import { daSummary } from '@/lib/design-associate'
import { formatINR } from '@/lib/utils'
import { DaApplyForm } from './apply-form'

export const metadata: Metadata = { title: 'Become a Design Associate' }
export const dynamic = 'force-dynamic'

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const INVOICE_PILL: Record<string, string> = { PAID: 'pill-ok', ISSUED: 'pill-info', OVERDUE: 'pill-warn' }

/** §3.1.7 / §5.2.15 — eligibility, the application, and once approved, the DA's invoices. */
export default async function DesignAssociatePage() {
  const me = await requireRole('PROFESSIONAL')
  const [u, summary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: { status: true, professionalProfile: { select: { isVerified: true } }, _count: { select: { pacts: { where: { status: 'ACTIVE' } } } } },
    }),
    daSummary(me.id),
  ])
  const checks = [
    { ok: u?.status === 'ACTIVE' && !!u?.professionalProfile?.isVerified, label: 'Verified Designa / Designi account', fix: { href: '/dashboard/settings/documents', text: 'Upload documents' } },
    { ok: (u?._count.pacts ?? 0) > 0, label: 'At least one active PACT', fix: { href: '/dashboard/professional/pact', text: 'Get a PACT' } },
  ]
  const eligible = checks.every((c) => c.ok)
  const share = BUSINESS_RULES.DA_REVENUE_SHARE_PERCENT

  return (
    <div className="space-y-5">
      <PageHeading title={summary ? 'Design Associate' : 'Become a Design Associate'} />

      {summary ? (
        <>
          <section className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-ink-3">Your DA code</p>
                <p className="tabular font-mono text-[20px] font-bold text-ink">{summary.da.daCode}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">{summary.da.daEmail}</p>
              </div>
              <span className={summary.da.approvedAt ? 'pill-ok' : 'pill-warn'}>{summary.da.approvedAt ? `Approved ${fmt(summary.da.approvedAt)}` : 'KYC under review'}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px] md:grid-cols-4">
              <div><dt className="text-ink-3">Revenue share</dt><dd className="font-semibold text-ink">{Number(summary.da.revenueShare)}% to you</dd></div>
              <div><dt className="text-ink-3">Club membership</dt><dd className="font-semibold text-ink">until {fmt(summary.da.clubValidTill)}</dd></div>
              <div><dt className="text-ink-3">Earned</dt><dd className="tabular font-semibold text-ink">{formatINR(summary.totals.earned)}</dd></div>
              <div><dt className="text-ink-3">Settled</dt><dd className="tabular font-semibold text-ink">{formatINR(summary.totals.settled)}</dd></div>
            </dl>
            {summary.da.slug && (
              <Link href={`/designers-associates/${summary.da.slug}`} className="mt-4 inline-block text-[12.5px] font-semibold text-brand hover:underline">View your public DA page →</Link>
            )}
          </section>

          <section className="card overflow-x-auto">
            <h2 className="px-5 pt-4 font-display text-[15px] font-bold text-navy">Invoices</h2>
            {summary.da.invoices.length === 0 ? (
              <p className="px-5 pb-6 pt-2 text-[13px] text-ink-3">No invoices yet. Projects assigned through ArchFacing are invoiced on the 1st of each month.</p>
            ) : (
              <table className="mt-3 w-full min-w-[680px] text-[13px]">
                <thead>
                  <tr className="border-y border-line bg-paper-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                    <th className="px-4 py-2.5">Invoice</th><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Gross</th>
                    <th className="px-4 py-2.5">Your share</th><th className="px-4 py-2.5">Due</th><th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.da.invoices.map((i) => (
                    <tr key={i.id} className="border-b border-line-soft last:border-0">
                      <td className="tabular px-4 py-3 font-mono text-[12px] text-ink">{i.invoiceNumber}</td>
                      <td className="px-4 py-3 text-ink-2">{i.clientName}</td>
                      <td className="tabular px-4 py-3 text-ink-2">{formatINR(Number(i.grossAmount))}</td>
                      <td className="tabular px-4 py-3 font-semibold text-ink">{formatINR(Number(i.daShare))}</td>
                      <td className="px-4 py-3 text-[12px] text-ink-3">{fmt(i.dueOn)}</td>
                      <td className="px-4 py-3"><span className={INVOICE_PILL[i.status] ?? 'pill-muted'}>{i.status.toLowerCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="card p-5 md:p-6">
            <h2 className="font-display text-[16px] font-bold text-navy">What a Design Associate gets</h2>
            <ul className="mt-3 grid gap-2 text-[13px] text-ink-2 md:grid-cols-3">
              <li className="rounded-card bg-paper-2 p-3"><strong className="block text-ink">{share}% of every project</strong>ArchFacing keeps {100 - share}% for projects it assigns to you.</li>
              <li className="rounded-card bg-paper-2 p-3"><strong className="block text-ink">{BUSINESS_RULES.DA_FREE_CLUB_YEARS} years of Club membership</strong>Free, from the day you are approved.</li>
              <li className="rounded-card bg-paper-2 p-3"><strong className="block text-ink">A DA code and email</strong>Your own reference for clients in your PACT area.</li>
            </ul>
          </section>

          <section className="card p-5 md:p-6">
            <h2 className="font-display text-[16px] font-bold text-navy">Eligibility</h2>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft px-3.5 py-2.5 text-[13px]">
                  <span className={c.ok ? 'pill-ok' : 'pill-warn'}>{c.ok ? 'Done' : 'Needed'}</span>
                  <span className="flex-1 text-ink">{c.label}</span>
                  {!c.ok && <Link href={c.fix.href} className="text-[12px] font-semibold text-brand hover:underline">{c.fix.text} →</Link>}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line-soft pt-5">
              <DaApplyForm disabled={!eligible} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
