'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * The phone Filters sheet (Projects / Products), per the client's reference: a
 * "Filters" button with an active-count badge that opens a full-height overlay
 * panel — collapsible sections, an optional in-section search, single-select
 * options (the listing query takes one value per field), and a sticky
 * "Clear All / Apply Filters" footer. Apply composes the query and navigates.
 */
export type FilterSection = {
  key: string
  label: string
  /** Show a search box that filters this section's options as you type. */
  searchable?: boolean
  /** The value currently applied (from the URL). */
  value: string
  options: { value: string; label: string; count?: number }[]
}

export function PhoneFilterSheet({
  basePath,
  carried,
  sections,
}: {
  basePath: string
  /** Params kept as-is on Apply — q, sort, view, and any desktop-only ones.
   *  An array value is appended once per entry (e.g. a multi-value colour). */
  carried: Record<string, string | string[] | undefined>
  sections: FilterSection[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(sections.map((s) => [s.key, s.value]))
  )

  const appliedCount = sections.filter((s) => s.value).length

  function apply() {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(carried)) {
      if (Array.isArray(v)) v.forEach((x) => x && p.append(k, x))
      else if (v) p.set(k, v)
    }
    for (const [k, v] of Object.entries(draft)) if (v) p.set(k, v)
    const qs = p.toString()
    setOpen(false)
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  function clearAll() {
    setDraft(Object.fromEntries(sections.map((s) => [s.key, ''])))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(Object.fromEntries(sections.map((s) => [s.key, s.value])))
          setOpen(true)
        }}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-ink"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z" /></svg>
        </span>
        Filters
        {appliedCount > 0 && (
          <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {appliedCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col bg-white shadow-lift">
            {/* header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <h2 className="font-display text-[18px] font-bold text-ink">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-paper-3">
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            {/* sections */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-1">
              {sections.map((s) => (
                <FilterGroup
                  key={s.key}
                  section={s}
                  value={draft[s.key] ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, [s.key]: v }))}
                />
              ))}
            </div>

            {/* footer */}
            <div className="flex gap-3 border-t border-line px-4 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
              <button type="button" onClick={clearAll} className="flex-1 rounded-lg border border-line bg-white py-2.5 text-[14px] font-semibold text-ink">
                Clear All
              </button>
              <button type="button" onClick={apply} className="flex-[1.4] rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FilterGroup({
  section,
  value,
  onChange,
}: {
  section: FilterSection
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? section.options.filter((o) => o.label.toLowerCase().includes(needle)) : section.options
  }, [q, section.options])

  return (
    <div className="border-b border-line-soft py-3.5 last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between">
        <span className="font-display text-[15px] font-bold text-ink">{section.label}</span>
        <svg viewBox="0 0 24 24" aria-hidden className={cn('h-4 w-4 text-ink-3 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="mt-3">
          {section.searchable && (
            <label className="relative mb-2.5 block">
              <span className="sr-only">Search {section.label}</span>
              <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${section.label.toLowerCase()}…`}
                className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-8 pr-3 text-[12.5px] text-ink outline-none focus:border-brand"
              />
            </label>
          )}
          <ul className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
            {/* "All" clears this section */}
            <FilterRow label={`All ${section.label}`} checked={!value} onSelect={() => onChange('')} />
            {shown.map((o) => (
              <FilterRow
                key={o.value}
                label={o.count !== undefined ? `${o.label} (${o.count})` : o.label}
                checked={value === o.value}
                onSelect={() => onChange(o.value)}
              />
            ))}
            {shown.length === 0 && <li className="px-1 py-2 text-[12px] text-ink-3">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <li>
      <button type="button" onClick={onSelect} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left">
        <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-brand' : 'border-line')}>
          {checked && <span className="h-2 w-2 rounded-full bg-brand" />}
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[13px]', checked ? 'font-semibold text-ink' : 'text-ink-2')}>{label}</span>
      </button>
    </li>
  )
}

/**
 * The phone listing selects (Products / Projects).
 *
 * A plain <select> inside (or attached by `form=` to) the page's GET filter
 * form. Picking an option submits that form straight away, so the phone never
 * needs an "Apply" tap — the filter tile beside the selects still submits it
 * for anyone without JavaScript.
 */
export function PhoneSelect({
  name,
  label,
  srLabel,
  value,
  options,
  form,
  className = '',
}: {
  name: string
  /** The first, empty option — also the accessible name unless `srLabel` is given. */
  label: string
  srLabel?: string
  value: string
  options: { value: string; label: string }[]
  form?: string
  className?: string
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{srLabel ?? label}</span>
      <select
        name={name}
        form={form}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 w-full min-w-0 appearance-none truncate rounded-[10px] border border-line bg-white pl-2.5 pr-6 text-[12px] font-semibold text-ink outline-none focus:border-brand"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  )
}
