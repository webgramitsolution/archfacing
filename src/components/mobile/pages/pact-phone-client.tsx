'use client'

import { startTransition, useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  findPactAction,
  districtsForState,
  pincodesForDistrict,
  nearestPincode,
  type FinderState,
} from '@/app/(public)/pact/actions'
import { SeatMap } from '@/app/(public)/pact/pact-search'
import { INDIAN_STATES } from '@/config/states'
import { cn } from '@/lib/utils'

/**
 * Phone "Find Your PACT Area" — the dark card. Same server actions as the
 * desktop band (PIN → live seat map; State → City → PACT area cascade), laid
 * out the way the phone reference draws it: white fields on navy.
 */
export function PactFinderPhone({ initialPin }: { initialPin?: string | null }) {
  const router = useRouter()
  const [finder, runFinder, pending] = useActionState<FinderState | null, FormData>(findPactAction, null)

  const [pincode, setPincode] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [area, setArea] = useState('')
  const [districts, setDistricts] = useState<string[]>([])
  const [areas, setAreas] = useState<{ code: string; locality: string }[]>([])
  const [locating, startLocating] = useTransition()
  const [loadingCity, startCity] = useTransition()
  const [loadingArea, startArea] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!state) { setDistricts([]); setDistrict(''); return }
    startCity(async () => {
      setDistricts(await districtsForState(state))
      setDistrict(''); setArea(''); setAreas([])
    })
  }, [state])

  useEffect(() => {
    if (!state || !district) { setAreas([]); setArea(''); return }
    startArea(async () => {
      setAreas(await pincodesForDistrict(state, district))
      setArea('')
    })
  }, [state, district])

  function search(code: string) {
    const clean = code.trim()
    if (!/^[1-9]\d{5}$/.test(clean)) { setNote('PIN code must be 6 digits.'); return }
    setNote(null)
    const fd = new FormData()
    fd.set('pincode', clean)
    startTransition(() => runFinder(fd))
    requestAnimationFrame(() =>
      document.getElementById('pact-phone-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    )
  }

  useEffect(() => {
    if (initialPin && /^[1-9]\d{5}$/.test(initialPin)) {
      setPincode(initialPin)
      search(initialPin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPin])

  function useMyLocation() {
    setNote(null)
    if (!('geolocation' in navigator)) { setNote('Your browser cannot share a location — enter a PIN instead.'); return }
    startLocating(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startLocating(async () => {
            const near = await nearestPincode(pos.coords.latitude, pos.coords.longitude)
            if (!near) { setNote('Could not find a PACT area near you — enter a PIN instead.'); return }
            setPincode(near.code)
            search(near.code)
          })
        },
        () => setNote('Location permission was declined — enter a PIN instead.'),
        { enableHighAccuracy: false, timeout: 8000 }
      )
    })
  }

  function explore() {
    if (area) { setPincode(area); search(area); return }
    const p = new URLSearchParams()
    if (state) p.set('state', state)
    router.push(`/designers-associates${p.size ? `?${p}` : ''}`)
  }

  const field = 'h-11 w-full rounded-card border border-white/10 bg-white px-3.5 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none'

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); search(pincode) }} className="flex">
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter Pin Code"
          aria-label="PIN code"
          className={cn(field, 'rounded-r-none')}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-r-card bg-brand px-4 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Searching…' : 'Search PACT'}
        </button>
      </form>

      <p className="my-2 text-center text-[12px] text-white/70">or</p>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-card border border-white/70 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
        {locating ? 'Locating…' : 'Use My Location'}
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
      </button>
      {note && <p className="mt-2 text-[12px] text-brand-hover">{note}</p>}

      <Picker label="Select State" value={state} onChange={setState} fieldCls={field}>
        <option value="">All States</option>
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </Picker>
      <Picker label="Select City" value={district} onChange={setDistrict} fieldCls={field} disabled={!state || loadingCity}>
        <option value="">{loadingCity ? 'Loading…' : 'All Cities'}</option>
        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
      </Picker>
      <Picker label="Select PACT Area" value={area} onChange={setArea} fieldCls={field} disabled={!district || loadingArea}>
        <option value="">{loadingArea ? 'Loading…' : 'All PACT Areas'}</option>
        {areas.map((a) => <option key={a.code} value={a.code}>{a.code}{a.locality ? ` — ${a.locality}` : ''}</option>)}
      </Picker>

      <button
        type="button"
        onClick={explore}
        className="mt-4 h-11 w-full rounded-card bg-brand text-[13.5px] font-semibold text-white"
      >
        Explore PACT Areas
      </button>

      {(finder?.error || finder?.map) && (
        <div id="pact-phone-result" className="mt-4 scroll-mt-20">
          {finder?.error && (
            <p className="rounded-card border border-white/15 bg-white/5 px-3.5 py-3 text-[13px] text-brand-hover">{finder.error}</p>
          )}
          {finder?.map && (
            <div className="[&>div]:p-3.5">
              <SeatMap map={finder.map} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Picker({
  label, value, onChange, fieldCls, disabled, children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fieldCls: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="mt-3.5 block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-white">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(fieldCls, 'appearance-none pr-9 disabled:opacity-100 disabled:text-ink-3')}
        >
          {children}
        </select>
        <svg viewBox="0 0 10 6" aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-[6px] w-[10px] -translate-y-1/2 text-ink">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    </label>
  )
}

export type ExploreRow = { key: string; title: string; line1: string; line2?: string; href: string; glyph: string }

/** Explore PACT Areas — four real lists, switched in place. */
export function ExploreTabsPhone({ tabs }: { tabs: { label: string; rows: ExploreRow[]; more?: { title: string; sub: string; href: string } }[] }) {
  const [on, setOn] = useState(0)
  const active = tabs[on]
  return (
    <div>
      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === on}
            type="button"
            onClick={() => setOn(i)}
            className={cn(
              'h-9 shrink-0 rounded-card px-3.5 text-[12px] font-semibold transition-colors',
              i === on ? 'bg-brand text-white' : 'bg-paper-2 text-ink-2'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active.rows.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-ink-3">Nothing to list here yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {active.rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="flex items-center gap-3 py-3">
                <Glyph seed={r.glyph} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{r.title}</span>
                  <span className="tabular mt-0.5 block truncate text-[11.5px] text-ink-3">
                    {r.line1}
                    {r.line2 && <><span className="mx-1.5">•</span>{r.line2}</>}
                  </span>
                </span>
                <Chevron />
              </Link>
            </li>
          ))}
          {active.more && (
            <li>
              <Link href={active.more.href} className="flex items-center gap-3 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[18px] font-bold leading-none text-ink">•••</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{active.more.title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-3">{active.more.sub}</span>
                </span>
                <Chevron />
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
  )
}

/** A tinted monument glyph per row — stands in for the reference's state crest artwork. */
function Glyph({ seed }: { seed: string }) {
  const tints = ['bg-brand-soft text-brand', 'bg-info-soft text-info', 'bg-ok-soft text-ok', 'bg-warn-soft text-warn', 'bg-danger-soft text-danger']
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (
    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-card', tints[h % tints.length])}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c-3 2.2-4.5 4.4-4.5 6.5h9C16.5 7.4 15 5.2 12 3z" />
        <path d="M5 21V11.5h14V21M3 21h18M8 21v-5M12 21v-5M16 21v-5M12 3V1.5" />
      </svg>
    </span>
  )
}
