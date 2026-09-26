import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { AdminPageHead, MiniStat, Panel, fmtDate } from '@/components/admin/parts'
import { registrationOpAction, setEventStatusAction } from './actions'
import { ClubPlanRow, EventEditor, type EventDraft } from './club-forms'

export const metadata: Metadata = { title: 'Club & Events' }
export const dynamic = 'force-dynamic'

/**
 * Club & Events — the ArchFacing Club run from one place: events (create,
 * edit, publish, cancel, complete), who registered and who came, club
 * members, and the club membership plans.
 */

const TABS = [
  { key: 'events', label: 'Events' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'members', label: 'Members' },
  { key: 'plans', label: 'Club Plans' },
] as const
const EV_PILL: Record<string, string> = {
  DRAFT: 'bg-paper-3 text-ink-3', PUBLISHED: 'bg-ok-soft text-ok', CANCELLED: 'bg-danger-soft text-danger', COMPLETED: 'bg-[#EAF2FF] text-[#2563EB]',
}
const REG_PILL: Record<string, string> = {
  PENDING_PAYMENT: 'bg-warn-soft text-warn', CONFIRMED: 'bg-ok-soft text-ok', CANCELLED: 'bg-paper-3 text-ink-3', ATTENDED: 'bg-[#EAF2FF] text-[#2563EB]',
}
const nice = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')
/** A Date as the value a datetime-local input expects, in local time. */
const local = (d: Date | null) => {
  if (!d) return ''
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 16)
}

