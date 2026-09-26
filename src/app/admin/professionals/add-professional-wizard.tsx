'use client'

import { LabeledField } from '@/components/admin/labeled-field'
import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { DocInputs, NotifyChannels, OneTimePassword, SendCredentials } from '@/components/admin/wizard-bits'
import { createProfessionalAction, type ProState } from './actions'

/**
 * The 7-step "Add Professional" wizard. All fields live in one form (steps are
 * shown/hidden), so the final submit posts everything — and everything is
 * saved: the account and profile, the optional details in profileExtras, the
 * documents as VerificationDocument uploads (they appear on the account page
 * for review), and the notification switches in the member's own preferences.
 */

const STEPS = [
  { n: 1, title: 'Basic Information', sub: 'Personal and contact details', icon: 'users' as IconName },
  { n: 2, title: 'Professional Details', sub: 'Expertise, experience, qualifications', icon: 'building' as IconName },
  { n: 3, title: 'Portfolio & Services', sub: 'Specialization, skills and services', icon: 'star' as IconName },
  { n: 4, title: 'Verification & Documents', sub: 'Upload and verify documents', icon: 'file' as IconName },
  { n: 5, title: 'Location & PACT', sub: 'Assign location and PACT areas', icon: 'map' as IconName },
  { n: 6, title: 'Access & Permissions', sub: 'System access and notifications', icon: 'shield' as IconName },
  { n: 7, title: 'Review & Create', sub: 'Confirm details and create', icon: 'check' as IconName },
]

const SERVICE_CATS = ['Architectural Design', 'Interior Design', 'Landscape Design', 'Structural Design', 'MEP Design', 'Project Management', 'Consultation', '3D Visualization', 'Sustainable Design', 'Renovation & Remodeling', 'Urban Planning', 'Other']
/** What a professional account can use — set by the role, shown for clarity. */
const INCLUDED = ['Dashboard', 'Projects', 'Products', 'Around Us & Blog', 'Messages', 'Leads & Enquiries', 'PACT territory', 'Membership & Plans']

const field = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const label = 'mb-1 block text-[12px] font-medium text-ink-2'
const req = <span className="text-danger"> *</span>

