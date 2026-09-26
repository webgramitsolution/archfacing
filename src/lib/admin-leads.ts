import { Prisma, type EnquiryStatus, type LeadSourceType } from '@prisma/client'
import { inLastMonth, inThisMonth, momPct, monthWindows } from '@/lib/mom'
import { prisma } from '@/lib/prisma'

/**
 * Data layer for the admin Leads & Enquiries control centre. Every enquiry is
 * a marketplace lead that fans out to one DIRECT recipient (the source owner)
 * plus zero-or-more PACT recipients (LeadRecipient rows). Everything here is
 * server-side and indexed — the platform holds lakhs of enquiries, so nothing
 * loads the full dataset into the browser.
 */

// ─── source labels ──────────────────────────────────────────
export const SOURCE_LABEL: Record<LeadSourceType, string> = {
  PROJECT: 'Project Enquiry',
  PRODUCT: 'Product Enquiry',
  PROFESSIONAL: 'Profile Enquiry',
  CORPORATE: 'Corporate Enquiry',
  BMF: 'BMF Enquiry',
  CONSULT_NEARBY: 'Consult Nearby',
  WEBSITE_FORM: 'Website Enquiry',
  RFQ: 'RFQ',
  PRODUCT_ENQUIRY: 'Product Enquiry',
  SERVICE_ENQUIRY: 'Service Enquiry',
  PROJECT_ENQUIRY: 'Project Enquiry',
  CONTACT_REQUEST: 'Contact Request',
  OTHER: 'Other',
}

// ═══════════════════════════════════════════════════════════
//  Stats + tabs
// ═══════════════════════════════════════════════════════════

export type LeadStats = {
  total: number; newCount: number; inProgress: number; converted: number; closed: number; conversionRate: number
  /** Enquiries received this calendar month, and the measured change on last month (null = no base). */
  thisMonth: number; totalPct: number | null
}

export async function leadStats(): Promise<LeadStats> {
  const w = monthWindows()
  const [total, byStatus, thisMonth, lastMonth] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.enquiry.count({ where: { createdAt: inThisMonth(w) } }),
    prisma.enquiry.count({ where: { createdAt: inLastMonth(w) } }),
  ])
  const of = (s: EnquiryStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  const converted = of('CONVERTED')
  const inProgress = of('IN_PROGRESS') + of('ASSIGNED') + of('RESPONDED')
  return {
    total,
    newCount: of('NEW'),
    inProgress,
    converted,
    closed: of('CLOSED'),
    conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
    thisMonth,
    totalPct: momPct(thisMonth, lastMonth),
  }
}

export async function leadTabCounts(): Promise<{ all: number; direct: number; pact: number; unassigned: number }> {
  const [all, direct, pact, unassigned] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { directRecipientId: { not: null } } }),
    prisma.enquiry.count({ where: { recipients: { some: { type: 'PACT' } } } }),
    prisma.enquiry.count({ where: { OR: [{ status: 'UNROUTED' }, { directRecipientId: null, recipients: { none: {} } }] } }),
  ])
  return { all, direct, pact, unassigned }
}

// ═══════════════════════════════════════════════════════════
//  Listing (server-side, filtered, paginated)
// ═══════════════════════════════════════════════════════════

export type LeadRow = {
  id: string
  contactName: string
  contactPhone: string
  contactEmail: string | null
  subject: string
  message: string
  category: string | null
  sourceTitle: string | null
  sourceLabel: string
  pincode: string
  city: string | null
  state: string | null
  status: EnquiryStatus
  createdAt: Date
  direct: { name: string; company: string | null } | null
  pactFirst: { name: string } | null
  pactCount: number
}

export type LeadQuery = {
  tab?: string; status?: string; category?: string; source?: string; location?: string; q?: string; page?: number; perPage?: number
  /** 'oldest' reverses the default newest-first order. */
  sort?: string
  /** A listing (Post id) the enquiry came from. */
  project?: string
  /** Staff owner id, or 'none' for nobody. */
  assignee?: string
  /** yyyy-mm-dd, inclusive. */
  from?: string
  to?: string
}

