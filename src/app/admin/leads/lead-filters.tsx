'use client'

import { useRouter, useSearchParams } from 'next/navigation'

/**
 * The filter bar — Enquiry Type · Category · Location (Pincode) · Project ·
 * Assigned To · Date Range · Reset, exactly as the reference. No submit button:
 * changing any control applies immediately (client-side navigation). Every
 * control filters the list: Project is the listing an enquiry came from,
 * Assigned To the staff owner, Date Range the received date (inclusive).
 */

type Opt = { value: string; label: string }

export function LeadFilters({
  sources, categories, locations, projects, assignees, current,
}: {
  sources: Opt[]; categories: Opt[]; locations: Opt[]; projects: Opt[]; assignees: Opt[]
  current: { source?: string; category?: string; location?: string; tab?: string; q?: string; project?: string; assignee?: string; from?: string; to?: string }
}) {
  const router = useRouter()
  const params = useSearchParams()

  const go = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (!value || value === 'all') p.delete(key)
    else p.set(key, value)
    p.delete('page'); p.delete('view')
    const s = p.toString()
    router.push(s ? `/admin/leads?${s}` : '/admin/leads')
  }

  const reset = () => {
    const p = new URLSearchParams()
    if (current.tab && current.tab !== 'all') p.set('tab', current.tab)
    const s = p.toString()
    router.push(s ? `/admin/leads?${s}` : '/admin/leads')
  }

  return (
    <div className="rise rise-2 flex flex-wrap items-end gap-3 rounded-card border border-line bg-white p-4 shadow-card">
      <Field label="Enquiry Type">
        <select value={current.source ?? 'all'} onChange={(e) => go('source', e.target.value)} className={SEL}>
          {sources.map((o) => <option key={o.value} value={o.value}>{o.label === 'All Sources' ? 'All Types' : o.label}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select value={current.category ?? 'all'} onChange={(e) => go('category', e.target.value)} className={SEL}>
          {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Location (Pincode)">
        <select value={current.location ?? 'all'} onChange={(e) => go('location', e.target.value)} className={SEL}>
          {locations.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Project">
        <select value={current.project ?? 'all'} onChange={(e) => go('project', e.target.value)} className={SEL}>
          {projects.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Assigned To">
        <select value={current.assignee ?? 'all'} onChange={(e) => go('assignee', e.target.value)} className={SEL}>
          {assignees.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Date Range">
        <span className="flex gap-1">
          <input type="date" aria-label="From" value={current.from ?? ''} max={current.to} onChange={(e) => go('from', e.target.value)} className={SEL + ' px-1.5'} />
          <input type="date" aria-label="To" value={current.to ?? ''} min={current.from} onChange={(e) => go('to', e.target.value)} className={SEL + ' px-1.5'} />
        </span>
      </Field>
      <button type="button" onClick={reset} className="flex h-9 items-center rounded-lg border border-line px-4 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4">Reset</button>
    </div>
  )
}

const SEL = 'h-9 w-full rounded-lg border border-line bg-paper-2 px-3 text-[12.5px] text-ink-2 focus:border-brand focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 flex-1 basis-[120px]"><label className="mb-1 block text-[11px] font-medium text-ink-3">{label}</label>{children}</div>
}
