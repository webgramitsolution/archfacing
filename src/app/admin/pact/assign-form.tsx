'use client'

import { useActionState, useState } from 'react'
import { assignPactAction, type AssignState } from './actions'

/**
 * The admin allots a territory to a user — offline deals and complimentary
 * seats. Sub-category appears only for a Consultant PACT, exactly as the seat
 * model requires.
 */

const SERVICES = [
  { value: 'DESIGNA', label: 'DESIGNA — Architect' },
  { value: 'DESIGNI', label: 'DESIGNI — Interior Designer' },
  { value: 'CONSULTANT', label: 'Consultant (needs sub-category)' },
  { value: 'BMF', label: 'BMF — Building Material' },
]

const field =
  'h-9 w-full rounded-lg border border-line bg-paper-2 px-3 text-[12.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'
const label = 'mb-1 block text-[11.5px] font-semibold text-ink-2'

export function AssignPactForm({ consultantSubs }: { consultantSubs: string[] }) {
  const [state, formAction, pending] = useActionState<AssignState, FormData>(assignPactAction, null)
  const [service, setService] = useState('DESIGNA')

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="assign-email">User email *</label>
        <input id="assign-email" name="email" type="email" required placeholder="seller@example.com" className={field} />
        <p className="mt-1 text-[10.5px] text-ink-4">The account the territory is allotted to.</p>
      </div>

      <div>
        <label className={label} htmlFor="assign-service">Service type *</label>
        <select
          id="assign-service"
          name="serviceType"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={field}
        >
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {service === 'CONSULTANT' && (
        <div>
          <label className={label} htmlFor="assign-sub">Consultant sub-category *</label>
          <select id="assign-sub" name="subCategory" className={field} defaultValue="">
            <option value="" disabled>Choose one of the 24…</option>
            {consultantSubs.map((s) => (
              <option key={s} value={s}>{s.replace(/[-_]/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={label} htmlFor="assign-pin">PIN code *</label>
          <input
            id="assign-pin" name="pincode" required inputMode="numeric"
            pattern="[1-9][0-9]{5}" maxLength={6} placeholder="110001" className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="assign-price">Price charged (₹)</label>
          <input
            id="assign-price" name="price" inputMode="numeric" type="number" min={0} step="1"
            placeholder="0 = complimentary" className={field}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? 'Assigning…' : 'Assign PACT (1 year)'}
      </button>

      {state && (
        <p
          className={
            'rounded-lg px-3 py-2.5 text-[12px] leading-snug ' +
            (state.ok ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger')
          }
        >
          {state.message}
        </p>
      )}
    </form>
  )
}
