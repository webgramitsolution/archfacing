import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/** The white card every settings sub-page sits in, with the matching header. */
export function SettingsPanel({
  icon,
  title,
  subtitle,
  action,
  children,
  tone = 'info',
}: {
  icon: IconName
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  tone?: 'info' | 'danger'
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-card',
              tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-info-soft text-info'
            )}
          >
            <Icon name={icon} className="h-5 w-5" />
          </span>
          <div>
            <h2 className={cn('font-display text-[18px] font-bold leading-tight', tone === 'danger' ? 'text-danger' : 'text-navy')}>
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 py-5 md:px-6">{children}</div>
    </section>
  )
}

/** A read-only row of label → value, for the overview and info panels. */
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft py-3 last:border-0">
      <span className="text-[12.5px] font-medium text-ink-3">{label}</span>
      <span className="text-[13.5px] font-semibold text-ink">{value}</span>
    </div>
  )
}

/**
 * A "this is managed elsewhere" panel — used where a settings item already has
 * a fuller home (the profile editor, the notification grid) so nothing is
 * duplicated or allowed to drift.
 */
export function ManagedElsewhere({
  icon,
  title,
  subtitle,
  points,
  href,
  cta,
}: {
  icon: IconName
  title: string
  subtitle: string
  points: string[]
  href: string
  cta: string
}) {
  return (
    <SettingsPanel icon={icon} title={title} subtitle={subtitle}>
      <ul className="mb-5 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-2">
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
              <Icon name="check" className="h-3 w-3" />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <Link href={href} className="btn-primary px-5 py-2.5">
        {cta}
        <Icon name="arrow" className="h-4 w-4" />
      </Link>
    </SettingsPanel>
  )
}
