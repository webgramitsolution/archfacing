'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import {
  deleteCategoryAction,
  toggleCategoryAction,
  updateCategoryAction,
  type CategoryState,
} from './actions'
import { Field, Input, Textarea, Button, Alert } from '@/components/form'
import { Td, Icon } from '@/components/ui'

export type CategoryRowData = {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  childCount: number
  /** In the database but not in the PDF taxonomy or any mega menu. */
  extra?: boolean
}

export function CategoryRow({
  category,
  depth,
}: {
  category: CategoryRowData
  depth: number
}) {
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string | null>(null)

  return (
    <>
      <tr className={category.isActive ? undefined : 'opacity-60'}>
        <Td>
          <span
            className="flex items-center gap-2"
            style={{ paddingLeft: depth * 20 }}
          >
            {depth > 0 && (
              <span aria-hidden className="text-ink-4">
                └
              </span>
            )}
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className={depth === 0 ? 'font-semibold text-ink' : depth === 1 ? 'font-medium text-ink' : 'text-ink-2'}>{category.name}</span>
                <span className={'rounded px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide ' + (depth === 0 ? 'bg-[#EEF1FF] text-[#6366F1]' : depth === 1 ? 'bg-[#E4EEFF] text-[#2563EB]' : 'bg-[#E7F7EE] text-[#16A34A]')}>
                  {depth === 0 ? 'Primary' : depth === 1 ? 'Secondary' : 'Tertiary'}
                </span>
                {category.extra && (
                  <span title="Not in the PDF taxonomy or any mega menu — older category still used by some listings" className="rounded bg-[#FEF2E2] px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-[#EA9412]">Not in PDF / menu</span>
                )}
              </span>
              {category.description && (
                <span className="block text-[12px] text-ink-3">
                  {category.description}
                </span>
              )}
              {category.childCount > 0 && (
                <span className="block text-[11.5px] text-ink-4">
                  {category.childCount} sub-
                  {category.childCount === 1 ? 'category' : 'categories'}
                </span>
              )}
            </span>
          </span>
        </Td>

        {/* ★ read-only — a slug is never editable once it exists */}
        <Td>
          <span className="font-mono text-[12.5px] text-ink-2">{category.slug}</span>
        </Td>

        <Td className="tabular text-ink-2">{category.sortOrder}</Td>

        <Td>
          <span className={category.isActive ? 'pill-ok' : 'pill-muted'}>
            {category.isActive ? 'Active' : 'Hidden'}
          </span>
        </Td>

        <Td className="text-right">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                title={editing ? 'Close' : 'Edit'}
                onClick={() => {
                  setNote(null)
                  setEditing((v) => !v)
                }}
                className="rounded-lg border border-line p-1.5 text-ink-3 transition-colors hover:border-ink-4 hover:text-ink"
              >
                <Icon name="file" className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={pending}
                title={category.isActive ? 'Hide from the site' : 'Show on the site'}
                onClick={() =>
                  start(async () => {
                    setNote(null)
                    const r = await toggleCategoryAction(category.id, !category.isActive)
                    if (!r.ok) setNote(r.error ?? 'Could not update this category.')
                  })
                }
                className={`rounded-lg border p-1.5 transition-colors disabled:opacity-50 ${
                  category.isActive
                    ? 'border-line text-ink-3 hover:border-brand hover:text-brand'
                    : 'border-ok/30 text-ok hover:bg-ok-soft'
                }`}
              >
                <Icon name={category.isActive ? 'alert' : 'check'} className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={pending}
                title="Delete"
                onClick={() =>
                  start(async () => {
                    setNote(null)
                    const r = await deleteCategoryAction(category.id)
                    if (!r.ok) setNote(r.error ?? 'Could not delete this category.')
                  })
                }
                className="rounded-lg border border-line p-1.5 text-ink-3 transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <Icon name="plus" className="h-4 w-4 rotate-45" />
              </button>
            </div>

            {note && (
              <p className="max-w-[22rem] text-right text-[11.5px] leading-snug text-brand">
                {note}
              </p>
            )}
          </div>
        </Td>
      </tr>

      {editing && (
        <tr>
          <td colSpan={5} className="border-b border-line-soft bg-paper-3 px-4 py-5">
            <EditForm category={category} onDone={() => setEditing(false)} />
          </td>
        </tr>
      )}
    </>
  )
}

function EditForm({
  category,
  onDone,
}: {
  category: CategoryRowData
  onDone: () => void
}) {
  const [state, submit, pending] = useActionState<CategoryState | null, FormData>(
    updateCategoryAction,
    null
  )

  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])

  const err = (k: string) => state?.fieldErrors?.[k]

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={category.id} />

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
        <Field label="Name" name={`name-${category.id}`} required error={err('name')}>
          <Input
            id={`name-${category.id}`}
            name="name"
            required
            defaultValue={state?.values?.name ?? category.name}
            error={!!err('name')}
          />
        </Field>

        <Field
          label="Slug"
          name={`slug-${category.id}`}
          hint="Fixed — the slug is part of public URLs and is saved on every posting that uses it."
        >
          <p className="input bg-paper-3 font-mono text-ink-3">{category.slug}</p>
        </Field>

        <Field
          label="Sort order"
          name={`sortOrder-${category.id}`}
          error={err('sortOrder')}
        >
          <Input
            id={`sortOrder-${category.id}`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            step={1}
            defaultValue={state?.values?.sortOrder ?? String(category.sortOrder)}
            error={!!err('sortOrder')}
          />
        </Field>
      </div>

      <Field
        label="Description"
        name={`description-${category.id}`}
        error={err('description')}
      >
        <Textarea
          id={`description-${category.id}`}
          name="description"
          rows={2}
          defaultValue={state?.values?.description ?? category.description ?? ''}
          error={!!err('description')}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <p className="text-[12.5px] text-ink-3">
          Use the hide button to take a category off the site — deleting is only
          possible when nothing uses it.
        </p>
      </div>
    </form>
  )
}
