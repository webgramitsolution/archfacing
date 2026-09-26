'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { QUICK_CITIES } from '@/config/nav'

const STORAGE_KEY = 'af.city'

/**
 * The city picker button in the top bar.
 *
 * The chosen city is remembered only in this browser — it is a convenience,
 * not a setting that matters. That is why every localStorage read and write
 * is wrapped in try/catch: it fails in a private window or with cookies
 * blocked, and the header must not break when it does.
 *
 * "Use my location" asks the browser, then turns the coordinates into a
 * district through `/api/pincode/nearest`. It is never asked for on its own —
 * a header that prompts for location on first paint is the fastest way to
 * have the permission denied for good.
 */
export function LocationPicker({ onPhone = false }: { /** Also show below md (the phone header). */ onPhone?: boolean } = {}) {
  const [city, setCity] = useState<string>(QUICK_CITIES[0])
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [locating, startLocating] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCity(saved)
    } catch {
      // nothing to do — the default city will be used
    }
  }, [])

  function useMyLocation() {
    setNote(null)
    if (!('geolocation' in navigator)) {
      setNote('This browser cannot detect location — pick a city instead.')
      return
    }

    startLocating(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `/api/pincode/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            )
            const data = (await res.json()) as {
              code?: string
              district?: string
              state?: string
            }
            if (data.district) {
              pick(data.district)
              setNote(`Detected ${data.district}${data.code ? ` · ${data.code}` : ''}`)
            } else {
              setNote('Nothing found near you — pick a city instead.')
            }
          } catch {
            setNote('Could not detect your location — pick a city instead.')
          }
        },
        () => setNote('Location permission denied — pick a city instead.'),
        { timeout: 8000 }
      )
    })
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(next: string) {
    setCity(next)
    setOpen(false)
    setNote(null)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // it won't be remembered, but everything keeps working
    }
  }

  return (
    <div ref={ref} className={onPhone ? "relative shrink-0" : "relative hidden shrink-0 md:block"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="header-control flex items-center gap-1.5 border border-line bg-paper-2 px-3 text-[13px] font-medium text-ink transition-colors hover:border-ink-3"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-brand"
          fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="max-w-[8rem] truncate">{city}</span>
        <svg viewBox="0 0 10 6" aria-hidden className="h-[5px] w-[9px] text-ink-3">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-card border border-line bg-paper-2 py-1.5 shadow-lg">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0"
              fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
            </svg>
            {locating ? 'Detecting…' : 'Use my location'}
          </button>

          {note && (
            <p className="px-3 pb-1.5 text-[11.5px] leading-snug text-ink-3">{note}</p>
          )}

          <p className="eyebrow border-t border-line px-3 pb-1.5 pt-2.5">Major cities</p>
          <ul>
            {QUICK_CITIES.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={`block w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-paper-2 ${
                    c === city ? 'font-semibold text-brand' : 'text-ink-2'
                  }`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-3 pb-1 pt-2 text-[11.5px] leading-snug text-ink-3">
            For anywhere else, search by PIN code above — all 19,238 PIN
            codes in India are covered.
          </p>
        </div>
      )}
    </div>
  )
}