export async function listLeads(query: LeadQuery): Promise<{ rows: LeadRow[]; total: number; page: number; perPage: number; pages: number }> {
  const perPage = query.perPage ?? 8
  const page = Math.max(1, query.page ?? 1)

  const and: Prisma.EnquiryWhereInput[] = []
  if (query.tab === 'direct') and.push({ directRecipientId: { not: null } })
  else if (query.tab === 'pact') and.push({ recipients: { some: { type: 'PACT' } } })
  else if (query.tab === 'unassigned') and.push({ OR: [{ status: 'UNROUTED' }, { directRecipientId: null, recipients: { none: {} } }] })
  if (query.status && query.status !== 'all') and.push({ status: query.status as EnquiryStatus })
  if (query.category && query.category !== 'all') and.push({ category: query.category })
  if (query.source && query.source !== 'all') and.push({ sourceType: query.source as LeadSourceType })
  if (query.location && query.location !== 'all') and.push({ pincode: query.location })
  if (query.project && query.project !== 'all') and.push({ sourceId: query.project })
  if (query.assignee === 'none') and.push({ employeeId: null })
  else if (query.assignee && query.assignee !== 'all') and.push({ employeeId: query.assignee })
  const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : null)
  const from = day(query.from)
  const to = day(query.to)
  if (from || to) {
    and.push({
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lt: new Date(to.getTime() + 86_400_000) } : {}),
      },
    })
  }
  if (query.q) {
    const q = query.q.trim()
    and.push({
      OR: [
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q } },
        { subject: { contains: q, mode: 'insensitive' } },
        { pincode: { contains: q } },
        { id: q },
      ],
    })
  }
  const where: Prisma.EnquiryWhereInput = and.length ? { AND: and } : {}

  const [total, rows] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where, orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' }, skip: (page - 1) * perPage, take: perPage,
      select: {
        id: true, contactName: true, contactPhone: true, contactEmail: true, subject: true, message: true,
        category: true, sourceType: true, sourceId: true, pincode: true, city: true, state: true, status: true, createdAt: true,
        directRecipient: { select: { name: true, professionalProfile: { select: { firmName: true } }, corporateProfile: { select: { companyName: true } } } },
        recipients: {
          where: { type: 'PACT' }, orderBy: { createdAt: 'asc' },
          select: { recipient: { select: { name: true } } },
        },
      },
    }),
  ])

  // batch-fetch source titles (products/projects/posts)
  const postIds = rows.map((r) => r.sourceId).filter((x): x is string => Boolean(x))
  const posts = postIds.length ? await prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true } }) : []
  const titleById = new Map(posts.map((p) => [p.id, p.title]))
  const cats = await prisma.category.findMany({ where: { slug: { in: rows.map((r) => r.category).filter((x): x is string => Boolean(x)) } }, select: { slug: true, name: true } })
  const catName = new Map(cats.map((c) => [c.slug, c.name]))

  const out: LeadRow[] = rows.map((e) => ({
    id: e.id,
    contactName: e.contactName,
    contactPhone: e.contactPhone,
    contactEmail: e.contactEmail,
    subject: e.subject,
    message: e.message,
    category: e.category ? (catName.get(e.category) ?? e.category.replace(/-/g, ' ')) : null,
    sourceTitle: e.sourceId ? (titleById.get(e.sourceId) ?? null) : null,
    sourceLabel: SOURCE_LABEL[e.sourceType],
    pincode: e.pincode,
    city: e.city,
    state: e.state,
    status: e.status,
    createdAt: e.createdAt,
    direct: e.directRecipient
      ? { name: e.directRecipient.name, company: e.directRecipient.professionalProfile?.firmName ?? e.directRecipient.corporateProfile?.companyName ?? null }
      : null,
    pactFirst: e.recipients[0] ? { name: e.recipients[0].recipient.name } : null,
    pactCount: e.recipients.length,
  }))

  return { rows: out, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Distinct categories + pincodes present in the enquiry data, for the filters. */
export async function leadFilterOptions(): Promise<{
  categories: { value: string; label: string }[]; locations: { value: string; label: string }[]; sources: { value: string; label: string }[]
  projects: { value: string; label: string }[]; assignees: { value: string; label: string }[]
}> {
  const [srcRows, staff] = await Promise.all([
    prisma.enquiry.groupBy({ by: ['sourceId'], where: { sourceId: { not: null } }, _count: true, orderBy: { _count: { sourceId: 'desc' } }, take: 40 }),
    prisma.user.findMany({
      where: { role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
      orderBy: { name: 'asc' }, select: { id: true, name: true }, take: 200,
    }),
  ])
  const srcIds = srcRows.map((r) => r.sourceId).filter((x): x is string => Boolean(x))
  const posts = srcIds.length ? await prisma.post.findMany({ where: { id: { in: srcIds } }, select: { id: true, title: true } }) : []
  const postTitle = new Map(posts.map((p) => [p.id, p.title]))
  const projects = [{ value: 'all', label: 'All Listings' }, ...srcIds.filter((id) => postTitle.has(id)).map((id) => ({ value: id, label: postTitle.get(id)! }))]
  const assignees = [{ value: 'all', label: 'Anyone' }, { value: 'none', label: 'Nobody yet' }, ...staff.map((u) => ({ value: u.id, label: u.name }))]

  const [catRows, pinRows] = await Promise.all([
    prisma.enquiry.groupBy({ by: ['category'], where: { category: { not: null } }, _count: true }),
    prisma.enquiry.groupBy({ by: ['pincode'], _count: true, orderBy: { _count: { pincode: 'desc' } }, take: 20 }),
  ])
  const slugs = catRows.map((r) => r.category).filter((x): x is string => Boolean(x))
  const cats = slugs.length ? await prisma.category.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } }) : []
  const catName = new Map(cats.map((c) => [c.slug, c.name]))
  return {
    categories: [{ value: 'all', label: 'All Categories' }, ...slugs.map((s) => ({ value: s, label: catName.get(s) ?? s.replace(/-/g, ' ') }))],
    locations: [{ value: 'all', label: 'All Locations' }, ...pinRows.map((r) => ({ value: r.pincode, label: r.pincode }))],
    sources: [{ value: 'all', label: 'All Sources' }, ...Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label }))],
    projects,
    assignees,
  }
}

