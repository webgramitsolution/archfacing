'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  findPactAction,
  districtsForState,
  pincodesForDistrict,
  nearestPincode,
  type FinderState,
} from './actions'
import { INDIAN_STATES } from '@/config/states'
import { Icon } from '@/components/ui'

/**
 * "Find Your PACT Area" — the dark band on the PACT page.
 *
 * Two ways in, both real:
 *   · type a PIN (or use the browser's location) and get that area's live seat
 *     map back from `seatMapForPincode`;
 *   · drill State → City → PACT Area with the cascading pickers, then Explore.
 *
 * Everything runs through server actions; there is no client-side data.
 */
export function PactSearch() {
  const router = useRouter()

  const [finder, runFinder, finderPending] = useActionState<FinderState | null, FormData>(
    findPactAction,
    null
  )

  const [pincode, setPincode] = useState('')
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [area, setArea] = useState('')

  const [districts, setDistricts] = useState<string[]>([])
  const [areas, setAreas] = useState<{ code: string; locality: string }[]>([])

  const [locating, startLocating] = useTransition()
  const [loadingCity, startCity] = useTransition()
  const [loadingArea, startArea] = useTransition()
  const [locError, setLocError] = useState<string | null>(null)

  // State → its districts (cities/towns)
  useEffect(() => {
    if (!state) {
      setDistricts([])
      setDistrict('')
      return
    }
    startCity(async () => {
      setDistricts(await districtsForState(state))
      setDistrict('')
      setArea('')
      setAreas([])
    })
  }, [state])

  // District → its PACT areas (PIN codes)
  useEffect(() => {
    if (!state || !district) {
      setAreas([])
      setArea('')
      return
    }
    startArea(async () => {
      setAreas(await pincodesForDistrict(state, district))
      setArea('')
    })
  }, [state, district])

  function search(code: string) {
    const clean = code.trim()
    if (!/^[1-9]\d{5}$/.test(clean)) return
    const fd = new FormData()
    fd.set('pincode', clean)
    runFinder(fd)
    // Bring the result into view on small screens.
    requestAnimationFrame(() =>
      document.getElementById('pact-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    )
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    search(pincode)
  }

  function useMyLocation() {
    setLocError(null)
    if (!('geolocation' in navigator)) {
      setLocError('Your browser cannot share a location — enter a PIN instead.')
      return
    }
    startLocating(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startLocating(async () => {
            const near = await nearestPincode(pos.coords.latitude, pos.coords.longitude)
            if (!near) {
              setLocError('Could not find a PACT area near you — enter a PIN instead.')
              return
            }
            setPincode(near.code)
            search(near.code)
          })
        },
        () => setLocError('Location permission was declined — enter a PIN instead.'),
        { enableHighAccuracy: false, timeout: 8000 }
      )
    })
  }

  function explore() {
    if (area) {
      setPincode(area)
      search(area)
      return
    }
    // Only a state/city chosen — send them to the professionals in that area.
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    router.push(`/designers-associates?${params.toString()}`)
  }

  const fieldCls =
    'h-11 w-full rounded-card border border-white/15 bg-white/5 px-3.5 text-[13.5px] text-white placeholder:text-white/40 focus:border-brand focus:outline-none'
  const selectCls = `${fieldCls} appearance-none pr-9`

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)]">
        {/* ─── by PIN / location ─── */}
        <form onSubmit={onSearchSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2.5">
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter Pin Code"
              aria-label="PIN code"
              className={`${fieldCls} font-mono tracking-wide`}
            />
            <button
              type="submit"
              disabled={finderPending}
              className="shrink-0 rounded-card bg-brand px-5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {finderPending ? 'Searching…' : 'Search PACT'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-white/40">or</span>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 rounded-card border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <Icon name="target" className="h-4 w-4" />
              {locating ? 'Locating…' : 'Use My Location'}
            </button>
          </div>
          {locError && <p className="text-[12.5px] text-brand-hover">{locError}</p>}
        </form>

        {/* divider */}
        <div aria-hidden className="hidden w-px bg-white/10 lg:block" />

        {/* ─── by state / city / area ─── */}
        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:items-end">
          <Field label="Select State">
            <div className="relative">
              <select value={state} onChange={(e) => setState(e.target.value)} className={selectCls}>
                <option value="">All States</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s} className="text-ink">
                    {s}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Field>

          <Field label="Select City">
            <div className="relative">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!state || loadingCity}
                className={`${selectCls} disabled:opacity-50`}
              >
                <option value="">{loadingCity ? 'Loading…' : 'All Cities'}</option>
                {districts.map((d) => (
                  <option key={d} value={d} className="text-ink">
                    {d}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Field>

          <Field label="Select PACT Area">
            <div className="relative">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={!district || loadingArea}
                className={`${selectCls} disabled:opacity-50`}
              >
                <option value="">{loadingArea ? 'Loading…' : 'All PACT Areas'}</option>
                {areas.map((a) => (
                  <option key={a.code} value={a.code} className="text-ink">
                    {a.code}
                    {a.locality ? ` — ${a.locality}` : ''}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Field>

          <button
            type="button"
            onClick={explore}
            className="h-11 shrink-0 rounded-card bg-brand px-5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Explore PACT Areas
          </button>
        </div>
      </div>

      {/* ─── result: the live seat map ─── */}
      {(finder?.error || finder?.map) && (
        <div id="pact-result" className="mt-6 scroll-mt-24">
          {finder?.error && (
            <p className="rounded-card border border-white/15 bg-white/5 px-4 py-3 text-[13.5px] text-brand-hover">
              {finder.error}
            </p>
          )}
          {finder?.map && <SeatMap map={finder.map} />}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 lg:w-[150px]">
      <span className="mb-1.5 block text-[11px] font-medium text-white/50">{label}</span>
      {children}
    </label>
  )
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 10 6"
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 h-[6px] w-[10px] -translate-y-1/2 text-white/50"
    >
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// The seat map, rendered on a light card so it reads on the dark band.
export function SeatMap({ map }: { map: NonNullable<FinderState['map']> }) {
  const main = map.rows.filter((r) => r.serviceType !== 'CONSULTANT')
  const consultants = map.rows.filter((r) => r.serviceType === 'CONSULTANT')
  const vacant = map.totalSeats - map.takenSeats

  return (
    <div className="rounded-card border border-line bg-paper p-5 text-ink">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-3">
        <span className="font-mono text-xl font-bold">{map.pincode}</span>
        <span className="text-[14px] text-ink-2">
          {map.district} · {map.state}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-ok-soft px-2.5 py-1 text-[11.5px] font-semibold text-ok">
          {vacant} vacant / {map.totalSeats}
        </span>
      </div>

      <p className="eyebrow mb-2">Main Categories</p>
      <ul className="mb-5 grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3">
        {main.map((r) => (
          <SeatRow key={`${r.serviceType}-${r.subCategory}`} row={r} />
        ))}
      </ul>

      <p className="eyebrow mb-2">Consultants — 24 seats</p>
      <ul className="grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {consultants.map((r) => (
          <SeatRow key={`${r.serviceType}-${r.subCategory}`} row={r} />
        ))}
      </ul>

      <p className="mt-5 border-t border-line pt-4 text-[13px] text-ink-2">
        Want a vacant seat?{' '}
        <Link href="/register?type=professional" className="font-semibold text-brand hover:underline">
          Register
        </Link>{' '}
        and claim your PACT from the dashboard.
      </p>
    </div>
  )
}

function SeatRow({ row }: { row: { label: string; taken: boolean; status?: string } }) {
  return (
    <li className="flex items-center justify-between gap-2 bg-paper px-3 py-2 text-[13px]">
      <span className="truncate text-ink-2">{row.label}</span>
      <span
        className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${
          row.taken ? 'text-brand' : 'text-ok'
        }`}
      >
        {row.taken ? (row.status === 'RESERVED' ? 'Reserved' : 'Taken') : 'Vacant'}
      </span>
    </li>
  )
}
