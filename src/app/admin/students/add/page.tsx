import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { institutionOptions } from '@/lib/admin-students'
import { AddStudentWizard } from '../add-student-wizard'
import { documentsFor, getVerificationConfig } from '@/lib/verification-config'

export const metadata: Metadata = { title: 'Add Student' }
export const dynamic = 'force-dynamic'

export default async function AddStudentPage() {
  await requirePermission('admin:users')
  const [institutions, cfg] = await Promise.all([institutionOptions(), getVerificationConfig()])
  const docTypes = documentsFor(cfg, 'STUDENT').map((d) => ({ id: d.id, name: d.name, required: d.required }))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
          <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
          <Link href="/admin/students" className="hover:text-brand">Students</Link><span className="text-ink-4">›</span>
          <span className="font-semibold text-ink">Add Student</span>
        </nav>
        <Link href="/admin/students" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Back to Students</Link>
      </div>
      <AddStudentWizard institutions={institutions} docTypes={docTypes} />
    </div>
  )
}
