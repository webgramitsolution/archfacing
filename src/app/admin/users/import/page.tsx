import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { can } from '@/config/permissions'
import { AdminPageHead, Panel } from '@/components/admin/parts'
import { ImportForm } from './import-form'
import type { ImportKind } from './actions'

export const metadata: Metadata = { title: 'Import Accounts' }
export const dynamic = 'force-dynamic'

const SAMPLE = `name,email,mobile,city,state,pincode,company
Asha Verma,asha@example.com,9876543210,Pune,Maharashtra,411001,Verma Design Studio`

export default async function ImportUsersPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const me = await requirePermission('admin:users')
  const k = (await searchParams).kind
  const kind: ImportKind = (['PROFESSIONAL', 'STUDENT', 'CLIENT', 'CORPORATE', 'RM_EMPLOYEE'] as const).find((x) => x === k) ?? 'PROFESSIONAL'

  return (
    <div className="space-y-5">
      <AdminPageHead title="Import Accounts" />
      <ImportForm initialKind={kind} allowStaff={can(me.role, 'admin:employees', me.permissions)} />
      <Panel title="File format">
        <p className="text-[12.5px] text-ink-2">A CSV with a header row. <strong>name</strong> and <strong>email</strong> are required; <strong>mobile</strong>, <strong>city</strong>, <strong>state</strong>, <strong>pincode</strong> and <strong>company</strong> are optional (company is required for Corporates). Rows with a registered email or mobile are skipped and listed — nothing is overwritten.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-paper-2 p-3 font-mono text-[11.5px] text-ink-2">{SAMPLE}</pre>
        <p className="mt-2 text-[11.5px] text-ink-3">Professionals, Consultants, BMFs and Corporates start as Pending Verification when Verification Settings require it. Everyone must change their password on first sign-in.</p>
      </Panel>
    </div>
  )
}
