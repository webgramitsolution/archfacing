import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import type { PostTypeConfig } from '@/config/post-types'
import { INDIAN_STATES } from '@/config/states'

/**
 * §6.1.3 — listing and filters for every section.
 *
 * The PDF lists the filters separately for each section, but they are
 * almost identical: Introducing Year, State, Category, Sub-category.
 * So a single component works for all of them.
 */

export type Filters = {
  category?: string
  sub?: string
  state?: string
  year?: string
  q?: string
  page?: string
}

const PER_PAGE = 12

export async function Listing({
  config,
  filters,
}: {
  config: PostTypeConfig
  filters: Filters
}) {
  const page = Math.max(1, Number(filters.page ?? 1))

  const where = {
    type: config.type,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.sub ? { subCategory: filters.sub } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.year ? { year: Number(filters.year) } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' as const } },
            { description: { contains: filters.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [posts, total, categories, years] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        author: { select: { name: true, logo: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({
      where: { type: config.categorySource, parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.post.findMany({
      where: { type: config.type, status: 'PUBLISHED', deletedAt: null },
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    }),
  ])

  const pages = Math.ceil(total / PER_PAGE)
  const subCategories =
    categories.find((c) => c.slug === filters.category)?.children ?? []

  return (
    <div className="container-af py-10">
      <header className="mb-8 border-b border-line pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {config.label}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-2">
          {config.description}
        </p>
      </header>

      {/* ── §6.1.3 filters ── */}
      <form
        method="get"
        className="mb-8 grid gap-4 rounded-card border border-line bg-paper-2 p-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <FilterSelect
          name="category"
          label="Category"
          value={filters.category}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <FilterSelect
          name="sub"
          label="Sub-category"
          value={filters.sub}
          disabled={!subCategories.length}
          options={subCategories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <FilterSelect
          name="state"
          label="State"
          value={filters.state}
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          name="year"
          label="Introducing year"
          value={filters.year}
          options={years
            .filter((y) => y.year)
            .map((y) => ({ value: String(y.year), label: String(y.year) }))}
        />

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-card bg-ink px-4 py-2.5 text-[13px] font-semibold text-paper transition-colors hover:bg-brand"
          >
            Filter
          </button>
          <Link
            href={config.publicPath}
            className="px-2 py-2.5 text-[13px] text-ink-3 hover:text-ink"
          >
            Clear
          </Link>
        </div>
      </form>

      <p className="eyebrow mb-4">
        {total} {config.label.toLowerCase()}
        {total !== 1 ? 's' : ''} found
      </p>

      {posts.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-2 px-6 py-14 text-center">
          <p className="text-[15px] font-medium">Nothing here yet</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Try clearing the filters, or be the first to post something here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const cover = p.media[0]
            return (
              <li key={p.id}>
                <Link
                  href={`${config.publicPath}/${p.slug}`}
                  className="group block overflow-hidden rounded-card border border-line bg-paper-2 transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[5/3] bg-paper-2">
                    {cover?.url ? (
                      <Image
                        src={cover.type === 'VIDEO_LINK' ? cover.thumbnailUrl! : cover.url}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-3">
                        <span className="eyebrow">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="font-display text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
                      {p.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                      {p.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                      {p.year && <span>{p.year}</span>}
                      {p.state && <span>{p.state}</span>}
                      {p.author?.name && <span className="truncate">{p.author.name}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => {
            const params = new URLSearchParams(
              Object.entries(filters).filter(([, v]) => v) as [string, string][]
            )
            params.set('page', String(n))
            return (
              <Link
                key={n}
                href={`${config.publicPath}?${params}`}
                className={`rounded px-3 py-1.5 font-mono text-[13px] ${
                  n === page
                    ? 'bg-ink text-paper'
                    : 'border border-line text-ink-2 hover:border-ink'
                }`}
              >
                {n}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function FilterSelect({
  name,
  label,
  value,
  options,
  disabled,
}: {
  name: string
  label: string
  value?: string
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ''}
        disabled={disabled}
        className="rounded-card border border-line bg-paper-2 px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none disabled:bg-paper-2 disabled:text-ink-3"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
