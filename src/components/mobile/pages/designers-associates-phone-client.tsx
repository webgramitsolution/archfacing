'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * "Find Professionals in Your PACT Area" — a PIN, or the browser's location,
 * filters the directory to the associates holding that PACT (`?pin=`).
 */
export function DaPinFinderPhone() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [locating, startLocating] = useTransition()

  function go(code: string) {
    if (/^[1-9]\d{5}$/.test(code)) router.push(`/designers-associates?pin=${code}#filter-professionals`)
    else setNote('PIN code must be 6 digits.')
  }

  function useMyLocation() {
    setNote(null)
    if (!('geolocation' in navigator)) { setNote('This browser cannot detect location — enter the PIN instead.'); return }
    startLocating(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startLocating(async () => {
            try {
              const res = await fetch(`/api/pincode/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
              const data = (await res.json()) as { code?: string }
              if (data.code) { setPin(data.code); go(data.code) } else setNote('No PIN found near you — enter it manually.')
            } catch {
              setNote('Could not detect your location — enter the PIN manually.')
            }
          })
        },
        () => setNote('Location permission denied — enter the PIN manually.'),
        { timeout: 8000 }
      )
    })
  }

  return (
    <div className="mt-3.5">
      <form
        onSubmit={(e) => { e.preventDefault(); go(pin) }}
        className="flex items-center gap-2.5"
      >
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter Pincode"
          aria-label="PIN code"
          className="h-10 min-w-0 flex-1 rounded-card border border-line bg-white px-3 text-[13px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
        />
        {pin.length === 6 ? (
          <button type="submit" className="h-10 shrink-0 rounded-card bg-brand px-4 text-[12.5px] font-semibold text-white">
            Search
          </button>
        ) : (
          <>
            <span className="text-[12px] text-ink-2">or</span>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-card border border-brand bg-white px-3 text-[12.5px] font-semibold text-brand disabled:opacity-60"
            >
              {locating ? 'Locating…' : 'Use My Location'}
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></svg>
            </button>
          </>
        )}
      </form>
      {note && <p className="mt-1.5 text-[11.5px] font-medium text-brand">{note}</p>}
    </div>
  )
}

/** The dropdown chips under "Filter Professionals" — each change re-submits the GET form. */
export function DaFilterChipsPhone({
  groups,
  keep,
}: {
  groups: { name: string; label: string; value: string; options: { value: string; label: string }[] }[]
  keep: Record<string, string>
}) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <form ref={form} action="/designers-associates" method="get" className="mt-3 flex items-center gap-2">
      {Object.entries(keep).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {groups.map((g) => (
          <label key={g.name} className="relative shrink-0">
            <span className="sr-only">{g.label}</span>
            <select
              name={g.name}
              defaultValue={g.value}
              onChange={() => form.current?.requestSubmit()}
              className={`h-9 max-w-[150px] appearance-none rounded-card border bg-white pl-2.5 pr-6 text-[11.5px] font-semibold ${g.value ? 'border-brand text-brand' : 'border-line text-ink'}`}
            >
              <option value="">{g.label}</option>
              {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <svg viewBox="0 0 10 6" aria-hidden className="pointer-events-none absolute right-2 top-1/2 h-[5px] w-[9px] -translate-y-1/2 text-ink">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </label>
        ))}
      </div>
      <button type="submit" aria-label="Apply filters" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-line bg-white text-ink">
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
      </button>
    </form>
  )
}
