import { Prisma, type PostStatus, type PostType } from '@prisma/client'
import { inLastMonth, inThisMonth, momPct, monthWindows } from '@/lib/mom'
import { prisma } from '@/lib/prisma'
import { categoryPathLabeller } from '@/lib/category-path'
import type { IconName } from '@/components/ui'
import type { Tint } from '@/components/admin/parts'

/**
 * Generic data layer for the admin Content pages (Projects, Products, Around
 * Us, Artistry, Blog). Every content type is a Post row; the same super-admin
 * listing page renders each of them, driven by a CONTENT config. Core fields
 * live in Post columns, richer bits in Post.meta JSON, images in Media. The
 * "Add New" page reuses the SAME shared dashboard PostForm — nothing here
 * creates content, it only reads it for the listing.
 */

// ─── per-type presentation config ───────────────────────────
export type ContentCfg = {
  type: PostType
  slug: string           // route base under /admin, e.g. 'projects'
  titlePlural: string    // 'Projects'
  titleSingular: string  // 'Project'
  subtitle: string
  itemHeader: string     // table col header for the item, e.g. 'Project'
  authorHeader: string   // 'Architect / Firm' | 'Author' | 'Seller'
  categoriesTitle: string
  locationsTitle: string
  viewPrefix: string     // public url prefix, e.g. '/projects/'
  emptyIcon: IconName
  showEnquiries: boolean
  addLabel: string
}

export const CONTENT: Record<string, ContentCfg> = {
  PROJECT: {
    type: 'PROJECT', slug: 'projects', titlePlural: 'Projects', titleSingular: 'Project',
    subtitle: 'Manage, showcase and promote architectural projects. Add new projects, organize by category, and track performance.',
    itemHeader: 'Project', authorHeader: 'Architect / Firm', categoriesTitle: 'Project Categories', locationsTitle: 'Projects by Location',
    viewPrefix: '/projects/', emptyIcon: 'building', showEnquiries: true, addLabel: 'Add New Project',
  },
  PRODUCT: {
    type: 'PRODUCT', slug: 'products', titlePlural: 'Products', titleSingular: 'Product',
    subtitle: 'Manage building materials and product listings. Add new products, organize by category, and track performance.',
    itemHeader: 'Product', authorHeader: 'Seller / Firm', categoriesTitle: 'Product Categories', locationsTitle: 'Products by Location',
    viewPrefix: '/products/', emptyIcon: 'box', showEnquiries: true, addLabel: 'Add New Product',
  },
  AROUND_US: {
    type: 'AROUND_US', slug: 'around-us', titlePlural: 'Around Us', titleSingular: 'Around Us Post',
    subtitle: 'Manage the Around Us feed — local happenings, spaces and points of interest shared by members.',
    itemHeader: 'Post', authorHeader: 'Posted By', categoriesTitle: 'Categories', locationsTitle: 'By Location',
    viewPrefix: '/around-us/', emptyIcon: 'globe', showEnquiries: false, addLabel: 'Add New Post',
  },
  ARTISTRY: {
    type: 'ARTISTRY', slug: 'artistry', titlePlural: 'Artistry', titleSingular: 'Artwork',
    subtitle: 'Manage the Artistry gallery — artworks, sketches and creative work shared by the community.',
    itemHeader: 'Artwork', authorHeader: 'Artist', categoriesTitle: 'Categories', locationsTitle: 'By Location',
    viewPrefix: '/artistry/', emptyIcon: 'image', showEnquiries: false, addLabel: 'Add New Artwork',
  },
  BLOG: {
    type: 'BLOG', slug: 'blog', titlePlural: 'Blog', titleSingular: 'Article',
    subtitle: 'Manage blog articles. Publish, feature and organize articles by category.',
    itemHeader: 'Article', authorHeader: 'Author', categoriesTitle: 'Blog Categories', locationsTitle: 'By Location',
    viewPrefix: '/blog/', emptyIcon: 'file', showEnquiries: false, addLabel: 'Write New Article',
  },
  DESIGN_COMPETITION: {
    type: 'DESIGN_COMPETITION', slug: 'competitions', titlePlural: 'Design Competitions', titleSingular: 'Competition',
    subtitle: 'Every design competition posted on ArchFacing.',
    itemHeader: 'Competition', authorHeader: 'Organiser', categoriesTitle: 'Competition Categories', locationsTitle: 'By Location',
    viewPrefix: '/competition/', emptyIcon: 'trophy', showEnquiries: false, addLabel: 'Post a Competition',
  },
}

