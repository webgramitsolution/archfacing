'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { DocInputs, OneTimePassword, SendCredentials } from '@/components/admin/wizard-bits'
import { createCorporateAction, type CorpState } from './actions'

/**
 * The 6-step "Join as a Corporate" wizard. All fields live in one form (steps
 * shown/hidden), so the final submit posts everything — and everything is
 * saved: the company account and profile (CORPORATE or BMF), industry,
 * registration numbers, both addresses and the contacts in profileExtras, and
 * the documents as VerificationDocument uploads for review.
 */

const STEPS = [
  { n: 1, title: 'Company Details', sub: 'Basic company information', icon: 'building' as IconName },
  { n: 2, title: 'Business Information', sub: 'Industry and registration', icon: 'file' as IconName },
  { n: 3, title: 'Address & Location', sub: 'Office addresses', icon: 'map' as IconName },
  { n: 4, title: 'Contact Persons', sub: 'Primary and secondary contacts', icon: 'users' as IconName },
  { n: 5, title: 'Documents', sub: 'Upload verification documents', icon: 'download' as IconName },
  { n: 6, title: 'Review & Submit', sub: 'Confirm details and create', icon: 'check' as IconName },
]

const INDUSTRIES = ['Construction', 'Building Materials', 'Real Estate', 'Interior & Design', 'Architecture', 'Engineering', 'Manufacturing', 'Furniture & Furnishing', 'MEP & Services', 'Other']

const field = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const label = 'mb-1 block text-[12px] font-medium text-ink-2'
const req = <span className="text-danger"> *</span>

