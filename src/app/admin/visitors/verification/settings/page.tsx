import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { getSetting } from '@/lib/settings'
import { getVerificationConfig, type RoleRuleKey, type BuyerRuleKey } from '@/lib/verification-config'
import { MessagesForm, type MessageValues } from './messages-form'
import { ConfigSaveBar, DocTypesEditor } from './config-form'
import { CFG_FORM } from './form-id'

export const metadata: Metadata = { title: 'Verification Settings' }
export const dynamic = 'force-dynamic'

/**
 * Verification Settings — every control on this page is stored in
 * SiteSetting 'verification.config' (see src/lib/verification-config.ts for
 * where each one is read) or, for the Messages panel, in the six
 * 'verification.*' message keys. Nothing here is decorative.
 */

const ROLE_ROWS: { key: RoleRuleKey; label: string; icon: IconName }[] = [
  { key: 'PROFESSIONAL', label: 'Professional', icon: 'user' },
  { key: 'STUDENT', label: 'Student', icon: 'award' },
  { key: 'CONSULTANT', label: 'Consultant', icon: 'target' },
  { key: 'CORPORATE', label: 'Corporate', icon: 'building' },
  { key: 'BMF', label: 'BMF', icon: 'building' },
]
const BUYER_ROWS: { key: BuyerRuleKey; label: string; icon: IconName }[] = [
  { key: 'BUYER_INDIVIDUAL', label: 'Buyer', icon: 'user' },
  { key: 'BUYER_COMPANY', label: 'Company Client', icon: 'building' },
]