type ContentMeta = { projectType?: string; architectName?: string; subtitle?: string } | null

/**
 * Enquiries are real Enquiry rows raised from a listing — never the seeded
 * meta.enquiries number. A row's count is its enquiries by sourceId.
 */
const ENQUIRY_SOURCES: Partial<Record<string, ('PROJECT' | 'PROJECT_ENQUIRY' | 'PRODUCT' | 'PRODUCT_ENQUIRY')[]>> = {
  PROJECT: ['PROJECT', 'PROJECT_ENQUIRY'],
  PRODUCT: ['PRODUCT', 'PRODUCT_ENQUIRY'],
}

// ═══════════════════════════════════════════════════════════
//  Overview (KPI cards + sidebars)
// ═══════════════════════════════════════════════════════════

/** `pct` is a measured month-over-month change, or null when there is nothing to compare. */
export type ContentStat = { key: string; label: string; icon: IconName; value: string; pct: number | null; hint: string; tint: Tint }
export type ContentOverview = {
  stats: ContentStat[]
  tabs: { key: string; label: string; count: number }[]
  categories: { name: string; slug: string; count: number; icon: IconName }[]
  locations: { city: string; count: number; max: number }[]
  recentEnquiries: { id: string; name: string; subject: string; at: Date }[]
  recentItems: { id: string; title: string; sub: string; at: Date }[]
  categoryOptions: { value: string; label: string }[]
  locationOptions: { value: string; label: string }[]
}

