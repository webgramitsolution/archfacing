'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui'

/**
 * "Deal of the Day" countdown — resets at midnight each day.
 *
 * The time is computed on the client, so to avoid a hydration mismatch
 * between server and browser we render nothing on the first pass.
 */
export function DealTimer() {
  const [left, setLeft] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)

      const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
      const h = String(Math.floor(s / 3600)).padStart(2, '0')
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
      const sec = String(s % 60).padStart(2, '0')
      setLeft(`${h}h : ${m}m : ${sec}s`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand">
      <Icon name="clock" className="h-3.5 w-3.5" />
      <span className="tabular">{left ?? '—'}</span>
      <span className="font-normal text-ink-3">Left</span>
    </p>
  )
}
