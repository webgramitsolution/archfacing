import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { INDIAN_STATES } from '@/config/states'
import { AddCorporateWizard } from '../add-corporate-wizard'
import { documentsFor, getVerificationConfig } from '@/lib/verification-config'

export const metadata: Metadata = { title: 'Join as a Corporate' }
export const dynamic = 'force-dynamic'

export default async function AddCorporatePage() {
  await requirePermission('admin:users')
  const cfg = await getVerificationConfig()
  const pick = (k: 'CORPORATE' | 'BMF') =>
    [...documentsFor(cfg, k), ...documentsFor(cfg, 'COMPANY').filter((d) => d.appliesTo === 'COMPANY')]
      .filter((d, i, a) => a.findIndex((x) => x.id === d.id) === i)
      .map((d) => ({ id: d.id, name: d.name, required: d.required }))
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/corporates" className="hover:text-brand">Corporates &amp; BMFs</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Join Corporate</span>
      </nav>
      <AddCorporateWizard states={[...INDIAN_STATES]} docTypes={{ CORPORATE: pick('CORPORATE'), BMF: pick('BMF') }} />
    </div>
  )
}