type DocT = { id: string; name: string; required: boolean }
export function AddCorporateWizard({ states, docTypes }: { states: string[]; docTypes: { CORPORATE: DocT[]; BMF: DocT[] } }) {
  const [state, formAction, pending] = useActionState<CorpState, FormData>(createCorporateAction, null)
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<'CORPORATE' | 'BMF'>('CORPORATE')
  const [second, setSecond] = useState(false)
  const cur = STEPS[step]

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Application submitted</h2>
        <p className="mt-1 text-[13px] text-ink-3">{state.created?.name} ({state.created?.email}) added — pending verification.{state.password ? '' : ' Login credentials were emailed.'}</p>
        <OneTimePassword password={state.password} />
        {state.note && <p className="mt-2 text-[12px] text-warn">{state.note}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/admin/corporates" className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Back to Corporates</Link>
          <Link href="/admin/corporates/add" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Add another</Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <div className="mb-4">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Join as a Corporate</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">Register your company to connect with professionals, showcase your projects, and grow your business on ArchFacing.</p>
      </div>

      {/* top stepper (horizontal, as the reference) */}
      <ol className="mb-5 flex items-center gap-1 rounded-card border border-line bg-white p-3 shadow-card">
        {STEPS.map((s, i) => {
          const done = i < step, active = i === step
          return (
            <li key={s.n} className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => setStep(i)} className="flex items-center gap-2">
                <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ' + (done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-paper-2 text-ink-3')}>{done ? <Icon name="check" className="h-3.5 w-3.5" /> : s.n}</span>
                <span className={'hidden text-[11.5px] font-semibold lg:block ' + (active ? 'text-brand' : done ? 'text-ink' : 'text-ink-4')}>{s.title}</span>
              </button>
              {i < STEPS.length - 1 && <span className={'h-px flex-1 ' + (done ? 'bg-ok' : 'bg-line')} />}
            </li>
          )
        })}
      </ol>

      <div className="flex items-start gap-5">
        {/* main */}
        <div className="min-w-0 flex-1">
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <p className="text-[11.5px] font-semibold text-ink-4">Step {cur.n} of 6</p>
            <h2 className="mb-1 font-display text-[16px] font-bold text-ink">{cur.title}</h2>
            <p className="mb-5 text-[12.5px] text-ink-3">{INTRO[step]}</p>

            {/* STEP 1 */}
            <Panel show={step === 0}>
              <Grid>
                <F label={<>Company Name{req}</>}><input name="companyName" placeholder="Enter legal company name" className={field} /></F>
                <F label="Short Name / Brand Name"><input name="brandName" maxLength={80} placeholder="e.g. ABC Infra" className={field} /></F>
                <F label={<>Company Type{req}</>}>
                  <select name="companyType" value={kind} onChange={(e) => setKind(e.target.value as 'CORPORATE' | 'BMF')} className={field}>
                    <option value="CORPORATE">Corporate</option><option value="BMF">BMF (Building Material Facilitator)</option>
                  </select>
                </F>
                <F label="Year of Establishment"><input name="yearFounded" inputMode="numeric" placeholder="e.g. 2016" className={field} /></F>
                <F label="Company Size"><Select name="companySize"><option value="">Select number of employees</option><option>1-10</option><option>11-50</option><option>51-200</option><option>200+</option></Select></F>
                <F label="Official Website"><input name="website" placeholder="https://www.yourcompany.com" className={field} /></F>
                <F label={<>Business Email{req}</>}><input name="email" type="email" placeholder="info@yourcompany.com" className={field} /></F>
                <F label="Company Phone"><input name="mobile" inputMode="numeric" placeholder="98765 43210" className={field} /></F>
              </Grid>
              <F label="Tagline / Brief Description"><textarea name="tagline" rows={2} maxLength={300} placeholder="Write a short description about your company (max 300 characters)" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 2 */}
            <Panel show={step === 1}>
              <Grid>
                <F label={<>Primary Industry{req}</>}><Select name="primaryIndustry"><option value="">Select primary industry</option>{INDUSTRIES.map((c) => <option key={c}>{c}</option>)}</Select></F>
                <F label="Secondary Industry"><Select name="secondaryIndustry"><option value="">Select secondary industry</option>{INDUSTRIES.map((c) => <option key={c}>{c}</option>)}</Select></F>
                <F label="GST Number"><input name="gstNumber" placeholder="Enter GST number" className={field} /></F>
                <F label="PAN Number"><input name="panNumber" placeholder="Enter PAN number" className={field} /></F>
                <F label="CIN Number"><input name="cinNumber" maxLength={25} placeholder="Enter CIN number (if applicable)" className={field} /></F>
                <F label="Legal Entity Type"><Select name="legalEntity"><option value="">Select entity type</option><option>Private Limited</option><option>Public Limited</option><option>LLP</option><option>Partnership</option><option>Proprietorship</option></Select></F>
                <F label="Business Registration Number"><input name="registrationNumber" maxLength={40} placeholder="Enter registration number" className={field} /></F>
                <F label={<>Annual Turnover{req}</>}><Select name="annualTurnover"><option value="">Select turnover range</option><option>Below ₹1 Cr</option><option>₹1 - 10 Cr</option><option>₹10 - 50 Cr</option><option>₹50 Cr+</option></Select></F>
              </Grid>
              <F label="Business Categories"><input name="categories" placeholder="Construction, Building Materials, Real Estate, Interior & Design…" className={field} /></F>
              <F label="Brief Business Overview"><textarea name="overview" rows={3} maxLength={500} placeholder="Tell us about your business, products or services (max 500 characters)" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 3 */}
            <Panel show={step === 2}>
              <Sub>Registered Office Address</Sub>
              <Grid>
                <F label={<>Address Line 1{req}</>}><input name="addressLine" placeholder="Enter address line 1" className={field} /></F>
                <F label="Address Line 2"><input name="addressLine2" maxLength={200} placeholder="Enter address line 2 (optional)" className={field} /></F>
              </Grid>
              <Grid cols={4}>
                <F label={<>Country{req}</>}><Select name="country"><option>India</option></Select></F>
                <F label={<>State{req}</>}><Select name="state"><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</Select></F>
                <F label={<>City{req}</>}><input name="city" placeholder="Enter city" className={field} /></F>
                <F label={<>PIN Code{req}</>}><input name="pincode" inputMode="numeric" placeholder="Enter PIN code" className={field} /></F>
              </Grid>
              <div className="flex items-center justify-between pt-1">
                <Sub>Operational / Head Office Address</Sub>
                <label className="flex items-center gap-1.5 text-[11.5px] text-ink-2"><input type="checkbox" name="opsSame" className="h-3.5 w-3.5 rounded border-line accent-brand" /> Same as registered office</label>
              </div>
              <Grid>
                <F label="Address Line 1"><input name="opsAddress1" maxLength={200} placeholder="Enter address line 1" className={field} /></F>
                <F label="Address Line 2"><input name="opsAddress2" maxLength={200} placeholder="Enter address line 2 (optional)" className={field} /></F>
              </Grid>
              <Grid cols={4}>
                <F label="Country"><Select name="opsCountry"><option>India</option></Select></F>
                <F label="State"><Select name="opsState"><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</Select></F>
                <F label="City"><input name="opsCity" maxLength={80} placeholder="Enter city" className={field} /></F>
                <F label="PIN Code"><input name="opsPincode" inputMode="numeric" maxLength={6} placeholder="Enter PIN code" className={field} /></F>
              </Grid>
              <F label="Map Location (Optional)"><input name="mapLocation" maxLength={300} placeholder="Google Maps link or coordinates" className={field} /></F>
            </Panel>

            {/* STEP 4 */}
            <Panel show={step === 3}>
              <Sub>Primary Contact Person</Sub>
              <Grid>
                <F label={<>Full Name{req}</>}><input name="contactName" maxLength={80} placeholder="Enter full name" className={field} /></F>
                <F label="Designation"><Select name="contactDesignation"><option value="">Select designation</option><option>Director</option><option>Manager</option><option>Head</option><option>Executive</option></Select></F>
                <F label={<>Email Address{req}</>}><input name="contactEmail" type="email" placeholder="Enter email address" className={field} /></F>
                <F label={<>Phone Number{req}</>}><input name="contactMobile" inputMode="numeric" maxLength={15} placeholder="10-digit mobile" className={field} /></F>
              </Grid>
              <div className="flex items-center justify-between pt-1">
                <Sub>Additional Contact Person (Optional)</Sub>
                {!second && (
                  <button type="button" onClick={() => setSecond(true)} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-brand hover:border-brand"><Icon name="plus" className="h-3.5 w-3.5" /> Add Another Contact</button>
                )}
              </div>
              {second ? (
                <Grid>
                  <F label="Full Name"><input name="contact2Name" maxLength={80} placeholder="Enter full name" className={field} /></F>
                  <F label="Role"><input name="contact2Designation" maxLength={80} placeholder="e.g. Sales, Support" className={field} /></F>
                  <F label="Email Address"><input name="contact2Email" type="email" placeholder="Enter email address" className={field} /></F>
                  <F label="Phone Number"><input name="contact2Mobile" inputMode="numeric" maxLength={15} placeholder="10-digit mobile" className={field} /></F>
                </Grid>
              ) : (
                <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] text-ink-3">Add a secondary contact (Sales, Support, etc.) so enquiries reach the right person.</p>
              )}
            </Panel>

            {/* STEP 5 */}
            <Panel show={step === 4}>
              <DocInputs types={docTypes[kind]} />
              <p className="mt-3 rounded-lg bg-info-soft px-3 py-2.5 text-[11.5px] text-info"><strong>Note:</strong> Please ensure all documents are clear and valid. Accepted formats: PDF, JPG, PNG. Max file size 5MB per file.</p>
            </Panel>

            {/* STEP 6 */}
            <Panel show={step === 5}>
              <p className="mb-4 text-[12.5px] text-ink-3">Verify all details before submitting the corporate application.</p>
              <div className="rounded-lg bg-paper-2 px-4 py-3 text-[12px] text-ink-3">Everything entered is saved — company details, both addresses, contacts and the documents. The account starts as <strong>Pending Verification</strong>; verify it from the account page.</div>
              <div className="mt-3"><SendCredentials who="company" /></div>
              <label className="mt-3 flex items-start gap-2 text-[11.5px] text-ink-2"><input type="checkbox" name="confirm" required className="mt-0.5 h-3.5 w-3.5 rounded border-line accent-brand" /> I confirm that all the information provided is accurate and complete. I agree to the Terms &amp; Conditions and Privacy Policy of ArchFacing.</label>
              {state?.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{state.error}</p>}
            </Panel>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Back</button>
              ) : (
                <Link href="/admin/corporates" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Cancel</Link>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Save &amp; Next →</button>
              ) : (
                <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-ok px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"><Icon name="check" className="h-4 w-4" /> {pending ? 'Submitting…' : 'Submit Application'}</button>
              )}
            </div>
          </div>
        </div>

        {/* tips rail */}
        <div className="w-[260px] shrink-0">
          <div className="rounded-card border border-line bg-gradient-to-br from-brand-soft to-white p-5 shadow-card">
            <h3 className="font-display text-[15px] font-bold text-ink">{TIPS[step].title}</h3>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{TIPS[step].blurb}</p>
            <ul className="mt-3 space-y-2 text-[11.5px] text-ink-2">
              {TIPS[step].items.map((g) => <li key={g} className="flex items-start gap-1.5"><Icon name="check" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ok" />{g}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── helpers ─────────────────────────────────────────────────
function Panel({ show, children }: { show: boolean; children: React.ReactNode }) { return <div className={show ? 'space-y-4' : 'hidden'}>{children}</div> }
function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) { return <div className={`grid gap-4 ${cols === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>{children}</div> }
function F({ label: l, children }: { label: React.ReactNode; children: React.ReactNode }) { return <div><label className={label}>{l}</label>{children}</div> }
function Select({ name, children }: { name?: string; children: React.ReactNode }) { return <select name={name} className={field}>{children}</select> }
function Sub({ children }: { children: React.ReactNode }) { return <h3 className="font-display text-[13px] font-bold text-ink">{children}</h3> }

const INTRO = [
  "Enter your company's basic information to get started.",
  'Tell us more about your business, industry and registration details.',
  'Provide your registered office and operational address details.',
  'Add primary and secondary contact persons for your company.',
  'Upload the required verification documents.',
  'Verify all details before submitting the corporate application.',
]

const TIPS: { title: string; blurb: string; items: string[] }[] = [
  { title: 'Build Your Business Presence on ArchFacing', blurb: 'Join as a corporate to get verified, showcase your work, connect with professionals and access quality leads.', items: ['Verified Corporate Badge', 'Project Showcasing', 'Quality Lead Access', 'Enhanced Brand Visibility'] },
  { title: 'Grow Your Business Network', blurb: 'Be part of a trusted network of architects, designers, contractors and corporates across India.', items: ['Access verified professionals', 'Showcase products & projects', 'Get quality business enquiries', 'Expand to new markets'] },
  { title: 'Show Your Location to the Right Audience', blurb: 'Help professionals and clients find your business easily with accurate location details.', items: ['Increase local visibility', 'Attract nearby projects', 'Get location-based enquiries', 'Show multiple office locations'] },
  { title: 'Add the Right People', blurb: 'Keep your team information updated for better collaboration and communication.', items: ['Multiple contact persons', 'Role-based communication', 'Faster support & response', 'Dedicated account manager'] },
  { title: 'Secure & Verified Platform', blurb: 'Your documents are securely stored and verified by our team to ensure a trusted business network.', items: ['Safe & encrypted upload', 'Quick verification process', 'Trusted by industry leaders', 'Build credibility'] },
  { title: 'Almost Done', blurb: 'Review everything, confirm, and submit. Our team verifies within 24-48 hours.', items: ['All information reviewed', 'Verified within 24-48 hrs', 'Credentials emailed', 'Instant dashboard access'] },
]
