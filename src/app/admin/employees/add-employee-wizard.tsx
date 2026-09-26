'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { GRANTABLE } from '@/config/permissions'
import { createEmployeeFullAction, type FullEmployeeState } from './actions'

/**
 * The 6-step "Add Employee" wizard. Every field lives in ONE form (steps are
 * shown/hidden, not unmounted), so the final submit posts everything at once.
 *
 * Everything here is saved by createEmployeeFullAction: account fields on the
 * User row, module permissions as real grants (User.permissions — the admin
 * sidebar and every admin page honour them), PACT areas on assignedPincodes,
 * the rest (emergency contact, reporting manager, probation, office address)
 * in profileExtras, and the documents as VerificationDocument uploads.
 */

const STEPS = [
  { n: 1, title: 'Basic Information', sub: 'Personal and contact details', icon: 'users' as IconName },
  { n: 2, title: 'Employment Details', sub: 'Role, department, reporting', icon: 'building' as IconName },
  { n: 3, title: 'Access & Permissions', sub: 'System access and modules', icon: 'shield' as IconName },
  { n: 4, title: 'PACT & Location', sub: 'Assign PACT areas and regions', icon: 'map' as IconName },
  { n: 5, title: 'Documents', sub: 'Upload verification documents', icon: 'file' as IconName },
  { n: 6, title: 'Review & Create', sub: 'Confirm details and create', icon: 'check' as IconName },
]

/** Access level presets — a quick way to tick the right modules. */
const ACCESS_PRESETS: Record<string, string[]> = {
  None: [],
  Standard: ['admin:leads'],
  High: ['admin:leads', 'admin:users', 'admin:moderate', 'admin:support'],
  'Full Access': GRANTABLE.map((g) => g.key).filter((k) => k !== 'admin:employees' && k !== 'admin:settings'),
}

const field = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const label = 'mb-1 block text-[12px] font-medium text-ink-2'
const req = <span className="text-danger"> *</span>