export async function contentOverview(cfg: ContentCfg): Promise<ContentOverview> {
  const WHERE: Prisma.PostWhereInput = { type: cfg.type, deletedAt: null }
  const w = monthWindows()
  const [
    total, published, drafts, featured, viewsAgg, metaRows, catRows, cityRows, underReview, archived,
    createdThis, createdLast, publishedThis, publishedLast,
  ] = await Promise.all([
    prisma.post.count({ where: WHERE }),
    prisma.post.count({ where: { ...WHERE, status: 'PUBLISHED' } }),
    prisma.post.count({ where: { ...WHERE, status: 'DRAFT' } }),
    prisma.post.count({ where: { ...WHERE, featured: true } }),
    prisma.post.aggregate({ where: WHERE, _sum: { viewCount: true } }),
    cfg.showEnquiries ? prisma.enquiry.count({ where: { sourceType: { in: ENQUIRY_SOURCES[cfg.type] ?? [] } } }) : Promise.resolve(0),
    prisma.post.groupBy({ by: ['category'], where: { ...WHERE, status: 'PUBLISHED' }, _count: true }),
    prisma.post.groupBy({ by: ['city'], where: { ...WHERE, city: { not: null } }, _count: true }),
    prisma.post.count({ where: { ...WHERE, status: 'PENDING_REVIEW' } }),
    prisma.post.count({ where: { ...WHERE, status: 'ARCHIVED' } }),
    // Two windows per trend — the only honest source for "vs last month".
    prisma.post.count({ where: { ...WHERE, createdAt: inThisMonth(w) } }),
    prisma.post.count({ where: { ...WHERE, createdAt: inLastMonth(w) } }),
    prisma.post.count({ where: { ...WHERE, status: 'PUBLISHED', publishedAt: inThisMonth(w) } }),
    prisma.post.count({ where: { ...WHERE, status: 'PUBLISHED', publishedAt: inLastMonth(w) } }),
  ])

  const totalViews = viewsAgg._sum.viewCount ?? 0
  const totalEnquiries = metaRows

  const stats: ContentStat[] = [
    { key: 'total', label: `Total ${cfg.titlePlural}`, icon: 'file', value: total.toLocaleString('en-IN'), pct: momPct(createdThis, createdLast), hint: `${createdThis} added this month`, tint: { bg: '#EEF1FF', fg: '#6366F1' } },
    { key: 'pub', label: 'Published', icon: 'check', value: published.toLocaleString('en-IN'), pct: momPct(publishedThis, publishedLast), hint: `${publishedThis} published this month`, tint: { bg: '#E7F7EE', fg: '#16A34A' } },
    { key: 'draft', label: 'Drafts', icon: 'clock', value: drafts.toLocaleString('en-IN'), pct: null, hint: 'in progress', tint: { bg: '#FEF7E0', fg: '#D97706' } },
    { key: 'feat', label: 'Featured', icon: 'star', value: featured.toLocaleString('en-IN'), pct: null, hint: 'currently featured', tint: { bg: '#FFEEE0', fg: '#F97316' } },
    { key: 'views', label: 'Total Views', icon: 'eye', value: totalViews.toLocaleString('en-IN'), pct: null, hint: 'all time', tint: { bg: '#EAF2FF', fg: '#2563EB' } },
    cfg.showEnquiries
      ? { key: 'enq', label: 'Total Enquiries', icon: 'mail', value: totalEnquiries.toLocaleString('en-IN'), pct: null, hint: 'all time', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } }
      : { key: 'rev', label: 'Under Review', icon: 'alert', value: underReview.toLocaleString('en-IN'), pct: null, hint: 'awaiting approval', tint: { bg: '#F3EAFE', fg: '#8B5CF6' } },
  ]

  const tabs = [
    { key: 'all', label: `All ${cfg.titlePlural}`, count: total },
    { key: 'published', label: 'Published', count: published },
    { key: 'drafts', label: 'Drafts', count: drafts },
    { key: 'featured', label: 'Featured', count: featured },
    { key: 'archived', label: 'Archived', count: archived },
  ]

  const catCount = new Map(catRows.map((r) => [r.category, r._count]))
  const cats = await prisma.category.findMany({ where: { type: cfg.type }, select: { name: true, slug: true }, orderBy: { sortOrder: 'asc' } })
  const categories = cats
    .map((c) => ({ name: c.name, slug: c.slug, count: catCount.get(c.slug) ?? 0, icon: cfg.emptyIcon }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const cityList = cityRows.map((r) => ({ city: r.city as string, count: r._count })).sort((a, b) => b.count - a.count)
  const cityHead = cityList.slice(0, 7)
  const cityRest = cityList.slice(7).reduce((a, r) => a + r.count, 0)
  const locRows = cityRest > 0 ? [...cityHead, { city: 'Others', count: cityRest }] : cityHead
  const locMax = Math.max(1, ...locRows.map((r) => r.count))
  const locations = locRows.map((r) => ({ ...r, max: locMax }))

  let recentEnquiries: ContentOverview['recentEnquiries'] = []
  if (cfg.showEnquiries) {
    const enq = await prisma.enquiry.findMany({ where: { sourceType: { in: ENQUIRY_SOURCES[cfg.type] ?? [] } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, subject: true, contactName: true, createdAt: true } })
    recentEnquiries = enq.map((e) => ({ id: e.id, name: e.contactName, subject: e.subject, at: e.createdAt }))
  }

  const recent = await prisma.post.findMany({ where: WHERE, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, city: true, createdAt: true } })
  const recentItems = recent.map((r) => ({ id: r.id, title: r.title, sub: r.city ?? '—', at: r.createdAt }))

  const categoryOptions = [{ value: 'all', label: 'All Categories' }, ...cats.map((c) => ({ value: c.slug, label: c.name }))]
  const locationOptions = [{ value: 'all', label: 'All Locations' }, ...cityList.slice(0, 12).map((c) => ({ value: c.city, label: c.city }))]

  return { stats, tabs, categories, locations, recentEnquiries, recentItems, categoryOptions, locationOptions }
}

