import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { PostType } from '@prisma/client'

import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { Icon, type IconName } from '@/components/ui'
import { DataTable, EmptyState } from '@/components/ui'
import { Panel } from '@/components/admin/parts'
import {
  POST_TYPE_OPTIONS,
  DEFAULT_POST_TYPE,
  isPostType,
  postTypeLabel,
} from './post-type-list'
import { CategoryForm } from './category-form'
import { CategoryRow } from './category-row'
import {
  PROJECT_CATEGORIES, PRODUCT_CATEGORIES, AROUND_US_CATEGORIES, ARTISTRY_CATEGORIES, BLOG_CATEGORIES,
  COMPETITION_CATEGORIES, MERCHANDISE_CATEGORIES, PODCAST_CATEGORIES, type TaxonomyNode,
} from '@/config/taxonomy'

/** The PDF taxonomy + mega menus, per post type — anything else in the table is an extra. */
const TAXONOMY: Partial<Record<PostType, TaxonomyNode[]>> = {
  PROJECT: PROJECT_CATEGORIES, PRODUCT: PRODUCT_CATEGORIES, AROUND_US: AROUND_US_CATEGORIES, ARTISTRY: ARTISTRY_CATEGORIES,
  BLOG: BLOG_CATEGORIES, DESIGN_COMPETITION: COMPETITION_CATEGORIES, MERCHANDISE: MERCHANDISE_CATEGORIES, PODCAST: PODCAST_CATEGORIES,
}
const slugsOf = (ns: TaxonomyNode[]): string[] => ns.flatMap((n) => [n.slug, ...slugsOf(n.children ?? [])])

export const metadata: Metadata = { title: 'Categories' }
export const dynamic = 'force-dynamic'

const STAT_TINT: { bg: string; fg: string }[] = [
  { bg: '#EEF1FF', fg: '#6366F1' },
  { bg: '#E4EEFF', fg: '#2563EB' },
  { bg: '#E7F7EE', fg: '#16A34A' },
  { bg: '#FEF2E2', fg: '#EA9412' },
]

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  await requirePermission('admin:categories')

  const { type: rawType } = await searchParams
  const type: PostType = isPostType(rawType) ? rawType : DEFAULT_POST_TYPE

  const [roots, counts, allRoots] = await Promise.all([
    prisma.category.findMany({
      where: { type, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
        },
      },
    }),
    prisma.category.groupBy({ by: ['type'], _count: { _all: true } }),
    // Anything that can take a child: Primary and Secondary categories.
    prisma.category.findMany({
      where: { OR: [{ parentId: null }, { parent: { parentId: null } }] },
      select: { id: true, name: true, type: true, sortOrder: true, parentId: true, parent: { select: { name: true, sortOrder: true } } },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    }),
  ])
  // "Primary › Secondary" labels, grouped under their primary.
  const parentOptions = allRoots
    .map((p) => ({
      id: p.id, type: p.type,
      name: p.parent ? `${p.parent.name} › ${p.name}` : p.name,
      key: p.parent ? `${String(p.parent.sortOrder).padStart(4, '0')}-${p.parent.name}-1-${String(p.sortOrder).padStart(4, '0')}` : `${String(p.sortOrder).padStart(4, '0')}-${p.name}-0`,
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key))

  const countByType = new Map(counts.map((c) => [c.type as string, c._count._all]))
  const known = TAXONOMY[type] ? new Set(slugsOf(TAXONOMY[type]!)) : null
  const extra = (slug: string) => !!known && !known.has(slug)
  const secondary = roots.flatMap((r) => r.children)
  const tertiary = secondary.flatMap((c) => c.children)
  const all = [...roots, ...secondary, ...tertiary]
  const hidden = all.filter((c) => !c.isActive).length

  const stats: { icon: IconName; label: string; value: number }[] = [
    { icon: 'grid', label: 'Primary', value: roots.length },
    { icon: 'tag', label: 'Secondary', value: secondary.length },
    { icon: 'list', label: 'Tertiary', value: tertiary.length },
    { icon: 'alert', label: hidden ? `Hidden (${all.length - hidden} active)` : 'Hidden', value: hidden },
  ]

  return (
    <div className="space-y-5">
      {/* header */}
      <div>
        <h1 className="font-display text-[24px] font-bold text-ink">Categories</h1>
      </div>

      {/* type filter */}
      <div className="flex flex-wrap gap-1.5">
        {POST_TYPE_OPTIONS.map((o) => {
          const on = o.value === type
          return (
            <Link
              key={o.value}
              href={`/admin/categories?type=${o.value}`}
              className={
                'flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ' +
                (on ? 'bg-brand text-white' : 'border border-line bg-white text-ink-2 hover:border-ink-4 hover:text-ink')
              }
            >
              {o.label}
              <span className={'tabular ' + (on ? 'text-white/70' : 'text-ink-4')}>
                {countByType.get(o.value) ?? 0}
              </span>
            </Link>
          )
        })}
      </div>

      {/* stat cards */}
      <section className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: STAT_TINT[i].bg, color: STAT_TINT[i].fg }}
              >
                <Icon name={s.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 truncate text-[12.5px] text-ink-3">{s.label}</span>
            </div>
            <p className="tabular mt-3 font-display text-[24px] font-bold leading-none text-ink">{s.value}</p>
          </div>
        ))}
      </section>

      {/* tree + create form */}
      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          <Panel title={`${postTypeLabel(type)} — ${all.length} categories`}>
            {roots.length === 0 ? (
              <EmptyState icon="tag" title={`No ${postTypeLabel(type)} categories yet`}>
                Use the form on the right to add the first one.
              </EmptyState>
            ) : (
              <DataTable bare head={['Category', 'Slug', 'Order', 'Status', '']}>
                {roots.map((root) => (
                  <Fragment key={root.id}>
                    <CategoryRow
                      category={{
                        id: root.id, name: root.name, slug: root.slug,
                        description: root.description, sortOrder: root.sortOrder,
                        isActive: root.isActive, childCount: root.children.length, extra: extra(root.slug),
                      }}
                      depth={0}
                    />
                    {root.children.map((child) => (
                      <Fragment key={child.id}>
                        <CategoryRow
                          category={{
                            id: child.id, name: child.name, slug: child.slug,
                            description: child.description, sortOrder: child.sortOrder,
                            isActive: child.isActive, childCount: child.children.length, extra: extra(child.slug),
                          }}
                          depth={1}
                        />
                        {child.children.map((g) => (
                          <CategoryRow
                            key={g.id}
                            category={{
                              id: g.id, name: g.name, slug: g.slug,
                              description: g.description, sortOrder: g.sortOrder,
                              isActive: g.isActive, childCount: 0, extra: extra(g.slug),
                            }}
                            depth={2}
                          />
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </DataTable>
            )}
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-paper-2 px-3 py-2.5 text-[11.5px] leading-snug text-ink-3">
              <Icon name="help" className="mt-[1px] h-3.5 w-3.5 shrink-0 text-ink-4" />
              Slugs are fixed once saved (they live in public URLs). A category deletes only when no
              sub-category and no posting use it — otherwise hide it, which is always safe.
            </p>
          </Panel>
        </div>

        {/* create */}
        <div className="w-[340px] shrink-0">
          <Panel title="New category">
            <CategoryForm defaultType={type} parents={parentOptions} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
