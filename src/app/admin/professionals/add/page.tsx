import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { INDIAN_STATES } from '@/config/states'
import { professionTypes } from '@/lib/admin-professionals'
import { AddProfessionalWizard } from '../add-professional-wizard'
import { documentsFor, getVerificationConfig } from '@/lib/verification-config'

export const metadata: Metadata = { title: 'Add Professional' }
export const dynamic = 'force-dynamic'

const DEFAULT_TYPES = ['Architect', 'Interior Designer', 'Civil Engineer', 'Contractor', 'Landscape Designer', 'Consultant', 'Structural Engineer', 'Urban Planner', 'MEP Consultant', 'Heritage Architect', 'Other']

export default async function AddProfessionalPage() {
  await requirePermission('admin:users')
  const [existing, cfg] = await Promise.all([professionTypes(), getVerificationConfig()])
  const docTypes = documentsFor(cfg, 'PROFESSIONAL').map((d) => ({ id: d.id, name: d.name, required: d.required }))
  const types = Array.from(new Set([...DEFAULT_TYPES, ...existing]))

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/professionals" className="hover:text-brand">Professionals</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Add Professional</span>
      </nav>
      <AddProfessionalWizard types={types} states={[...INDIAN_STATES]} docTypes={docTypes} />
    </div>
  )
}
