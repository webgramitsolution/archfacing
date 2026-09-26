'use client'

import { LabeledField } from '@/components/admin/labeled-field'
import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { DocInputs, NotifyChannels, OneTimePassword, SendCredentials } from '@/components/admin/wizard-bits'
import { createBuyerAction, type BuyerState } from './actions'

/**
 * The 6-step "Add Buyer / Client" wizard. All fields live in one form (steps
 * shown/hidden), so the final submit posts everything. createBuyerAction
 * creates a CLIENT account + BuyerProfile (Individual or Company) and saves
 * everything else too: contacts and billing in profileExtras, documents as
 * VerificationDocument uploads (they count towards the queue's minimum), and
 * the notification switches in the buyer's preferences.
 */

const STEPS = [
  { n: 1, title: 'Basic Information', sub: 'Client details', icon: 'user' as IconName },
  { n: 2, title: 'Business Details', sub: 'Organization information', icon: 'building' as IconName },
  { n: 3, title: 'Contact & Billing', sub: 'Address & contacts', icon: 'phone' as IconName },
  { n: 4, title: 'Preferences', sub: 'Buying interests & PACT', icon: 'star' as IconName },
  { n: 5, title: 'Access & Permissions', sub: 'Set roles & access', icon: 'shield' as IconName },
  { n: 6, title: 'Review & Create', sub: 'Confirm and save', icon: 'check' as IconName },
]

const INDUSTRIES = ['Interior Design', 'Architecture', 'Construction', 'Home Decor', 'Real Estate', 'Building Materials', 'Civil Engineering', 'Product Design', 'Furniture']
const COMPANY_TYPES = ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Proprietorship', 'Others']
const COMPANY_SIZES = ['1 - 10 Employees', '11 - 50 Employees', '51 - 200 Employees', '201 - 500 Employees', '500+ Employees']
const TURNOVERS = ['< ₹ 25 Lakh', '₹ 25 Lakh - 1 Crore', '₹ 1 - 5 Crore', '₹ 5 - 25 Crore', '₹ 25 - 100 Crore', '₹ 100 Crore +']
const CATEGORIES = ['Interior Design', 'Architecture', 'Furniture', 'Building Materials', 'Lighting', 'Home Decor', 'Sanitary & Bath Fittings', 'HVAC', 'Electrical', 'Paints & Coatings', 'Kitchen Solutions', 'Smart Home', 'Outdoor & Landscaping', 'Sustainable Products', 'Other']
const ORDER_RANGES = ['< ₹ 1 Lakh', '₹ 1 Lakh - ₹ 10 Lakh', '₹ 10 - 50 Lakh', '₹ 50 Lakh - 1 Crore', '₹ 1 Crore +']
/** What a buyer account can use — set by the role, shown for clarity. */
const INCLUDED = ['Browse products & projects', 'Send enquiries', 'Consult Nearby', 'Merchandise orders', 'Saved items', 'Messages']

const field = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const labelCls = 'mb-1 block text-[12px] font-medium text-ink-2'
const req = <span className="text-danger"> *</span>

