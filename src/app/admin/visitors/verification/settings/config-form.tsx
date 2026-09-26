'use client'

import { useActionState, useState } from 'react'
import { Icon } from '@/components/ui'
import type { VerificationDocType } from '@/lib/verification-config'
import { saveVerificationConfigAction, type VerificationConfigState } from '../../actions'
import { CFG_FORM } from './form-id'

/**
 * The settings page is laid out in several panels, but it is ONE form: every
 * control carries form={CFG_FORM}, so a single Save writes the lot. (The
 * Messages panel is its own form and saves separately.)
 */

/** The form element itself plus its Save button and result — sits in the header. */
export function ConfigSaveBar() {
  const [state, action, pending] = useActionState<VerificationConfigState, FormData>(saveVerificationConfigAction, null)
  return (
    <form id={CFG_FORM} action={action} className="flex items-center gap-2">
      {state?.ok && !pending && <span role="status" className="text-[12px] font-medium text-ok">Settings saved</span>}
      {state && !state.ok && <span role="alert" className="max-w-[260px] text-right text-[11.5px] font-medium text-danger">{state.error}</span>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
      >
        <Icon name="check" className="h-4 w-4" /> {pending ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}

const APPLIES: { value: VerificationDocType['appliesTo']; label: string }[] = [
  { value: 'ALL', label: 'All User Types' },
  { value: 'BUYER', label: 'Buyers' },
  { value: 'COMPANY', label: 'Companies' },
  { value: 'PROFESSIONAL', label: 'Professionals' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'BMF', label: 'BMF' },
  { value: 'CORPORATE', label: 'Corporate' },
]
export const appliesLabel = (v: string) => APPLIES.find((a) => a.value === v)?.label ?? v

/**
 * 2. Document Types — add, rename, re-target, mark required, switch off,
 * remove. The list travels as JSON in one hidden field of the settings form.
 */
export function DocTypesEditor({ initial }: { initial: VerificationDocType[] }) {
  const [docs, setDocs] = useState(initial)
  const [draft, setDraft] = useState('')
  const [showAll, setShowAll] = useState(false)
  const patch = (id: string, p: Partial<VerificationDocType>) => setDocs((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const add = () => {
    const name = draft.trim()
    if (name.length < 2 || docs.some((d) => d.name.toLowerCase() === name.toLowerCase())) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) + '-' + Date.now().toString(36).slice(-4)
    setDocs((d) => [...d, { id, name, appliesTo: 'ALL', required: false, active: true }])
    setDraft('')
    setShowAll(true)
  }
  const visible = showAll ? docs : docs.slice(0, 8)
  const sel = 'h-7 rounded-md border border-line bg-white px-1 text-[11px] text-ink-2 focus:border-brand focus:outline-none'

  return (
    <div>
      <input type="hidden" form={CFG_FORM} name="documentTypes" value={JSON.stringify(docs)} />
      <div className="mb-3 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          maxLength={60}
          placeholder="New document type"
          aria-label="New document type"
          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-[12px] focus:border-brand focus:outline-none"
        />
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-2.5 text-[11px] font-semibold text-white">
          <Icon name="plus" className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-4">
              <th className="py-2 font-semibold">#</th>
              <th className="py-2 font-semibold">Document Type</th>
              <th className="py-2 font-semibold">Applicable For</th>
              <th className="py-2 font-semibold">Required</th>
              <th className="py-2 font-semibold">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {visible.map((d, i) => (
              <tr key={d.id} className="text-[11.5px]">
                <td className="py-1.5 text-ink-4">{i + 1}</td>
                <td className="py-1.5 pr-1">
                  <input value={d.name} maxLength={60} aria-label="Document name" onChange={(e) => patch(d.id, { name: e.target.value })} className="h-7 w-full min-w-[110px] rounded-md border border-transparent bg-transparent px-1 font-medium text-ink hover:border-line focus:border-brand focus:bg-white focus:outline-none" />
                </td>
                <td className="py-1.5 pr-1">
                  <select value={d.appliesTo} aria-label="Applicable for" onChange={(e) => patch(d.id, { appliesTo: e.target.value as VerificationDocType['appliesTo'] })} className={sel}>
                    {APPLIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </td>
                <td className="py-1.5">
                  <button type="button" onClick={() => patch(d.id, { required: !d.required })} className={'font-semibold ' + (d.required ? 'text-ok' : 'text-ink-4')}>
                    {d.required ? 'Yes' : 'No'}
                  </button>
                </td>
                <td className="py-1.5">
                  <button type="button" onClick={() => patch(d.id, { active: !d.active })} className={'rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ' + (d.active ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>
                    {d.active ? 'Active' : 'Off'}
                  </button>
                </td>
                <td className="py-1.5 text-right">
                  <button type="button" aria-label={`Remove ${d.name}`} onClick={() => setDocs((x) => x.filter((y) => y.id !== d.id))} className="rounded px-1.5 text-[13px] leading-none text-ink-4 hover:bg-danger-soft hover:text-danger">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {docs.length > 8 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[12px] font-semibold text-brand hover:underline">
          {showAll ? 'Show fewer' : `View all ${docs.length} document types →`}
        </button>
      )}
      <p className="mt-2 text-[10.5px] text-ink-4">Changes here are saved with “Save Settings”.</p>
    </div>
  )
}
