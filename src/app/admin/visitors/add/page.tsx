import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { AddBuyerWizard } from '../add-buyer-wizard'
import { prisma } from '@/lib/prisma'
import { documentsFor, getVerificationConfig } from '@/lib/verification-config'

export const metadata: Metadata = { title: 'Add Buyer / Client' }
export const dynamic = 'force-dynamic'

export default async function AddBuyerPage() {
  await requirePermission('admin:users')
  const [staff, cfg] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 200,
    }),
    getVerificationConfig(),
  ])
  const pick = (k: 'BUYER' | 'COMPANY') => documentsFor(cfg, k).map((d) => ({ id: d.id, name: d.name, required: d.required }))
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
        <Link href="/admin/visitors" className="hover:text-brand">Buyers / Clients</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Add Buyer / Client</span>
      </nav>
      <AddBuyerWizard staff={staff} docTypes={{ BUYER: pick('BUYER'), COMPANY: pick('COMPANY') }} />
    </div>
  )
}