export function AddProfessionalWizard({ types, states, docTypes }: { types: string[]; states: string[]; docTypes: { id: string; name: string; required: boolean }[] }) {
  const [state, formAction, pending] = useActionState<ProState, FormData>(createProfessionalAction, null)
  const [step, setStep] = useState(0)
  const cur = STEPS[step]

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Professional created</h2>
        <p className="mt-1 text-[13px] text-ink-3">{state.created?.name} ({state.created?.email}) added — pending verification.{state.password ? '' : ' Login credentials were emailed.'}</p>
        <OneTimePassword password={state.password} />
        {state.note && <p className="mt-2 text-[12px] text-warn">{state.note}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/admin/professionals" className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Back to Professionals</Link>
          <Link href="/admin/professionals/add" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Add another</Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <div className="mb-4">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Add Professional</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">Create a new professional account and manage their profile, verification and permissions.</p>
      </div>

      <div className="flex items-start gap-5">
        {/* stepper */}
        <div className="w-[230px] shrink-0">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step, active = i === step
              return (
                <li key={s.n}>
                  <button type="button" onClick={() => setStep(i)} className={'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ' + (active ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-ink-4')}>
                    <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ' + (done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-paper-2 text-ink-3')}>{done ? <Icon name="check" className="h-4 w-4" /> : s.n}</span>
                    <span className="min-w-0"><span className={'block truncate text-[12.5px] font-semibold ' + (active ? 'text-brand' : 'text-ink')}>{s.title}</span><span className="block truncate text-[10.5px] text-ink-4">{s.sub}</span></span>
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
            <p className="mb-5 text-[12.5px] text-ink-3">{INTRO[step]}</p>

            {/* STEP 1 */}
            <Panel show={step === 0}>
              <Grid>
                <F label={<>Full Name{req}</>}><input name="name" placeholder="Enter full name" className={field} /></F>
                <F label={<>Email Address{req}</>}><input name="email" type="email" placeholder="professional@archfacing.com" className={field} /></F>
                <F label="Phone Number"><input name="mobile" inputMode="numeric" placeholder="Enter phone number" className={field} /></F>
                <F label="Date of Birth"><input name="dob" type="date" className={field} /></F>
                <F label="Gender"><Select name="gender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select></F>
              </Grid>
            </Panel>

            {/* STEP 2 */}
            <Panel show={step === 1}>
              <Grid cols={3}>
                <F label={<>Professional Type{req}</>}><Select name="professionType"><option value="">Select professional type</option>{types.map((t) => <option key={t}>{t}</option>)}</Select></F>
                <F label="Designation"><input name="designation" placeholder="e.g. Principal Architect" className={field} /></F>
                <F label="Years of Experience"><Select name="experience"><option value="">Select experience</option>{[1, 3, 5, 8, 10, 12, 15, 20, 25].map((y) => <option key={y} value={y}>{y} Years</option>)}</Select></F>
              </Grid>
              <Grid>
                <F label="Company / Firm Name"><input name="firmName" placeholder="Enter company or firm name" className={field} /></F>
                <F label="Registration Number (Optional)"><input name="coaNumber" placeholder="e.g. COA/12345, IIA/88765" className={field} /></F>
              </Grid>
              <F label="Short Bio"><textarea name="bio" rows={3} maxLength={300} placeholder="Write a short professional bio (max 300 characters)" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
              <Sub>Areas of Expertise</Sub>
              <Grid cols={3}>
                <F label="Primary Category"><Select name="primaryCategory"><option value="">Select primary category</option>{SERVICE_CATS.map((c) => <option key={c}>{c}</option>)}</Select></F>
                <F label="Sub Categories"><Select name="subCategory"><option value="">Select sub categories</option><option>Residential</option><option>Commercial</option><option>Hospitality</option></Select></F>
                <F label="Skills / Expertise"><input name="categories" placeholder="Sustainable Design, 3D Visualization…" className={field} /></F>
              </Grid>
            </Panel>

            {/* STEP 3 */}
            <Panel show={step === 2}>
              <Sub>Service Categories</Sub>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {SERVICE_CATS.map((c, i) => (
                  <label key={c} className="flex items-center gap-2 text-[11.5px] text-ink-2"><input type="checkbox" name="serviceCategories" value={c} defaultChecked={i < 2} className="h-3.5 w-3.5 rounded border-line accent-brand" /> {c}</label>
                ))}
              </div>
              <F label="Areas of Specialization"><input name="specialization" maxLength={300} placeholder="Select or type specialization (e.g. Residential, Commercial, Hospitality)" className={field} /></F>
              <F label="Services Offered"><textarea name="servicesOffered" rows={3} maxLength={600} placeholder="List the key services offered by the professional…" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
              <Sub>Portfolio / Past Work</Sub>
              <F label="Portfolio URL (Optional)"><input name="portfolioUrl" type="url" placeholder="https://your-portfolio-website.com" className={field} /></F>
              <p className="-mt-2 text-[11px] text-ink-4">Portfolio pieces are published by the professional as Projects from their dashboard once the account is verified.</p>
            </Panel>

            {/* STEP 4 */}
            <Panel show={step === 3}>
              <p className="mb-4 flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2.5 text-[12px] text-info"><Icon name="alert" className="h-4 w-4" /> Upload clear and valid documents. JPG, PNG, PDF. Max 5MB per document. Documents will be verified by admin.</p>
              <DocInputs types={docTypes} />
            </Panel>

            {/* STEP 5 */}
            <Panel show={step === 4}>
              <Grid cols={3}>
                <F label={<>Country{req}</>}><Select name="country"><option>India</option></Select></F>
                <F label={<>State{req}</>}><Select name="state"><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</Select></F>
                <F label={<>City{req}</>}><input name="city" placeholder="Enter city" className={field} /></F>
              </Grid>
              <F label={<>Address{req}</>}><textarea name="address" rows={2} maxLength={300} placeholder="Enter complete address" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
              <Sub>PACT Area Assignment</Sub>
              <F label="Base PIN code"><input name="pincode" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="e.g. 110024" className={field} /></F>
              <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] text-ink-3">The base PIN code places the professional in Consult Nearby. PACT territories are allotted (or bought) separately — use PACT Area Management → Assign a PACT once the account is verified.</p>
            </Panel>

            {/* STEP 6 */}
            <Panel show={step === 5}>
              <Sub>User Account</Sub>
              <Grid>
                <F label="Sign-in email"><input readOnly placeholder="The email from step 1" className={`${field} bg-paper-2`} /></F>
                <F label="Password"><input readOnly value="Auto-generated" className={`${field} bg-paper-2`} /></F>
              </Grid>
              <SendCredentials who="professional" />
              <label className="flex items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" name="featured" className="h-3.5 w-3.5 rounded border-line accent-brand" /> Feature this professional in the directory</label>
              <Sub>Included with a Professional account</Sub>
              <div className="flex flex-wrap gap-1.5">
                {INCLUDED.map((m) => <span key={m} className="rounded-pill bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">{m}</span>)}
              </div>
              <Sub>Notification Preferences</Sub>
              <NotifyChannels />
            </Panel>

            {/* STEP 7 */}
            <Panel show={step === 6}>
              <p className="mb-4 text-[12.5px] text-ink-3">Confirm all details before creating the professional account.</p>
              <div className="rounded-lg bg-paper-2 px-4 py-3 text-[12px] text-ink-3">Everything entered is saved, including the documents and notification choices. The account starts as <strong>Pending Verification</strong>; verify it from the account page once the documents check out.</div>
              {state?.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{state.error}</p>}
            </Panel>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Previous</button>
              ) : (
                <Link href="/admin/professionals" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Cancel</Link>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Next →</button>
              ) : (
                <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-ok px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"><Icon name="check" className="h-4 w-4" /> {pending ? 'Creating…' : 'Create Professional'}</button>
              )}
            </div>
          </div>
        </div>

        {/* tips rail */}
        <div className="w-[270px] shrink-0 space-y-4">
          <TipCard icon="check" tint="#2563EB" title={TIPS[step].title} items={TIPS[step].items} />
          {step === 0 && (
            <InfoCard icon="users" tint="#8B5CF6" title="Professional Types">
              <ul className="space-y-1.5 text-[11px] text-ink-2">
                {['Architect', 'Interior Designer', 'Civil Engineer', 'Contractor', 'Landscape Designer', 'Consultant', 'Structural Engineer'].map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-4" />{t}</li>)}
              </ul>
            </InfoCard>
          )}
        </div>
      </div>
    </form>
  )
}

