'use client'

import { useEffect, useMemo, useState } from 'react'
import { useActionState } from 'react'
import { createCategoryAction, type CategoryState } from './actions'
import { Field, Input, Select, Textarea, Button, Alert } from '@/components/form'
import { slugify } from '@/lib/utils'
import { POST_TYPE_OPTIONS } from './post-type-list'

export type ParentOption = { id: string; name: string; type: string }

export function CategoryForm({
  defaultType,
  parents,
}: {
  defaultType: string
  parents: ParentOption[]
}) {
  const [state, submit, pending] = useActionState<CategoryState | null, FormData>(
    createCategoryAction,
    null
  )

  const [type, setType] = useState(defaultType)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  const err = (k: string) => state?.fieldErrors?.[k]

  // a fresh form after every successful create
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state?.ok) {
      setName('')
      setSlug('')
      setSlugEdited(false)
      setFormKey((k) => k + 1)
    }
  }, [state])

  // the filter tab changed under us
  useEffect(() => {
    setType(defaultType)
  }, [defaultType])

  const parentOptions = useMemo(
    () => parents.filter((p) => p.type === type),
    [parents, type]
  )

  return (
    <form key={formKey} action={submit} className="flex flex-col gap-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {state?.ok && state.created && (
        <Alert tone="success">
          “{state.created.name}” was added as{' '}
          <strong className="font-mono">{state.created.slug}</strong>.
        </Alert>
      )}

      <Field label="Name" name="name" required error={err('name')}>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!slugEdited) setSlug(slugify(e.target.value))
          }}
          placeholder="Kitchen Equipment"
          error={!!err('name')}
        />
      </Field>

      <Field
        label="Slug"
        name="slug"
        required
        hint="Suggested from the name — you can change it now, but never after saving."
        error={err('slug')}
      >
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugEdited(true)
            setSlug(e.target.value)
          }}
          placeholder="kitchen-equipment"
          className="font-mono"
          error={!!err('slug')}
        />
      </Field>

      <Field label="Type" name="type" required error={err('type')}>
        <Select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          error={!!err('type')}
        >
          {POST_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Parent category"
        name="parentId"
        hint={
          parentOptions.length === 0
            ? 'This type has no categories yet'
            : 'Blank = Primary · pick a Primary to make a Secondary · pick a Secondary to make a Tertiary'
        }
        error={err('parentId')}
      >
        <Select id="parentId" name="parentId" error={!!err('parentId')}>
          <option value="">— none, this is a Primary category —</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Description" name="description" error={err('description')}>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={state?.values?.description ?? ''}
          placeholder="Optional — shown as help text on the posting form"
          error={!!err('description')}
        />
      </Field>

      <Field
        label="Sort order"
        name="sortOrder"
        hint="Lower numbers appear first"
        error={err('sortOrder')}
      >
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          min={0}
          max={9999}
          step={1}
          defaultValue={state?.values?.sortOrder ?? '0'}
          error={!!err('sortOrder')}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add category'}
      </Button>
    </form>
  )
}