export default async function AdminClubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string; new?: string; event?: string; status?: string }>
}) {
  await requirePermission('admin:club')
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? 'events'
  const now = new Date()

  const [events, upcoming, activeMembers, regStats, revenue, plans, planMembers] = await Promise.all([
    prisma.clubEvent.findMany({
      orderBy: { startsAt: 'desc' },
      take: 60,
      select: { id: true, slug: true, title: true, type: true, status: true, startsAt: true, endsAt: true, city: true, isOnline: true, totalSeats: true, seatsTaken: true, _count: { select: { registrations: true } } },
    }),
    prisma.clubEvent.count({ where: { status: 'PUBLISHED', startsAt: { gte: now } } }),
    prisma.clubMembership.count({ where: { expiresAt: { gte: now } } }),
    prisma.clubRegistration.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: 'PAID', purpose: { in: ['CLUB_EVENT', 'CLUB_MEMBERSHIP'] } }, _sum: { totalAmount: true } }),
    prisma.clubPlan.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.clubMembership.groupBy({ by: ['planName'], where: { expiresAt: { gte: now } }, _count: { _all: true } }),
  ])
  const regOf = (s: string) => regStats.find((r) => r.status === s)?._count._all ?? 0

  // editor
  const editing = sp.edit && /^[a-z0-9]{10,40}$/i.test(sp.edit)
    ? await prisma.clubEvent.findUnique({
        where: { id: sp.edit },
        include: { speakers: { orderBy: { sortOrder: 'asc' } }, agenda: { orderBy: { sortOrder: 'asc' } }, faqs: { orderBy: { sortOrder: 'asc' } } },
      })
    : null
  const draft: EventDraft | null = editing
    ? {
        id: editing.id, title: editing.title, type: editing.type, summary: editing.summary, description: editing.description,
        heroImage: editing.heroImage, startsAt: local(editing.startsAt), endsAt: local(editing.endsAt), isOnline: editing.isOnline,
        venueName: editing.venueName ?? '', venueAddress: editing.venueAddress ?? '', city: editing.city ?? '',
        contactPhone: editing.contactPhone ?? '', contactEmail: editing.contactEmail ?? '', totalSeats: editing.totalSeats,
        standardPrice: Number(editing.standardPrice), earlyBirdPrice: editing.earlyBirdPrice != null ? String(Number(editing.earlyBirdPrice)) : '',
        earlyBirdTill: local(editing.earlyBirdTill), spotPrice: editing.spotPrice != null ? String(Number(editing.spotPrice)) : '',
        taxPercent: Number(editing.taxPercent), includes: editing.includes.join('\n'), audience: editing.audience.join('\n'),
        speakers: editing.speakers.map((s) => [s.name, s.role, s.company, s.photo].join(' | ')).join('\n'),
        agenda: editing.agenda.map((a) => [a.startTime, a.endTime, a.title, a.speaker ?? ''].join(' | ')).join('\n'),
        faqs: editing.faqs.map((q) => `${q.question} | ${q.answer}`).join('\n'),
      }
    : sp.new
      ? {
          title: '', type: 'SEMINAR', summary: '', description: '', heroImage: '', startsAt: '', endsAt: '', isOnline: false,
          venueName: '', venueAddress: '', city: '', contactPhone: '', contactEmail: '', totalSeats: 100, standardPrice: 0,
          earlyBirdPrice: '', earlyBirdTill: '', spotPrice: '', taxPercent: 18, includes: '', audience: '', speakers: '', agenda: '', faqs: '',
        }
      : null

  // registrations tab
  const regEvent = sp.event && /^[a-z0-9]{10,40}$/i.test(sp.event) ? sp.event : undefined
  const regStatus = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'ATTENDED'].includes(sp.status ?? '') ? sp.status : undefined
  const registrations = tab === 'registrations'
    ? await prisma.clubRegistration.findMany({
        where: { ...(regEvent ? { eventId: regEvent } : {}), ...(regStatus ? { status: regStatus as never } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { event: { select: { title: true } }, user: { select: { id: true, name: true, email: true } } },
      })
    : []
  const members = tab === 'members'
    ? await prisma.clubMembership.findMany({
        orderBy: { expiresAt: 'desc' },
        take: 100,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      })
    : []

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Club & Events"
        action={
          <>
            <Link href="/club" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4">Public club page</Link>
            <Link href="/admin/club?new=1" className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-hover"><Icon name="plus" className="h-4 w-4" /> New event</Link>
          </>
        }
      />

      <section className="grid grid-cols-5 gap-4">
        <MiniStat icon="calendar" label="Upcoming events" value={upcoming} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="published and ahead" />
        <MiniStat icon="users" label="Confirmed seats" value={regOf('CONFIRMED')} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint={`${regOf('ATTENDED')} attended so far`} />
        <MiniStat icon="clock" label="Awaiting payment" value={regOf('PENDING_PAYMENT')} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint="seats held" />
        <MiniStat icon="award" label="Active club members" value={activeMembers} tint={{ bg: '#F3EAFE', fg: '#8B5CF6' }} hint="membership running" />
        <MiniStat icon="rupee" label="Club revenue" value={'₹' + Math.round(Number(revenue._sum.totalAmount ?? 0)).toLocaleString('en-IN')} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint="events + memberships, paid" />
      </section>

      {draft && (
        <Panel title={draft.id ? `Edit — ${draft.title}` : 'New event'} action={<Link href="/admin/club" className="text-[12px] font-semibold text-ink-3 hover:text-brand">Close</Link>}>
          <EventEditor e={draft} />
        </Panel>
      )}

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key === 'events' ? '/admin/club' : `/admin/club?tab=${t.key}`}
            className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium ' + (tab === t.key ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4')}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'events' && (
        <Panel title="Events" subtitle={String(events.length)}>
          {events.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-3">No events yet — create the first one.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                  <th className="py-2 font-semibold">Event</th><th className="py-2 font-semibold">When</th><th className="py-2 font-semibold">Seats</th>
                  <th className="py-2 font-semibold">Status</th><th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {events.map((e) => {
                  const over = e.endsAt < now
                  const fill = e.totalSeats ? Math.round((e.seatsTaken / e.totalSeats) * 100) : 0
                  return (
                    <tr key={e.id} className="text-[12.5px]">
                      <td className="py-2.5 pr-2">
                        <span className="block font-semibold text-ink">{e.title}</span>
                        <span className="block text-[11px] text-ink-3">{nice(e.type)} · {e.isOnline ? 'Online' : e.city ?? '—'}</span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-2 text-ink-2">{fmtDate(e.startsAt)}{over && <span className="block text-[10.5px] text-ink-4">finished</span>}</td>
                      <td className="py-2.5 pr-2">
                        <span className="tabular text-ink-2">{e.seatsTaken} / {e.totalSeats}</span>
                        <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-paper-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${fill}%` }} /></span>
                      </td>
                      <td className="py-2.5 pr-2"><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + EV_PILL[e.status]}>{nice(e.status)}</span></td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Link href={`/admin/club?edit=${e.id}`} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-2 hover:border-brand hover:text-brand">Edit</Link>
                          <Link href={`/admin/club?tab=registrations&event=${e.id}`} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-2 hover:border-brand hover:text-brand">{e._count.registrations} regs</Link>
                          {e.status === 'PUBLISHED' && <Link href={`/club/events/${e.slug}`} className="rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-2 hover:border-brand hover:text-brand">View</Link>}
                          {(e.status === 'DRAFT' ? ['PUBLISHED'] : e.status === 'PUBLISHED' ? (over ? ['COMPLETED'] : ['DRAFT', 'CANCELLED']) : e.status === 'CANCELLED' ? ['DRAFT'] : []).map((to) => (
                            <form key={to} action={setEventStatusAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="status" value={to} />
                              <button type="submit" className={'rounded-md px-2 py-1 text-[11px] font-semibold ' + (to === 'PUBLISHED' ? 'bg-ok-soft text-ok' : to === 'CANCELLED' ? 'bg-danger-soft text-danger' : to === 'COMPLETED' ? 'bg-[#EAF2FF] text-[#2563EB]' : 'bg-paper-3 text-ink-3')}>
                                {{ PUBLISHED: 'Publish', DRAFT: 'Unpublish', CANCELLED: 'Cancel event', COMPLETED: 'Mark completed' }[to]}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'registrations' && (
        <Panel
          title="Registrations"
          subtitle={String(registrations.length)}
          action={
            <form method="get" className="flex gap-1.5">
              <input type="hidden" name="tab" value="registrations" />
              <select name="event" defaultValue={regEvent ?? ''} className="h-8 rounded-lg border border-line bg-white px-2 text-[12px]">
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
              <select name="status" defaultValue={regStatus ?? ''} className="h-8 rounded-lg border border-line bg-white px-2 text-[12px]">
                <option value="">Any status</option>
                {['CONFIRMED', 'PENDING_PAYMENT', 'ATTENDED', 'CANCELLED'].map((s) => <option key={s} value={s}>{nice(s)}</option>)}
              </select>
              <button type="submit" className="h-8 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white">Filter</button>
            </form>
          }
        >
          {registrations.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-3">No registrations match.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                  <th className="py-2 font-semibold">Member</th><th className="py-2 font-semibold">Event</th><th className="py-2 font-semibold">Ticket</th>
                  <th className="py-2 font-semibold">Paid</th><th className="py-2 font-semibold">Status</th><th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {registrations.map((r) => (
                  <tr key={r.id} className="text-[12.5px]">
                    <td className="py-2.5"><Link href={`/admin/users/${r.user.id}`} className="font-medium text-ink hover:text-brand">{r.user.name}</Link><span className="block text-[10.5px] text-ink-4">{r.user.email}</span></td>
                    <td className="py-2.5 text-ink-2">{r.event.title}</td>
                    <td className="py-2.5 font-mono text-[11.5px] text-ink-2">{r.ticketCode}</td>
                    <td className="tabular py-2.5 text-ink-2">{Number(r.amount) > 0 ? `₹${(Number(r.amount) + Number(r.taxAmount)).toLocaleString('en-IN')} · ${nice(r.tier)}` : 'Free'}</td>
                    <td className="py-2.5"><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + REG_PILL[r.status]}>{nice(r.status)}</span></td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        {r.status === 'CONFIRMED' && (
                          <form action={registrationOpAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="ATTENDED" />
                            <button type="submit" className="rounded-md bg-[#EAF2FF] px-2 py-1 text-[11px] font-semibold text-[#2563EB]">Mark attended</button></form>
                        )}
                        {(r.status === 'CONFIRMED' || r.status === 'PENDING_PAYMENT') && (
                          <form action={registrationOpAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="CANCEL" />
                            <button type="submit" className="rounded-md bg-danger-soft px-2 py-1 text-[11px] font-semibold text-danger">Cancel</button></form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'members' && (
        <Panel title="Club members" subtitle={String(members.length)}>
          {members.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-3">Nobody has joined the club yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-4">
                  <th className="py-2 font-semibold">Member</th><th className="py-2 font-semibold">Plan</th><th className="py-2 font-semibold">Paid</th>
                  <th className="py-2 font-semibold">From</th><th className="py-2 font-semibold">Until</th><th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {members.map((m) => {
                  const live = m.expiresAt >= now
                  return (
                    <tr key={m.id} className="text-[12.5px]">
                      <td className="py-2.5"><Link href={`/admin/users/${m.user.id}`} className="font-medium text-ink hover:text-brand">{m.user.name}</Link><span className="block text-[10.5px] capitalize text-ink-4">{m.user.role.toLowerCase().replace('_', ' ')}</span></td>
                      <td className="py-2.5 text-ink-2">{m.planName}</td>
                      <td className="tabular py-2.5 text-ink-2">{m.isFree ? 'Free (DA)' : `₹${Number(m.price).toLocaleString('en-IN')}`}</td>
                      <td className="py-2.5 text-ink-3">{fmtDate(m.startsAt)}</td>
                      <td className="py-2.5 text-ink-3">{fmtDate(m.expiresAt)}</td>
                      <td className="py-2.5"><span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (live ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>{live ? 'Active' : 'Expired'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'plans' && (
        <Panel title="Club membership plans">
          {plans.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-3">No club plans exist yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {plans.map((p) => (
                <ClubPlanRow key={p.id} p={{
                  id: p.id, name: p.name, price: Number(p.price), months: p.months, taxPercent: Number(p.taxPercent),
                  benefits: p.benefits, isActive: p.isActive, members: planMembers.find((x) => x.planName === p.name)?._count._all ?? 0,
                }} />
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
