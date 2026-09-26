import { cn } from '@/lib/utils'

/**
 * Shared UI pieces — styled to match the mockup.
 * Every page is built from these so the whole site looks consistent.
 */

// ═══════════════════════════════════════════════════════════
//  Icons — one stroke style, one size
// ═══════════════════════════════════════════════════════════

export type IconName =
  | 'map' | 'users' | 'star' | 'check' | 'arrow' | 'search' | 'bell'
  | 'grid' | 'help' | 'user' | 'box' | 'bag' | 'chart' | 'shield'
  | 'clock' | 'rupee' | 'file' | 'mail' | 'phone' | 'plus' | 'alert'
  | 'settings' | 'tag' | 'inbox' | 'calendar'
  // Subject marks. An article about energy, water or waste needs an icon that
  // says so — the twenty-five above are interface furniture, and reusing a cog
  // for "Energy Efficiency" reads as a mistake.
  | 'bolt' | 'droplet' | 'recycle' | 'leaf' | 'wind' | 'sun'
  | 'home' | 'trending' | 'heart' | 'coins' | 'globe' | 'award'
  // Merchandise shelves. The row above the catalogue names what is in each
  // one, and a cog standing for "Tools & Hardware" was doing nobody any good.
  | 'sofa' | 'chair' | 'lamp' | 'dining' | 'tap' | 'wrench' | 'building' | 'cart'
  // Advertising. The placement tiles and the stats rail each name a thing the
  // interface set above has no mark for — an impression is an eye, a slot is
  // a screen, a competition is a cup.
  | 'eye' | 'target' | 'monitor' | 'image' | 'trophy' | 'mobile' | 'list' | 'download'
  | 'edit' | 'share' | 'globe2' | 'copy' | 'trash' | 'dots'

