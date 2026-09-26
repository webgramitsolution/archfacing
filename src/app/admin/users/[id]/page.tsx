import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { ACCESS_TEMPLATES, can, GRANTABLE, STAFF_ROLES } from '@/config/permissions'
import { getVerificationConfig, documentsFor, docKindFor, type VerificationDocType } from '@/lib/verification-config'
import { Icon, type IconName } from '@/components/ui'
import { Panel, ago, fmtDate } from '@/components/admin/parts'
import { bulkUserAction, reviewDocumentAction, verifyUserFormAction } from '../actions'
import { EmployeeRowActions } from '../../employees/row-actions'
import { AccessEditor, DocUpload, RejectVerification } from './user-controls'

export const metadata: Metadata = { title: 'Account' }
export const dynamic = 'force-dynamic'

/**
 * One account, everything about it: who they are, what they have registered,
 * what they have bought, what they have posted, the leads they sent and
 * received, their support tickets, their documents and the audit trail —
 * with the actions an admin needs on this one person.
 */

const STATUS_PILL: Record<string, string> = {
  ACTIVE: 'bg-ok-soft text-ok', PENDING_VERIFICATION: 'bg-warn-soft text-warn', SUSPENDED: 'bg-danger-soft text-danger', BANNED: 'bg-danger text-white',
}
const nice = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const PRESETS: { label: string; keys: string[] }[] = [
  ...ACCESS_TEMPLATES.map((t) => ({ label: t.label, keys: t.keys as string[] })),
  { label: 'None', keys: [] },
]

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission('admin:users')
  const { id } = await params
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound()

  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      professionalProfile: true, consultantProfile: true, bmfProfile: true, corporateProfile: true, buyerProfile: true,
      verificationDocs: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { name: true } }, reviewedBy: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!u || u.deletedAt) notFound()

  const now = new Date()
  const [cfg, pacts, subs, clubs, postCounts, recentPosts, leadsIn, leadsOut, payments, paidSum, tickets, audit] = await Promise.all([
    getVerificationConfig(),
    prisma.pact.findMany({ where: { holderId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, pincode: true, city: true, serviceType: true, status: true, expiresAt: true } }),
    prisma.subscription.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, planName: true, price: true, expiresAt: true, status: true } }),
    prisma.clubMembership.findMany({ where: { userId: id }, orderBy: { expiresAt: 'desc' }, take: 3, select: { id: true, planName: true, expiresAt: true, isFree: true } }),
    prisma.post.groupBy({ by: ['type', 'status'], where: { authorId: id, deletedAt: null }, _count: { _all: true } }),
    prisma.post.findMany({ where: { authorId: id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, title: true, type: true, status: true, createdAt: true } }),
    prisma.leadRecipient.count({ where: { recipientId: id } }),
    prisma.enquiry.count({ where: { clientId: id } }),
    prisma.payment.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, purpose: true, status: true, totalAmount: true, createdAt: true, invoiceNumber: true } }),
    prisma.payment.aggregate({ where: { userId: id, status: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.supportTicket.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, subject: true, status: true, createdAt: true } }),
    prisma.auditLog.findMany({
      where: { OR: [{ actorId: id }, { entityId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, action: true, createdAt: true, actor: { select: { name: true } }, actorId: true, entityType: true },
    }),
  ])

  const isStaff = STAFF_ROLES.includes(u.role)
  const isSuper = u.role === 'SUPER_ADMIN'
  const mayChangeStatus = !isSuper && u.id !== me.id && (!isStaff || me.role === 'SUPER_ADMIN')
  const extras = (u.profileExtras ?? null) as Record<string, unknown> | null

  const kind: VerificationDocType['appliesTo'] = docKindFor(u.role, u.professionalProfile?.tier, u.buyerProfile?.accountType)
  const docTypes = documentsFor(cfg, kind)

  const profileRows: [string, string | null | undefined][] = [
    ['Email', u.email], ['Mobile', u.mobile], ['City', [u.city, u.state].filter(Boolean).join(', ')], ['PIN code', u.pincode], ['Address', u.addressLine],
    ['Joined', fmtDate(u.createdAt)], ['Last sign-in', u.lastLoginAt ? ago(u.lastLoginAt) : 'Never'],
    ...(u.professionalProfile ? [['Firm', u.professionalProfile.firmName], ['COA number', u.professionalProfile.coaNumber], ['Experience', u.professionalProfile.experience != null ? `${u.professionalProfile.experience} years` : null], ['Tier', nice(u.professionalProfile.tier)]] as [string, string | null][] : []),
    ...(u.consultantProfile ? [['Consultant group', nice(u.consultantProfile.group)], ['Speciality', u.consultantProfile.subCategory], ['Firm', u.consultantProfile.firmName]] as [string, string | null][] : []),
    ...(u.bmfProfile ? [['Business', u.bmfProfile.businessName], ['GST', u.bmfProfile.gstNumber]] as [string, string | null][] : []),
    ...(u.corporateProfile ? [['Company', u.corporateProfile.companyName], ['GST', u.corporateProfile.gstNumber], ['PAN', u.corporateProfile.panNumber], ['Website', u.corporateProfile.website]] as [string, string | null][] : []),
    ...(u.buyerProfile ? [['Buyer type', u.buyerProfile.accountType === 'COMPANY' ? 'Company' : 'Individual'], ['Company', u.buyerProfile.companyName], ['Industry', u.buyerProfile.industry], ['Verification', nice(u.buyerProfile.verificationStatus)]] as [string, string | null][] : []),
    ...(u.role === 'RM_EMPLOYEE' || u.role === 'ADMIN' || u.role === 'ADMIN_SELLER' ? [['Employee ID', u.employeeCode], ['Department', u.department], ['Designation', u.designation], ['Work mode', u.workMode], ['Joined company', u.joinedAt ? fmtDate(u.joinedAt) : null], ['PACT areas', u.assignedPincodes.includes('*') ? 'All areas' : u.assignedPincodes.join(', ')]] as [string, string | null][] : []),
  ]
  const extraRows = extras
    ? Object.entries(extras).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)).map(([k, v]) => [
        k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
        Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? Object.values(v as Record<string, unknown>).filter(Boolean).join(' · ') : String(v),
      ] as [string, string])
    : []
  const posted = postCounts.reduce((a, r) => a + r._count._all, 0)
  const published = postCounts.filter((r) => r.status === 'PUBLISHED').reduce((a, r) => a + r._count._all, 0)
  const initials = u.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Link href="/admin" className="hover:text-brand">Home</Link><span className="text-ink-4">›</span>
        <Link href="/admin/users" className="hover:text-brand">Users</Link><span className="text-ink-4">›</span>
        <span className="font-semibold text-ink">{u.name}</span>
      </nav>

      {/* identity + actions */}
      <section className="flex items-start gap-5 rounded-card border border-line bg-white p-5 shadow-card">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[20px] font-bold text-brand">
          {u.profilePhoto ?? u.logo ? <Image src={(u.profilePhoto ?? u.logo)!} alt="" fill sizes="64px" className="object-cover" /> : initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[22px] font-bold text-ink">{u.name}</h1>
            <span className="rounded-pill bg-[#EEF1FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#6366F1]">{nice(u.role)}</span>
            <span className={'rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ' + (STATUS_PILL[u.status] ?? 'bg-paper-3 text-ink-3')}>{nice(u.status)}</span>
            {u.permissions.length > 0 && <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">{u.permissions.length} admin module{u.permissions.length === 1 ? '' : 's'}</span>}
          </div>
          <p className="mt-1 text-[12.5px] text-ink-3">{u.email}{u.mobile ? ` · ${u.mobile}` : ''} · joined {fmtDate(u.createdAt)}{u.createdBy ? ` · added by ${u.createdBy.name}` : ''}</p>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {([
              ['Posts', `${published}/${posted}`, 'published / total', 'file'],
              ['PACT seats', String(pacts.filter((p) => p.status === 'ACTIVE').length), `${pacts.length} ever`, 'map'],
              ['Leads received', String(leadsIn), 'as recipient', 'inbox'],
              ['Enquiries sent', String(leadsOut), 'as a client', 'mail'],
              ['Paid', inr(Number(paidSum._sum.totalAmount ?? 0)), 'all time', 'rupee'],
            ] as [string, string, string, IconName][]).map(([l, v, h, i]) => (
              <div key={l} className="rounded-lg bg-paper-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-3"><Icon name={i} className="h-3.5 w-3.5" />{l}</p>
                <p className="tabular font-display text-[17px] font-bold text-ink">{v}</p>
                <p className="text-[10px] text-ink-4">{h}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-[220px] shrink-0 flex-col gap-2">
          {u.status === 'PENDING_VERIFICATION' && (
            <>
              <form action={verifyUserFormAction}>
                <input type="hidden" name="userId" value={u.id} />
                <button type="submit" className="w-full rounded-lg bg-ok px-3 py-2 text-[12.5px] font-semibold text-white">Verify &amp; activate</button>
              </form>
              <RejectVerification userId={u.id} />
            </>
          )}
          {mayChangeStatus && u.status !== 'PENDING_VERIFICATION' && (
            <form action={bulkUserAction}>
              <input type="hidden" name="ids" value={u.id} />
              {u.status === 'ACTIVE'
                ? <button type="submit" name="status" value="SUSPEND" className="w-full rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger">Suspend account</button>
                : <button type="submit" name="status" value="ACTIVATE" className="w-full rounded-lg bg-ok-soft px-3 py-2 text-[12.5px] font-semibold text-ok">Activate account</button>}
            </form>
          )}
          {isStaff && can(me.role, 'admin:employees', me.permissions) && <EmployeeRowActions id={u.id} name={u.name} suspended={u.status === 'SUSPENDED'} />}
          {!mayChangeStatus && u.status !== 'PENDING_VERIFICATION' && (
            <p className="rounded-lg bg-paper-2 px-3 py-2 text-[11px] text-ink-3">{isSuper ? 'Super Admin accounts cannot be changed here.' : u.id === me.id ? 'This is your own account.' : 'Only a Super Admin can change a staff account.'}</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-[1.15fr_1fr] gap-5">
        <div className="space-y-5">
          <Panel title="Profile">
            <dl className="grid grid-cols-2 gap-x-6">
              {profileRows.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line-soft py-2 text-[12.5px]">
                  <dt className="text-ink-3">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {extraRows.length > 0 && (
              <>
                <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Captured when the account was added</p>
                <dl className="grid grid-cols-2 gap-x-6">
                  {extraRows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-line-soft py-2 text-[12.5px]">
                      <dt className="text-ink-3">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Panel>

          <Panel title="Verification documents" subtitle={String(u.verificationDocs.length)}>
            {u.verificationDocs.length === 0 ? (
              <p className="pb-3 text-[12.5px] text-ink-3">No documents yet.</p>
            ) : (
              <ul className="mb-4 divide-y divide-line-soft">
                {u.verificationDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-3 text-ink-3"><Icon name="file" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[12.5px] font-semibold text-ink hover:text-brand">{d.docName}</a>
                      <span className="block truncate text-[11px] text-ink-3">{d.fileName} · {Math.max(1, Math.round(d.sizeBytes / 1024))} KB · {d.uploadedBy?.name ?? 'member'} · {ago(d.createdAt)}{d.reviewedBy ? ` · reviewed by ${d.reviewedBy.name}` : ''}</span>
                    </span>
                    <span className={'shrink-0 rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (d.status === 'ACCEPTED' ? 'bg-ok-soft text-ok' : d.status === 'REJECTED' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn')}>{nice(d.status)}</span>
                    {d.status !== 'ACCEPTED' && (
                      <form action={reviewDocumentAction}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="status" value="ACCEPTED" />
                        <button type="submit" className="rounded-md bg-ok-soft px-2 py-1 text-[11px] font-semibold text-ok">Accept</button></form>
                    )}
                    {d.status !== 'REJECTED' && (
                      <form action={reviewDocumentAction}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="status" value="REJECTED" />
                        <button type="submit" className="rounded-md bg-danger-soft px-2 py-1 text-[11px] font-semibold text-danger">Reject</button></form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <DocUpload userId={u.id} types={docTypes.map((d) => ({ id: d.id, name: d.name, required: d.required }))} />
          </Panel>

          {isStaff && (
            <Panel title="Admin module access" subtitle={me.role === 'SUPER_ADMIN' ? 'on top of the role' : 'read only'}>
              {me.role === 'SUPER_ADMIN' ? (
                <AccessEditor userId={u.id} current={u.permissions} modules={GRANTABLE} presets={PRESETS} />
              ) : (
                <p className="text-[12.5px] text-ink-3">{u.permissions.length ? GRANTABLE.filter((g) => u.permissions.includes(g.key)).map((g) => g.label).join(', ') : 'No extra modules.'}</p>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="PACT territories" subtitle={String(pacts.length)}>
            {pacts.length === 0 ? <p className="text-[12.5px] text-ink-3">No PACT seats.</p> : (
              <ul className="divide-y divide-line-soft">
                {pacts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                    <Link href={`/admin/pact?q=${p.pincode}`} className="font-mono font-semibold text-ink hover:text-brand">{p.pincode}</Link>
                    <span className="flex-1 truncate text-ink-3">{p.serviceType}{p.city ? ` · ${p.city}` : ''}</span>
                    <span className="text-[11px] text-ink-3">{p.expiresAt ? `to ${fmtDate(p.expiresAt)}` : '—'}</span>
                    <span className="rounded-pill bg-paper-3 px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">{nice(p.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Plans & membership">
            {subs.length === 0 && clubs.length === 0 ? <p className="text-[12.5px] text-ink-3">No plan or club membership.</p> : (
              <ul className="divide-y divide-line-soft">
                {subs.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                    <span className="font-medium text-ink">{s.planName} plan</span>
                    <span className="text-ink-3">{inr(Number(s.price))} · until {fmtDate(s.expiresAt)}</span>
                    <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (s.status === 'ACTIVE' && s.expiresAt >= now ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{s.status === 'ACTIVE' && s.expiresAt >= now ? 'Active' : 'Ended'}</span>
                  </li>
                ))}
                {clubs.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                    <span className="font-medium text-ink">Club — {c.planName}</span>
                    <span className="text-ink-3">{c.isFree ? 'Free' : ''} until {fmtDate(c.expiresAt)}</span>
                    <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (c.expiresAt >= now ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{c.expiresAt >= now ? 'Active' : 'Ended'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Latest posts" subtitle={String(posted)}>
            {recentPosts.length === 0 ? <p className="text-[12.5px] text-ink-3">Nothing posted.</p> : (
              <ul className="divide-y divide-line-soft">
                {recentPosts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                    <span className="min-w-0 truncate font-medium text-ink">{p.title}</span>
                    <span className="shrink-0 text-[11px] text-ink-3">{nice(p.type)} · {nice(p.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Payments">
            {payments.length === 0 ? <p className="text-[12.5px] text-ink-3">No payments.</p> : (
              <ul className="divide-y divide-line-soft">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-[12.5px]">
                    <span className="text-ink-2">{nice(p.purpose)}</span>
                    <span className="tabular text-ink">{inr(Number(p.totalAmount))}</span>
                    <span className="text-[11px] text-ink-3">{fmtDate(p.createdAt)}</span>
                    <span className="rounded-pill bg-paper-3 px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">{nice(p.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Support tickets">
            {tickets.length === 0 ? <p className="text-[12.5px] text-ink-3">No tickets.</p> : (
              <ul className="divide-y divide-line-soft">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/admin/support?view=${t.id}`} className="flex items-center justify-between gap-2 py-2 text-[12.5px] hover:text-brand">
                      <span className="min-w-0 truncate font-medium">{t.subject}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{nice(t.status)} · {ago(t.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Activity">
            {audit.length === 0 ? <p className="text-[12.5px] text-ink-3">No recorded activity.</p> : (
              <ol className="space-y-2">
                {audit.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[12px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="min-w-0 flex-1 text-ink-2">
                      {nice(a.action)}{a.actorId && a.actorId !== id ? ` — by ${a.actor?.name ?? 'staff'}` : ''}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-ink-4">{ago(a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