// ═══════════════════════════════════════════════════════════
//  The listing table
// ═══════════════════════════════════════════════════════════

export type ContentRow = {
  id: string
  slug: string
  title: string
  subtitle: string
  thumb: string | null
  category: string
  categoryLabel: string
  city: string | null
  author: string
  status: PostStatus
  views: number
  enquiries: number
  featured: boolean
  createdAt: Date
}

const STATUS_ORDER: Record<string, PostStatus> = { published: 'PUBLISHED', drafts: 'DRAFT', archived: 'ARCHIVED' }

export async function listContent(cfg: ContentCfg, query: {
  tab?: string; category?: string; location?: string; status?: string; q?: string; page?: number; perPage?: number
  /** newest (default) | oldest | views | title */
  sort?: string
}): Promise<{ rows: ContentRow[]; total: number; page: number; perPage: number; pages: number }> {
  const perPage = query.perPage ?? 10
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.PostWhereInput[] = [{ type: cfg.type, deletedAt: null }]
  if (query.tab === 'featured') and.push({ featured: true })
  else if (query.tab && STATUS_ORDER[query.tab]) and.push({ status: STATUS_ORDER[query.tab] })
  if (query.status && query.status !== 'all') and.push({ status: query.status as PostStatus })
  if (query.category && query.category !== 'all') and.push({ category: query.category })
  if (query.location && query.location !== 'all') and.push({ city: query.location })
  if (query.q) and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { city: { contains: query.q, mode: 'insensitive' } }] })

  const where: Prisma.PostWhereInput = { AND: and }
  const [total, rows, cats] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: query.sort === 'oldest' ? { createdAt: 'asc' } : query.sort === 'views' ? { viewCount: 'desc' } : query.sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' },
      skip: (page - 1) * perPage, take: perPage,
      select: {
        id: true, slug: true, title: true, category: true, subCategory: true, tertiaryCategory: true, city: true, status: true, viewCount: true,
        featured: true, createdAt: true, meta: true,
        media: { where: { type: 'IMAGE' }, orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true, thumbnailUrl: true } },
        author: { select: { name: true, professionalProfile: { select: { firmName: true } } } },
      },
    }),
    prisma.category.findMany({ where: { type: cfg.type }, select: { slug: true, name: true } }),
  ])
  const catName = new Map(cats.map((c) => [c.slug, c.name]))
  const pathOf = await categoryPathLabeller(cfg.type)
  const enqBy = cfg.showEnquiries && rows.length
    ? new Map((await prisma.enquiry.groupBy({ by: ['sourceId'], where: { sourceId: { in: rows.map((r) => r.id) } }, _count: { _all: true } })).map((g) => [g.sourceId, g._count._all]))
    : new Map<string | null, number>()

  const rowsOut: ContentRow[] = rows.map((p) => {
    const m = p.meta as ContentMeta
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: m?.subtitle ?? (m?.projectType ? `${m.projectType} ${cfg.titleSingular.toLowerCase()}` : (catName.get(p.category) ?? p.category.replace(/-/g, ' '))),
      thumb: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
      category: p.category,
      categoryLabel: pathOf(p.category, p.subCategory, p.tertiaryCategory).join(' › '),
      city: p.city,
      author: m?.architectName ?? p.author?.professionalProfile?.firmName ?? p.author?.name ?? '—',
      status: p.status,
      views: p.viewCount,
      enquiries: enqBy.get(p.id) ?? 0,
      featured: p.featured,
      createdAt: p.createdAt,
    }
  })

  return { rows: rowsOut, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}
