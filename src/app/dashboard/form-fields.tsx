'use client'

import { useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The richer inputs the posting forms need so that everything the public page
 * renders can actually be typed in — instead of arriving from seeded demo
 * `meta`.
 *
 * Each one keeps its value in a hidden input under its own `name`, so the
 * server action reads them from `FormData` exactly like any other field:
 *   • RichTextField → a Markdown string
 *   • ListField     → JSON array of strings
 *   • PairsField    → JSON array of { label, value }
 */

// ──────────────────────────────────────────────────────────────
//  Rich text — a small Markdown toolbar, no HTML stored
// ──────────────────────────────────────────────────────────────

const TOOLS: { label: string; title: string; wrap: [string, string]; icon?: IconName }[] = [
  { label: 'B', title: 'Bold', wrap: ['**', '**'] },
  { label: 'I', title: 'Italic', wrap: ['_', '_'] },
  { label: 'H', title: 'Heading', wrap: ['\n## ', ''] },
  { label: '•', title: 'Bullet list', wrap: ['\n- ', ''] },
  { label: '1.', title: 'Numbered list', wrap: ['\n1. ', ''] },
  { label: '“', title: 'Quote', wrap: ['\n> ', ''] },
]

export function RichTextField({
  name,
  defaultValue = '',
  rows = 8,
  placeholder,
  maxLength = 6000,
}: {
  name: string
  defaultValue?: string
  rows?: number
  placeholder?: string
  maxLength?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(defaultValue)

  function apply(open: string, close: string) {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const picked = value.slice(s, e)
    const next = `${value.slice(0, s)}${open}${picked}${close}${value.slice(e)}`
    setValue(next)
    // put the caret after the inserted text
    requestAnimationFrame(() => {
      el.focus()
      const pos = s + open.length + picked.length
      el.setSelectionRange(pos, pos)
    })
  }

  function addLink() {
    const url = window.prompt('Link address (https://…)')
    if (!url) return
    apply('[', `](${url})`)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-paper-2 focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line-soft bg-paper-3/60 px-1.5 py-1">
        {TOOLS.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            onClick={() => apply(t.wrap[0], t.wrap[1])}
            className="flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-[12px] font-bold text-ink-2 transition-colors hover:bg-paper hover:text-brand"
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          onClick={addLink}
          className="flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-ink-2 transition-colors hover:bg-paper hover:text-brand"
        >
          <Icon name="globe2" className="h-3.5 w-3.5" />
        </button>
        <span className="tabular ml-auto pr-1 text-[10.5px] text-ink-4">
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
        rows={rows}
        placeholder={placeholder}
        className="block w-full resize-y bg-transparent px-3.5 py-3 text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none"
      />
      <p className="border-t border-line-soft px-3.5 py-1.5 text-[10.5px] text-ink-4">
        Formatting: **bold**, _italic_, ## heading, - bullet, &gt; quote, [text](link)
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  List — repeatable single lines (key points, tags, highlights)
// ──────────────────────────────────────────────────────────────

export function ListField({
  name,
  defaultValue = [],
  placeholder = 'Add an item…',
  max = 20,
}: {
  name: string
  defaultValue?: string[]
  placeholder?: string
  max?: number
}) {
  const [items, setItems] = useState<string[]>(defaultValue)
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v || items.length >= max) return
    setItems((l) => [...l, v])
    setDraft('')
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-center gap-2 rounded-lg border border-line-soft bg-paper-2 px-3 py-2">
              <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-ok" />
              <span className="min-w-0 flex-1 text-[13px] text-ink-2">{it}</span>
              <button
                type="button"
                onClick={() => setItems((l) => l.filter((_, j) => j !== i))}
                aria-label={`Remove ${it}`}
                className="shrink-0 text-ink-4 transition-colors hover:text-danger"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="input flex-1 py-2 text-[13px]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || items.length >= max}
          className="btn-outline shrink-0 px-3 py-2 text-[12.5px]"
        >
          <Icon name="plus" className="h-4 w-4" />
          Add
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ink-4">
        {items.length}/{max} — press Enter to add.
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Pairs — label + value rows (specifications, timeline)
// ──────────────────────────────────────────────────────────────

export function PairsField({
  name,
  defaultValue = [],
  labelPlaceholder = 'Label',
  valuePlaceholder = 'Value',
  max = 20,
}: {
  name: string
  defaultValue?: { label: string; value: string }[]
  labelPlaceholder?: string
  valuePlaceholder?: string
  max?: number
}) {
  const [rows, setRows] = useState(defaultValue)
  const [l, setL] = useState('')
  const [v, setV] = useState('')

  function add() {
    if (!l.trim() || !v.trim() || rows.length >= max) return
    setRows((r) => [...r, { label: l.trim(), value: v.trim() }])
    setL('')
    setV('')
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />

      {rows.length > 0 && (
        <ul className="mb-2 overflow-hidden rounded-lg border border-line-soft">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="flex items-center gap-2 border-b border-line-soft bg-paper-2 px-3 py-2 last:border-0">
              <span className="w-2/5 shrink-0 truncate text-[12.5px] font-semibold text-ink-3">{r.label}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.value}</span>
              <button
                type="button"
                onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                aria-label={`Remove ${r.label}`}
                className="shrink-0 text-ink-4 transition-colors hover:text-danger"
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[2fr_3fr_auto]">
        <input value={l} onChange={(e) => setL(e.target.value)} placeholder={labelPlaceholder} className="input py-2 text-[13px]" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={valuePlaceholder}
          className="input py-2 text-[13px]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!l.trim() || !v.trim() || rows.length >= max}
          className="btn-outline shrink-0 px-3 py-2 text-[12.5px]"
        >
          <Icon name="plus" className="h-4 w-4" />
          Add
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ink-4">{rows.length}/{max} rows.</p>
    </div>
  )
}

/** Small section heading used to group the richer fields in the form. */
export function FieldGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-line-soft bg-paper-2/50 p-4')}>
      <h4 className="text-[13px] font-bold text-ink">{title}</h4>
      {hint && <p className="mt-0.5 text-[11.5px] text-ink-3">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}
