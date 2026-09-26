'use client'

import { useEffect } from 'react'

/**
 * Fits the fixed 1280-wide admin canvas to the viewport — width AND height — so
 * the shell behaves like a real app: the dark sidebar and the top bar stay put
 * and only the main column scrolls.
 *
 * The canvas is `zoom`-scaled to fill the viewport width exactly (`clientWidth
 * / 1280`, so no side gap). Because `zoom` scales height too, the canvas height
 * is set to `viewportHeight / zoom` — after zoom that renders as exactly the
 * viewport height. The viewport wrapper is locked to the screen height with
 * `overflow: hidden`, so the page itself never scrolls; the inner `<main>`
 * (which carries `overflow-y-auto`) is the only scroll region.
 *
 * At ≥1280 the canvas is fluid (full width, no zoom, viewport-tall).
 */
export function AdminCanvasFit() {
  useEffect(() => {
    const canvas = document.querySelector('.admin-canvas') as HTMLElement | null
    const viewport = document.querySelector('.admin-viewport') as HTMLElement | null
    if (!canvas || !viewport) return

    const fit = () => {
      const w = document.documentElement.clientWidth
      const h = window.innerHeight
      viewport.style.height = `${h}px`
      viewport.style.overflow = 'hidden'
      if (w >= 1280) {
        canvas.style.width = '100%'
        canvas.style.zoom = '1'
        canvas.style.height = `${h}px`
      } else {
        const z = w / 1280
        canvas.style.width = '1280px'
        canvas.style.zoom = String(z)
        canvas.style.height = `${h / z}px`
      }
    }

    fit()

    // Catch window resize, mobile address-bar/rotation changes, and the
    // scrollbar toggling (which changes clientWidth).
    const ro = new ResizeObserver(fit)
    ro.observe(document.documentElement)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])

  return null
}