export function AddBuyerWizard({
  staff, docTypes,
}: {
  staff: { id: string; name: string }[]
  docTypes: { BUYER: { id: string; name: string; required: boolean }[]; COMPANY: { id: string; name: string; required: boolean }[] }
}) {
  const [state, formAction, pending] = useActionState<BuyerState, FormData>(createBuyerAction, null)
  const [step, setStep] = useState(0)
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL')
  const cur = STEPS[step]

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Buyer / Client created</h2>
        <p className="mt-1 text-[13px] text-ink-3">{state.created?.name} ({state.created?.email}) added.{state.password ? '' : ' Login credentials were emailed.'}</p>
        <OneTimePassword password={state.password} />
        {state.note && <p className="mt-2 text-[12px] text-warn">{state.note}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/admin/visitors" className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Back to Buyers / Clients</Link>
          <Link href="/admin/visitors/add" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Add another</Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="accountType" value={accountType} />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Add Buyer / Client</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Create a new buyer or client account to give them access to purchase, submit RFQs and engage with the platform.</p>
        </div>
        <Link href="/admin/visitors" className="shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Back to Buyers / Clients</Link>
      </div>

      {/* horizontal stepper — number + step name + subtitle */}
      <ol className="mb-5 flex items-center rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
        {STEPS.map((s, i) => {
          const done = i < step, active = i === step
          return (
            <li key={s.n} className="flex min-w-0 items-center gap-2 last:flex-initial [&:not(:last-child)]:flex-1">
              <button type="button" onClick={() => setStep(i)} className="flex min-w-0 items-center gap-2 text-left">
                <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors ' + (done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-paper-2 text-ink-3')}>{done ? <Icon name="check" className="h-4 w-4" /> : s.n}</span>
                <span className="min-w-0">
                  <span className={'block whitespace-nowrap text-[12px] font-semibold leading-tight transition-colors ' + (active ? 'text-brand' : done ? 'text-ink' : 'text-ink-4')}>{s.title}</span>
                  <span className="block whitespace-nowrap text-[10px] leading-tight text-ink-4">{s.sub}</span>
                </span>
              </button>
              {i < STEPS.length - 1 && <span className={'mx-2 h-px flex-1 ' + (done ? 'bg-ok' : 'bg-line')} />}
            </li>
          )
        })}
      </ol>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <h2 className="mb-1 font-display text-[16px] font-bold text-ink">{cur.n}. {cur.title}</h2>
            <p className="mb-5 text-[12.5px] text-ink-3">{INTRO[step]}</p>

            {/* STEP 1 — Basic Information */}
            <Panel show={step === 0}>
              <F label={<>Account Type{req}</>}>
                <div className="grid grid-cols-2 gap-3">
                  <TypeCard active={accountType === 'INDIVIDUAL'} onClick={() => setAccountType('INDIVIDUAL')} label="Individual Buyer" />
                  <TypeCard active={accountType === 'COMPANY'} onClick={() => setAccountType('COMPANY')} label="Company Client" />
                </div>
              </F>
              <Grid>
                <F label={<>Full Name{req}</>}><input name="name" placeholder="Enter full name" className={field} /></F>
                <F label={<>Email Address{req}</>}><input name="email" type="email" placeholder="buyer@example.com" className={field} /></F>
                <F label={<>Mobile Number{req}</>}><input name="mobile" inputMode="numeric" placeholder="98765 43210" className={field} /></F>
                <F label="Date of Birth"><input name="dob" type="date" className={field} /></F>
                <F label="Gender"><Select name="gender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select></F>
                <F label="User Type"><Select name="buyerType"><option>Regular Buyer</option><option>Premium Buyer</option><option>Corporate Representative</option></Select></F>
                <F label="Nationality"><Select name="nationality"><option>Indian</option><option>Other</option></Select></F>
                <F label="City"><input name="city" placeholder="Delhi" className={field} /></F>
              </Grid>
              <F label="Short Bio / Notes (Optional)"><textarea name="bio" rows={2} maxLength={300} placeholder="Add a brief note about the buyer/client…" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 2 — Business Details */}
            <Panel show={step === 1}>
              <F label="Account Type">
                <div className="grid grid-cols-2 gap-3">
                  <TypeCard active={accountType === 'INDIVIDUAL'} onClick={() => setAccountType('INDIVIDUAL')} label="Individual Buyer" />
                  <TypeCard active={accountType === 'COMPANY'} onClick={() => setAccountType('COMPANY')} label="Company Client" />
                </div>
              </F>
              <Grid>
                <F label={<>Company / Organization Name{accountType === 'COMPANY' && req}</>}><input name="companyName" placeholder="DesignHub India Pvt Ltd" className={field} /></F>
                <F label="Trade Name (Optional)"><input name="tradeName" placeholder="DesignHub" className={field} /></F>
                <F label="GST Number (Optional)"><input name="gstNumber" placeholder="27AABCD1234F1Z5" className={field} /></F>
                <F label="PAN Number (Optional)"><input name="panNumber" placeholder="AABCD1234F" className={field} /></F>
                <F label={<>Company Type{accountType === 'COMPANY' && req}</>}><Select name="companyType"><option value="">Select type</option>{COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></F>
                <F label={<>Industry{accountType === 'COMPANY' && req}</>}><Select name="industry"><option value="">Select industry</option>{INDUSTRIES.map((t) => <option key={t}>{t}</option>)}</Select></F>
                <F label={<>Company Size{accountType === 'COMPANY' && req}</>}><Select name="companySize"><option value="">Select size</option>{COMPANY_SIZES.map((t) => <option key={t}>{t}</option>)}</Select></F>
                <F label="Annual Turnover (Optional)"><Select name="annualTurnover"><option value="">Select range</option>{TURNOVERS.map((t) => <option key={t}>{t}</option>)}</Select></F>
                <F label="Website (Optional)"><input name="website" placeholder="https://www.designhub.in" className={field} /></F>
                <F label="Year of Establishment (Optional)"><input name="yearEstablished" inputMode="numeric" placeholder="2018" className={field} /></F>
              </Grid>
              <F label="Business Description (Optional)"><textarea name="businessDescription" rows={3} maxLength={500} placeholder="Leading interior design and architectural solutions provider for commercial and residential spaces." className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 3 — Contact & Billing */}
            <Panel show={step === 2}>
              <Sub>Primary Contact Person</Sub>
              <Grid>
                <F label={<>Full Name{req}</>}><input name="contactName" maxLength={80} placeholder="Contact person's name" className={field} /></F>
                <F label={<>Designation{req}</>}><input name="contactDesignation" maxLength={80} placeholder="e.g. Purchase Manager" className={field} /></F>
                <F label={<>Email Address{req}</>}><input name="contactEmail" type="email" placeholder="name@company.com" className={field} /></F>
                <F label={<>Mobile Number{req}</>}><input name="contactMobile" inputMode="numeric" maxLength={15} placeholder="10-digit mobile" className={field} /></F>
              </Grid>
              <Sub>Secondary Contact Person (Optional)</Sub>
              <Grid>
                <F label="Full Name"><input name="contact2Name" maxLength={80} placeholder="Contact person's name" className={field} /></F>
                <F label="Designation"><input name="contact2Designation" maxLength={80} placeholder="e.g. Accounts Executive" className={field} /></F>
                <F label="Email Address"><input name="contact2Email" type="email" placeholder="name@company.com" className={field} /></F>
                <F label="Mobile Number"><input name="contact2Mobile" inputMode="numeric" maxLength={15} placeholder="10-digit mobile" className={field} /></F>
              </Grid>
              <Sub>Billing Address</Sub>
              <Grid>
                <F label={<>Address Line 1{req}</>}><input name="billingAddress" maxLength={200} placeholder="Building, street, area" className={field} /></F>
                <F label="Address Line 2 (Optional)"><input name="billingAddress2" maxLength={200} placeholder="Landmark" className={field} /></F>
                <F label={<>City{req}</>}><input name="billingCity" maxLength={80} placeholder="City" className={field} /></F>
                <F label={<>State{req}</>}><input name="billingState" maxLength={80} placeholder="State" className={field} /></F>
                <F label={<>Pincode{req}</>}><input name="billingPincode" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="6-digit PIN" className={field} /></F>
              </Grid>
            </Panel>

            {/* STEP 4 — Preferences */}
            <Panel show={step === 3}>
              <Sub>Product Categories of Interest</Sub>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {CATEGORIES.map((c, i) => (
                  <label key={c} className="flex items-center gap-2 text-[11.5px] text-ink-2"><input type="checkbox" name="productCategories" value={c} defaultChecked={i < 2} className="h-3.5 w-3.5 rounded border-line accent-brand" /> {c}</label>
                ))}
              </div>
              <F label="Buying Purpose (Optional)">
                <div className="grid grid-cols-2 gap-y-2">
                  {['For Own Use', 'For Resale / Distribution', 'For Projects / Contract', 'For Multiple Purposes'].map((p, i) => (
                    <label key={p} className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="buyingPurpose" value={p} defaultChecked={i === 0} className="accent-brand" /> {p}</label>
                  ))}
                </div>
              </F>
              <F label="Typical Order Value Range"><Select name="orderValueRange"><option value="">Select range</option>{ORDER_RANGES.map((r) => <option key={r}>{r}</option>)}</Select></F>
              <F label="Preferred Brands (Optional)">
                <input name="preferredBrandsText" maxLength={300} placeholder="Comma separated brand names" className={field} />
              </F>
              <F label="Special Requirements (Optional)"><textarea name="specialRequirements" rows={2} maxLength={300} placeholder="Looking for sustainable and eco-friendly products. Open to new vendor partnerships." className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 5 — Access & Permissions */}
            <Panel show={step === 4}>
              <F label="Account Status">
                <div className="flex h-10 items-center gap-5">
                  <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="accStatus" value="active" defaultChecked className="accent-brand" /> Active (Allow login access)</label>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="accStatus" value="inactive" className="accent-brand" /> Inactive (Restrict login access)</label>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="accStatus" value="pending" className="accent-brand" /> Pending Verification</label>
                </div>
              </F>
              <Sub>Included with a Buyer account</Sub>
              <div className="flex flex-wrap gap-1.5">
                {INCLUDED.map((m) => <span key={m} className="rounded-pill bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">{m}</span>)}
              </div>
              <Grid>
                <F label="Assign to Account Manager (Optional)">
                  <Select name="assignedRm"><option value="">Nobody yet</option>{staff.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}</Select>
                </F>
                <F label="Base PIN code (Optional)"><input name="pactArea" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="e.g. 110024" className={field} /></F>
              </Grid>
              <Sub>Verification Documents</Sub>
              <DocInputs types={docTypes[accountType === 'COMPANY' ? 'COMPANY' : 'BUYER']} />
              <SendCredentials who="buyer" />
              <Sub>Notification Preferences</Sub>
              <NotifyChannels />
              <F label="Internal Notes (Optional)"><textarea name="internalNotes" rows={2} maxLength={300} placeholder="Only staff see this." className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 6 — Review & Create */}
            <Panel show={step === 5}>
              <p className="mb-4 text-[12.5px] text-ink-3">Review all details before creating the buyer or client account.</p>
              <div className="rounded-lg bg-paper-2 px-4 py-3 text-[12px] text-ink-3">
                A <strong>{accountType === 'COMPANY' ? 'Company Client' : 'Individual Buyer'}</strong> account is created with everything entered — {accountType === 'COMPANY' ? 'company details, ' : ''}contacts, billing, preferences, documents and notification choices. Login credentials are auto-generated; the buyer must change the password on first sign-in.
              </div>
              {state?.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{state.error}</p>}
            </Panel>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Previous</button>
              ) : (
                <Link href="/admin/visitors" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Cancel</Link>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-navy px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Save &amp; Next →</button>
              ) : (
                <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"><Icon name="check" className="h-4 w-4" /> {pending ? 'Creating…' : 'Create Buyer / Client'}</button>
              )}
            </div>
          </div>
        </div>

        {/* tips rail */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="overflow-hidden rounded-card border border-line bg-gradient-to-br from-[#EAF1FF] to-[#F3ECFF] p-5 shadow-card">
            <h3 className="font-display text-[17px] font-bold leading-tight text-[#1E2A5A]">{RAIL[step].headline}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{RAIL[step].body}</p>
            <ul className="mt-4 space-y-2.5 text-[11.5px] font-medium text-ink-2">
              {RAIL[step].items.map((g) => (
                <li key={g} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-brand shadow-sm"><Icon name="check" className="h-3 w-3" /></span>
                  {g}
                </li>
              ))}
            </ul>
          </div>

          {step === 0 && (
            <div className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="help" className="h-4 w-4" /></span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">Quick Tips</p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-ink-3">
                    <li>• Choose the correct account type (Individual or Company).</li>
                    <li>• Add accurate contact details for communication.</li>
                    <li>• Premium buyers can be given additional benefits.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}

// ── helpers ─────────────────────────────────────────────────
function Panel({ show, children }: { show: boolean; children: React.ReactNode }) { return <div className={show ? 'space-y-4' : 'hidden'}>{children}</div> }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-4">{children}</div> }
function F({ label: l, children }: { label: React.ReactNode; children: React.ReactNode }) { return <LabeledField label={l} labelClassName={labelCls}>{children}</LabeledField> }
function Select({ name, children }: { name?: string; children: React.ReactNode }) { return <select name={name} className={field}>{children}</select> }
function Sub({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-line-soft pt-4 font-display text-[13px] font-bold text-ink">{children}</h3> }
function TypeCard({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={'flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] font-semibold transition-colors ' + (active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-ink-2 hover:border-ink-4')}>
      <span className={'flex h-4 w-4 items-center justify-center rounded-full border ' + (active ? 'border-brand' : 'border-line')}>{active && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
      {label}
    </button>
  )
}

const INTRO = [
  "Enter the buyer or client's basic details to get started.",
  'Enter the organization or business information.',
  'Enter primary and secondary contact details along with billing information.',
  'Set buying interests, categories, and preferences for the buyer or client.',
  'Set user access, roles and permissions for the buyer or client account.',
  'Review all details before creating the buyer or client account.',
]

const RAIL: { headline: string; body: string; items: string[] }[] = [
  { headline: 'Connect Buyers with Better Opportunities', body: 'Add buyers and clients to enable seamless purchasing, RFQ submission and project collaboration on ArchFacing.', items: ['Enable product purchasing', 'Allow RFQ submissions', 'Provide personalized experience', 'Track enquiries and orders', 'Build long-term relationships'] },
  { headline: 'Build Strong Business Relationships', body: 'Add accurate business information to help us serve them better and provide relevant opportunities.', items: ['Verified business accounts', 'Access to bulk purchasing', 'Submit RFQs easily', 'Get industry updates', 'Dedicated account support'] },
  { headline: 'Seamless Communication, Better Service', body: 'Add multiple contact persons to ensure uninterrupted communication and support.', items: ['Multiple contact persons', 'Dedicated account manager', 'Important updates & alerts', 'Order & RFQ notifications', 'Billing and invoice communication'] },
  { headline: 'Understand Their Needs, Deliver Better', body: 'Set preferences to show relevant products, suppliers and opportunities to the buyer or client.', items: ['Personalized product recommendations', 'Relevant supplier connections', 'Targeted communication', 'Better buying experience', 'Support for project requirements'] },
  { headline: 'Right Access, Right Control', body: 'Set the right access and permissions to give the buyer a secure, tailored experience on ArchFacing.', items: ['Flexible role-based access', 'Secure account controls', 'Assign a relationship manager', 'Grant only what they need', 'Adjust permissions anytime'] },
  { headline: 'Ready to Create the Account?', body: 'Review all information and click the button below to create the buyer or client account.', items: ['Instant account activation', 'Automated welcome email', 'Dedicated account manager', 'Access to relevant suppliers', 'Start purchasing & submitting RFQs'] },
]
