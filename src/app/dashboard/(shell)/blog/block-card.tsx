'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon, type IconName } from '@/components/ui'
import type { Block } from '@/lib/content'
import { BLOCK_LABEL } from '@/lib/blog-blocks'
import { Input, Select } from '@/components/form'
import { cn } from '@/lib/utils'
import { RichText } from './rich-text'
import { ImageField } from './image-field'
import { IconPicker } from './icon-picker'

/**
 * One section in the builder: a header you can drag, collapse and remove, and
 * the fields for that section type inside it.
 *
 * Everything is controlled — the whole `Block[]` lives in the builder's state
 * and is posted as one hidden JSON field. That is what makes reordering,
 * duplicating and the live preview all work off the same array.
 */
export function BlockCard({
  id,
  block,
  index,
  collapsed,
  onChange,
  onToggle,
  onDuplicate,
  onRemove,
}: {
  id: string
  block: Block
  index: number
  collapsed: boolean
  onChange: (next: Block) => void
  onToggle: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border bg-paper-2',
        isDragging ? 'z-10 border-brand shadow-lift' : 'border-line'
      )}
    >
      {/* ─── header ─── */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 md:gap-3 md:px-3.5 md:py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${BLOCK_LABEL[block.type]} section`}
          className="flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-ink-4 transition-colors hover:text-ink-2 active:cursor-grabbing"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>

        {/* the type, as a marked tile — the blueprint reads the kind of
            section from its glyph before reading the label */}
        <span className="chip-icon h-9 w-9 shrink-0 rounded-lg bg-brand-soft text-brand md:h-10 md:w-10">
          <Icon name={BLOCK_ICON[block.type] ?? 'file'} className="h-[18px] w-[18px]" />
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate font-display text-[13.5px] font-bold text-ink md:text-[14.5px]">
            {BLOCK_LABEL[block.type]} Section
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
            {summarise(block)}
          </span>
        </button>

        <span className="flex shrink-0 items-center gap-0.5">
          {/* Hidden under `lg`: the pencil and the chevron both open the
              editor, and on a narrow column those 32px are what the section's
              own name needs to stay readable. */}
          <RowButton label="Edit this section" onClick={onToggle} className="hidden lg:flex">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </RowButton>

          <RowButton label="Duplicate this section" onClick={onDuplicate}>
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </RowButton>

          <RowButton label="Remove this section" onClick={onRemove} tone="danger">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </RowButton>

          <RowButton
            label={collapsed ? 'Expand this section' : 'Collapse this section'}
            onClick={onToggle}
          >
            <svg
              viewBox="0 0 10 6"
              aria-hidden
              className={cn('h-[5px] w-[9px] transition-transform', !collapsed && 'rotate-180')}
            >
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </RowButton>
        </span>
      </div>

      {/* ─── editor ─── */}
      {!collapsed && (
        <div className="border-t border-line-soft px-3.5 py-3.5">
          <BlockEditor block={block} onChange={onChange} />
        </div>
      )}
    </li>
  )
}

/** One glyph per section type, for the tile on the row. */
const BLOCK_ICON: Record<string, IconName> = {
  heading: 'file',
  para: 'file',
  lead: 'file',
  bullets: 'check',
  iconGrid: 'grid',
  imageGrid: 'grid',
  image: 'box',
  cards: 'star',
  numbered: 'settings',
  quote: 'alert',
  pills: 'tag',
  cta: 'arrow',
}

/**
 * One of the small controls on a section row.
 *
 * 32px, which is under the 44px touch target a phone wants — but this row is
 * a desktop and tablet control, and the phone keeps the whole card tappable
 * through the title button beside these.
 */
function RowButton({
  label,
  onClick,
  tone = 'muted',
  className,
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'muted' | 'danger'
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        tone === 'danger'
          ? 'text-danger/70 hover:bg-danger-soft hover:text-danger'
          : 'text-ink-4 hover:bg-paper-3 hover:text-brand',
        className
      )}
    >
      {children}
    </button>
  )
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/**
 * The line under a section's name on its row.
 *
 * Text sections show their text, because that is what identifies them at a
 * glance. Everything built from repeated rows shows a count instead — a list
 * of six titles run together is unreadable at this size, and "6 items" is the
 * fact the author is actually checking.
 */
function summarise(b: Block): string {
  switch (b.type) {
    case 'heading':
      return b.text ? `${b.number ? `${b.number}. ` : ''}${b.text}` : 'Not written yet'
    case 'lead':
    case 'para':
      return b.text || 'Not written yet'
    case 'quote':
      return b.text ? plural(1, 'quote') : 'Not written yet'
    case 'bullets':
      return plural(b.items.filter(Boolean).length, 'point')
    case 'iconGrid':
    case 'cards':
    case 'numbered':
      return plural(b.items.filter((i) => i.title).length, 'item')
    case 'imageGrid':
      return plural(b.items.filter((i) => i.image).length, 'image')
    case 'image':
      return b.caption || (b.image ? '1 image' : 'No image yet')
    case 'pills':
      return plural(b.items.filter((i) => i.text).length, 'tag')
    case 'cta':
      return b.title || 'Not written yet'
  }
}

// ═══════════════════════════════════════════════════════════
//  The editors, one per section type
// ═══════════════════════════════════════════════════════════

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  // every editor narrows `block` by its own type, so the patch is safe
  const patch = (p: Record<string, unknown>) => onChange({ ...block, ...p } as Block)

  switch (block.type) {
    case 'lead':
    case 'para':
      return (
        <RichText
          value={block.text}
          rows={block.type === 'lead' ? 3 : 5}
          placeholder={block.type === 'lead' ? 'The opening paragraph…' : 'Write your paragraph…'}
          onChange={(text) => patch({ text })}
        />
      )

    case 'quote':
      return (
        <RichText
          value={block.text}
          rows={3}
          placeholder="The statement you want to stand out…"
          onChange={(text) => patch({ text })}
        />
      )

    case 'heading':
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px]">
          <Input
            value={block.text}
            placeholder="Section title"
            onChange={(e) => patch({ text: e.target.value })}
          />
          <Select
            value={String(block.level ?? 2)}
            aria-label="Heading level"
            onChange={(e) => patch({ level: Number(e.target.value) })}
          >
            <option value="2">H2 — big</option>
            <option value="3">H3 — medium</option>
            <option value="4">H4 — small</option>
          </Select>
          <Input
            type="number"
            min={0}
            value={block.number ?? ''}
            placeholder="No."
            title="Number this heading — leave blank for none"
            onChange={(e) => patch({ number: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      )

    case 'bullets':
      return (
        <div className="flex flex-col gap-2.5">
          <Input
            value={block.title ?? ''}
            placeholder="Optional heading above the list"
            onChange={(e) => patch({ title: e.target.value })}
          />
          <Rows
            rows={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ''}
            addLabel="Add a point"
            render={(item, set) => (
              <Input
                value={item}
                placeholder="One point"
                onChange={(e) => set(e.target.value)}
              />
            )}
          />
        </div>
      )

    case 'iconGrid':
      return (
        <div className="flex flex-col gap-2.5">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input
              value={block.title ?? ''}
              placeholder="Optional heading above the grid"
              onChange={(e) => patch({ title: e.target.value })}
            />
            <ColumnSelect value={block.columns} onChange={(columns) => patch({ columns })} />
          </div>
          <Rows
            rows={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ icon: 'star' as IconName, title: '', body: '' })}
            addLabel="Add a block"
            render={(item, set) => (
              <div className="flex min-w-0 flex-1 gap-2">
                <IconPicker value={item.icon} onChange={(icon) => set({ ...item, icon })} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    value={item.title}
                    placeholder="Title — e.g. Energy Efficiency"
                    onChange={(e) => set({ ...item, title: e.target.value })}
                  />
                  <Input
                    value={item.body}
                    placeholder="One line of description"
                    onChange={(e) => set({ ...item, body: e.target.value })}
                  />
                </div>
              </div>
            )}
          />
        </div>
      )

    case 'cards':
      return (
        <div className="flex flex-col gap-2.5">
          <Input
            value={block.title ?? ''}
            placeholder="Optional heading above the cards"
            onChange={(e) => patch({ title: e.target.value })}
          />
          <Rows
            rows={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ icon: 'check' as IconName, title: '', body: '' })}
            addLabel="Add a card"
            render={(item, set) => (
              <div className="flex min-w-0 flex-1 gap-2">
                <IconPicker value={item.icon} onChange={(icon) => set({ ...item, icon })} />
                <Input
                  value={item.title}
                  placeholder="e.g. Lower energy bills"
                  onChange={(e) => set({ ...item, title: e.target.value })}
                />
              </div>
            )}
          />
        </div>
      )

    case 'pills':
      return (
        <Rows
          rows={block.items}
          onChange={(items) => patch({ items })}
          blank={() => ({ icon: 'check' as IconName, text: '' })}
          addLabel="Add a tag"
          render={(item, set) => (
            <div className="flex min-w-0 flex-1 gap-2">
              <IconPicker value={item.icon} onChange={(icon) => set({ ...item, icon })} />
              <Input
                value={item.text}
                placeholder="Short label"
                onChange={(e) => set({ ...item, text: e.target.value })}
              />
            </div>
          )}
        />
      )

    case 'numbered':
      return (
        <div className="flex flex-col gap-2.5">
          <Input
            value={block.title ?? ''}
            placeholder="Optional heading above the list"
            onChange={(e) => patch({ title: e.target.value })}
          />
          <Rows
            rows={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ title: '', body: '' })}
            addLabel="Add a point"
            render={(item, set) => (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  value={item.title}
                  placeholder="Point heading"
                  onChange={(e) => set({ ...item, title: e.target.value })}
                />
                <RichText
                  value={item.body}
                  rows={2}
                  placeholder="What this point says…"
                  onChange={(body) => set({ ...item, body })}
                />
              </div>
            )}
          />
        </div>
      )

    case 'imageGrid':
      return (
        <div className="flex flex-col gap-2.5">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Input
              value={block.title ?? ''}
              placeholder="Optional heading above the grid"
              onChange={(e) => patch({ title: e.target.value })}
            />
            <ColumnSelect value={block.columns} onChange={(columns) => patch({ columns })} />
          </div>
          <Rows
            rows={block.items}
            onChange={(items) => patch({ items })}
            blank={() => ({ image: '', caption: '' })}
            addLabel="Add a picture"
            render={(item, set) => (
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[180px_1fr]">
                <ImageField
                  value={item.image}
                  ratio="aspect-[4/3]"
                  label="picture"
                  onChange={(image) => set({ ...item, image })}
                />
                <Input
                  value={item.caption}
                  placeholder="Caption — e.g. Green Roofs"
                  onChange={(e) => set({ ...item, caption: e.target.value })}
                />
              </div>
            )}
          />
        </div>
      )

    case 'image':
      return (
        <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
          <ImageField
            value={block.image}
            label="picture"
            onChange={(image) => patch({ image })}
          />
          <div className="flex flex-col gap-2.5">
            <Input
              value={block.caption ?? ''}
              placeholder="Caption (optional)"
              onChange={(e) => patch({ caption: e.target.value })}
            />
            <Input
              value={block.alt ?? ''}
              placeholder="Describe the picture for screen readers"
              onChange={(e) => patch({ alt: e.target.value })}
            />
            <Select
              value={block.width ?? 'full'}
              aria-label="Image width"
              onChange={(e) => patch({ width: e.target.value })}
            >
              <option value="full">Full width</option>
              <option value="contained">Narrower, centred</option>
            </Select>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div className="flex flex-col gap-2.5">
          <Input
            value={block.title}
            placeholder="Heading — e.g. Planning a green build?"
            onChange={(e) => patch({ title: e.target.value })}
          />
          <RichText
            value={block.body ?? ''}
            rows={2}
            placeholder="One line of supporting text (optional)"
            onChange={(body) => patch({ body })}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Input
              value={block.buttonText}
              placeholder="Button text"
              onChange={(e) => patch({ buttonText: e.target.value })}
            />
            <Input
              value={block.buttonUrl}
              placeholder="/consult-nearby or https://…"
              onChange={(e) => patch({ buttonUrl: e.target.value })}
            />
          </div>
          <p className="text-[11.5px] text-ink-4">
            A call to action needs both a button label and a link — without them
            the section is left off the article.
          </p>
        </div>
      )
  }
}

// ═══════════════════════════════════════════════════════════

function ColumnSelect({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (n: number) => void
}) {
  return (
    <Select
      value={String(value ?? 3)}
      aria-label="Columns"
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value="2">2 columns</option>
      <option value="3">3 columns</option>
      <option value="4">4 columns</option>
      <option value="6">6 columns</option>
    </Select>
  )
}

/**
 * A repeating list of rows with Add and Remove.
 *
 * Six of the ten section types are "several of the same thing", so the
 * add/remove plumbing lives here once rather than six times.
 */
function Rows<T>({
  rows,
  onChange,
  blank,
  render,
  addLabel,
}: {
  rows: T[]
  onChange: (next: T[]) => void
  blank: () => T
  render: (row: T, set: (next: T) => void) => React.ReactNode
  addLabel: string
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="tabular mt-3 w-4 shrink-0 text-[11px] text-ink-4">{i + 1}</span>
            {render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`Remove item ${i + 1}`}
              title="Remove"
              className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-4 transition-colors hover:text-danger"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChange([...rows, blank()])}
        className="self-start text-[12.5px] font-semibold text-brand hover:underline"
      >
        + {addLabel}
      </button>
    </div>
  )
}
