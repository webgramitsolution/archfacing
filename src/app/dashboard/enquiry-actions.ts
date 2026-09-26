'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'
import { respondToEnquiry } from '@/lib/enquiry'
import { uploadFile } from '@/lib/upload'

/** §5.2.12 — enquiries I have received */
/**
 * `Enquiry.budget` is a Prisma `Decimal`, and a Decimal is a class instance,
 * not a plain object. React will not serialise one across the server/client
 * boundary — every enquiry row handed to `<EnquiryThread>` logged
 *
 *   Only plain objects can be passed to Client Components … Decimal objects
 *   are not supported.
 *
 * It happened to render because the component does `Number(enquiry.budget)`
 * anyway, but it is unsupported and the value can arrive mangled. Converting
 * here fixes every page that lists enquiries at once, rather than each of them
 * remembering to.
 */
/**
 * Dual distribution: each professional's progress on a lead is their own
 * LeadRecipient row. These two maps translate it to and from the pipeline
 * statuses the Leads workspace uses.
 */
type Delivery = 'CREATED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'OPENED' | 'RESPONDED' | 'CONVERTED' | 'CLOSED' | 'FAILED'
const FROM_DELIVERY: Record<Delivery, string> = {
  CREATED: 'NEW', QUEUED: 'NEW', SENT: 'NEW', DELIVERED: 'NEW', OPENED: 'IN_PROGRESS',
  RESPONDED: 'RESPONDED', CONVERTED: 'CONVERTED', CLOSED: 'CLOSED', FAILED: 'CLOSED',
}
const TO_DELIVERY: Record<string, Delivery> = {
  NEW: 'SENT', ASSIGNED: 'OPENED', IN_PROGRESS: 'OPENED', RESPONDED: 'RESPONDED', CONVERTED: 'CONVERTED', CLOSED: 'CLOSED',
}

/** Is this user the lead's owner, a routed recipient, or neither? */
async function leadRole(enquiryId: string, userId: string) {
  const e = await prisma.enquiry.findUnique({ where: { id: enquiryId }, select: { holderId: true, directRecipientId: true, clientId: true } })
  if (!e) return null
  const rec = await prisma.leadRecipient.findUnique({
    where: { enquiryId_recipientId: { enquiryId, recipientId: userId } },
    select: { id: true },
  })
  const owner = e.holderId === userId
  return { owner, rec, client: e.clientId === userId, member: owner || e.directRecipientId === userId || !!rec }
}

function plain<T extends { budget: unknown }>(row: T): Omit<T, 'budget'> & { budget: number | null } {
  return { ...row, budget: row.budget == null ? null : Number(row.budget) }
}

