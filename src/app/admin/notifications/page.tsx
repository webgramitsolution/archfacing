import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminShell } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { AdminPageHead, MiniStat, Panel, Pagination, ago } from '@/components/admin/parts'
import { markAllNotificationsReadAction } from './actions'

export const metadata: Metadata = { title: 'Notifications' }
export const dynamic = 'force-dynamic'

const PER_PAGE = 20

/** Icon + tint by notification type prefix — purely presentational. */
function look(type: string): { icon: IconName; bg: string; fg: string } {
  if (type.startsWith('VERIFICATION') || type.startsWith('BUYER') || type.startsWith('ACCOUNT')) return { icon: 'shield', bg: '#E7F7EE', fg: '#16A34A' }
  if (type.startsWith('LEAD') || type.includes('ENQUIRY')) return { icon: 'inbox', bg: '#EAF2FF', fg: '#2563EB' }
  if (type.startsWith('PACT')) return { icon: 'map', bg: '#E3F6F5', fg: '#0D9488' }
  if (type.startsWith('AD_')) return { icon: 'star', bg: '#FFEEE0', fg: '#F97316' }
  if (type.startsWith('POST') || type.includes('REVIEW')) return { icon: 'file', bg: '#F3EAFE', fg: '#8B5CF6' }
  if (type.includes('PAYMENT')) return { icon: 'rupee', bg: '#FEF7E0', fg: '#D97706' }
  return { icon: 'bell', bg: '#EEF1FF', fg: '#6366F1' }
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  const me = await requireAdminShell()
  const sp = await searchParams
  const unreadOnly = sp.filter === 'unread'
  const page = Math.max(1, Number(sp.page) || 1)
  const where = { userId: me.id, ...(unreadOnly ? { isRead: false } : {}) }

  const [rows, total, unread, today] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: me.id, isRead: false } }),
    prisma.notification.count({ where: { userId: me.id, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ])
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const href = (p: number) => `/admin/notifications?${unreadOnly ? 'filter=unread&' : ''}page=${p}`

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Notifications"
        action={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-navy/90">
                <Icon name="check" className="h-4 w-4" /> Mark all as read
              </button>
            </form>
          ) : null
        }
      />

      <section className="grid grid-cols-3 gap-4">
        <MiniStat icon="bell" label="Unread" value={unread} tint={{ bg: '#FFE4E6', fg: '#E11D48' }} hint={unread ? 'waiting for you' : 'all caught up'} />
        <MiniStat icon="clock" label="Today" value={today} tint={{ bg: '#EAF2FF', fg: '#2563EB' }} hint="received since midnight" />
        <MiniStat icon="list" label="All notifications" value={unreadOnly ? unread : total} tint={{ bg: '#EEF1FF', fg: '#6366F1' }} hint="kept for your account" />
      </section>

      <Panel
        title={unreadOnly ? 'Unread' : 'All notifications'}
        action={
          <div className="flex gap-1.5">
            {[{ k: '', l: 'All' }, { k: 'unread', l: `Unread (${unread})` }].map((t) => (
              <Link
                key={t.l}
                href={t.k ? '/admin/notifications?filter=unread' : '/admin/notifications'}
                className={'rounded-pill px-3 py-1 text-[12px] font-medium ' + ((t.k === 'unread') === unreadOnly ? 'bg-brand text-white' : 'border border-line text-ink-2 hover:border-ink-4')}
              >
                {t.l}
              </Link>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-3">{unreadOnly ? 'Nothing unread.' : 'No notifications yet.'}</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {rows.map((n) => {
              const l = look(n.type)
              return (
                <li key={n.id}>
                  {/* No prefetch: opening this route marks the notification read. */}
                  <Link href={`/admin/notifications/open?id=${n.id}`} prefetch={false} className="row-hover flex items-start gap-3 rounded-lg px-2 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: l.bg, color: l.fg }}>
                      <Icon name={l.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={'block text-[13px] ' + (n.isRead ? 'font-medium text-ink-2' : 'font-bold text-ink')}>{n.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">{n.body}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="whitespace-nowrap text-[11px] text-ink-4">{ago(n.createdAt)}</span>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {pages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination page={page} pages={pages} makeHref={href} perPageLabel={`${PER_PAGE} per page`} />
          </div>
        )}
      </Panel>
    </div>
  )
}
