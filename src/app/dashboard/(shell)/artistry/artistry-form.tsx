'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { ArtGlyph } from '@/components/artistry'
import { ARTISTRY_CATEGORIES } from '@/config/taxonomy'
import { cn } from '@/lib/utils'
import {
  saveArtistryAction,
  uploadArtistryFileAction,
  type ArtistryState,
} from './artistry-actions'

/**
 * Create / edit an Artistry posting.
 *
 * Two columns: the brief on the left in the design's seven numbered sections,
 * the media and SEO rail on the right. Everything the rail collects is a URL
 * that was uploaded on its own before the form is saved, so each one lives in
 * React state and rides along in a hidden input — the same arrangement the
 * Blog builder uses, and for the same reason.
 */

export type ArtistryDraft = {
  id: string | null
  title: string
  category: string
  subCategory: string
  yearPeriod: string
  location: string
  tags: string[]
  shortDescription: string
  detail: string
  material: string
  dimensions: string
  weight: string
  yearBuilt: string
  artType: string
  technique: string
  colourFinish: string
  condition: string
  applicable: string[]
  projectTitle: string
  completionDate: string
  projectStatus: string
  projectDuration: string
  allowEnquiries: boolean
  allowComments: boolean
  featured: boolean
  showInProfile: boolean
  coverImage: string
  gallery: string[]
  videoUrl: string
  externalUrl: string
  documents: string[]
  metaTitle: string
  metaDescription: string
  keywords: string
}

export const EMPTY_DRAFT: ArtistryDraft = {
  id: null,
  title: '', category: '', subCategory: '', yearPeriod: '', location: '', tags: [],
  shortDescription: '', detail: '',
  material: '', dimensions: '', weight: '', yearBuilt: '',
  artType: '', technique: '', colourFinish: '', condition: '',
  applicable: [],
  projectTitle: '', completionDate: '', projectStatus: '', projectDuration: '',
  allowEnquiries: true, allowComments: true, featured: false, showInProfile: true,
  coverImage: '', gallery: [], videoUrl: '', externalUrl: '', documents: [],
  metaTitle: '', metaDescription: '', keywords: '',
}

const MATERIALS = ['Sandstone', 'Marble', 'Teak Wood', 'Lime Plaster', 'Terracotta', 'Bronze', 'Brick', 'Concrete', 'Bamboo', 'Mixed Media']
const TYPES = ['Heritage Building', 'Sculpture', 'Painting', 'Mural', 'Photograph', 'Textile', 'Artefact', 'Installation']
const TECHNIQUES = ['Hand Carved, Traditional', 'Cast', 'Woven', 'Painted', 'Printed', 'Restored', 'Digitally Composed']
const CONDITIONS = ['Fully Restored', 'Partially Restored', 'Original', 'Under Restoration', 'Replica']
const STATUSES = ['Restored', 'Completed', 'Ongoing', 'Proposed', 'Documented']

