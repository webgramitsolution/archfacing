'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'

/**
 * The "Find Professionals in Your PACT Area" strip.
 *
 * "Use My Location" asks the browser for coordinates — the user grants
 * that permission, and if they decline, entering the PIN manually still works.
 */
export function PactLocator() {
  const router = useRouter()
  const [pincode, setPincode] = useState('')
  const [locating, startLocating] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  function go(pin: string) {
    if (/^[1-9]\d{5}$/.test(pin)) {
      router.push(`/consult-nearby?pincode=${pin}`)
    } else {
      setNote('PIN code must be 6 digits.')
    }
  }

  function useMyLocation() {
    setNote(null)
    if (!('geolocation' in navigator)) {
      setNote('This browser cannot detect location — please enter the PIN manually.')
      return
    }

    startLocating(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `/api/pincode/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            )
            const data = (await res.json()) as { code?: string; district?: string }
            if (data.code) {
              setPincode(data.code)
              setNote(`Near you — ${data.code}${data.district ? ` · ${data.district}` : ''}`)
            } else {
              setNote('No PIN found near you — please enter it manually.')
            }
          } catch {
            setNote('Could not detect your location — please enter the PIN manually.')
          }
        },
        () => setNote('Location permission denied — please enter the PIN manually.'),
        { timeout: 8000 }
      )
    })
  }

  return (
    <div className="rounded-card border border-line-soft bg-paper-2 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon name="map" className="h-4 w-4" />
        </span>
        <span className="font-display text-[12.5px] font-bold leading-tight text-ink">
          Find Professionals in Your PACT Area
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
        Enter a PIN code to find the associate who covers your location.
      </p>

      <input
        value={pincode}
        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => e.key === 'Enter' && go(pincode)}
        placeholder="Enter Pincode"
        aria-label="PIN code"
        inputMode="numeric"
        className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
      />

      {pincode.length === 6 ? (
        <button type="button" onClick={() => go(pincode)} className="btn-primary mt-2 w-full justify-center py-2 text-[12.5px]">
          Search
        </button>
      ) : (
        <>
          <p className="my-1.5 text-center text-[11px] text-ink-4">or</p>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
          >
            <Icon name="map" className="h-3.5 w-3.5" />
            {locating ? 'Locating…' : 'Use My Location'}
          </button>
        </>
      )}

      {note && <p className="mt-1.5 text-[11px] font-medium text-brand">{note}</p>}
    </div>
  )
}
