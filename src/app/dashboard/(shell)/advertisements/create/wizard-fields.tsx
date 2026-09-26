'use client'

import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The form furniture the wizard's seven steps share.
 *
 * Kept apart from the steps themselves so a step file reads as its own
 * content — what the step asks for — rather than as markup for a label and a
 * border repeated fourteen times.
 */

// ═══════════════════════════════════════════════════════════
//  Step frame
// ═══════════════════════════════════════════════════════════

const TIP_TONE = {
  warn: { band: 'bg-warn-soft text-warn', icon: 'help' },
  info: { band: 'bg-info-soft text-info', icon: 'help' },
  ok: { band: 'bg-ok-soft text-ok', icon: 'check' },
} as const satisfies Record<string, { band: string; icon: IconName }>

export function StepCard({
  step,
  title,
  subtitle,
  tip,
  tipTone = 'warn',
  aside,
  children,
  footer,
}: {
  step: number
  title: string
  subtitle: string
  /** The hint line under the heading. Omitted when there is nothing useful to say. */
  tip?: string
  /**
   * Which kind of hint it is — the blueprint gives each of the three a
   * different colour, because they are three different kinds of remark: a
   * suggestion (amber), a fact about how the form works (blue) and a piece of
   * good news (green).
   */
  tipTone?: keyof typeof TIP_TONE
  /** A control on the right of the heading — "Compare Plans" and the like. */
  aside?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-start gap-3 border-b border-line-soft px-5 py-4">
        {/* The mint pin the blueprint puts at the head of all seven steps. */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-ok-soft text-ok">
          <Icon name="map" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-ink-3">Step {step} of 7</p>
          <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>
        </div>
        {aside}
      </header>

      {tip && (
        <p
          className={cn(
            'flex items-start gap-2 border-b border-line-soft px-5 py-2.5 text-[12px]',
            TIP_TONE[tipTone].band
          )}
        >
          <Icon name={TIP_TONE[tipTone].icon} className="mt-[2px] h-3.5 w-3.5 shrink-0" />
          {tip}
        </p>
      )}

      <div className="px-5 py-5">{children}</div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-paper-2 px-5 py-4">
        {footer}
      </footer>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════
//  Inputs
// ═══════════════════════════════════════════════════════════

export function Field({
  label,
  required,
  hint,
  count,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  /** "24/100" — drawn on the right of the label row. */
  count?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink">
          {label}
          {required && <span className="ml-1 text-brand">*</span>}
        </span>
        {count && <span className="tabular text-[11px] text-ink-4">{count}</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  max?: number
}) {
  return (
    <input
      type={type}
      value={value}
      maxLength={max}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="input h-10 py-0 text-[13px]"
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  max?: number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      maxLength={max}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="input resize-y py-2.5 text-[13px]"
    />
  )
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input h-10 py-0 text-[13px]"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/**
 * A checkbox that reads as one.
 *
 * The native control is kept — it is what a screen reader and the keyboard
 * operate — and the square beside it is drawn from its checked state, so the
 * two can never disagree.
 */
export function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    // `relative` is load-bearing: Tailwind's `sr-only` is position:absolute,
    // and with no positioned ancestor the hidden input's containing block is
    // the document — it then escapes the dashboard's scroll container and
    // stretches the page, producing a second scrollbar beside the first.
    <label className="relative flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30',
          checked ? 'border-brand bg-brand text-white' : 'border-line bg-paper'
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"
            strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="text-[12.5px] text-ink-2">{label}</span>
    </label>
  )
}

/** A many-of list, drawn as removable chips over a picker. */
export function MultiSelect({
  values,
  onChange,
  options,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const remaining = options.filter((o) => !values.includes(o.value))

  return (
    <div>
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...values, e.target.value])}
        disabled={remaining.length === 0}
        className="input h-10 py-0 text-[13px]"
      >
        <option value="">{remaining.length === 0 ? 'All selected' : placeholder}</option>
        {remaining.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v
            return (
              <li key={v}>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((x) => x !== v))}
                  className="relative flex items-center gap-1.5 rounded-card border border-brand-border bg-brand-soft px-2.5 py-1 text-[11.5px] font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  {label}
                  <span aria-hidden>×</span>
                  <span className="sr-only">Remove</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** A free-text many-of list — PIN codes, cities typed by hand. */
export function TagInput({
  values,
  onChange,
  placeholder,
  pattern,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  /** Rejects anything that does not match, e.g. a 6-digit PIN. */
  pattern?: RegExp
}) {
  return (
    <div>
      <input
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ',') return
          e.preventDefault()
          const el = e.currentTarget
          const raw = el.value.trim().replace(/,$/, '')
          if (!raw) return
          if (pattern && !pattern.test(raw)) return
          if (!values.includes(raw)) onChange([...values, raw])
          el.value = ''
        }}
        className="input h-10 py-0 text-[13px]"
      />

      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="tabular relative flex items-center gap-1.5 rounded-card border border-line bg-paper-3 px-2.5 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-danger hover:text-danger"
              >
                {v}
                <span aria-hidden>×</span>
                <span className="sr-only">Remove</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Buttons
// ═══════════════════════════════════════════════════════════

export function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-card border border-line bg-paper px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-ink-3 disabled:opacity-50"
    >
      <span aria-hidden>←</span> Back
    </button>
  )
}

export function ContinueButton({
  label,
  onClick,
  busy,
  disabled,
}: {
  label: string
  onClick: () => void
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="btn-primary gap-2 px-6"
    >
      {busy ? 'Saving…' : label}
      {!busy && <Icon name="arrow" className="h-4 w-4" />}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
//  Side panels
// ═══════════════════════════════════════════════════════════

export function GuidelineList({
  title,
  items,
  icon = 'check',
}: {
  title: string
  items: string[]
  icon?: IconName
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 font-display text-[13.5px] font-bold text-ink">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon name={icon} className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ok" />
            <span className="text-[11.5px] leading-snug text-ink-2">{i}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="mb-4 flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger">
      <Icon name="alert" className="mt-[2px] h-4 w-4 shrink-0" />
      {message}
    </p>
  )
}