// ── helpers ─────────────────────────────────────────────────

function Panel({ show, children }: { show: boolean; children: React.ReactNode }) { return <div className={show ? 'space-y-4' : 'hidden'}>{children}</div> }
function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) { return <div className={`grid gap-4 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{children}</div> }
function F({ label: l, children }: { label: React.ReactNode; children: React.ReactNode }) { return <LabeledField label={l} labelClassName={label}>{children}</LabeledField> }
function Select({ name, children }: { name?: string; children: React.ReactNode }) { return <select name={name} className={field}>{children}</select> }
function Sub({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-line-soft pt-4 font-display text-[13px] font-bold text-ink">{children}</h3> }
function TipCard({ icon, tint, title, items }: { icon: IconName; tint: string; title: string; items: string[] }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${tint}1A`, color: tint }}><Icon name={icon} className="h-4 w-4" /></span><h3 className="font-display text-[13px] font-bold text-ink">{title}</h3></div>
      <ul className="space-y-1.5 text-[11.5px] text-ink-2">{items.map((g) => <li key={g} className="flex items-start gap-1.5"><Icon name="check" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ok" />{g}</li>)}</ul>
    </div>
  )
}
function InfoCard({ icon, tint, title, children }: { icon: IconName; tint: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <div className="mb-2.5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${tint}1A`, color: tint }}><Icon name={icon} className="h-4 w-4" /></span><h3 className="font-display text-[13px] font-bold text-ink">{title}</h3></div>
      {children}
    </div>
  )
}

const INTRO = [
  "Enter the professional's personal and contact information.",
  "Enter professional category, experience and qualifications.",
  'Define the portfolio, specializations and services offered.',
  "Upload and verify the professional's identity and documents.",
  "Assign the professional's location and PACT areas for regional operations.",
  'Set system access, role and notification preferences.',
  'Confirm all details before creating the professional account.',
]

const TIPS: { title: string; items: string[] }[] = [
  { title: 'Professional Onboarding Guidelines', items: ['Collect complete and accurate information', 'Verify professional credentials and documents', 'Assign relevant categories and skills', 'Set location and PACT areas', 'Review information before creating', 'Professional will receive login credentials via email'] },
  { title: 'Tips for Professional Details', items: ['Mention accurate qualifications', 'Add valid license/registration number', 'Provide total years of experience', 'Write a clear professional bio'] },
  { title: 'Tips for Portfolio & Services', items: ['Select relevant service categories', 'Add key specializations', 'Describe services clearly', 'Upload high-quality portfolio images', 'Add portfolio website if available'] },
  { title: 'Document Guidelines', items: ['Upload clear and valid documents', 'Ensure all details are visible', 'Supported formats: JPG, PNG, PDF', 'Max file size: 5MB per document', 'Documents will be verified by admin'] },
  { title: 'What is PACT?', items: ['PIN Code Area Coverage Team', 'Helps in managing regional operations', 'Assign relevant PACT areas', 'Can be updated later'] },
  { title: 'Role Information', items: ['Manage their profile', 'Showcase portfolio & services', 'Receive relevant enquiries', 'Participate in projects & events', 'Access marketplace features'] },
  { title: 'Before You Create', items: ['All information is reviewed', 'Account starts as Pending Verification', 'Credentials are emailed automatically', 'Password change required on first login'] },
]
