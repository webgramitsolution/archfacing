import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MemberReplyForm } from './reply-form'

export const metadata = { title: 'My Support Tickets · ArchFacing' }

const STATUS: Record<string, { label: string; pill: string }> = {
  OPEN: { label: 'Open', pill: 'pill-warn' },
  IN_PROGRESS: { label: 'In Progress', pill: 'pill-info' },
  RESOLVED: { label: 'Resolved', pill: 'pill-ok' },
  CLOSED: { label: 'Closed', pill: 'pill-muted' },
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MyTicketsPage() {
  const user = await requireAuth()
  const tickets = await prisma.supportTicket
    .findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    })
    .catch(() => [])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
            <Icon name="file" className="h-6 w-6" />
          </span>
          <h1 className="font-display text-[20px] font-bold leading-tight text-navy">My Support Tickets</h1>
        </div>
        <Link href="/dashboard/help" className="btn-outline px-4 py-2 text-[13px]">
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          Back to Help
        </Link>
      </header>

      {tickets.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-ink-3">
            <Icon name="file" className="h-6 w-6" />
          </span>
          <p className="mt-3 font-display text-[15px] font-bold text-ink">No tickets yet</p>
          <p className="mt-1 max-w-sm text-[12.5px] text-ink-3">
            When you raise a support ticket it appears here with its status.
          </p>
          <Link href="/dashboard/help" className="btn-primary mt-4 px-4 py-2 text-[13px]">
            <Icon name="plus" className="h-4 w-4" />
            Raise a ticket
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-line-soft overflow-hidden">
          {tickets.map((t) => {
            const s = STATUS[t.status] ?? STATUS.OPEN
            return (
              <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-ink">{t.subject}</p>
                    <span className={cn('pill text-[10px] capitalize', 'bg-paper-3 text-ink-3')}>{t.category}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 max-w-2xl text-[12px] leading-snug text-ink-3">{t.message}</p>
                  <p className="tabular mt-1.5 text-[11px] text-ink-4">
                    #{t.id.slice(-6).toUpperCase()} · Raised {fmt(t.createdAt)}
                  </p>
                  {/* The conversation with ArchFacing support. */}
                  {t.replies.length > 0 && (
                    <ol className="mt-3 space-y-2">
                      {t.replies.map((r) => (
                        <li key={r.id} className={cn('rounded-lg p-3', r.isStaff ? 'mr-8 bg-info-soft/60' : 'ml-8 bg-paper-2')}>
                          <p className="text-[11px] font-semibold text-ink-2">
                            {r.isStaff ? 'ArchFacing Support' : 'You'} <span className="font-normal text-ink-4">· {fmt(r.createdAt)}</span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">{r.body}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                  {t.status !== 'CLOSED' && <MemberReplyForm id={t.id} />}
                </div>
                <span className={cn('pill shrink-0 text-[11px]', s.pill)}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
