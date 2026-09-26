import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { can } from '@/config/permissions'
import { AdminPageHead, MiniStat, Panel, Pagination, ago, fmtDate } from '@/components/admin/parts'
import { TicketReply, TicketTriage } from './ticket-controls'

export const metadata: Metadata = { title: 'Support Tickets' }
export const dynamic = 'force-dynamic'

/**
 * Support Tickets — every ticket a member raises from Help & Support, with
 * the conversation, triage (status · priority · owner) and replies that reach
 * the member in-app and by email.
 */

const PER_PAGE = 12
const TABS: { key: string; label: string; where: Prisma.SupportTicketWhereInput }[] = [
  { key: 'active', label: 'Active', where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
  { key: 'OPEN', label: 'Open', where: { status: 'OPEN' } },
  { key: 'IN_PROGRESS', label: 'In Progress', where: { status: 'IN_PROGRESS' } },
  { key: 'RESOLVED', label: 'Resolved', where: { status: 'RESOLVED' } },
  { key: 'CLOSED', label: 'Closed', where: { status: 'CLOSED' } },
  { key: 'mine', label: 'Assigned to me', where: {} },
]
const STATUS_PILL: Record<string, string> = {
  OPEN: 'bg-warn-soft text-warn', IN_PROGRESS: 'bg-[#EAF2FF] text-[#2563EB]', RESOLVED: 'bg-ok-soft text-ok', CLOSED: 'bg-paper-3 text-ink-3',
}
const PRIORITY_PILL: Record<string, string> = {
  LOW: 'text-ink-4', NORMAL: 'text-ink-3', HIGH: 'text-warn', URGENT: 'text-danger',
}
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string; view?: string }>
}) {
  const me = await requirePermission('admin:support')
  const canTrust = can(me.role, 'admin:audit', me.permissions)
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]
  const page = Math.max(1, Number(sp.page) || 1)
  const q = (sp.q ?? '').trim().slice(0, 80)

  const where: Prisma.SupportTicketWhereInput = {
    ...(tab.key === 'mine' ? { assigneeId: me.id } : tab.where),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: 'insensitive' as const } },
            { message: { contains: q, mode: 'insensitive' as const } },
            { user: { name: { contains: q, mode: 'insensitive' as const } } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const [rows, total, counts, mine, new7, staffReplies, detail, staff] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, subject: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true,
        user: { select: { name: true, role: true } }, assignee: { select: { name: true } }, _count: { select: { replies: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.supportTicket.count({ where: { assigneeId: me.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.supportTicket.count({ where: { createdAt: { gte: since7 } } }),
    // First-response time: each ticket's first staff reply vs when it was raised.
    prisma.supportReply.findMany({
      where: { isStaff: true },
      orderBy: { createdAt: 'asc' },
      distinct: ['ticketId'],
      take: 500,
      select: { createdAt: true, ticket: { select: { createdAt: true } } },
    }),
    sp.view && /^[a-z0-9]{10,40}$/i.test(sp.view)
      ? prisma.supportTicket.findUnique({
          where: { id: sp.view },
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true, role: true } },
            replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } },
          },
        })
      : Promise.resolve(null),
    prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'RM_EMPLOYEE'] }, status: 'ACTIVE', deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 200,
    }),
  ])
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0
  const spans = staffReplies.map((r) => r.createdAt.getTime() - r.ticket.createdAt.getTime()).filter((ms) => ms >= 0)
  const avgFirst = spans.length
    ? (() => { const h = spans.reduce((a, b) => a + b, 0) / spans.length / 3_600_000; return h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days` })()
    : '—'

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { tab: tab.key === 'active' ? undefined : tab.key, q: q || undefined, ...over }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? `/admin/support?${s}` : '/admin/support'
  }

  return (
    <div className="space-y-5">
      <AdminPageHead title="Support Tickets" />

      <section className="grid grid-cols-5 gap-4">
        <MiniStat icon="alert" label="Open" value={countOf('OPEN')} tint={{ bg: '#FEF2E2', fg: '#EA9412' }} hint="waiting for a first reply" />
        <MiniStat icon="clock" label="In progress" value={countOf('IN_PROGRESS')} tint={{ bg: '#EAF2FF', fg: '#2563EB' }} hint="conversation ongoing" />
        <MiniStat icon="check" label="Resolved" value={countOf('RESOLVED') + countOf('CLOSED')} tint={{ bg: '#E7F7EE', fg: '#16A34A' }} hint="resolved or closed" />
        <MiniStat icon="user" label="Assigned to me" value={mine} tint={{ bg: '#F3EAFE', fg: '#8B5CF6' }} hint="still active" />
        <MiniStat icon="trending" label="Avg. first response" value={avgFirst} tint={{ bg: '#FFEEE0', fg: '#F97316' }} hint={`${new7} new in 7 days`} />
      </section>

      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {TABS.map((t) => (
              <Link key={t.key} href={qs({ tab: t.key === 'active' ? undefined : t.key, page: undefined, view: undefined })}
                className={'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' + (tab.key === t.key ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4')}>
                {t.label}
              </Link>
            ))}
            <form method="get" className="ml-auto flex gap-2">
              {tab.key !== 'active' && <input type="hidden" name="tab" value={tab.key} />}
              <input name="q" defaultValue={q} placeholder="Search subject, member…" className="h-9 w-[220px] rounded-lg border border-line bg-white px-3 text-[12.5px] focus:border-brand focus:outline-none" />
              <button type="submit" className="h-9 rounded-lg bg-brand px-3.5 text-[12.5px] font-semibold text-white">Search</button>
            </form>
          </div>

          <Panel title={`${tab.label} tickets`} subtitle={String(total)}>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">No tickets here.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {rows.map((t) => (
                  <li key={t.id}>
                    <Link href={qs({ page: page > 1 ? String(page) : undefined, view: t.id })}
                      className={'row-hover flex items-center gap-3 rounded-lg px-2 py-3 ' + (detail?.id === t.id ? 'bg-brand-soft/40' : '')}>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-ink">{t.subject}</span>
                          <span className={'shrink-0 text-[10.5px] font-bold uppercase ' + PRIORITY_PILL[t.priority]}>{t.priority !== 'NORMAL' ? t.priority.toLowerCase() : ''}</span>
                        </span>
                        <span className="block truncate text-[11.5px] text-ink-3">
                          #{t.id.slice(-6).toUpperCase()} · {t.user.name} · {t.category} · {t._count.replies} repl{t._count.replies === 1 ? 'y' : 'ies'}{t.assignee ? ` · ${t.assignee.name}` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (STATUS_PILL[t.status] ?? '')}>{label(t.status)}</span>
                        <span className="text-[10.5px] text-ink-4">{ago(t.updatedAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination page={page} pages={pages} makeHref={(n) => qs({ page: String(n) })} perPageLabel={`${PER_PAGE} per page`} />
              </div>
            )}
          </Panel>
        </div>

        {/* conversation */}
        {detail && (
          <aside className="w-[380px] shrink-0 space-y-4 rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Ticket #{detail.id.slice(-6).toUpperCase()}</p>
                <h2 className="font-display text-[15px] font-bold text-ink">{detail.subject}</h2>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  <Link href={`/admin/users/${detail.user.id}`} className="font-medium text-brand hover:underline">{detail.user.name}</Link>
                  {' · '}{detail.user.email}{detail.user.mobile ? ` · ${detail.user.mobile}` : ''}
                </p>
              </div>
              <Link href={qs({ page: page > 1 ? String(page) : undefined, view: undefined })} aria-label="Close" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-4 hover:bg-paper-3"><Icon name="alert" className="h-4 w-4 rotate-45" /></Link>
            </div>

            <TicketTriage id={detail.id} status={detail.status} priority={detail.priority} assigneeId={detail.assigneeId} staff={staff} />

            <ol className="max-h-[380px] space-y-3 overflow-y-auto border-y border-line-soft py-3">
              <li className="rounded-lg bg-paper-2 p-3">
                <p className="text-[11px] font-semibold text-ink-2">{detail.user.name} <span className="font-normal text-ink-4">· {fmtDate(detail.createdAt)}</span></p>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{detail.message}</p>
              </li>
              {detail.replies.map((r) => (
                <li key={r.id} className={'rounded-lg p-3 ' + (r.isStaff ? 'ml-6 bg-[#EEF1FF]' : 'mr-6 bg-paper-2')}>
                  <p className="text-[11px] font-semibold text-ink-2">
                    {r.author.name}{r.isStaff ? ' · ArchFacing' : ''} <span className="font-normal text-ink-4">· {ago(r.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{r.body}</p>
                </li>
              ))}
            </ol>

            <TicketReply id={detail.id} disabled={detail.status === 'CLOSED'} />
            {canTrust && (
              <Link href={`/admin/trust?ticket=${detail.id}`} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger hover:underline">
                <Icon name="alert" className="h-3.5 w-3.5" /> File as a complaint
              </Link>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
