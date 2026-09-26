import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { INDIAN_STATES } from '@/config/states'
import { nextEmployeeCode, employeeDepartments } from '@/lib/admin-employees'
import { AddEmployeeWizard } from '../add-employee-wizard'
import { ACCESS_TEMPLATES } from '@/config/permissions'
import { prisma } from '@/lib/prisma'
import { documentsFor, getVerificationConfig } from '@/lib/verification-config'

export const metadata: Metadata = { title: 'Add Employee' }
export const dynamic = 'force-dynamic'

const DEFAULT_DEPTS = [
  'Sales', 'Business Development', 'Content & Marketing', 'Operations', 'Customer Support',
  'Advertisement', 'Membership', 'Finance', 'HR', 'IT & System',
]

export default async function AddEmployeePage({ searchParams }: { searchParams: Promise<{ level?: string; template?: string }> }) {
  const me = await requirePermission('admin:employees')
  const sp = await searchParams
  const level = sp.level === 'Admin' && me.role === 'SUPER_ADMIN' ? 'Admin' : 'Employee'
  const template = ACCESS_TEMPLATES.find((t) => t.key === sp.template)
  const [code, existing, managers, cfg] = await Promise.all([
    nextEmployeeCode(),
    employeeDepartments(),
    prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE'] }, status: 'ACTIVE', deletedAt: null },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
      take: 200,
    }),
    getVerificationConfig(),
  ])
  const docTypes = documentsFor(cfg, 'ALL').map((d) => ({ id: d.id, name: d.name, required: d.required }))
  const departments = Array.from(new Set([...DEFAULT_DEPTS, ...existing]))

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
        <Link href="/admin/employees" className="hover:text-brand">Employees</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">Add Employee</span>
      </nav>
      <AddEmployeeWizard employeeCode={code} departments={departments} states={[...INDIAN_STATES]} managers={managers} docTypes={docTypes} defaultLevel={level} canMakeAdmin={me.role === 'SUPER_ADMIN'} defaultGrants={template?.keys} />
    </div>
  )
}