// ═══════════════════════════════════════════════════════════
//  Detail drawer
// ═══════════════════════════════════════════════════════════

export type LeadRecipientView = {
  id: string
  type: 'DIRECT' | 'PACT'
  name: string
  company: string | null
  reason: string | null
  pincode: string | null
  deliveryStatus: string
  sentAt: Date | null
  openedAt: Date | null
  respondedAt: Date | null
  convertedAt: Date | null
}

export type LeadDetail = {
  id: string
  subject: string
  message: string
  status: EnquiryStatus
  sourceLabel: string
  sourceTitle: string | null
  category: string | null
  pincode: string
  city: string | null
  state: string | null
  contactName: string
  contactPhone: string
  contactEmail: string | null
  createdAt: Date
  clientName: string
  recipients: LeadRecipientView[]
  directCount: number
  pactCount: number
  /** The staff member handling it, if any (Enquiry.employeeId). */
  employeeId: string | null
  employeeName: string | null
  /** Internal notes — AuditLog rows with action LEAD_NOTE, newest first. */
  notes: { id: string; author: string; body: string; at: Date }[]
  /** Admin-side history — status changes, assignments, replies. */
  log: { id: string; action: string; by: string; detail: string | null; at: Date }[]
  /** Who the lead can be assigned to: RM employees and admins. */
  staff: { id: string; name: string }[]
}

export async function leadDetail(id: string): Promise<LeadDetail | null> {
  const e = await prisma.enquiry.findUnique({
    where: { id },
    select: {
      id: true, subject: true, message: true, status: true, sourceType: true, sourceId: true,
      category: true, pincode: true, city: true, state: true, contactName: true, contactPhone: true, contactEmail: true, createdAt: true,
      client: { select: { name: true } },
      employeeId: true,
      employee: { select: { name: true } },
      recipients: {
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true, type: true, routingReason: true, pincode: true, deliveryStatus: true, sentAt: true, openedAt: true, respondedAt: true, convertedAt: true,
          recipient: { select: { name: true, professionalProfile: { select: { firmName: true } }, corporateProfile: { select: { companyName: true } } } },
        },
      },
    },
  })
  if (!e) return null

  const [audit, staff] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: 'Enquiry', entityId: e.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, action: true, after: true, createdAt: true, actor: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
      take: 200,
    }),
  ])
  const text = (v: unknown, k: string) =>
    v && typeof v === 'object' && k in (v as Record<string, unknown>) ? String((v as Record<string, unknown>)[k] ?? '') : null

  const title = e.sourceId ? (await prisma.post.findUnique({ where: { id: e.sourceId }, select: { title: true } }))?.title ?? null : null
  const catName = e.category ? (await prisma.category.findFirst({ where: { slug: e.category }, select: { name: true } }))?.name ?? e.category : null

  const recipients: LeadRecipientView[] = e.recipients.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.recipient.name,
    company: r.recipient.professionalProfile?.firmName ?? r.recipient.corporateProfile?.companyName ?? null,
    reason: r.routingReason,
    pincode: r.pincode,
    deliveryStatus: r.deliveryStatus,
    sentAt: r.sentAt,
    openedAt: r.openedAt,
    respondedAt: r.respondedAt,
    convertedAt: r.convertedAt,
  }))

  return {
    id: e.id, subject: e.subject, message: e.message, status: e.status,
    sourceLabel: SOURCE_LABEL[e.sourceType], sourceTitle: title, category: catName,
    pincode: e.pincode, city: e.city, state: e.state,
    contactName: e.contactName, contactPhone: e.contactPhone, contactEmail: e.contactEmail, createdAt: e.createdAt,
    clientName: e.client.name,
    recipients,
    directCount: recipients.filter((r) => r.type === 'DIRECT').length,
    pactCount: recipients.filter((r) => r.type === 'PACT').length,
    employeeId: e.employeeId,
    employeeName: e.employee?.name ?? null,
    notes: audit
      .filter((a) => a.action === 'LEAD_NOTE')
      .map((a) => ({ id: a.id, author: a.actor?.name ?? 'System', body: text(a.after, 'body') ?? '', at: a.createdAt })),
    log: audit
      .filter((a) => a.action !== 'LEAD_NOTE')
      .map((a) => ({ id: a.id, action: a.action, by: a.actor?.name ?? 'System', detail: text(a.after, 'detail'), at: a.createdAt })),
    staff,
  }
}
