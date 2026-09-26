'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Block, BlockType } from '@/lib/content'
import { BLOCK_SPECS, emptyBlock, normaliseBlocks } from '@/lib/blog-blocks'
import { Field, Input, Select, Textarea, Alert } from '@/components/form'
import { Icon, type IconName } from '@/components/ui'
import { slugify, cn } from '@/lib/utils'
import { saveBlogAction, type BlogState } from './blog-actions'
import { BlockCard } from './block-card'
import { ImageField } from './image-field'

export type BlogDraft = {
  id?: string
  title: string
  slug: string
  subCategory: string
  category: string
  excerpt: string
  heroImage: string
  tags: string
  readMinutes: string
  authorRole: string
  /** kept on the type because `saveBlogAction` still stores them, derived */
  seoTitle: string
  seoDescription: string
  status: string
  rejectionReason?: string | null
  blocks: Block[]
}

const EXCERPT_MAX = 200

/**
 * The Blog Builder, laid out as the blueprint draws it.
 *
 * The section list fills the width, with the actions and everything that
 * labels the article down the right. Not a sticky footer and not a left-hand
 * form — the earlier arrangement put the fields first and the article second,
 * which is backwards for a page whose whole job is the article.
 *
 * ⚠️ Tablet gets the desktop layout, not the phone one. The split is `md`
 *    (768) rather than `xl`, so a tablet keeps both columns and only the type
 *    and the spacing step down. Stacking at `xl` is what made a tablet look
 *    like a stretched phone.
 *
 * ⚠️ Sections need a stable key that is not their index, or dragging a row
 *    would carry the wrong `<input>` values with it. `keys` holds an id per
 *    section for the life of the page and moves with it.
 */