export function AddEmployeeWizard({
  employeeCode, departments, states, managers, docTypes, defaultLevel = 'Employee', canMakeAdmin = false, defaultGrants,
}: {
  employeeCode: string; departments: string[]; states: string[]
  managers: { id: string; name: string }[]
  docTypes: { id: string; name: string; required: boolean }[]
  defaultLevel?: string
  canMakeAdmin?: boolean
  /** From an access template (?template=…). */
  defaultGrants?: string[]
}) {
  const [state, formAction, pending] = useActionState<FullEmployeeState, FormData>(createEmployeeFullAction, null)
  const [step, setStep] = useState(0)
  const [grants, setGrants] = useState<Set<string>>(new Set(defaultGrants ?? ACCESS_PRESETS.Standard))
  const [pactMode, setPactMode] = useState<'all' | 'specific'>('specific')
  const cur = STEPS[step]

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Employee created</h2>
        <p className="mt-1 text-[13px] text-ink-3">{state.created?.name} ({state.created?.email}) has been added. Login credentials were emailed.</p>
        {state.note && <p className="mt-2 text-[12px] text-warn">{state.note}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/admin/employees" className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Back to Employees</Link>
          <Link href="/admin/employees/add" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Add another</Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction}>
      {/* header */}
      <div className="mb-4">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Add Employee</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">Create a new employee account and assign roles, departments and access permissions.</p>
      </div>

      <div className="flex items-start gap-5">
        {/* stepper */}
        <div className="w-[240px] shrink-0">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <li key={s.n}>
                  <button type="button" onClick={() => setStep(i)}
                    className={'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ' + (active ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-ink-4')}>
                    <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ' + (done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-paper-2 text-ink-3')}>
                      {done ? <Icon name="check" className="h-4 w-4" /> : s.n}
                    </span>
                    <span className="min-w-0">
                      <span className={'block truncate text-[12.5px] font-semibold ' + (active ? 'text-brand' : 'text-ink')}>{s.title}</span>
                      <span className="block truncate text-[10.5px] text-ink-4">{s.sub}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* main */}
        <div className="min-w-0 flex-1">
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <h2 className="mb-1 font-display text-[16px] font-bold text-ink">{cur.n}. {cur.title}</h2>
            <p className="mb-5 text-[12.5px] text-ink-3">{stepIntro(step)}</p>

            {/* STEP 1 */}
            <Panel show={step === 0}>
              <Grid>
                <Field label={<>Full Name{req}</>}><input name="name" placeholder="Enter full name" className={field} /></Field>
                <Field label="Employee ID"><input name="employeeCode" defaultValue={employeeCode} className={`${field} bg-paper-2`} /></Field>
                <Field label={<>Email Address{req}</>}><input name="email" type="email" placeholder="employee@archfacing.com" className={field} /></Field>
                <Field label="Phone Number"><input name="mobile" inputMode="numeric" placeholder="Enter phone number" className={field} /></Field>
                <Field label="Date of Birth"><input name="dob" type="date" className={field} /></Field>
                <Field label="Gender"><Select name="gender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select></Field>
              </Grid>
              <Sub>Address Information</Sub>
              <Grid>
                <Field label="Address Line 1"><input name="address1" maxLength={200} placeholder="House/Building No., Street, Area" className={field} /></Field>
                <Field label="Address Line 2"><input name="address2" maxLength={200} placeholder="Apartment, Landmark (Optional)" className={field} /></Field>
              </Grid>
              <Sub>Emergency Contact</Sub>
              <Grid cols={3}>
                <Field label="Emergency Contact Name"><input name="emergencyName" maxLength={80} placeholder="Enter contact name" className={field} /></Field>
                <Field label="Relationship"><Select name="emergencyRelation"><option value="">Select relationship</option><option>Parent</option><option>Spouse</option><option>Sibling</option><option>Friend</option></Select></Field>
                <Field label="Emergency Number"><input name="emergencyPhone" inputMode="numeric" maxLength={15} placeholder="Enter emergency number" className={field} /></Field>
              </Grid>
            </Panel>

            {/* STEP 2 */}
            <Panel show={step === 1}>
              <Grid cols={3}>
                <Field label="Employee Type"><Select name="employmentType"><option>Employee</option><option>Contract</option><option>Intern</option></Select></Field>
                <Field label={<>Department{req}</>}><Select name="department"><option value="">Select department</option>{departments.map((d) => <option key={d}>{d}</option>)}</Select></Field>
                <Field label={<>Designation{req}</>}><input name="designation" placeholder="e.g. Relationship Manager" className={field} /></Field>
                <Field label="Reporting Manager"><Select name="reportingManagerId"><option value="">Select reporting manager</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
                <Field label="Employee Code"><input defaultValue={employeeCode} readOnly className={`${field} bg-paper-2`} /></Field>
                <Field label="Date of Joining"><input name="joinedAt" type="date" className={field} /></Field>
              </Grid>
              <Grid cols={3}>
                <Field label="Employment Status"><Select name="employmentStatus"><option>Active</option><option>Probation</option><option>Notice Period</option></Select></Field>
                <Field label="Work Mode">
                  <div className="flex h-10 items-center gap-4">
                    {['Office', 'Hybrid', 'Remote'].map((w, i) => (
                      <label key={w} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
                        <input type="radio" name="workMode" value={w} defaultChecked={i === 0} className="accent-brand" /> {w}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Probation Period"><Select name="probation"><option value="">No probation</option><option>3 Months</option><option>6 Months</option></Select></Field>
              </Grid>
            </Panel>

            {/* STEP 3 */}
            <Panel show={step === 2}>
              <Grid>
                <Field label={<>User Role{req}</>}><select name="designationLevel" defaultValue={defaultLevel} className={field}><option value="Employee">Employee</option><option value="RM">RM</option><option value="Manager">Manager</option>{canMakeAdmin && <option value="Admin">Admin (full admin account)</option>}</select></Field>
                <Field label="Access Level">
                  <select name="accessLevel" defaultValue="Standard" onChange={(e) => setGrants(new Set(ACCESS_PRESETS[e.target.value] ?? []))} className={field}>
                    {Object.keys(ACCESS_PRESETS).map((k) => <option key={k}>{k}</option>)}
                  </select>
                </Field>
              </Grid>
              <Sub>Module Permissions</Sub>
              <p className="-mt-2 text-[11.5px] text-ink-3">Every employee has their own leads dashboard. Ticked modules also open the matching admin pages for them.</p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {GRANTABLE.map((m) => (
                  <label key={m.key} className="flex items-start gap-2 text-[11.5px] text-ink-2" title={m.hint}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={m.key}
                      checked={grants.has(m.key)}
                      onChange={() => setGrants((g) => { const n = new Set(g); if (n.has(m.key)) n.delete(m.key); else n.add(m.key); return n })}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-line accent-brand"
                    />
                    <span><span className="font-medium text-ink">{m.label}</span><span className="block text-[10.5px] text-ink-4">{m.hint}</span></span>
                  </label>
                ))}
              </div>
            </Panel>

            {/* STEP 4 */}
            <Panel show={step === 3}>
              <Grid cols={3}>
                <Field label="Primary Location"><input name="pactCode" placeholder="e.g. PACT-001" className={field} /></Field>
                <Field label="State"><Select name="state"><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="City"><input name="city" placeholder="Enter city" className={field} /></Field>
              </Grid>
              <Field label="Office Address"><textarea name="officeAddress" rows={2} maxLength={300} placeholder="Enter office address" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></Field>
              <Sub>PACT Area Assignment</Sub>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[12.5px] text-ink-2"><input type="radio" name="pactMode" value="all" checked={pactMode === 'all'} onChange={() => setPactMode('all')} className="accent-brand" /> <span><strong>All PACT Areas</strong> — manage leads for every PIN code</span></label>
                <label className="flex items-center gap-2 text-[12.5px] text-ink-2"><input type="radio" name="pactMode" value="specific" checked={pactMode === 'specific'} onChange={() => setPactMode('specific')} className="accent-brand" /> <span><strong>Specific PACT Areas</strong> — only the PIN codes below</span></label>
                {pactMode === 'specific' && (
                  <input name="pincodes" placeholder="PIN codes, comma separated — e.g. 110001, 110024, 122002" className={field} />
                )}
              </div>
              <p className="mt-2 rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] text-ink-3">The employee’s Leads dashboard shows enquiries from these PIN codes (or from every PIN code with “All PACT Areas”).</p>
            </Panel>

            {/* STEP 5 */}
            <Panel show={step === 4}>
              <p className="mb-4 flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2.5 text-[12px] text-info"><Icon name="alert" className="h-4 w-4" /> Upload clear and valid documents. JPG, PNG, PDF. Max 5MB per document.</p>
              {docTypes.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">No document types apply to staff — add them in Verification Settings.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {docTypes.map((d) => (
                    <label key={d.id} className="block">
                      <span className="mb-1 block text-[12px] font-medium text-ink-2">{d.name}{d.required && req}</span>
                      <span className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-2 px-2 text-center text-ink-4">
                        <Icon name="download" className="h-5 w-5 rotate-180" />
                        <input type="file" name={`doc_${d.id}`} accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 w-full text-[10.5px] file:mr-1 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-[10.5px] file:font-semibold" />
                        <span className="text-[9.5px]">JPG, PNG, PDF</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Panel>

            {/* STEP 6 */}
            <Panel show={step === 5}>
              <p className="mb-4 text-[12.5px] text-ink-3">Verify all details before creating the employee account.</p>
              <div className="rounded-lg bg-paper-2 px-4 py-3 text-[12px] text-ink-3">
                Everything entered is saved: the account, module permissions ({grants.size} selected), PACT areas ({pactMode === 'all' ? 'all' : 'specific PIN codes'}), emergency contact and the documents you attached. Login credentials are auto-generated and emailed; the employee must change the password on first login.
              </div>
              {state?.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{state.error}</p>}
            </Panel>

            {/* footer nav */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Previous</button>
              ) : (
                <Link href="/admin/employees" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Cancel</Link>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Next →</button>
              ) : (
                <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-ok px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  <Icon name="check" className="h-4 w-4" /> {pending ? 'Creating…' : 'Create Employee'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* right info rail — step 1 only, per the reference */}
        {step === 0 && (
          <div className="w-[280px] shrink-0 space-y-4">
            <InfoCard icon="check" tint="#2563EB" title="Employee Creation Guidelines">
              <ul className="space-y-1.5 text-[11.5px] text-ink-2">
                {['Use official company email address', 'Assign appropriate role and department', 'Set correct access permissions', 'Assign PACT areas for regional operations', 'Upload valid identity documents', 'Employee receives login credentials via email'].map((g) => (
                  <li key={g} className="flex items-start gap-1.5"><Icon name="check" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ok" />{g}</li>
                ))}
              </ul>
            </InfoCard>
            <InfoCard icon="settings" tint="#8B5CF6" title="Default Settings">
              <ul className="space-y-2 text-[11.5px]">
                {[['Status', 'Active', 'ok'], ['Initial Access Level', 'Standard', 'info'], ['Leads Dashboard', 'Yes', 'ok'], ['Credentials Email', 'Sent', 'ok'], ['Must Change Password', 'Yes', 'ok']].map(([k, v, tone]) => (
                  <li key={k} className="flex items-center justify-between"><span className="text-ink-3">{k}</span><span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-info-soft text-info'}`}>{v}</span></li>
                ))}
              </ul>
            </InfoCard>
            <InfoCard icon="file" tint="#16A34A" title="Supported Document Types">
              <ul className="space-y-1 text-[11.5px] text-ink-2">
                {(docTypes.length ? docTypes.map((d) => d.name + (d.required ? ' (required)' : '')) : ['Set up in Verification Settings']).map((d) => <li key={d} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-4" />{d}</li>)}
              </ul>
            </InfoCard>
          </div>
        )}
      </div>
    </form>
  )
}

// ── small helpers ───────────────────────────────────────────

function Panel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <div className={show ? 'space-y-4' : 'hidden'}>{children}</div>
}
function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return <div className={`grid gap-4 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{children}</div>
}
function Field({ label: l, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div><label className={label}>{l}</label>{children}</div>
}
function Select({ name, children }: { name?: string; children: React.ReactNode }) {
  return <select name={name} className={field}>{children}</select>
}
function Sub({ children }: { children: React.ReactNode }) {
  return <h3 className="border-t border-line-soft pt-4 font-display text-[13px] font-bold text-ink">{children}</h3>
}
function InfoCard({ icon, tint, title, children }: { icon: IconName; tint: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${tint}1A`, color: tint }}><Icon name={icon} className="h-4 w-4" /></span>
        <h3 className="font-display text-[13px] font-bold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}
function stepIntro(step: number): string {
  return [
    "Enter the employee's personal and contact information.",
    "Define the employee's professional information and work details.",
    'Assign system access, roles and module permissions.',
    'Assign PACT areas, operational regions and work location.',
    'Upload and verify employee documents.',
    'Review all details before creating the employee account.',
  ][step]
}