export async function myEnquiries() {
  const user = await requireAuth()
  const rows = await prisma.enquiry.findMany({
    where: { holderId: user.id },
    include: {
      responses: { orderBy: { createdAt: 'asc' } },
      client: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return rows.map(plain)
}

/**
 * The CRM workspace feed for the professional's Leads & Enquiries page.
 *
 * Enquiries are GROUPED by buyer (client) into one conversation each — the same
 * buyer never appears twice, and a fresh enquiry from a known buyer becomes a
 * new event inside their existing thread (§2, §3, §30). Every Decimal/Date is
 * serialised so the whole tree crosses cleanly into the client component.
 */
export async function myLeadConversations() {
  const user = await requireAuth()

  // Both the DIRECT lead (holder / listing owner) and every PACT-routed lead
  // (a LeadRecipient row for this user) belong in this professional's inbox.
  const rows = await prisma.enquiry.findMany({
    where: {
      OR: [
        { holderId: user.id },
        { directRecipientId: user.id },
        { recipients: { some: { recipientId: user.id } } },
      ],
    },
    include: {
      responses: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, senderId: true, message: true, attachments: true, createdAt: true },
      },
      client: { select: { id: true, name: true, email: true, profilePhoto: true, logo: true, city: true } },
      recipients: {
        where: { recipientId: user.id },
        select: { type: true, routingReason: true, deliveryStatus: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Feature images for enquiries that came from a product/project listing —
  // sourceId points at the Post; grab its first image so the chat card shows it.
  const sourceIds = [...new Set(rows.map((r) => r.sourceId).filter((x): x is string => !!x))]
  const posts = sourceIds.length
    ? await prisma.post.findMany({
        where: { id: { in: sourceIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          media: {
            where: { type: 'IMAGE' },
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true, thumbnailUrl: true },
          },
        },
      })
    : []
  const postMap = new Map(posts.map((p) => [p.id, p]))

  // The status THIS professional sees: the owner keeps the enquiry's own
  // status; a routed PACT holder sees their own recipient row.
  const statusFor = (e: (typeof rows)[number]) =>
    e.holderId === user.id || !e.recipients[0] ? e.status : FROM_DELIVERY[e.recipients[0].deliveryStatus as Delivery] ?? e.status
  for (const e of rows) {
    ;(e as { status: string }).status = statusFor(e)
    // Competing holders never see each other's messages — only their own and the buyer's.
    e.responses = e.responses.filter((r) => r.senderId === user.id || r.senderId === e.clientId)
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const kpis = {
    total: rows.length,
    newToday: rows.filter((e) => e.status === 'NEW' && e.createdAt >= startOfToday).length,
    inConversation: rows.filter((e) =>
      e.status === 'IN_PROGRESS' || e.status === 'RESPONDED' || e.status === 'ASSIGNED'
    ).length,
    converted: rows.filter((e) => e.status === 'CONVERTED').length,
  }

  // group by buyer
  const groups = new Map<string, typeof rows>()
  for (const e of rows) {
    const arr = groups.get(e.clientId) ?? []
    arr.push(e)
    groups.set(e.clientId, arr)
  }

  const conversations = [...groups.values()]
    .map((enqs) => {
      const latest = enqs[0] // rows are createdAt desc, so [0] is newest
      const chrono = [...enqs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      const c = latest.client
      return {
        id: latest.clientId,
        latestEnquiryId: latest.id,
        buyer: {
          id: c?.id ?? latest.clientId,
          name: c?.name || latest.contactName || 'Buyer',
          email: latest.contactEmail || c?.email || '',
          phone: latest.contactPhone || '',
          city: latest.city || c?.city || '',
          state: latest.state || '',
          pincode: latest.pincode || '',
          // Show whatever image the buyer set on their profile — a personal
          // photo, or a company logo for a business account — in the chat.
          avatar: c?.profilePhoto ?? c?.logo ?? null,
        },
        enquiries: chrono.map((e) => {
          const post = e.sourceId ? postMap.get(e.sourceId) : undefined
          const detailHref = post
            ? post.type === 'PROJECT'
              ? `/projects/${post.slug}`
              : post.type === 'MERCHANDISE'
                ? `/merchandise/${post.slug}`
                : `/products/${post.slug}`
            : e.sourceUrl ?? null
          return {
          id: e.id,
          subject: e.subject,
          message: e.message,
          category: e.category || e.serviceType,
          serviceType: e.serviceType,
          subCategory: e.subCategory,
          budget: e.budget == null ? null : Number(e.budget),
          pincode: e.pincode,
          city: e.city,
          sourceType: e.sourceType,
          sourceUrl: e.sourceUrl,
          productImage: post?.media[0]?.thumbnailUrl ?? post?.media[0]?.url ?? null,
          productTitle: post?.title ?? null,
          productSlug: post?.slug ?? null,
          detailHref,
          isProject: post?.type === 'PROJECT',
          status: e.status,
          createdAt: e.createdAt.toISOString(),
          responses: e.responses.map((r) => ({
            id: r.id,
            senderId: r.senderId,
            message: r.message,
            attachments: r.attachments,
            createdAt: r.createdAt.toISOString(),
          })),
          }
        }),
        count: enqs.length,
        newCount: enqs.filter((e) => e.status === 'NEW').length,
        unread: enqs.some((e) => e.status === 'NEW'),
        latestSubject: latest.subject,
        latestAt: latest.createdAt.toISOString(),
        status: latest.status,
        recipientType:
          latest.recipients[0]?.type ?? (latest.holderId === user.id ? 'DIRECT' : 'PACT'),
        routingReason: latest.recipients[0]?.routingReason ?? null,
      }
    })
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())

  return { conversations, kpis, myId: user.id }
}

export type LeadConversation = Awaited<ReturnType<typeof myLeadConversations>>['conversations'][number]

/** §5.2.11 — enquiries I have sent */
export async function myConsultations() {
  const user = await requireAuth()
  const rows = await prisma.enquiry.findMany({
    where: { clientId: user.id },
    include: {
      responses: { orderBy: { createdAt: 'asc' } },
      holder: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(plain)
}

/**
 * A file sent inside a lead thread (image or PDF). Only someone the lead was
 * delivered to — or the buyer — may attach to it; respondToEnquiry re-checks.
 */
export async function uploadLeadAttachmentAction(fd: FormData): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  const user = await requireAuth()
  const file = fd.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a file.' }
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const up = await uploadFile({ userId: user.id, file, kind: isPdf ? 'PDF' : 'IMAGE', aspect: 'free', folder: 'enquiries' })
  if (!up.ok) return { ok: false, error: up.error }
  return { ok: true, url: up.url, name: file.name.slice(0, 80) }
}

export async function replyAction(enquiryId: string, message: string, attachments: string[] = []) {
  const user = await requireAuth()

  // Only our own uploaded files travel in a thread — never arbitrary links.
  const files = attachments.filter((a) => typeof a === 'string' && (a.startsWith('/uploads/') || (!!process.env.R2_PUBLIC_URL && a.startsWith(process.env.R2_PUBLIC_URL.trim())))).slice(0, 5)
  if (message.trim().length < 2 && files.length === 0) {
    return { ok: false, error: 'Please write a message before sending.' }
  }

  try {
    await respondToEnquiry({
      enquiryId,
      senderId: user.id,
      attachments: files,
      message: message.trim(),
    })
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') {
      return { ok: false, error: 'This enquiry does not belong to your account.' }
    }
    console.error('Reply fail:', e)
    return { ok: false, error: 'Your reply could not be sent. Please try again.' }
  }
}

const LEAD_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED'] as const
type LeadStatusValue = (typeof LEAD_STATUSES)[number]

/** The professional moves a lead along its pipeline from the CRM workspace. */
export async function setLeadStatusAction(enquiryId: string, status: string) {
  const user = await requireAuth()
  if (!LEAD_STATUSES.includes(status as LeadStatusValue)) {
    return { ok: false, error: 'Unknown status.' }
  }
  const who = await leadRole(enquiryId, user.id)
  if (!who?.member) {
    return { ok: false, error: 'This enquiry does not belong to your account.' }
  }
  const now = new Date()
  if (who.owner) {
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: status as LeadStatusValue,
        ...(status === 'CONVERTED' || status === 'CLOSED' ? { closedAt: now } : {}),
      },
    })
  }
  if (who.rec) {
    const d = TO_DELIVERY[status]
    await prisma.leadRecipient.update({
      where: { id: who.rec.id },
      data: {
        deliveryStatus: d,
        ...(d === 'OPENED' ? { openedAt: now } : d === 'RESPONDED' ? { respondedAt: now } : d === 'CONVERTED' ? { convertedAt: now } : {}),
      },
    })
  }
  revalidatePath('/dashboard/professional/enquiries')
  return { ok: true }
}

/** The holder closes the enquiry once the work is complete */
export async function closeEnquiryAction(enquiryId: string, converted: boolean) {
  const user = await requireAuth()

  const who = await leadRole(enquiryId, user.id)
  if (!who || (!who.member && !who.client)) {
    return { ok: false, error: 'This enquiry does not belong to your account.' }
  }

  // The owner or the buyer closes the enquiry itself; a routed PACT holder
  // closes only their own copy of it.
  if (who.owner || who.client) {
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: { status: converted ? 'CONVERTED' : 'CLOSED', closedAt: new Date() },
    })
  }
  if (who.rec) {
    await prisma.leadRecipient.update({
      where: { id: who.rec.id },
      data: { deliveryStatus: converted ? 'CONVERTED' : 'CLOSED', ...(converted ? { convertedAt: new Date() } : {}) },
    })
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
