'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { createPostAction, updatePostAction, type PostState } from './post-actions'
import { Field, Input, Select, Button, Alert } from '@/components/form'
import { RichTextField, ListField, PairsField } from './form-fields'
import { INDIAN_STATES } from '@/config/states'
import type { PostTypeConfig } from '@/config/post-types'
import { parseVideoUrl, VIDEO_HOST_LABEL } from '@/lib/video'
import { findPhoneNumbers, NO_PHONE_MESSAGE } from '@/lib/phone-detect'

/** An existing posting loaded into the form (§5.2.13 Edit the Postings). */
export type PostEdit = {
  postId: string
  values: Record<string, string>
  lists: Record<string, unknown[]>
  flags: Record<string, boolean>
  media: { id: string; url: string; type: string; label: string | null; fileName: string }[]
  doneHref: string
}

type Leaf = { id: string; slug: string; name: string }
/** Primary → Secondary → Tertiary, exactly as /admin/categories holds them. */
type CategoryNode = Leaf & { children: (Leaf & { children?: Leaf[] })[] }

export function PostForm({
  config,
  categories,
  defaultPincode,
  defaultState,
  edit,
}: {
  config: PostTypeConfig
  categories: CategoryNode[]
  defaultPincode?: string | null
  defaultState?: string | null
  edit?: PostEdit
}) {
  const action = edit ? updatePostAction.bind(null, edit.postId) : createPostAction.bind(null, config.type)
  const [state, submit, pending] = useActionState<PostState | null, FormData>(
    action,
    null
  )

  const [category, setCategory] = useState(edit?.values.category ?? '')
  const [subCategory, setSubCategory] = useState(edit?.values.subCategory ?? '')
  const [videoUrl, setVideoUrl] = useState(edit?.values.videoUrl ?? '')
  const [images, setImages] = useState<File[]>([])
  const [words, setWords] = useState(0)
  const [phoneInText, setPhoneInText] = useState(false)

  // The form is rebuilt after an error — put the entered values back in
  const prev = (k: string) => state?.values?.[k] ?? edit?.values[k] ?? ''
  const err = (k: string) => state?.fieldErrors?.[k]

  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (state && !state.ok) setFormKey((k) => k + 1)
  }, [state])

  const subCategories =
    categories.find((c) => c.slug === category)?.children ?? []
  const tertiaries = subCategories.find((s) => s.slug === subCategory)?.children ?? []
  // Any third level anywhere in this type (Products) earns the third column.
  const hasThirdLevel = categories.some((c) => c.children.some((s) => (s.children?.length ?? 0) > 0))

  const video = videoUrl.trim() ? parseVideoUrl(videoUrl) : null

  if (state?.ok && edit) {
    return (
      <Alert tone="success">
        <strong>Your changes have been saved.</strong> The {config.label.toLowerCase()} goes back to the
        ArchFacing team for review and is published again once approved.{' '}
        <Link href={edit.doneHref} className="font-medium text-brand hover:underline">
          Back to my postings →
        </Link>
      </Alert>
    )
  }

  if (state?.ok) {
    return (
      <Alert tone="success">
        <strong>Your {config.label} has been submitted.</strong> The ArchFacing
        team will review it and publish it — until then it appears under “My
        postings” as
        <em> in review</em>.{' '}
        <Link href="/dashboard" className="font-medium text-brand hover:underline">
          Dashboard →
        </Link>
      </Alert>
    )
  }

  return (
    // `id="add-new"` is the anchor the sidebar's "Add a …" child links scroll
    // to. The visible "Add a new …" heading was removed on request (panel pages
    // show the page heading only) — the id stays on the form so those links
    // still land the reader on the fields.
    <form
      key={formKey}
      id="add-new"
      action={submit}
      className="flex scroll-mt-4 flex-col gap-6"
    >
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {/* ── basics ── */}
      <Field label="Title" name="title" required error={err('title')}>
        <Input
          id="title"
          name="title"
          required
          maxLength={180}
          defaultValue={prev('title')}
          error={!!err('title')}
        />
      </Field>

      <Field
        label="Description"
        name="description"
        required
        hint={`Up to ${config.maxWords} words${words ? ` · currently ${words}` : ''}`}
        error={err('description')}
      >
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          defaultValue={prev('description')}
          onChange={(e) => {
            setWords(e.target.value.trim().split(/\s+/).filter(Boolean).length)
            setPhoneInText(findPhoneNumbers(e.target.value).length > 0)
          }}
          className={`w-full rounded-card border bg-paper-2 px-3 py-2.5 text-[14px] leading-relaxed transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${
            err('description') || words > config.maxWords
              ? 'border-brand'
              : 'border-line'
          }`}
        />
      </Field>
      {phoneInText && (
        <p role="alert" className="-mt-4 text-[12.5px] text-danger">{NO_PHONE_MESSAGE}</p>
      )}

      {/* ── category ── */}
      <div className={`grid gap-5 sm:grid-cols-2 ${hasThirdLevel ? 'md:grid-cols-3' : ''}`}>
        <Field label="Primary category" name="category" required error={err('category')}>
          <Select
            id="category"
            name="category"
            required
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setSubCategory('')
            }}
            error={!!err('category')}
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {(config.requiresSubCategory || subCategories.length > 0) && (
          <Field
            label="Secondary category"
            name="subCategory"
            required={config.requiresSubCategory}
            error={err('subCategory')}
          >
            <Select
              id="subCategory"
              name="subCategory"
              required={config.requiresSubCategory}
              disabled={!subCategories.length}
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              error={!!err('subCategory')}
            >
              <option value="">
                {subCategories.length ? 'Select…' : 'Choose a category first'}
              </option>
              {subCategories.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {hasThirdLevel && (
          <Field label="Tertiary category" name="tertiaryCategory" error={err('tertiaryCategory')}>
            <Select
              id="tertiaryCategory"
              name="tertiaryCategory"
              key={subCategory}
              disabled={!tertiaries.length}
              defaultValue={subCategory === (edit?.values.subCategory ?? '') ? prev('tertiaryCategory') : ''}
              error={!!err('tertiaryCategory')}
            >
              <option value="">
                {tertiaries.length ? 'Select…' : subCategory ? 'None for this one' : 'Choose a secondary first'}
              </option>
              {tertiaries.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {/* ── location and year ── */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="PIN code" name="pincode" required error={err('pincode')}>
          <Input
            id="pincode"
            name="pincode"
            inputMode="numeric"
            maxLength={6}
            required
            defaultValue={prev('pincode') || defaultPincode || ''}
            error={!!err('pincode')}
            className="font-mono"
          />
        </Field>

        <Field label="City" name="city">
          <Input id="city" name="city" defaultValue={prev('city')} />
        </Field>

        <Field label="State" name="state" required error={err('state')}>
          <Select
            id="state"
            name="state"
            required
            defaultValue={prev('state') || defaultState || ''}
            error={!!err('state')}
          >
            <option value="">Select…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Introducing year"
        name="year"
        required
        hint="People will filter results by this year"
        error={err('year')}
      >
        <Input
          id="year"
          name="year"
          type="number"
          min={1900}
          max={new Date().getFullYear() + 5}
          required
          defaultValue={prev('year') || String(new Date().getFullYear())}
          error={!!err('year')}
          className="max-w-[10rem] font-mono"
        />
      </Field>

      {/* ── images ── */}
      <fieldset className="rounded-card border border-line bg-paper-2 p-5">
        <legend className="eyebrow px-1">Images and video</legend>

        {edit && edit.media.some((m) => m.type !== 'VIDEO_LINK') && (
          <div className="mb-5">
            <p className="mb-2 text-[13px] font-medium text-ink">Current files <span className="font-normal text-ink-3">— tick any to remove</span></p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {edit.media.filter((m) => m.type !== 'VIDEO_LINK').map((m) => (
                <li key={m.id}>
                  <label className="block cursor-pointer overflow-hidden rounded-card border border-line bg-paper">
                    {m.type === 'IMAGE' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.fileName} className="aspect-[5/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[5/3] items-center justify-center bg-paper-3 text-[12px] font-semibold text-ink-3">{m.type}</span>
                    )}
                    <span className="flex items-center gap-2 px-2 py-1.5 text-[11.5px] text-ink-2">
                      <input type="checkbox" name="removeMedia" value={m.id} className="h-3.5 w-3.5 accent-brand" />
                      <span className="truncate">{m.label ?? 'Remove'}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field
          label="Images"
          name="images"
          required={!edit && config.images.min > 0}
          hint={`${edit ? 'Add more · ' : ''}JPG · up to 2 MB · landscape ${
            config.images.aspect === 'wide' ? '16:9' : '5:3'
          } · ${config.images.min}–${config.images.max} images · no phone numbers on images`}
          error={err('images')}
        >
          <input
            id="images"
            name="images"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            required={!edit && config.images.min > 0}
            onChange={(e) => setImages([...(e.target.files ?? [])])}
            className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-paper hover:file:bg-brand"
          />
        </Field>

        {images.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {images.map((f, i) => {
              const tooBig = f.size > 2 * 1024 * 1024
              return (
                <li
                  key={i}
                  className={`flex justify-between gap-3 text-[12px] ${
                    tooBig ? 'text-brand' : 'text-ink-3'
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="tabular shrink-0 font-mono">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                    {tooBig && ' — too large'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {/* ── plan drawings, a second set kept apart from the photographs ── */}
        {config.planImages && (
          <div className="mt-5">
            <Field
              label={config.planImages.label}
              name="planImages"
              hint={config.planImages.hint}
              error={err('planImages')}
            >
              <input
                id="planImages"
                name="planImages"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                required={!edit && config.planImages.min > 0}
                className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-paper hover:file:bg-brand"
              />
            </Field>
          </div>
        )}

        {/* ── video link ── */}
        {config.allowVideo && (
          <div className="mt-5">
            <Field
              label="Video link"
              name="videoUrl"
              hint="A YouTube or Dailymotion link — no upload needed"
              error={err('videoUrl')}
            >
              <Input
                id="videoUrl"
                name="videoUrl"
                type="url"
                placeholder="https://youtu.be/… or https://dailymotion.com/video/…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                error={!!err('videoUrl') || (!!videoUrl.trim() && !video)}
              />
            </Field>

            {videoUrl.trim() &&
              (video ? (
                <p className="mt-1.5 text-[12px] text-ok">
                  ✓ {VIDEO_HOST_LABEL[video.host]} video recognised —{' '}
                  <span className="font-mono">{video.videoId}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] text-brand">
                  This link was not recognised. Only YouTube and Dailymotion are supported.
                </p>
              ))}
          </div>
        )}

        {/* ── documents ── */}
        {(config.allowPdf || config.allowPpt) && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {config.allowPdf && (
              <Field
                label="PDF"
                name="pdf"
                hint="Up to 10 MB"
                error={err('pdf')}
              >
                <input
                  id="pdf"
                  name="pdf"
                  type="file"
                  accept="application/pdf"
                  className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:text-paper"
                />
              </Field>
            )}
            {config.allowPpt && (
              <Field
                label="Presentation"
                name="ppt"
                hint="PPT · up to 10 MB"
                error={err('ppt')}
              >
                <input
                  id="ppt"
                  name="ppt"
                  type="file"
                  accept=".ppt,.pptx"
                  className="w-full rounded-card border border-line bg-paper-2 px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[12px] file:text-paper"
                />
              </Field>
            )}
          </div>
        )}
      </fieldset>

      {/* ── fields specific to this type ── */}
      {config.extraFields.length > 0 && (
        <fieldset className="rounded-card border border-line bg-paper-2 p-5">
          <legend className="eyebrow px-1">{config.label} details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {config.extraFields.map((f) =>
              // A checkbox carries its own label to the right of the box, so it
              // is not wrapped in Field the way a labelled input is.
              f.type === 'checkbox' ? (
                <label
                  key={f.name}
                  htmlFor={f.name}
                  className="flex cursor-pointer items-start gap-2.5 sm:col-span-2"
                >
                  <input
                    id={f.name}
                    name={f.name}
                    type="checkbox"
                    value="on"
                    defaultChecked={edit ? !!edit.flags[f.name] : f.defaultChecked}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] text-ink">{f.label}</span>
                    {f.hint && (
                      <span className="mt-0.5 block text-[12.5px] text-ink-3">{f.hint}</span>
                    )}
                  </span>
                </label>
              ) : (
              <div
                key={f.name}
                className={
                  f.wide || ['textarea', 'richtext', 'list', 'pairs'].includes(f.type)
                    ? 'sm:col-span-2'
                    : ''
                }
              >
                <Field
                  label={f.label}
                  name={f.name}
                  required={f.required}
                  hint={f.hint}
                  error={err(f.name)}
                >
                  {f.type === 'richtext' ? (
                    <RichTextField name={f.name} defaultValue={prev(f.name)} placeholder={f.placeholder} />
                  ) : f.type === 'list' ? (
                    <ListField name={f.name} placeholder={f.placeholder} max={f.max ?? 20} defaultValue={(edit?.lists[f.name] as string[] | undefined) ?? []} />
                  ) : f.type === 'pairs' ? (
                    <PairsField
                      name={f.name}
                      max={f.max ?? 20}
                      defaultValue={(edit?.lists[f.name] as { label: string; value: string }[] | undefined) ?? []}
                      labelPlaceholder={f.pairLabels?.[0] ?? 'Label'}
                      valuePlaceholder={f.pairLabels?.[1] ?? 'Value'}
                    />
                  ) : f.type === 'select' ? (
                    <select
                      id={f.name}
                      name={f.name}
                      defaultValue={prev(f.name)}
                      className="w-full rounded-card border border-line bg-paper-2 px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="">Select…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      id={f.name}
                      name={f.name}
                      rows={3}
                      defaultValue={prev(f.name)}
                      className="w-full rounded-card border border-line bg-paper-2 px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  ) : (
                    <Input
                      id={f.name}
                      name={f.name}
                      type={f.type === 'datetime' ? 'datetime-local' : f.type}
                      required={f.required}
                      placeholder={f.placeholder}
                      defaultValue={prev(f.name)}
                      error={!!err(f.name)}
                    />
                  )}
                </Field>
              </div>
              )
            )}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Checking images and saving…' : edit ? 'Save changes' : `Submit ${config.label}`}
        </Button>
        <p className="text-[12.5px] text-ink-3">
          {edit
            ? 'Saved changes go back to the ArchFacing team for review before they are published.'
            : 'After you submit, the ArchFacing team reviews it before publishing.'}
        </p>
      </div>
    </form>
  )
}
