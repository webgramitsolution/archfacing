'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { DocInputs, NotifyChannels, OneTimePassword, SendCredentials } from '@/components/admin/wizard-bits'
import { createStudentAction, type StudentState } from './actions'

/**
 * The 6-step "Add Student" wizard. All fields live in one form (steps
 * shown/hidden), so the final submit posts everything — and everything is
 * saved: the account (PROFESSIONAL, tier STUDENT), academic details, the
 * optional details in profileExtras, the documents as VerificationDocument
 * uploads and the notification switches in the student's preferences.
 */

const STEPS = [
  { n: 1, title: 'Basic Information', icon: 'users' as IconName },
  { n: 2, title: 'Academic Details', icon: 'building' as IconName },
  { n: 3, title: 'Interests & Skills', icon: 'star' as IconName },
  { n: 4, title: 'Documents', icon: 'file' as IconName },
  { n: 5, title: 'Access & Permissions', icon: 'shield' as IconName },
  { n: 6, title: 'Review & Create', icon: 'check' as IconName },
]

const COURSES = [
  { value: 'architecture', label: 'B.Arch (Bachelor of Architecture)' },
  { value: 'interior-design', label: 'Interior Design' },
  { value: 'civil-engineering', label: 'Civil Engineering' },
  { value: 'product-design', label: 'Product Design' },
  { value: 'urban-planning', label: 'Urban Planning' },
  { value: 'graphic-design', label: 'Graphic Design' },
]
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
const INTERESTS = ['Architecture', 'Interior Design', 'Civil Engineering', 'Product Design', 'Urban Planning', 'Graphic Design', 'Sustainability', 'Real Estate', 'Construction Technology', 'Art & Creativity', 'Research', 'Other']
/** What a student account can use — set by the role, shown for clarity. */
const INCLUDED = ['Design Competitions', 'Artistry posts', 'Club events', 'Messages', 'Saved items', 'Blog & Podcast']

const field = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const label = 'mb-1 block text-[12px] font-medium text-ink-2'
const req = <span className="text-danger"> *</span>

