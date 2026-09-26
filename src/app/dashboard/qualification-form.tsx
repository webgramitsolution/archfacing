'use client'

import { useActionState, useState } from 'react'
import { addQualificationAction, type QualState } from './qualification-actions'

const LEVELS: [string, string][] = [
  ['GRADUATION', 'Graduation'], ['POST_GRADUATION', 'Post-graduation'], ['PHD', 'PhD'], ['DIPLOMA', 'Diploma'],
  ['TWELFTH', 'Class 12'], ['TENTH', 'Class 10'], ['PROFESSIONAL_MEMBERSHIP', 'Professional membership (COA etc.)'],
]

export function AddQualificationForm({ defaultState }: { defaultState: string }) {
  const [state, action, pending] = useActionState<QualState, FormData>(addQualificationAction, null)
  const [level, setLevel] = useState('GRADUATION')
  return (
    <form action={action} key={state?.ok ? String(Date.now()) : 'form'} className="grid gap-3 md:grid-cols-3">
      <label className="block text-[12px] font-medium text-ink-2">Level
        <select name="level" value={level} onChange={(e) => setLevel(e.target.value)} className="input mt-1 h-10 text-[13px]">
          {LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="block text-[12px] font-medium text-ink-2">{level === 'PROFESSIONAL_MEMBERSHIP' ? 'Body / council' : 'Board / University'}
        <input name="boardOrUniv" required maxLength={150} className="input mt-1 h-10 text-[13px]" />
      </label>
      <label className="block text-[12px] font-medium text-ink-2">State
        <input name="state" required maxLength={60} defaultValue={defaultState} className="input mt-1 h-10 text-[13px]" />
      </label>
      <label className="block text-[12px] font-medium text-ink-2">{level === 'PROFESSIONAL_MEMBERSHIP' ? 'Year registered' : 'Passing year'}
        <input name="passingYear" type="number" required min={1950} max={new Date().getFullYear() + 1} className="input mt-1 h-10 text-[13px]" />
      </label>
      <label className="block text-[12px] font-medium text-ink-2">Membership number {level !== 'PROFESSIONAL_MEMBERSHIP' && <span className="font-normal text-ink-4">(optional)</span>}
        <input name="membershipNo" maxLength={60} required={level === 'PROFESSIONAL_MEMBERSHIP'} className="input mt-1 h-10 text-[13px]" />
      </label>
      <label className="block text-[12px] font-medium text-ink-2">Certificate <span className="font-normal text-ink-4">(optional, image or PDF)</span>
        <input name="certificate" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full text-[12.5px] text-ink-2 file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-ink-2" />
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-3">
        <button type="submit" disabled={pending} className="btn-primary px-5 py-2 text-[13px] disabled:opacity-60">{pending ? 'Saving…' : 'Add qualification'}</button>
        {state && <p role={state.ok ? 'status' : 'alert'} className={'text-[12px] ' + (state.ok ? 'text-ok' : 'text-danger')}>{state.message}</p>}
      </div>
    </form>
  )
}