export default async function VerificationSettingsPage() {
  await requirePermission('admin:users')

  const MESSAGE_KEYS = [
    'verification.review.subject', 'verification.review.body',
    'verification.approved.subject', 'verification.approved.body',
    'verification.rejected.subject', 'verification.rejected.body',
  ] as const
  const [cfg, messageEntries, staff, verified, pendingPros, pendingBuyers] = await Promise.all([
    getVerificationConfig(),
    Promise.all(MESSAGE_KEYS.map(async (k) => [k, String(await getSetting<string>(k))] as const)),
    prisma.user.findMany({
      where: { role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
      take: 200,
    }),
    // How long a verified profile really waited: account creation → verifiedAt.
    prisma.professionalProfile
      .findMany({
        where: { verifiedAt: { not: null } },
        select: { verifiedAt: true, user: { select: { createdAt: true } } },
        take: 500,
        orderBy: { verifiedAt: 'desc' },
      })
      .catch(() => [] as { verifiedAt: Date | null; user: { createdAt: Date } }[]),
    prisma.user.count({ where: { status: 'PENDING_VERIFICATION', deletedAt: null } }),
    prisma.buyerProfile.count({ where: { verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
  ])
  const messageValues = Object.fromEntries(messageEntries) as MessageValues

  const spans = verified
    .filter((v) => v.verifiedAt)
    .map((v) => v.verifiedAt!.getTime() - v.user.createdAt.getTime())
    .filter((ms) => ms > 0)
  const avgVerify =
    spans.length === 0
      ? '—'
      : (() => {
          const hrs = spans.reduce((a, b) => a + b, 0) / spans.length / 3_600_000
          return hrs < 24 ? `${hrs.toFixed(1)} hours` : `${(hrs / 24).toFixed(1)} days`
        })()

  const activeDocs = cfg.documentTypes.filter((d) => d.active).length
  const requiredRoles = ROLE_ROWS.filter((r) => cfg.rules[r.key].required).length
  const stats = [
    { label: 'Active Document Types', value: String(activeDocs), hint: `${cfg.documentTypes.length} defined in total`, icon: 'file' as IconName, bg: '#EEF1FF', fg: '#6366F1' },
    { label: 'Types Needing Verification', value: `${cfg.enabled ? requiredRoles : 0} / ${ROLE_ROWS.length}`, hint: 'member account types checked at sign-up', icon: 'users' as IconName, bg: '#F3EAFE', fg: '#8B5CF6' },
    { label: 'Waiting for a Decision', value: String(pendingPros + pendingBuyers), hint: `${pendingPros} members · ${pendingBuyers} buyers`, icon: 'shield' as IconName, bg: '#E7F7EE', fg: '#16A34A' },
    { label: 'Average Verification Time', value: avgVerify, hint: avgVerify === '—' ? 'No verifications yet' : 'Across verified profiles', icon: 'clock' as IconName, bg: '#FEF7E0', fg: '#D97706' },
  ]

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rise flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
            <Link href="/admin/users" className="hover:text-brand">Users &amp; Roles</Link><span className="text-ink-4">›</span>
            <span className="font-semibold text-ink">Verification Settings</span>
          </nav>
          <h1 className="font-display text-[24px] font-bold text-ink">Verification Settings</h1>
          <p className="mt-0.5 text-[13px] text-ink-3">Configure verification rules, document requirements, approval workflow and notifications for all user types.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {/* Master switch — part of the settings form. */}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <Switch name="enabled" defaultChecked={cfg.enabled} label="Verification system" />
            <span className="leading-tight">
              <span className="block text-[12px] font-semibold text-ink">Verification System</span>
              <span className={'block text-[10.5px] font-medium ' + (cfg.enabled ? 'text-ok' : 'text-ink-4')}>● {cfg.enabled ? 'Enabled' : 'Disabled'}</span>
            </span>
          </label>
          <Link href="/admin/visitors/verification" className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4 hover:text-ink">← Back to Verification Queue</Link>
          <ConfigSaveBar />
        </div>
      </div>

      {/* stat cards */}
      <section className="rise rise-1 grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3.5 rounded-card border border-line bg-white p-4 shadow-card">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: s.bg, color: s.fg }}><Icon name={s.icon} className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="truncate text-[12px] text-ink-3">{s.label}</p>
              <p className="font-display text-[22px] font-bold leading-tight text-ink">{s.value}</p>
              <p className="truncate text-[10.5px] text-ink-4">{s.hint}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-5">
          {/* row A: general settings + rules */}
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
            {/* 1. General Verification Settings */}
            <section className="rise rise-2 min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[15px] font-bold text-ink">1. General Verification Settings</h2>
              <p className="mb-4 text-[12px] text-ink-3">Basic verification policy for the platform. Saved with “Save Settings”.</p>
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div className="space-y-4">
                  <SwitchRow name="notifyUser" defaultChecked={cfg.notifyUser} title="Notify User on Status Change" desc="An in-app notice when an account is approved, sent for review or verified" />
                  <SwitchRow name="emailUser" defaultChecked={cfg.emailUser} title="Send Email Notifications" desc="Also email the user when their verification status changes" />
                  <NumField name="min_BUYER_INDIVIDUAL" label="Minimum Documents — Buyers" desc="An individual buyer cannot be approved with fewer" value={cfg.rules.BUYER_INDIVIDUAL.minDocs} min={0} max={10} suffix="documents" />
                  <NumField name="min_BUYER_COMPANY" label="Minimum Documents — Companies" desc="A company client cannot be approved with fewer" value={cfg.rules.BUYER_COMPANY.minDocs} min={0} max={10} suffix="documents" />
                </div>
                <div className="space-y-4">
                  <SelectField
                    name="revalidateMonths" label="Verification Validity" desc="A buyer’s verification lapses after this and they are asked again"
                    value={String(cfg.revalidateMonths)}
                    options={[['0', 'Never lapses'], ['6', '6 Months'], ['12', '1 Year'], ['24', '2 Years'], ['36', '3 Years']]}
                  />
                  <SelectField
                    name="reminderDays" label="Verification Reminder" desc="Warn the buyer before their verification lapses"
                    value={String(cfg.reminderDays)}
                    options={[['0', 'No reminder'], ['7', '7 Days Before'], ['15', '15 Days Before'], ['30', '30 Days Before'], ['60', '60 Days Before']]}
                  />
                  <p className="rounded-lg bg-paper-2 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-3">
                    Lapses and reminders run in the nightly job. With validity set to “Never lapses”, a verified buyer stays verified.
                  </p>
                </div>
              </div>
            </section>

            {/* Verification Rules by User Type */}
            <section className="rise rise-2 min-w-0 overflow-hidden rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[15px] font-bold text-ink">Verification Rules by User Type</h2>
              <p className="mb-4 text-[12px] text-ink-3">Which accounts wait for a check before they can use the platform.</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-[9px] uppercase leading-tight tracking-wide text-ink-4">
                    <th className="py-2 pr-1 font-semibold">User Type</th>
                    <th className="px-0.5 py-2 text-center font-semibold">Verification<br />Required</th>
                    <th className="px-0.5 py-2 text-center font-semibold">Min.<br />Docs</th>
                    <th className="py-2 pl-1 text-right font-semibold">Applies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {ROLE_ROWS.map((r) => (
                    <tr key={r.key} className="text-[11.5px]">
                      <td className="py-2.5 pr-1"><span className="flex items-center gap-1 whitespace-nowrap font-medium text-ink"><Icon name={r.icon} className="h-3.5 w-3.5 shrink-0 text-ink-4" />{r.label}</span></td>
                      <td className="px-0.5 py-2.5 text-center"><div className="flex justify-center"><Switch name={`req_${r.key}`} defaultChecked={cfg.rules[r.key].required} label={`${r.label} verification required`} /></div></td>
                      <td className="px-0.5 py-2.5 text-center text-ink-4">—</td>
                      <td className="py-2.5 pl-1 text-right text-[10px] text-ink-3">at sign-up</td>
                    </tr>
                  ))}
                  {BUYER_ROWS.map((r) => (
                    <tr key={r.key} className="text-[11.5px]">
                      <td className="py-2.5 pr-1"><span className="flex items-center gap-1 whitespace-nowrap font-medium text-ink"><Icon name={r.icon} className="h-3.5 w-3.5 shrink-0 text-ink-4" />{r.label}</span></td>
                      <td className="px-0.5 py-2.5 text-center text-[10px] text-ink-3">queue</td>
                      <td className="px-0.5 py-2.5 text-center tabular font-semibold text-ink">{cfg.rules[r.key].minDocs}</td>
                      <td className="py-2.5 pl-1 text-right text-[10px] text-ink-3">on approval</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-4">
                Buyers always go through the Verification Queue; their minimum is set under General Settings.
              </p>
            </section>
          </div>

          {/* row B: document types + workflow + messages */}
          <div className="grid grid-cols-[1.2fr_0.82fr_1.1fr] gap-4">
            {/* 2. Document Types */}
            <section className="rise rise-3 min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="mb-1 font-display text-[15px] font-bold text-ink">2. Document Types</h2>
              <p className="mb-3 text-[12px] text-ink-3">The documents accepted for verification, and who they apply to.</p>
              <DocTypesEditor initial={cfg.documentTypes} />
            </section>

            {/* 3. Verification Workflow */}
            <section className="rise rise-3 min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[15px] font-bold text-ink">3. Verification Workflow</h2>
              <p className="mb-4 text-[12px] text-ink-3">Who reviews, and what happens when nobody does.</p>
              <div className="space-y-4">
                <SelectField
                  name="defaultReviewerId" label="Default Reviewer" desc="Notified of every new account waiting for a check"
                  value={cfg.defaultReviewerId ?? ''}
                  options={[['', 'Nobody — check the queue'], ...staff.map((s) => [s.id, `${s.name} · ${s.role.replace('_', ' ').toLowerCase()}`] as [string, string])]}
                />
                <SelectField
                  name="escalateAfterHours" label="Escalation Time (if no action)" desc="Checked by the nightly job"
                  value={String(cfg.escalateAfterHours)}
                  options={[['0', 'Never escalate'], ['24', '24 Hours'], ['48', '48 Hours'], ['72', '72 Hours'], ['168', '7 Days']]}
                />
                <SelectField
                  name="escalateTo" label="Auto Escalate To" desc="Every active account with this role is notified"
                  value={cfg.escalateTo}
                  options={[['SUPER_ADMIN', 'Super Admin'], ['ADMIN', 'Admin']]}
                />
              </div>
            </section>

            {/* 4. Verification Messages — its own form, saves separately */}
            <section className="rise rise-3 min-w-0 rounded-card border border-line bg-white p-5 shadow-card">
              <h2 className="font-display text-[15px] font-bold text-ink">4. Verification Messages</h2>
              <p className="mb-4 text-[12px] text-ink-3">The notice a buyer receives at each stage.</p>
              <MessagesForm values={messageValues} />
            </section>
          </div>
        </div>

        {/* right rail */}
        <div className="w-[172px] shrink-0 space-y-4">
          <div className="rounded-card border border-line bg-gradient-to-br from-[#EAF1FF] to-[#F3ECFF] p-5 text-center shadow-card">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand shadow-sm"><Icon name="shield" className="h-8 w-8" /></span>
            <p className="mt-3 font-display text-[17px] font-bold leading-tight text-[#1E2A5A]">Secure Users<br />Build Trust<br />Grow Together</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">A verified community creates a safer and more trustworthy marketplace for everyone.</p>
          </div>

          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name="help" className="h-4 w-4" /></span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">Need Help?</p>
                <p className="mt-1 text-[11px] text-ink-3">The help centre explains verification, or reach the ArchFacing team.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Link href="/legal/need-help" className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand"><Icon name="file" className="h-3.5 w-3.5" /> Help Centre</Link>
              <Link href="/legal/contact" className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand"><Icon name="help" className="h-3.5 w-3.5" /> Contact Support</Link>
            </div>
          </div>

          <div className="rounded-card border border-line bg-[#F6F3FF] p-4 shadow-card">
            <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#8B5CF6]"><Icon name="star" className="h-4 w-4" /></span><p className="text-[12.5px] font-semibold text-ink">Pro Tips</p></div>
            <ul className="mt-2.5 space-y-1.5 text-[11px] text-ink-3">
              <li>• Set a validity so buyer checks stay current.</li>
              <li>• Name a default reviewer so nothing waits unseen.</li>
              <li>• Keep escalation on — overdue checks reach a Super Admin.</li>
              <li>• Edit the Messages so users know what to do next.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── controls (all belong to the settings form via form=…) ──
function Switch({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <span className="relative inline-flex h-5 w-9 shrink-0">
      <input type="checkbox" form={CFG_FORM} name={name} defaultChecked={defaultChecked} aria-label={label} className="peer absolute inset-0 z-10 cursor-pointer opacity-0" />
      <span className="absolute inset-0 rounded-full bg-[#CBD5E1] transition-colors peer-checked:bg-[#2563EB] peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
      <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all peer-checked:left-[18px]" />
    </span>
  )
}
function SwitchRow({ name, defaultChecked, title, desc }: { name: string; defaultChecked: boolean; title: string; desc?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium leading-snug text-ink">{title}</p>
        {desc && <p className="mt-0.5 text-[10px] leading-snug text-ink-3">{desc}</p>}
      </div>
      <Switch name={name} defaultChecked={defaultChecked} label={title} />
    </div>
  )
}
function SelectField({ name, label, desc, value, options }: { name: string; label: string; desc?: string; value: string; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium leading-snug text-ink">{label}</span>
      {desc && <span className="mb-1 mt-0.5 block text-[10px] leading-snug text-ink-3">{desc}</span>}
      <select form={CFG_FORM} name={name} defaultValue={value} className={'h-9 w-full rounded-lg border border-line bg-white px-2 text-[12px] text-ink focus:border-brand focus:outline-none ' + (desc ? '' : 'mt-1')}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
function NumField({ name, label, desc, value, min, max, suffix }: { name: string; label: string; desc?: string; value: number; min: number; max: number; suffix: string }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium leading-snug text-ink">{label}</span>
      {desc && <span className="mb-1 mt-0.5 block text-[10px] leading-snug text-ink-3">{desc}</span>}
      <span className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-2.5">
        <input form={CFG_FORM} type="number" name={name} defaultValue={value} min={min} max={max} required className="w-full bg-transparent text-[12px] text-ink focus:outline-none" />
        <span className="shrink-0 text-[11px] text-ink-4">{suffix}</span>
      </span>
    </label>
  )
}