export function AddStudentWizard({ institutions, docTypes }: { institutions: string[]; docTypes: { id: string; name: string; required: boolean }[] }) {
  const [state, formAction, pending] = useActionState<StudentState, FormData>(createStudentAction, null)
  const [step, setStep] = useState(0)
  const cur = STEPS[step]

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" className="h-7 w-7" /></span>
        <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Student created</h2>
        <p className="mt-1 text-[13px] text-ink-3">{state.created?.name} ({state.created?.email}) added.{state.password ? '' : ' Login credentials were emailed.'}</p>
        <OneTimePassword password={state.password} />
        {state.note && <p className="mt-2 text-[12px] text-warn">{state.note}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/admin/students" className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90">Back to Students</Link>
          <Link href="/admin/students/add" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Add another</Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <div className="mb-4">
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">Add Student</h1>
        <p className="mt-0.5 text-[13px] text-ink-3">Create a new student account to give them access to learning resources, competitions, internships and more.</p>
      </div>

      {/* horizontal stepper — number + step name, like the reference */}
      <ol className="mb-5 flex items-center rounded-card border border-line bg-white px-4 py-3.5 shadow-card">
        {STEPS.map((s, i) => {
          const done = i < step, active = i === step
          return (
            <li key={s.n} className="flex min-w-0 items-center gap-2 last:flex-initial [&:not(:last-child)]:flex-1">
              <button type="button" onClick={() => setStep(i)} className="flex min-w-0 items-center gap-2">
                <span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold transition-colors ' + (done ? 'bg-ok text-white' : active ? 'bg-brand text-white' : 'bg-paper-2 text-ink-3')}>{done ? <Icon name="check" className="h-3.5 w-3.5" /> : s.n}</span>
                <span className={'whitespace-nowrap text-[11.5px] font-semibold transition-colors ' + (active ? 'text-brand' : done ? 'text-ink' : 'text-ink-4')}>{s.title}</span>
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

            {/* STEP 1 */}
            <Panel show={step === 0}>
              <Grid>
                <F label={<>Full Name{req}</>}><input name="name" placeholder="Enter full name" className={field} /></F>
                <F label={<>Email Address{req}</>}><input name="email" type="email" placeholder="student@example.com" className={field} /></F>
                <F label="Mobile Number"><input name="mobile" inputMode="numeric" placeholder="98765 43210" className={field} /></F>
                <F label="Date of Birth"><input name="dob" type="date" className={field} /></F>
                <F label="Gender"><Select name="gender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></Select></F>
                <F label="Blood Group"><Select name="bloodGroup"><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}</Select></F>
                <F label="Nationality"><Select name="nationality"><option>Indian</option><option>Other</option></Select></F>
                <F label="City"><input name="city" placeholder="Enter city" className={field} /></F>
              </Grid>
              <F label="Current Address"><textarea name="address" rows={2} maxLength={300} placeholder="Enter current address" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 2 */}
            <Panel show={step === 1}>
              <F label={<>Institution Name{req}</>}><input name="institution" list="inst-list" placeholder="e.g. Indian Institute of Technology (IIT) Delhi" className={field} /><datalist id="inst-list">{institutions.map((i) => <option key={i} value={i} />)}</datalist></F>
              <Grid>
                <F label={<>Course / Stream{req}</>}><Select name="course"><option value="">Select course</option>{COURSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></F>
                <F label={<>Year / Semester{req}</>}><Select name="studentYear"><option value="">Select year</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</Select></F>
                <F label={<>Expected Graduation Year{req}</>}><input name="graduationYear" inputMode="numeric" maxLength={4} pattern="20\d\d" placeholder="2027" className={field} /></F>
                <F label={<>Enrollment / Roll Number{req}</>}><input name="studentId" placeholder="STU001245" className={field} /></F>
              </Grid>
              <F label={<>Student Category{req}</>}>
                <div className="flex h-10 items-center gap-5">
                  {['Undergraduate', 'Postgraduate', 'Diploma', 'Other'].map((c, i) => (
                    <label key={c} className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="studentLevel" value={c} defaultChecked={i === 0} className="accent-brand" /> {c}</label>
                  ))}
                </div>
              </F>
              <F label="Department (Optional)"><input name="department" maxLength={80} placeholder="e.g. Architecture" className={field} /></F>
            </Panel>

            {/* STEP 3 */}
            <Panel show={step === 2}>
              <Sub>Areas of Interest</Sub>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {INTERESTS.map((c, i) => <label key={c} className="flex items-center gap-2 text-[11.5px] text-ink-2"><input type="checkbox" name="interests" value={c} defaultChecked={i === 0} className="h-3.5 w-3.5 rounded border-line accent-brand" /> {c}</label>)}
              </div>
              <F label="Skills"><input name="skills" maxLength={300} placeholder="Comma separated — e.g. AutoCAD, SketchUp, Revit" className={field} /></F>
              <F label="Career Goals (Optional)"><textarea name="careerGoals" rows={2} maxLength={300} placeholder="I want to become a sustainable architect and work on urban design projects…" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
              <F label="Hobbies & Interests (Optional)"><textarea name="hobbies" rows={2} maxLength={300} placeholder="Sketching, Photography, Travel, Reading…" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none" /></F>
            </Panel>

            {/* STEP 4 */}
            <Panel show={step === 3}>
              <DocInputs types={docTypes} />
            </Panel>

            {/* STEP 5 */}
            <Panel show={step === 4}>
              <F label="Account Status">
                <div className="flex h-10 items-center gap-5">
                  <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="accStatus" value="active" defaultChecked className="accent-brand" /> Active (Allow login access)</label>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="accStatus" value="inactive" className="accent-brand" /> Inactive (Restrict login access)</label>
                </div>
              </F>
              <F label={<>Member Type{req}</>}>
                <div className="flex h-10 items-center gap-5">
                  {['Standard Student', 'Competition Participant', 'Internship Seeker'].map((m, i) => (
                    <label key={m} className="flex items-center gap-1.5 text-[12.5px] text-ink-2"><input type="radio" name="memberType" value={m} defaultChecked={i === 0} className="accent-brand" /> {m}</label>
                  ))}
                </div>
              </F>
              <F label="Base PIN code (Optional)"><input name="pincode" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="e.g. 110016" className={field} /></F>
              <SendCredentials who="student" />
              <Sub>Included with a Student account</Sub>
              <div className="flex flex-wrap gap-1.5">
                {INCLUDED.map((m) => <span key={m} className="rounded-pill bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">{m}</span>)}
              </div>
              <Sub>Notification Preferences</Sub>
              <NotifyChannels />
            </Panel>

            {/* STEP 6 */}
            <Panel show={step === 5}>
              <p className="mb-4 text-[12.5px] text-ink-3">Review all details before creating the student account.</p>
              <div className="rounded-lg bg-paper-2 px-4 py-3 text-[12px] text-ink-3">Everything entered is saved, including interests, skills, documents and notification choices. Login credentials are auto-generated; the student must change the password on first sign-in.</div>
              {state?.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-[12px] text-danger">{state.error}</p>}
            </Panel>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-4">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Previous</button>
              ) : (
                <Link href="/admin/students" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">Cancel</Link>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-brand px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover">Save &amp; Next →</button>
              ) : (
                <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-lg bg-ok px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"><Icon name="check" className="h-4 w-4" /> {pending ? 'Creating…' : 'Create Student'}</button>
              )}
            </div>
          </div>
        </div>

        {/* tips rail — illustration + tagline + tips, as the reference */}
        <div className="w-[280px] shrink-0">
          <div className="overflow-hidden rounded-card border border-line bg-[#EEF3FF] shadow-card">
            <div className="px-5 pt-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/students/student-${step + 1}.jpg`} alt="Student" className="h-[200px] w-full rounded-xl object-cover object-top" />
              <p className="mt-3 font-display text-[20px] font-bold leading-[1.15] text-[#1E2A5A]">{TIPS[step].headline}</p>
            </div>
            <div className="m-4 rounded-xl bg-white p-4 shadow-card">
              <ul className="space-y-2.5 text-[11.5px] font-medium text-ink-2">
                {TIPS[step].items.map((g) => (
                  <li key={g} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"><Icon name="check" className="h-3 w-3" /></span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── helpers ─────────────────────────────────────────────────
function Panel({ show, children }: { show: boolean; children: React.ReactNode }) { return <div className={show ? 'space-y-4' : 'hidden'}>{children}</div> }
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-4">{children}</div> }
function F({ label: l, children }: { label: React.ReactNode; children: React.ReactNode }) { return <div><label className={label}>{l}</label>{children}</div> }
function Select({ name, children }: { name?: string; children: React.ReactNode }) { return <select name={name} className={field}>{children}</select> }
function Sub({ children }: { children: React.ReactNode }) { return <h3 className="border-t border-line-soft pt-4 font-display text-[13px] font-bold text-ink">{children}</h3> }

const INTRO = [
  "Enter the student's personal details to get started.",
  "Enter the student's educational information.",
  "Select the student's areas of interest and skills to show relevant opportunities.",
  'Upload required documents for verification and record keeping.',
  'Set user access, roles and permissions for the student account.',
  'Review all details before creating the student account.',
]

const TIPS: { headline: string; items: string[] }[] = [
  { headline: 'Every Great Designer Was Once a Student', items: ['Access exclusive learning content', 'Participate in competitions', 'Find internship opportunities', 'Connect with industry experts'] },
  { headline: 'Knowledge Builds Better Futures', items: ['Access exclusive learning content', 'Participate in competitions', 'Find internship opportunities', 'Connect with industry experts'] },
  { headline: 'Passion Today, Profession Tomorrow', items: ['Explore industry domains', 'Find the right opportunities', 'Build in-demand skills', 'Showcase their talent'] },
  { headline: 'Verified Students, Trusted Opportunities', items: ['Secure document verification', 'Build trust in the community', 'Access premium opportunities', 'Participate in verified events'] },
  { headline: 'Give the Right Access to Bright Minds', items: ['Flexible access control', 'Role-based permissions', 'Safe and secure platform', 'Better student engagement'] },
  { headline: 'Almost There! Create the Account', items: ['Complete and accurate profile', 'Secure and verified account', 'Access to all eligible features', 'A brighter future on ArchFacing'] },
]
