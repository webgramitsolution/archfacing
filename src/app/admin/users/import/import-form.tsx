'use client'

import { useActionState } from 'react'
import { importUsersAction, type ImportKind, type ImportResult } from './actions'

const KINDS: { value: ImportKind; label: string }[] = [
  { value: 'PROFESSIONAL', label: 'Professionals' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'CLIENT', label: 'Buyers / Clients' },
  { value: 'CORPORATE', label: 'Corporates' },
  { value: 'RM_EMPLOYEE', label: 'Employees' },
]

export function ImportForm({ initialKind, allowStaff }: { initialKind: ImportKind; allowStaff: boolean }) {
  const [state, action, pending] = useActionState<ImportResult, FormData>(importUsersAction, null)
  const kinds = KINDS.filter((k) => allowStaff || k.value !== 'RM_EMPLOYEE')
  const withPw = state?.created?.filter((c) => c.password) ?? []

  return (
    <div className="space-y-5">
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-white p-5 shadow-card">
        <label className="text-[11px] font-medium text-ink-3">Accounts in the file
          <select name="kind" defaultValue={initialKind} className="mt-0.5 block h-9 rounded-lg border border-line bg-white px-2 text-[12.5px]">
            {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <label className="min-w-[260px] flex-1 text-[11px] font-medium text-ink-3">CSV file (max 500 rows)
          <input name="file" type="file" accept=".csv,text/csv" required className="mt-0.5 block w-full text-[12px] file:mr-2 file:rounded-md file:border-0 file:bg-paper-3 file:px-2.5 file:py-1.5 file:text-[11.5px] file:font-semibold" />
        </label>
        <label className="flex h-9 items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" name="sendCredentials" defaultChecked className="h-3.5 w-3.5 accent-brand" /> Email login details</label>
        <button type="submit" disabled={pending} className="h-9 rounded-lg bg-navy px-5 text-[12.5px] font-semibold text-white disabled:opacity-60">{pending ? 'Importing…' : 'Import'}</button>
        {state && !state.ok && <p role="alert" className="w-full text-[12px] text-danger">{state.error}</p>}
      </form>

      {state?.ok && (
        <div className="grid grid-cols-2 gap-5">
          <section className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="font-display text-[14px] font-bold text-ok">{state.created?.length ?? 0} created</h2>
            {withPw.length > 0 && (
              <p className="mt-1 text-[11.5px] text-warn">Login details were not emailed for {withPw.length} account{withPw.length === 1 ? '' : 's'} — their temporary passwords are below, shown once.</p>
            )}
            <ul className="mt-3 max-h-[360px] divide-y divide-line-soft overflow-y-auto">
              {state.created?.map((c) => (
                <li key={c.email} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                  <span className="min-w-0 truncate"><span className="font-medium text-ink">{c.name}</span> <span className="text-ink-3">{c.email}</span></span>
                  {c.password && <span className="shrink-0 font-mono text-[11px] text-ink-2">{c.password}</span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="font-display text-[14px] font-bold text-warn">{state.skipped?.length ?? 0} skipped</h2>
            <ul className="mt-3 max-h-[360px] divide-y divide-line-soft overflow-y-auto">
              {state.skipped?.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                  <span className="min-w-0 truncate text-ink-2">Row {s.row}{s.email ? ` · ${s.email}` : ''}</span>
                  <span className="shrink-0 text-ink-3">{s.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
