import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import {
  CampaignThumb, FactRow, StatusPill, TypePill,
  compact, dateRange, dateTime, money, shortDate, ago,
} from '@/components/dashboard/advertiser-parts'
import type { CampaignView } from '@/lib/advertiser'
import { cn } from '@/lib/utils'
import { DraftRowActions } from './draft-row-actions'

/**
 * The two ways a campaign is drawn in a list.
 *
 * The design uses cards where the reader is being told a story about one
 * campaign — what is happening to it, how far along it is — and a table where
 * they are comparing campaigns against each other. Pending and Drafts are
 * cards; Active, Scheduled, Completed and Rejected are tables.
 */

// ═══════════════════════════════════════════════════════════
//  Card — Pending Approval
// ═══════════════════════════════════════════════════════════

export function PendingCard({ c }: { c: CampaignView }) {
  return (
    <li className="card p-4">
      <div className="flex flex-col gap-4 md:flex-row lg:items-start">
        <CampaignThumb src={c.imageUrl} alt={c.title} className="h-[76px] w-[124px]" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 font-display text-[14.5px] font-bold text-ink">{c.title}</h3>
            {c.adType && <TypePill name={c.adType.name} slug={c.adType.slug} />}
          </div>

          {c.description && (
            <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-3">{c.description}</p>
          )}

          <div className="mt-3.5 grid gap-4 sm:grid-cols-3">
            <FactRow
              icon="monitor"
              label="Placement"
              value={c.placements[0]?.name ?? 'Not selected'}
            />
            <FactRow
              icon="users"
              label="Target Audience"
              value={audienceLabel(c)}
            />
            <FactRow icon="calendar" label="Duration" value={dateRange(c.startsAt, c.endsAt)} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <StatusPill status={c.status} />
          <p className="text-[11px] text-ink-3">
            Submitted on
            <br />
            <span className="tabular font-medium text-ink-2">
              {dateTime(c.submittedAt ?? c.createdAt)}
            </span>
          </p>
          <Link
            href={`/dashboard/advertisements/${c.id}`}
            className="mt-1 w-full rounded-card border border-line px-4 py-2 text-center text-[12px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand lg:w-auto"
          >
            View Details
          </Link>
        </div>
      </div>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
//  Card — Drafts
// ═══════════════════════════════════════════════════════════

export function DraftCard({ c }: { c: CampaignView }) {
  return (
    <li className="card p-4">
      <div className="flex flex-col gap-4 md:flex-row lg:items-start">
        <CampaignThumb src={c.imageUrl} alt={c.title} className="h-[96px] w-[150px]" />

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[14.5px] font-bold text-ink">{c.title}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusPill status={c.status} />
            <span className="text-[11.5px] text-ink-3">Last modified {ago(c.updatedAt)}</span>
          </div>

          {c.description && (
            <p className="mt-2 line-clamp-1 text-[12.5px] text-ink-3">{c.description}</p>
          )}

          <div className="mt-3.5 grid gap-4 sm:grid-cols-3">
            <FactRow icon="image" label="Type" value={c.adType?.name ?? 'Not selected'} />
            <FactRow
              icon="monitor"
              label="Placement"
              value={c.placements[0]?.name ?? 'Not selected'}
            />
            <FactRow icon="users" label="Target Audience" value={audienceLabel(c)} />
          </div>
        </div>

        {/* ─── progress ─── */}
        <div className="w-full shrink-0 lg:w-[240px] xl:w-[280px]">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11.5px] font-semibold text-ink-2">Campaign Progress</span>
            <span className="tabular text-[11.5px] font-bold text-ink">{c.progress.percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-paper-3">
            <div
              className="h-full rounded-pill bg-brand"
              style={{ width: `${c.progress.percent}%` }}
            />
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 lg:grid-cols-1">
            {c.progress.steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                {s.done ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                    <Icon name="check" className="h-2.5 w-2.5" />
                  </span>
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-line" />
                )}
                <span
                  className={cn(
                    'truncate text-[11.5px]',
                    s.done ? 'font-semibold text-ink' : 'text-ink-3'
                  )}
                >
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── actions ─── */}
        <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[142px]">
          <Link
            href={`/dashboard/advertisements/create?draft=${c.id}`}
            className="btn-primary w-full text-[12.5px]"
          >
            Continue Editing
          </Link>
          <DraftAction icon="eye" label="Preview" href={`/dashboard/advertisements/${c.id}`} />
          <DraftRowActions id={c.id} />
        </div>
      </div>
    </li>
  )
}

function DraftAction({
  icon,
  label,
  href,
  danger,
}: {
  icon: IconName
  label: string
  href: string
  danger?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-card border px-3 py-2 text-[12px] font-medium transition-colors',
        danger
          ? 'border-line text-danger hover:border-danger hover:bg-danger-soft'
          : 'border-line text-ink-2 hover:border-brand hover:text-brand'
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════
//  Table — Active, Scheduled, Completed, Rejected
// ═══════════════════════════════════════════════════════════

export type Column =
  | 'type'
  | 'placement'
  | 'schedule'
  | 'dates'
  | 'duration'
  | 'budget'
  | 'spend'
  | 'results'
  | 'performance'
  | 'submitted'
  | 'rejectedOn'
  | 'reason'

const HEADINGS: Record<Column, string> = {
  type: 'Type',
  placement: 'Placement',
  schedule: 'Scheduled Date & Time',
  dates: 'Start / End Date',
  duration: 'Duration',
  budget: 'Budget',
  spend: 'Spend',
  results: 'Results',
  performance: 'Performance',
  submitted: 'Submitted On',
  rejectedOn: 'Rejection Date',
  reason: 'Rejection Reason',
}

export function CampaignTable({
  rows,
  columns,
  action,
}: {
  rows: CampaignView[]
  columns: Column[]
  /** The button at the end of each row. */
  action: (c: CampaignView) => { label: string; href: string }
}) {
  /*
   * Cards, not a table.
   *
   * The table was eight columns wide — Campaign, Type, Placement, Dates,
   * Performance, Spend, Status, Action — which measured 1112px inside a 920px
   * column, so every one of these screens scrolled sideways inside its own
   * card and the campaign name was cut off. Narrowing the type would have
   * made it fit and unreadable.
   *
   * A card holds the same facts and fits: the creative and the name on the
   * left, the chosen facts as a labelled grid beneath, the status and the
   * action on the right. `columns` still chooses which facts each screen
   * shows, so no caller changes and no screen loses information.
   */
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((c) => {
        const a = action(c)

        return (
          <li key={c.id} className="card p-4">
            <div className="flex flex-col gap-4 md:flex-row lg:items-start">
              <CampaignThumb src={c.imageUrl} alt={c.title} className="h-[76px] w-[124px]" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 font-display text-[14.5px] font-bold text-ink">
                    {c.title}
                  </h3>
                  {c.adType && <TypePill name={c.adType.name} slug={c.adType.slug} />}
                </div>

                {c.headline && (
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-3">{c.headline}</p>
                )}

                <div className="mt-3.5 grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                  {columns.map((col) => (
                    <span key={col} className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-4">
                        {HEADINGS[col]}
                      </span>
                      <Cell col={col} c={c} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 flex-row items-center gap-3 lg:w-[132px] lg:flex-col lg:items-end">
                <StatusPill status={c.status} />
                <Link
                  href={a.href}
                  className="whitespace-nowrap rounded-card border border-line px-3.5 py-2 text-center text-[12px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand lg:w-full"
                >
                  {a.label}
                </Link>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Cell({ col, c }: { col: Column; c: CampaignView }) {
  switch (col) {
    case 'type':
      return <span className="text-[12px] text-ink-2">{c.adType?.name ?? '—'}</span>

    case 'placement':
      return (
        <span className="text-[12px] text-ink-2">
          {c.placements[0]?.name ?? '—'}
          {c.placements.length > 1 && (
            <span className="ml-1 text-[11px] text-ink-4">+{c.placements.length - 1}</span>
          )}
        </span>
      )

    case 'schedule':
      return (
        <span className="tabular block text-[12px] font-medium text-ink-2">
          {shortDate(c.startsAt)}
          <span className="block text-[11px] text-ink-3">{c.startTime ?? '00:00'}</span>
        </span>
      )

    case 'dates':
      return (
        <span className="tabular block text-[12px] text-ink-2">
          {shortDate(c.startsAt)}
          <span className="block text-[11px] text-ink-3">{shortDate(c.endsAt)}</span>
        </span>
      )

    case 'duration':
      return (
        <span className="tabular text-[12px] text-ink-2">
          {c.durationDays ? `${c.durationDays} Days` : '—'}
        </span>
      )

    case 'budget':
    case 'spend':
      return (
        <span className="tabular block text-[12px] font-semibold text-ink">
          {money(c.spend)}
          {col === 'budget' && c.durationDays > 0 && (
            <span className="block text-[10.5px] font-normal text-ink-3">
              Daily: {money(Math.round(c.spend / c.durationDays))}
            </span>
          )}
        </span>
      )

    case 'results':
      return (
        <span className="tabular flex flex-col gap-0.5 text-[11.5px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <Icon name="eye" className="h-3 w-3 text-info" />
            {compact(c.impressions)}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="target" className="h-3 w-3 text-brand" />
            {compact(c.clicks)}
          </span>
        </span>
      )

    case 'performance':
      return (
        <span className="tabular flex flex-col gap-0.5 text-[11.5px] text-ink-2">
          <span>{compact(c.impressions)} impressions</span>
          <span>
            {compact(c.clicks)} clicks · {c.ctr.toFixed(2)}% CTR
          </span>
          {c.daysLeft !== null && (
            <span className="text-[10.5px] text-ink-3">{c.daysLeft} days left</span>
          )}
        </span>
      )

    case 'submitted':
      return <span className="tabular text-[12px] text-ink-2">{shortDate(c.submittedAt)}</span>

    case 'rejectedOn':
      return <span className="tabular text-[12px] text-ink-2">{shortDate(c.reviewedAt)}</span>

    case 'reason':
      return (
        <span className="block max-w-[15rem]">
          {c.rejectionCode ? (
            <span className="inline-flex rounded-card bg-danger-soft px-2 py-[3px] text-[10.5px] font-semibold text-danger">
              {c.rejectionCode}
            </span>
          ) : (
            <span className="text-[12px] text-ink-3">—</span>
          )}
          {c.rejectionReason && (
            <span className="mt-1 block text-[11px] leading-snug text-ink-3">
              {c.rejectionReason}
            </span>
          )}
        </span>
      )
  }
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Who the campaign is aimed at, in a phrase.
 *
 * Roles first, because that is what the design prints; a campaign targeted
 * only by geography says so instead of claiming an audience it never set.
 */
export function audienceLabel(c: CampaignView): string {
  const t = c.targeting
  if (!t) return 'Not set'

  if (t.audienceRoles.length) {
    const shown = t.audienceRoles.slice(0, 2).map(prettyRole).join(', ')
    return t.audienceRoles.length > 2 ? `${shown} +${t.audienceRoles.length - 2}` : shown
  }
  if (t.cities.length) return t.cities.slice(0, 2).join(', ')
  if (t.pincodes.length) return `PACT ${t.pincodes[0]}`
  if (t.states.length) return t.states.slice(0, 2).join(', ')
  return 'Everyone'
}

function prettyRole(r: string): string {
  return r
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}