export function ArtistryForm({ initial }: { initial: ArtistryDraft }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<ArtistryState, FormData>(
    saveArtistryAction,
    null
  )

  const [d, setD] = useState<ArtistryDraft>(initial)
  const set = <K extends keyof ArtistryDraft>(k: K, v: ArtistryDraft[K]) =>
    setD((p) => ({ ...p, [k]: v }))

  const [tagDraft, setTagDraft] = useState('')

  const group = ARTISTRY_CATEGORIES.find((g) => g.slug === d.category)
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined)

  // A successful save leaves the author on the list, where the new row is.
  if (state?.ok && !pending) router.push('/dashboard/artistry')

  function addTag() {
    const t = tagDraft.trim()
    if (!t || d.tags.includes(t) || d.tags.length >= 10) return
    set('tags', [...d.tags, t])
    setTagDraft('')
  }

  function toggleApplicable(slug: string) {
    set(
      'applicable',
      d.applicable.includes(slug)
        ? d.applicable.filter((s) => s !== slug)
        : [...d.applicable, slug]
    )
  }

  return (
    <form action={action} className="min-w-0">
      {/* everything the rail holds, carried as plain strings */}
      <input type="hidden" name="postId" value={d.id ?? ''} />
      <input type="hidden" name="coverImage" value={d.coverImage} />
      <input type="hidden" name="gallery" value={d.gallery.join(',')} />
      <input type="hidden" name="documents" value={d.documents.join(',')} />
      <input type="hidden" name="tags" value={d.tags.join(',')} />
      <input type="hidden" name="applicable" value={d.applicable.join(',')} />

      {/* ─── header ─── */}
      <div className="mb-6 flex min-w-0 items-start gap-3">
        <Link
          href="/dashboard/artistry"
          aria-label="Back to my artistry"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 text-ink-2 transition-colors hover:border-brand hover:text-brand"
        >
          <ArtGlyph name="left" className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-ink">
            {d.id ? 'Edit Artistry' : 'Create New Artistry'}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Showcase your creative work, heritage, art, designs and architectural expressions to
            the ArchFacing community.
          </p>
        </div>
      </div>

      {state && !state.ok && state.error && (
        <p className="mb-4 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger">
          {state.error}
        </p>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ═════════════════ the brief ═════════════════ */}
        <div className="min-w-0 rounded-card border border-line bg-paper p-5 shadow-card md:p-6">
          {/* ─── 1 ─── */}
          <Section n={1} title="Basic Information">
            <Field label="Title" required error={err('title')} count={`${d.title.length}/200`}>
              <input
                name="title"
                maxLength={200}
                value={d.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Enter title of your artistry"
                className="input"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Category" required error={err('category')}>
                <select
                  name="category"
                  value={d.category}
                  onChange={(e) => {
                    set('category', e.target.value)
                    set('subCategory', '')
                  }}
                  className="input"
                >
                  <option value="">Select category</option>
                  {ARTISTRY_CATEGORIES.map((g) => (
                    <option key={g.slug} value={g.slug}>{g.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Sub Category" required error={err('subCategory')}>
                <select
                  name="subCategory"
                  value={d.subCategory}
                  onChange={(e) => set('subCategory', e.target.value)}
                  disabled={!group}
                  className="input disabled:opacity-60"
                >
                  <option value="">Select sub category</option>
                  {(group?.children ?? []).map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Year / Period" required error={err('yearPeriod')}>
                <input
                  name="yearPeriod"
                  value={d.yearPeriod}
                  onChange={(e) => set('yearPeriod', e.target.value)}
                  placeholder="Select year / period"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Location" required error={err('location')}>
                <input
                  name="location"
                  value={d.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Enter location (City, State / Country)"
                  className="input"
                />
              </Field>

              <Field
                label="Tags"
                hint="Add relevant tags (e.g. Heritage, Indian Culture, Art, Design, etc.)"
                count={`${d.tags.length}/10`}
              >
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Type and press enter"
                  className="input"
                />
                {d.tags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {d.tags.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => set('tags', d.tags.filter((x) => x !== t))}
                          className="inline-flex items-center gap-1 rounded-lg bg-paper-3 px-2 py-1 text-[11.5px] text-ink-2 transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          {t}
                          <span aria-hidden>×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>
          </Section>

          {/* ─── 2 ─── */}
          <Section n={2} title="Short Description" required>
            <Field
              label=""
              error={err('shortDescription')}
              count={`${d.shortDescription.length}/300`}
            >
              <textarea
                name="shortDescription"
                rows={3}
                maxLength={300}
                value={d.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
                placeholder="Write a short description about your artistry (this will appear in listings)"
                className="input resize-y"
              />
            </Field>
          </Section>

          {/* ─── 3 ─── */}
          <Section n={3} title="Detailed Description" required>
            <Field label="" error={err('detail')} count={`${d.detail.length}/5000`}>
              <textarea
                name="detail"
                rows={8}
                maxLength={5000}
                value={d.detail}
                onChange={(e) => set('detail', e.target.value)}
                placeholder="Write detailed description about your artistry, inspiration, process, materials used, cultural significance etc."
                className="input resize-y"
              />
              <p className="mt-1.5 text-[11px] text-ink-4">
                Leave a blank line between paragraphs — each becomes its own paragraph on the
                public page.
              </p>
            </Field>
          </Section>

          {/* ─── 4 ─── */}
          <Section n={4} title="Specifications / Details">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Material" required>
                <Choice name="material" value={d.material} onChange={(v) => set('material', v)} options={MATERIALS} placeholder="Select material" />
              </Field>
              <Field label="Dimensions (L × W × H)">
                <input name="dimensions" value={d.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="e.g. 10 ft x 5 ft x 8 ft" className="input" />
              </Field>
              <Field label="Weight">
                <input name="weight" value={d.weight} onChange={(e) => set('weight', e.target.value)} placeholder="e.g. 450 Tons" className="input" />
              </Field>
              <Field label="Year / Built">
                <input name="yearBuilt" value={d.yearBuilt} onChange={(e) => set('yearBuilt', e.target.value)} placeholder="e.g. 1896" className="input" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Type" required>
                <Choice name="artType" value={d.artType} onChange={(v) => set('artType', v)} options={TYPES} placeholder="Select type" />
              </Field>
              <Field label="Technique" required>
                <Choice name="technique" value={d.technique} onChange={(v) => set('technique', v)} options={TECHNIQUES} placeholder="Select technique" />
              </Field>
              <Field label="Color / Finish">
                <input name="colourFinish" value={d.colourFinish} onChange={(e) => set('colourFinish', e.target.value)} placeholder="e.g. Natural Stone Finish" className="input" />
              </Field>
              <Field label="Condition" required>
                <Choice name="condition" value={d.condition} onChange={(v) => set('condition', v)} options={CONDITIONS} placeholder="Select condition" />
              </Field>
            </div>
          </Section>

          {/* ─── 5 ─── */}
          <Section n={5} title="Applicable Categories" hint="(Select all that apply)">
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ARTISTRY_CATEGORIES.map((g) => (
                <li key={g.slug}>
                  <label className="flex min-w-0 cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={d.applicable.includes(g.slug)}
                      onChange={() => toggleApplicable(g.slug)}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    <span className="min-w-0 truncate">{g.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Section>

          {/* ─── 6 ─── */}
          <Section n={6} title="Project / Artwork Information">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Project / Artwork Title">
                <input name="projectTitle" value={d.projectTitle} onChange={(e) => set('projectTitle', e.target.value)} placeholder="e.g. Temple Restoration" className="input" />
              </Field>
              <Field label="Completion Date">
                <input name="completionDate" value={d.completionDate} onChange={(e) => set('completionDate', e.target.value)} placeholder="Select date" className="input" />
              </Field>
              <Field label="Project Status">
                <Choice name="projectStatus" value={d.projectStatus} onChange={(v) => set('projectStatus', v)} options={STATUSES} placeholder="Select status" />
              </Field>
              <Field label="Project Duration">
                <input name="projectDuration" value={d.projectDuration} onChange={(e) => set('projectDuration', e.target.value)} placeholder="e.g. 6 Months" className="input" />
              </Field>
            </div>
          </Section>

          {/* ─── 7 ─── */}
          <Section n={7} title="Additional Information" hint="(Optional)" last>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {([
                ['allowEnquiries', 'Allow Enquiries'],
                ['allowComments', 'Allow Comments'],
                ['featured', 'Mark as Featured'],
                ['showInProfile', 'Show in Artist Profile'],
              ] as const).map(([key, label]) => (
                <li key={key}>
                  <label className="flex min-w-0 cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                    <input
                      type="checkbox"
                      name={key}
                      checked={d[key]}
                      onChange={(e) => set(key, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    <span className="min-w-0 truncate">{label}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                name="intent"
                value="submit"
                disabled={pending}
                className="btn-primary disabled:opacity-60"
              >
                <Icon name="check" className="h-4 w-4" />
                {pending ? 'Saving…' : 'Submit for Review'}
              </button>
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={pending}
                className="btn-outline disabled:opacity-60"
              >
                <Icon name="file" className="h-4 w-4" />
                Save Draft
              </button>
            </div>
          </Section>
        </div>

        {/* ═════════════════ the rail ═════════════════ */}
        <aside className="flex min-w-0 flex-col gap-4">
          {/* ─── feature image ─── */}
          <RailCard title="Feature Image" required error={err('coverImage')}>
            <DropUpload
              slot="cover"
              label="Click to upload feature image"
              note="Any shape. Landscape around 1920 × 1080 px crops best (Max 5MB)"
              onDone={(url) => set('coverImage', url)}
            />
            {d.coverImage && (
              <div className="relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-lg bg-paper-3">
                <Image src={d.coverImage} alt="" fill sizes="340px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => set('coverImage', '')}
                  aria-label="Remove the feature image"
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-paper/90 text-ink-2 transition-colors hover:text-danger"
                >
                  ×
                </button>
                <span className="absolute bottom-2 left-2 rounded-lg bg-paper/90 px-2 py-1 text-[10.5px] font-semibold text-ink-2">
                  Cover Image
                </span>
              </div>
            )}
          </RailCard>

          {/* ─── gallery ─── */}
          <RailCard title="Gallery Images" hint="Add multiple images (Max 20)">
            {d.gallery.length === 0 && (
              <DropUpload
                slot="gallery"
                label="Click to upload gallery images"
                onDone={(url) => set('gallery', [...d.gallery, url])}
              />
            )}

            {d.gallery.length > 0 && (
              <ul className="mt-1 grid grid-cols-4 gap-2">
                {d.gallery.map((url, i) => (
                  <li key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg bg-paper-3">
                    <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => set('gallery', d.gallery.filter((_, j) => j !== i))}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-paper/90 text-[11px] text-ink-2 transition-colors hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}

                {d.gallery.length < 20 && (
                  <li>
                    <DropUpload
                      slot="gallery"
                      compact
                      label="Add More"
                      onDone={(url) => set('gallery', [...d.gallery, url])}
                    />
                  </li>
                )}
              </ul>
            )}
          </RailCard>

          {/* ─── links ─── */}
          <RailCard title="Video (YouTube/Vimeo)" hint="(Optional)">
            <input
              name="videoUrl"
              value={d.videoUrl}
              onChange={(e) => set('videoUrl', e.target.value)}
              placeholder="Paste video URL (optional)"
              className="input"
            />
          </RailCard>

          <RailCard title="External Link" hint="(Optional)">
            <input
              name="externalUrl"
              value={d.externalUrl}
              onChange={(e) => set('externalUrl', e.target.value)}
              placeholder="Website or reference URL (optional)"
              className="input"
            />
          </RailCard>

          {/* ─── documents ─── */}
          <RailCard title="Documents" hint="(Optional)">
            <DropUpload
              slot="document"
              label="Upload Document"
              note="Max file size: 10MB (PDF, DOC, DOCX)"
              accept=".pdf,.doc,.docx,application/pdf"
              onDone={(url) => set('documents', [...d.documents, url])}
            />
            {d.documents.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {d.documents.map((url, i) => (
                  <li key={url} className="flex min-w-0 items-center gap-2 text-[11.5px] text-ink-2">
                    <Icon name="file" className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                    <span className="min-w-0 truncate">{url.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={() => set('documents', d.documents.filter((_, j) => j !== i))}
                      className="ml-auto shrink-0 text-ink-4 transition-colors hover:text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          {/* ─── seo ─── */}
          <RailCard title="SEO Settings" hint="(Optional)">
            <Field label="Meta Title" count={`${d.metaTitle.length}/60`}>
              <input
                name="metaTitle"
                maxLength={60}
                value={d.metaTitle}
                onChange={(e) => set('metaTitle', e.target.value)}
                placeholder="Enter meta title"
                className="input"
              />
            </Field>
            <Field label="Meta Description" count={`${d.metaDescription.length}/160`}>
              <textarea
                name="metaDescription"
                rows={3}
                maxLength={160}
                value={d.metaDescription}
                onChange={(e) => set('metaDescription', e.target.value)}
                placeholder="Enter meta description"
                className="input resize-y"
              />
            </Field>
            <Field label="Keywords">
              <input
                name="keywords"
                value={d.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                placeholder="Add keywords separated by comma"
                className="input"
              />
            </Field>
          </RailCard>
        </aside>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════
//  Pieces
// ═══════════════════════════════════════════════════════════

function Section({
  n, title, hint, required, last, children,
}: {
  n: number
  title: string
  hint?: string
  required?: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-4', !last && 'mb-7 border-b border-line pb-7')}>
      <h2 className="font-display text-[15.5px] font-bold text-ink">
        <span className="text-brand">{n}.</span> {title}
        {required && <span className="ml-0.5 text-brand">*</span>}
        {hint && <span className="ml-1.5 text-[12px] font-normal text-ink-3">{hint}</span>}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label, hint, count, error, required, children,
}: {
  label: string
  hint?: string
  count?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <span className="text-[12.5px] font-semibold text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-brand">*</span>}
        </span>
      )}
      {children}
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0 text-[11px] text-ink-4">{error ? '' : hint}</span>
        {count && <span className="tabular shrink-0 text-[11px] text-ink-4">{count}</span>}
      </span>
      {error && <span className="text-[11.5px] font-medium text-danger">{error}</span>}
    </div>
  )
}

/** A `<select>` that still posts a value when the list has no match. */
function Choice({
  name, value, onChange, options, placeholder,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  const known = options.includes(value)
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    >
      <option value="">{placeholder}</option>
      {!known && value && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function RailCard({
  title, hint, required, error, children,
}: {
  title: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-card border bg-paper p-4 shadow-card',
        error ? 'border-danger/40' : 'border-line'
      )}
    >
      <h2 className="mb-2.5 text-[12.5px] font-bold text-ink">
        {title}
        {required && <span className="ml-0.5 text-brand">*</span>}
        {hint && <span className="ml-1.5 font-normal text-ink-3">{hint}</span>}
      </h2>
      {children}
      {error && <p className="mt-2 text-[11.5px] font-medium text-danger">{error}</p>}
    </section>
  )
}

/**
 * A dashed drop zone that posts one file on its own.
 *
 * `compact` is the "+ Add More" tile inside the gallery grid, which has to be
 * the same square as the thumbnails beside it.
 */
function DropUpload({
  slot, label, note, accept = 'image/jpeg,image/jpg,image/png,image/webp', compact, onDone,
}: {
  slot: 'cover' | 'gallery' | 'document'
  label: string
  note?: string
  accept?: string
  compact?: boolean
  onDone: (url: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState<string | null>(null)

  function choose(file: File | undefined) {
    if (!file) return
    setProblem(null)
    start(async () => {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('slot', slot)
      const res = await uploadArtistryFileAction(fd)
      if (res.ok) onDone(res.url)
      else setProblem(res.error)
      if (input.current) input.current.value = ''
    })
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-paper-3 text-center transition-colors hover:border-brand disabled:opacity-60',
          compact ? 'aspect-square p-2' : 'px-4 py-7'
        )}
      >
        <Icon name={slot === 'document' ? 'file' : 'grid'} className="h-5 w-5 text-ink-3" />
        <span className="text-[11.5px] font-medium text-ink-2">
          {pending ? 'Uploading…' : label}
        </span>
        {!compact && !pending && (
          <span className="text-[11px] text-ink-4">or drag and drop</span>
        )}
        {note && !compact && <span className="mt-1 text-[10.5px] text-ink-4">{note}</span>}
      </button>
      {problem && <p className="mt-1.5 text-[11.5px] font-medium text-danger">{problem}</p>}
    </>
  )
}