export function BlogBuilder({
  initial,
  categories,
}: {
  initial: BlogDraft
  categories: { slug: string; name: string; children?: { slug: string; name: string }[] }[]
}) {
  const router = useRouter()
  const [state, submit, pending] = useActionState<BlogState | null, FormData>(
    saveBlogAction,
    null
  )

  const [d, setD] = useState<BlogDraft>(initial)
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks)
  const [keys, setKeys] = useState<string[]>(() => initial.blocks.map((_, i) => `b${i}`))
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [picking, setPicking] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [panel, setPanel] = useState({ basic: true })
  const [tagDraft, setTagDraft] = useState('')
  const nextKey = useRef(initial.blocks.length)

  const tags = useMemo(
    () => d.tags.split(',').map((t) => t.trim()).filter(Boolean),
    [d.tags]
  )

  const set = <K extends keyof BlogDraft>(k: K, v: BlogDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }))
    setDirty(true)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // dnd-kit gives keyboard reordering for free, the only way this works
    // without a mouse
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const subCategories = useMemo(
    () => categories.find((c) => c.slug === d.category)?.children ?? [],
    [categories, d.category]
  )

  /** Sections that will survive the save — the live count and reading time. */
  const kept = useMemo(() => normaliseBlocks(blocks), [blocks])

  useEffect(() => {
    if (!state?.ok || !state.postId) return
    setDirty(false)
    if (state.intent === 'submit') router.push('/dashboard/blog?sent=1')
    else if (!initial.id) router.replace(`/dashboard/blog/${state.postId}/edit`)
    else router.refresh()
  }, [state, router, initial.id])

  function addBlock(type: BlockType) {
    const b = emptyBlock(type)
    if (!b) return
    const key = `b${nextKey.current++}`
    setBlocks((p) => [...p, b])
    setKeys((p) => [...p, key])
    setOpen((p) => ({ ...p, [key]: true }))
    setPicking(false)
    setDirty(true)
  }

  function duplicate(i: number) {
    const key = `b${nextKey.current++}`
    setBlocks((p) => [...p.slice(0, i + 1), structuredClone(p[i]), ...p.slice(i + 1)])
    setKeys((p) => [...p.slice(0, i + 1), key, ...p.slice(i + 1)])
    setDirty(true)
  }

  function remove(i: number) {
    setBlocks((p) => p.filter((_, j) => j !== i))
    setKeys((p) => p.filter((_, j) => j !== i))
    setDirty(true)
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = keys.indexOf(String(active.id))
    const to = keys.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    setBlocks((p) => arrayMove(p, from, to))
    setKeys((p) => arrayMove(p, from, to))
    setDirty(true)
  }

  function addTag() {
    const t = tagDraft.trim().replace(/^#/, '')
    if (!t || tags.includes(t) || tags.length >= 12) return setTagDraft('')
    set('tags', [...tags, t].join(', '))
    setTagDraft('')
  }

  const err = (k: string) => state?.fieldErrors?.[k]

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="postId" value={d.id ?? ''} />
      <input type="hidden" name="body" value={JSON.stringify(blocks)} />
      <input type="hidden" name="heroImage" value={d.heroImage} />
      <input type="hidden" name="authorRole" value={d.authorRole} />
      <input type="hidden" name="tags" value={d.tags} />
      {/* derived from the title, never shown — a URL is not the author's job */}
      <input type="hidden" name="slug" value={d.slug} />
      {/*
        No hidden `intent` field — the submit buttons carry `name="intent"`
        themselves. A submitter's name and value are part of the FormData it
        sends, which is the only way to tell which of two buttons was pressed
        without a state update that has not flushed yet.
      */}

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.intent === 'draft' && (
        <Alert tone="success">Saved. Nobody sees a draft but you.</Alert>
      )}
      {initial.rejectionReason && initial.status === 'REJECTED' && (
        <Alert tone="error">
          <strong>Sent back by the review team:</strong> {initial.rejectionReason}
        </Alert>
      )}

      {/* ═══════════ body ═══════════ */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ─── main column ─── */}
        <div className="min-w-0">
          <section className="rounded-card border border-line bg-white p-4 shadow-card md:p-5">
              {/*
                Only the title here. The slug is no longer a field at all — it
                is derived from the title and stays hidden, because a URL is
                not something an author should have to think about. Category
                and sub-category are in the right rail with the rest of what
                labels the article.
              */}
              <div className="mb-5 border-b border-line-soft pb-5">
                <Field label="Title" name="title" required error={err('title')}>
                  <Input
                    id="title"
                    name="title"
                    value={d.title}
                    error={!!err('title')}
                    placeholder="The Future of Green Building"
                    onChange={(e) => {
                      const title = e.target.value
                      setD((p) => ({
                        ...p,
                        title,
                        // a published article keeps the URL readers already
                        // have; a draft's follows the title
                        slug: p.id ? p.slug : slugify(title).slice(0, 80),
                      }))
                      setDirty(true)
                    }}
                  />
                </Field>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[15px] font-bold text-ink md:text-[16.5px]">
                  Content sections
                  <span className="tabular ml-2 text-[12.5px] font-medium text-ink-3">
                    {kept.length}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setPicking((p) => !p)}
                  className="btn-primary shrink-0 gap-1.5 px-3.5 py-2 text-[13px]"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add Section
                </button>
              </div>

              {err('body') && <Alert tone="error">{err('body')}</Alert>}

              {picking && (
                <div className="mb-4 rounded-lg border border-line bg-paper-2 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-[13px] font-bold text-ink">
                      Choose a section
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPicking(false)}
                      className="text-[12px] text-ink-4 hover:text-ink-2"
                    >
                      Cancel
                    </button>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {BLOCK_SPECS.map((s) => (
                      <li key={s.type}>
                        <button
                          type="button"
                          onClick={() => addBlock(s.type)}
                          className="flex w-full items-start gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand-soft"
                        >
                          <span className="chip-icon mt-0.5 h-8 w-8 shrink-0 bg-brand-soft text-brand">
                            <Icon name={s.icon as IconName} className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-semibold text-ink">
                              {s.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                              {s.hint}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {blocks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
                  <p className="text-[14px] font-semibold text-ink">Nothing written yet</p>
                  <p className="mx-auto mt-1 max-w-[380px] text-[12.5px] leading-relaxed text-ink-3">
                    An article is built from sections — a heading, some
                    paragraphs, a grid of pictures. Add the first one to begin.
                  </p>
                </div>
              ) : (
                <DndContext
                  /* A fixed id. Without one dnd-kit numbers its own
                     `aria-describedby` from a module counter that starts over
                     on the client, so every drag handle hydrated with a
                     different value than the server sent. */
                  id="blog-sections"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext items={keys} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-2.5">
                      {blocks.map((b, i) => (
                        <BlockCard
                          key={keys[i]}
                          id={keys[i]}
                          block={b}
                          index={i}
                          collapsed={!open[keys[i]]}
                          onToggle={() => setOpen((p) => ({ ...p, [keys[i]]: !p[keys[i]] }))}
                          onChange={(next) => {
                            setBlocks((p) => p.map((x, j) => (j === i ? next : x)))
                            setDirty(true)
                          }}
                          onDuplicate={() => duplicate(i)}
                          onRemove={() => remove(i)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
          </section>
        </div>

        {/* ─── right rail ─── */}
        <aside className="flex min-w-0 flex-col gap-4">
          {/*
            The actions live here, above the fields they act on, rather than
            in a bar across the top. On a tablet that bar wrapped onto two
            lines and pushed the article down the page.
          */}
          <div className="flex flex-col gap-2 rounded-card border border-line bg-white p-3 shadow-card">
            <button
              type="submit"
              name="intent"
              value="submit"
              disabled={pending}
              className="btn-primary w-full py-2 text-[13px] disabled:opacity-60"
            >
              {d.status === 'PUBLISHED' ? 'Save & Resubmit' : 'Submit for Review'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                name="intent"
                value="draft"
                disabled={pending}
                className="btn-outline w-full gap-1.5 px-2 py-2 text-[12.5px] disabled:opacity-60"
              >
                <Icon name="file" className="h-4 w-4 shrink-0" />
                {pending ? 'Saving…' : 'Save Draft'}
              </button>

              {d.id ? (
                <Link
                  href={`/dashboard/blog/${d.id}/preview`}
                  className="btn-outline w-full gap-1.5 px-2 py-2 text-[12.5px]"
                >
                  <EyeGlyph />
                  Preview
                </Link>
              ) : (
                <Link
                  href="/dashboard/blog"
                  className="btn-outline w-full gap-1.5 px-2 py-2 text-[12.5px]"
                >
                  <Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180" />
                  Back
                </Link>
              )}
            </div>

            {dirty && (
              <p className="text-center text-[11.5px] text-ink-3">Unsaved changes</p>
            )}
          </div>

          <Panel
            title="Basic Info"
            open={panel.basic}
            onToggle={() => setPanel((p) => ({ ...p, basic: !p.basic }))}
          >
            <Field label="Category" name="category" required error={err('category')}>
              <Select
                id="category"
                name="category"
                value={d.category}
                error={!!err('category')}
                onChange={(e) => {
                  // a sub-category belongs to one parent, so changing the
                  // parent has to clear it rather than leave an orphan
                  setD((p) => ({ ...p, category: e.target.value, subCategory: '' }))
                  setDirty(true)
                }}
              >
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </Select>
            </Field>

            <Field
              label="Sub Category"
              name="subCategory"
              error={err('subCategory')}
              hint={
                !d.category
                  ? 'Choose a category first'
                  : subCategories.length === 0
                    ? 'This category has no sub-categories'
                    : undefined
              }
            >
              <Select
                id="subCategory"
                name="subCategory"
                value={d.subCategory}
                disabled={subCategories.length === 0}
                onChange={(e) => set('subCategory', e.target.value)}
              >
                <option value="">
                  {subCategories.length ? 'Choose a sub-category…' : '—'}
                </option>
                {subCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </Select>
            </Field>

            <Field
              label="Featured Image"
              name="heroImage"
              error={err('heroImage')}
              hint="1920 × 1080 px · JPG, PNG or WebP up to 2 MB"
            >
              <ImageField
                value={d.heroImage}
                cover
                label="featured image"
                error={!!err('heroImage')}
                onChange={(heroImage) => set('heroImage', heroImage)}
              />
            </Field>

            <Field
              label="Short Description"
              name="excerpt"
              required
              error={err('excerpt')}
              hint={`${d.excerpt.length}/${EXCERPT_MAX} — left blank, the first paragraph is used`}
            >
              <Textarea
                id="excerpt"
                name="excerpt"
                rows={3}
                maxLength={EXCERPT_MAX}
                value={d.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
              />
            </Field>

            {/* ─── tags as chips ─── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">Tags</span>

              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <li key={t}>
                      <span className="inline-flex items-center gap-1 rounded-pill bg-brand-soft px-2.5 py-1 text-[11.5px] font-medium text-brand">
                        {t}
                        <button
                          type="button"
                          aria-label={`Remove ${t}`}
                          onClick={() => set('tags', tags.filter((x) => x !== t).join(', '))}
                          className="text-brand/70 transition-colors hover:text-brand"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-1.5">
                <input
                  value={tagDraft}
                  placeholder="Add a tag"
                  aria-label="Add a tag"
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter inside a form would submit it — this field adds a
                    // tag instead
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className="input min-w-0 flex-1 py-1.5 text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-outline shrink-0 px-3 py-1.5 text-[12.5px]"
                >
                  Add
                </button>
              </div>
            </div>

            {/*
              The last two, moved here when the SEO tab was dropped. There is
              no separate SEO title or description any more — the article's own
              title and short description are what search results show, and
              asking for a second copy of both only invited them to drift apart.
            */}
            <Field
              label="Your role"
              name="authorRoleShown"
              hint="Shown under your name on the article"
            >
              <Input
                id="authorRoleShown"
                value={d.authorRole}
                placeholder="Environment Artist"
                onChange={(e) => set('authorRole', e.target.value)}
              />
            </Field>

          </Panel>
        </aside>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════

/** A collapsible card in the right rail, as the blueprint draws it. */
function Panel({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-white shadow-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3"
      >
        <span className="font-display text-[14px] font-bold text-ink">{title}</span>
        <svg
          viewBox="0 0 10 6"
          aria-hidden
          className={cn('h-[5px] w-[9px] text-ink-3 transition-transform', open && 'rotate-180')}
        >
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-3.5 border-t border-line-soft px-4 py-3.5">
          {children}
        </div>
      )}
    </section>
  )
}

/** `IconName` has no eye, and the Preview button in the blueprint carries one. */
function EyeGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