const PATHS: Record<IconName, React.ReactNode> = {
  map: (<><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>),
  users: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
  star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />,
  check: <path d="M20 6L9 17l-5-5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  bell: (<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  help: (<><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01" /></>),
  user: (<><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  box: (<><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></>),
  bag: (<><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 01-8 0" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></>),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  rupee: <path d="M6 3h12M6 8h12M15.5 3c0 5-3.5 5-3.5 5H6l7.5 8" />,
  file: (<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>),
  mail: (<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 6 10-6" /></>),
  phone: <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  alert: (<><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></>),
  tag: (<><path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
  inbox: (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.4 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z" /></>),
  calendar: (<><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M3 10h18M8 2.5v4M16 2.5v4" /></>),

  // ── subject marks ──
  bolt: <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" />,
  droplet: <path d="M12 2.7l5.1 5.9a6.8 6.8 0 11-10.2 0z" />,
  recycle: (<><path d="M8.8 4.6l2-3.1a1.5 1.5 0 012.5 0l2.3 3.6" /><path d="M18.6 8.5l1.8 3a1.5 1.5 0 01-1.3 2.3H15" /><path d="M9 13.8H5a1.5 1.5 0 00-1.3 2.3l1.9 3.1a1.5 1.5 0 001.3.7h3.6" /><path d="M11.4 11.4L9 13.8l2.4 2.4M17 6.6l-2.5 1 1 2.6M8.6 19.9l-1.3-2.5 2.6-1.1" /></>),
  leaf: (<><path d="M20.5 3.5c0 9.4-4.6 14-13.5 14a5.5 5.5 0 010-11c6.5 0 8.5-1 13.5-3z" /><path d="M3.5 21c2.5-5.5 6-9 10.5-11" /></>),
  wind: (<><path d="M3 8h10a3 3 0 10-3-3" /><path d="M3 12.5h14.5a3 3 0 11-3 3" /><path d="M3 17h7.5a2.5 2.5 0 11-2.5 2.5" /></>),
  sun: (<><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" /></>),
  home: (<><path d="M3.5 10.2L12 3.2l8.5 7v9.3a1.5 1.5 0 01-1.5 1.5H5a1.5 1.5 0 01-1.5-1.5z" /><path d="M9.5 21V13h5v8" /></>),
  trending: (<><path d="M3 20V4" /><path d="M3 20h18" /><path d="M6.5 15.5l4-4.5 3 2.5 5.5-6.5" /><path d="M14.5 7h4.5v4.5" /></>),
  heart: <path d="M12 20.5l-7.6-7.3a4.6 4.6 0 116.5-6.5l1.1 1.1 1.1-1.1a4.6 4.6 0 116.5 6.5z" />,
  coins: (<><ellipse cx="12" cy="5.8" rx="7.5" ry="3.3" /><path d="M4.5 5.8v4.4c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3V5.8" /><path d="M4.5 10.2v4.4c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3v-4.4" /></>),
  globe: (<><circle cx="12" cy="12" r="9.2" /><path d="M2.8 12h18.4" /><path d="M12 2.8a14.5 14.5 0 010 18.4 14.5 14.5 0 010-18.4z" /></>),
  award: (<><circle cx="12" cy="8.5" r="5.7" /><path d="M8.2 12.8L7 22l5-2.7 5 2.7-1.2-9.2" /></>),

  // ── merchandise shelves ──
  sofa: (<><path d="M4.5 11V8a2 2 0 012-2h11a2 2 0 012 2v3" /><path d="M4.5 11a2 2 0 00-2 2v3h19v-3a2 2 0 00-2-2 2 2 0 00-2 2v1h-11v-1a2 2 0 00-2-2z" /><path d="M4.5 19v1.5M19.5 19v1.5" /></>),
  chair: (<><path d="M6.5 10V6a2.5 2.5 0 012.5-2.5h6A2.5 2.5 0 0117.5 6v4" /><path d="M6.5 10a2 2 0 00-2 2v3h15v-3a2 2 0 00-2-2z" /><path d="M6 15v5.5M18 15v5.5M4.5 15h15" /></>),
  lamp: (<><path d="M12 2v3.5" /><path d="M12 5.5L5 14h14z" /><path d="M9.6 14a2.4 2.4 0 004.8 0" /><path d="M12 16.4v3.1" /><path d="M9.5 21.5h5" /></>),
  dining: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.2" /><path d="M4.4 8.2h15.2" /></>),
  // Bathroom reads as a shower head over a basin: the spray is the part a
  // person recognises at 28px, which a bare tap spout does not give you.
  tap: (<><path d="M12 2.5v4" /><path d="M7.5 6.5h9l-1.4 3H8.9z" /><path d="M9.2 12.2v.01M12 12.2v.01M14.8 12.2v.01M10.6 14.6v.01M13.4 14.6v.01" /><path d="M3.5 18h17" /><path d="M5.5 18a6.5 6.5 0 0113 0" /></>),
  // Hardware reads as a screwdriver crossed with a spanner — one tool alone
  // says "settings", two crossed say "tools".
  wrench: (<><path d="M6.4 3.2a3.4 3.4 0 00-.7 5.4l1.9 1.9-2 2 7.9 7.9a2.2 2.2 0 003.1-3.1l-7.9-7.9 2-2-1.9-1.9a3.4 3.4 0 00-2.4-2.3z" /><path d="M18.5 3.5l-9.9 9.9" /><path d="M16.2 5.8l2.3 2.3" /><path d="M17.4 2.6l3.9 3.9-1.6 1.6-3.9-3.9z" /></>),
  // ── advertising ──
  eye: (<><path d="M1.8 12S5.5 5.2 12 5.2 22.2 12 22.2 12 18.5 18.8 12 18.8 1.8 12 1.8 12z" /><circle cx="12" cy="12" r="3.2" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>),
  monitor: (<><rect x="2.5" y="3.5" width="19" height="13" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.6" cy="9.4" r="1.7" /><path d="M3.4 17.2l4.8-4.6 3.6 3.3 3.3-3 5.1 4.6" /></>),
  trophy: (<><path d="M7.5 3.5h9v5a4.5 4.5 0 11-9 0z" /><path d="M7.5 5.2H4.8a2.7 2.7 0 002.7 2.7M16.5 5.2h2.7a2.7 2.7 0 01-2.7 2.7" /><path d="M12 13v3.8M8.6 20.5h6.8l-.8-3.7H9.4z" /></>),
  mobile: (<><rect x="6.5" y="2.5" width="11" height="19" rx="2.4" /><path d="M10.6 18.6h2.8" /></>),
  list: (<><path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" /><path d="M3.7 6.5h.01M3.7 12h.01M3.7 17.5h.01" /></>),
  download: (<><path d="M12 3.5v11" /><path d="M7.8 10.5L12 14.7l4.2-4.2" /><path d="M4 16.5v2.4A1.6 1.6 0 005.6 20.5h12.8a1.6 1.6 0 001.6-1.6v-2.4" /></>),

  cart: (<><circle cx="9.5" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3h2.6l2.6 12.1a1.6 1.6 0 001.6 1.3h8.4a1.6 1.6 0 001.6-1.3L21 7.2H5.9" /></>),
  building: (<><path d="M4 21V5.5A1.5 1.5 0 015.5 4h8A1.5 1.5 0 0115 5.5V21" /><path d="M15 10h3.5A1.5 1.5 0 0120 11.5V21" /><path d="M2.5 21h19" /><path d="M7.5 8h1M11 8h1M7.5 12h1M11 12h1M7.5 16h1M11 16h1M17.5 14h1M17.5 17.5h1" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>),
  share: (<><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" /></>),
  globe2: (<><circle cx="12" cy="12" r="9.2" /><path d="M2.8 12h18.4" /><path d="M12 2.8a14.5 14.5 0 010 18.4 14.5 14.5 0 010-18.4z" /></>),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></>),
  trash: (<><path d="M3.5 6h17" /><path d="M8 6V4.5A1.5 1.5 0 019.5 3h5A1.5 1.5 0 0116 4.5V6" /><path d="M5.5 6l1 13a1.5 1.5 0 001.5 1.4h8a1.5 1.5 0 001.5-1.4l1-13" /><path d="M10 10.5v6M14 10.5v6" /></>),
  dots: (<><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></>),
}

export function Icon({
  name,
  className,
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('h-[18px] w-[18px]', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════
//  Page heading
// ═══════════════════════════════════════════════════════════

export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  // Page heading only — the description line was removed from every dashboard
  // page on request. `children` is accepted still so callers compile unchanged.
  void children
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Stat card — icon + number, as in the mockup
// ═══════════════════════════════════════════════════════════

export function StatCard({
  icon,
  value,
  label,
  tone = 'brand',
}: {
  icon: IconName
  value: string | number
  label: string
  tone?: 'brand' | 'ok' | 'info' | 'warn' | 'muted'
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    ok: 'bg-ok-soft text-ok',
    info: 'bg-info-soft text-info',
    warn: 'bg-warn-soft text-warn',
    muted: 'bg-paper-3 text-ink-3',
  }

  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className={cn('chip-icon', tones[tone])}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="tabular block font-display text-[20px] font-bold leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 block truncate text-[12.5px] text-ink-3">
          {label}
        </span>
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Empty state
// ═══════════════════════════════════════════════════════════

export function EmptyState({
  icon = 'inbox',
  title,
  children,
  action,
}: {
  icon?: IconName
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="chip-icon mb-4 h-12 w-12 bg-paper-3 text-ink-3">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="font-display text-[16px] font-semibold text-ink">{title}</p>
      {children && (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-2">
          {children}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Section heading
// ═══════════════════════════════════════════════════════════

export function SectionHead({
  title,
  children,
  action,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">
          {title}
        </h2>
        {children && (
          <p className="mt-1 text-[13px] text-ink-3">{children}</p>
        )}
      </div>
      {action}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Callout
// ═══════════════════════════════════════════════════════════

export function Callout({
  tone = 'brand',
  icon,
  title,
  children,
  action,
}: {
  tone?: 'brand' | 'ok' | 'info' | 'warn'
  icon?: IconName
  title?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const tones = {
    brand: 'border-brand-border bg-brand-soft',
    ok: 'border-ok/25 bg-ok-soft',
    info: 'border-info/25 bg-info-soft',
    warn: 'border-warn/25 bg-warn-soft',
  }
  const iconTones = {
    brand: 'text-brand',
    ok: 'text-ok',
    info: 'text-info',
    warn: 'text-warn',
  }

  return (
    <div className={cn('rounded-card border p-5', tones[tone])}>
      <div className="flex gap-3.5">
        {icon && (
          <span className={cn('shrink-0 pt-0.5', iconTones[tone])}>
            <Icon name={icon} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <p className="font-display text-[15px] font-semibold text-ink">
              {title}
            </p>
          )}
          <div className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            {children}
          </div>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Data table
// ═══════════════════════════════════════════════════════════

export function DataTable({
  head,
  children,
  bare = false,
}: {
  head: string[]
  children: React.ReactNode
  /** Inside a Panel/card already — draw the table only, no second card around it. */
  bare?: boolean
}) {
  return (
    <div className={bare ? 'overflow-hidden' : 'card overflow-hidden'}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-paper-3">
              {head.map((h) => (
                <th
                  key={h}
                  className="eyebrow whitespace-nowrap px-4 py-2.5 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn('border-b border-line-soft px-4 py-3 align-middle', className)}>
      {children}
    </td>
  )
}
