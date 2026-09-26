import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageTitle, EmptyState, Icon, type IconName } from '@/components/ui'
import { SubmitButton } from '@/components/form'
import { markAllReadAction } from './actions'

export const metadata: Metadata = { title: 'Notifications' }

/**
 * The bell in the header has always linked here, but the route did not exist —
 * so every click 404'd. This is that page.
 *
 * Notification.type is a free-text column, so the glyph and tone are looked up
 * with a fallback rather than indexed blindly: an unknown type still renders,
 * just without a bespoke icon.
 */
const LOOK: Record<string, { icon: IconName; tone: string }> = {
  NEW_ENQUIRY: { icon: 'inbox', tone: 'bg-info-soft text-info' },
  PACT_EXPIRING: { icon: 'clock', tone: 'bg-warn-soft text-warn' },
  PAYMENT_SUCCESS: { icon: 'rupee', tone: 'bg-ok-soft text-ok' },
  POST_APPROVED: { icon: 'check', tone: 'bg-ok-soft text-ok' },
  POST_REJECTED: { icon: 'alert', tone: 'bg-brand-soft text-brand' },
  ORDER_PAID: { icon: 'bag', tone: 'bg-ok-soft text-ok' },
  CLUB_ACTIVE: { icon: 'star', tone: 'bg-brand-soft text-brand' },
  DA_APPROVED: { icon: 'shield', tone: 'bg-ok-soft text-ok' },
  AD_APPROVED: { icon: 'star', tone: 'bg-ok-soft text-ok' },
  AD_REJECTED: { icon: 'alert', tone: 'bg-brand-soft text-brand' },
  AD_PAID: { icon: 'rupee', tone: 'bg-ok-soft text-ok' },
  PORTAL_SPACE_ADDED: { icon: 'box', tone: 'bg-ok-soft text-ok' },
  PORTAL_SPACE_EXPIRED: { icon: 'box', tone: 'bg-warn-soft text-warn' },
}

const FALLBACK = { icon: 'bell' as IconName, tone: 'bg-paper-3 text-ink-3' }

function whenLabel(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function NotificationsPage() {
  const user = await requireAuth()

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const unread = items.filter((n) => !n.isRead).length

  return (
    <>

      <div>
        <PageTitle
          eyebrow="Your account"
          title="Notifications"
          action={
            unread > 0 ? (
              <form action={markAllReadAction}>
                <SubmitButton className="btn-outline" pendingLabel="Marking…">
                  Mark all as read
                </SubmitButton>
              </form>
            ) : undefined
          }
        >
          {unread > 0
            ? `${unread} unread of ${items.length}.`
            : items.length > 0
              ? 'You are all caught up.'
              : 'Anything that needs your attention will appear here.'}
        </PageTitle>

        {items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Nothing yet"
            action={
              <Link href="/dashboard" className="btn-primary">
                Back to dashboard
              </Link>
            }
          >
            Enquiries, payments, approvals and reminders all land here.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((n) => {
              const look = LOOK[n.type] ?? FALLBACK
              const row = (
                <span className="flex min-w-0 flex-1 gap-3.5">
                  <span className={`chip-icon shrink-0 ${look.tone}`}>
                    <Icon name={look.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[14px] font-bold text-ink">
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                      )}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-2">
                      {n.body}
                    </span>
                    <span className="mt-1.5 block text-[12px] text-ink-3">
                      {whenLabel(n.createdAt)}
                    </span>
                  </span>
                </span>
              )

              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className={`card-hover flex min-w-0 items-start p-4 ${
                        n.isRead ? '' : 'border-brand-border bg-brand-soft/30'
                      }`}
                    >
                      {row}
                      <Icon name="arrow" className="ml-2 mt-1 h-4 w-4 shrink-0 text-ink-4" />
                    </Link>
                  ) : (
                    <div
                      className={`card flex min-w-0 items-start p-4 ${
                        n.isRead ? '' : 'border-brand-border bg-brand-soft/30'
                      }`}
                    >
                      {row}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </>
  )
}
