'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MenuItem } from '@/config/nav'
import { Icon } from './ui'
import { LinkPending } from './link-pending'
import { cn } from '@/lib/utils'

/**
 * The header dropdown — two kinds:
 *   · mega  — taxonomy columns (Projects, Products…)
 *   · links — a few links with an icon + description (Membership)
 *
 * Opens on hover and works from the keyboard too (Tab → Enter, Escape to close).
 * Closing is delayed slightly so the panel does not disappear while the mouse
 * crosses the gap between the nav and the panel.
 */
export function MegaMenu({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = () => timer.current && clearTimeout(timer.current)
  const close = () => {
    cancel()
    timer.current = setTimeout(() => setOpen(false), 160)
  }

  const hasPanel = Boolean(item.mega?.length || item.links?.length)

  if (!hasPanel) {
    return (
      <Link
        href={item.href}
        className="flex items-center gap-1 whitespace-nowrap px-0.5 py-3 text-[11px] md:text-[10.5px] lg:text-[12px] xl:text-[13.5px] font-medium text-ink-2 transition-colors hover:text-brand"
      >
        {item.label}
        <LinkPending />
      </Link>
    )
  }

  return (
    <div
      onMouseEnter={() => {
        cancel()
        setOpen(true)
      }}
      onMouseLeave={close}
    >
      <Link
        href={item.href}
        aria-expanded={open}
        aria-haspopup="true"
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap px-0.5 py-3 text-[11px] md:text-[10.5px] lg:text-[12px] xl:text-[13.5px] font-medium transition-colors',
          open ? 'text-brand' : 'text-ink-2 hover:text-brand'
        )}
      >
        {item.label}
        <LinkPending />
        <svg
          viewBox="0 0 10 6"
          aria-hidden
          className={cn('h-[5px] w-[9px] transition-transform', open && 'rotate-180')}
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Link>

      {open && (
        <div
          onMouseEnter={cancel}
          onMouseLeave={close}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="absolute inset-x-0 top-full z-50 border-t border-line bg-paper-2 shadow-menu"
        >
          {/* `megaZoom` scales this one panel the way Ctrl+- scales the page:
              the content lays out against a wider box and renders smaller, so
              a very tall menu fits without touching any other menu or page. */}
          <div
            className={cn(
              'container-af pt-5',
              // Dropping the "View all" footer took away the breathing room it
              // gave the last row, so a panel without it pays that back.
              item.megaHideViewAll ? 'pb-16' : 'pb-5'
            )}
            style={
              item.megaZoom
                ? {
                    zoom: item.megaZoom,
                    // `zoom` shrinks a CSS pixel, so container-af's 15px would
                    // land at 13.5px on screen. Dividing the target back out
                    // puts the edge at a real 30px. Unzoomed panels are left
                    // on container-af's own padding, untouched.
                    paddingInline: `${30 / item.megaZoom}px`,
                  }
                : undefined
            }
          >
            {item.links ? <LinkPanel item={item} onGo={() => setOpen(false)} /> : null}
            {item.mega ? <MegaPanel item={item} onGo={() => setOpen(false)} /> : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Membership style — icon + description
// ═══════════════════════════════════════════════════════════

function LinkPanel({ item, onGo }: { item: MenuItem; onGo: () => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {item.links!.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onGo}
          className="group flex gap-3.5 rounded-card border border-line p-4 transition-all hover:border-brand-border hover:bg-brand-soft"
        >
          <span className="chip-icon bg-brand-soft text-brand group-hover:bg-brand group-hover:text-white">
            <Icon name={l.icon} />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[14.5px] font-semibold text-ink">
              {l.title}
            </span>
            <span className="mt-1 block text-[12.5px] leading-snug text-ink-3">
              {l.desc}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Projects style — taxonomy columns
// ═══════════════════════════════════════════════════════════

function MegaPanel({ item, onGo }: { item: MenuItem; onGo: () => void }) {
  const param = item.megaParam ?? 'category'

  // With an illustration the columns share the row with it; without one they
  // take the full width, as every other mega-panel does.
  const withImage = Boolean(item.megaImage)

  // A fixed column count, so a 14-category menu is an exact 7 x 2 rather than
  // however many happen to fit. Menus with fewer categories than the cap keep
  // their own count instead of being stretched across seven tracks.
  //
  // The value is a complete track list, not a number: `repeat()` does not
  // reliably accept a custom property as its repetition count.
  const wide = new Set(item.megaWide ?? [])
  const cards = item.megaStyle === 'cards'

  // A wide category occupies two tracks, so the grid needs one extra track for
  // each of them, or the last column would be pushed onto a row of its own.
  const cols = item.mega!.length + wide.size
  const track = (n: number) => `repeat(${Math.min(cols, n)}, minmax(0, 1fr))`

  return (
    <>
      <div className={withImage ? 'flex min-w-0 items-stretch gap-5' : ''}>
      <div
        className={cn(
          'mega-grid',
          item.megaStyle === 'striped' && 'is-striped',
          cards && 'is-cards',
          withImage && 'min-w-0 flex-1'
        )}
        style={
          {
            '--mega-cols-lg': track(5),
            '--mega-cols-xl': track(7),
          } as React.CSSProperties
        }
      >
        {item.mega!.map((col) => (
          <div
            key={col.slug}
            className={cn('min-w-0', wide.has(col.slug) && 'mega-wide')}
          >
            <Link
              href={`${item.href}?${param}=${col.slug}`}
              onClick={onGo}
              className={cn(
                'mb-1.5 block text-[11.5px] font-bold uppercase leading-snug tracking-[0.04em] text-brand hover:text-brand-hover',
                cards && 'mb-2.5 text-center'
              )}
            >
              {col.name}
            </Link>

            {col.children?.length ? (
              <ul
                className={cn(
                  'gap-[3px]',
                  // A wide column flows its children down one sub-column and
                  // on into the next, which is what balances the two halves.
                  wide.has(col.slug) ? 'mega-subcols' : 'flex flex-col'
                )}
              >
                {col.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`${item.href}?${param}=${col.slug}&sub=${child.slug}`}
                      onClick={onGo}
                      className="block text-[12px] leading-snug text-ink-2 transition-colors hover:text-brand"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

        {item.megaImage && (
          // lg, not xl: a maximised browser on a 1280-wide screen leaves about
          // 1265px of viewport, so an xl gate would hide the illustration on
          // exactly the size it was drawn for.
          <div className="hidden shrink-0 self-center lg:block">
            <Image
              src={item.megaImage.src}
              alt=""
              width={item.megaImage.width}
              height={item.megaImage.height}
              className="h-auto"
            />
          </div>
        )}
      </div>

      {/* The label in the bar is itself a link to the listing page, so this
          footer is a second route to the same place. Menus that are already
          tall enough drop it via `megaHideViewAll`. */}
      {!item.megaHideViewAll && (
        <div className="mt-5 border-t border-line pt-3.5">
          <Link
            href={item.href}
            onClick={onGo}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:gap-2.5"
          >
            View all {item.label}
            <Icon name="arrow" className="h-3.5 w-3.5 transition-all" />
          </Link>
        </div>
      )}
    </>
  )
}
