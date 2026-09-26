'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * A textarea with Bold / Italic / Link buttons.
 *
 * The buttons wrap the selection in Markdown — `**bold**`, `*italic*`,
 * `[text](url)` — and what is stored is that plain string. `parseInline` in
 * `src/lib/blog-blocks.ts` turns it back into real elements on the public
 * page.
 *
 * Deliberately not a WYSIWYG editor. A WYSIWYG stores HTML, HTML has to be
 * rendered with `dangerouslySetInnerHTML`, and that would put whatever an
 * author pasted straight into the page. Markdown keeps the content as text
 * all the way through, so the worst a paste can do is look wrong.
 */
export function RichText({
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  error?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  /** Wrap the selection, or drop the markers in ready to type between. */
  function wrap(before: string, after: string, sample: string) {
    const el = ref.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || sample
    const next = value.slice(0, start) + before + selected + after + value.slice(end)

    onChange(next)

    // put the caret back around the text, not after the closing markers
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function bulletLine() {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const next = value.slice(0, lineStart) + '• ' + value.slice(lineStart)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 2, start + 2)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <ToolButton label="Bold" onClick={() => wrap('**', '**', 'bold text')}>
          <span className="font-bold">B</span>
        </ToolButton>
        <ToolButton label="Italic" onClick={() => wrap('*', '*', 'italic text')}>
          <span className="font-serif italic">I</span>
        </ToolButton>
        <ToolButton label="Link" onClick={() => wrap('[', '](https://)', 'link text')}>
          <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
            <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
          </svg>
        </ToolButton>
        <ToolButton label="Bullet line" onClick={bulletLine}>
          <span className="text-[13px] leading-none">•</span>
        </ToolButton>

        <span className="ml-auto text-[10.5px] text-ink-4">
          **bold** · *italic* · [text](url)
        </span>
      </div>

      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input leading-relaxed', error && 'input-error')}
      />
    </div>
  )
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-paper-2 text-[12px] text-ink-2 transition-colors hover:border-brand hover:text-brand"
    >
      {children}
    </button>
  )
}
