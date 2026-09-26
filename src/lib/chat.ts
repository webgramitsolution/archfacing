import { prisma } from '@/lib/prisma'

/**
 * Direct messages between two members.
 *
 * This is NOT the lead/enquiry pipeline — a `Conversation` is two people
 * talking about a post, started from that post's Chat button (Artistry and
 * Around Us today). Nothing here reads `Enquiry` or `LeadRecipient`.
 *
 * Every helper is written from the reader's point of view ("me"), so the same
 * functions serve every role: the professional who owns the post and the
 * client who started the chat both see their own side.
 */

export type ChatSource = 'ARTISTRY' | 'AROUND_US'

export const SOURCE_LABEL: Record<string, string> = {
  ARTISTRY: 'Artistry',
  AROUND_US: 'Around Us',
}

/** Where a post of this source lives on the public site. */
export const SOURCE_HREF: Record<string, string> = {
  ARTISTRY: '/artistry',
  AROUND_US: '/around-us',
}

export type ConversationRow = {
  id: string
  subject: string
  source: string
  postSlug: string | null
  archived: boolean
  lastMessageAt: string
  unread: number
  /** The person on the other side, from the reader's point of view. */
  other: {
    id: string
    name: string
    photo: string | null
    role: string
    location: string | null
    phone: string | null
    email: string | null
    verified: boolean
    joinedAt: string
  }
  preview: string
}

const otherSelect = {
  id: true,
  name: true,
  profilePhoto: true,
  logo: true,
  role: true,
  city: true,
  state: true,
  mobile: true,
  email: true,
  createdAt: true,
  professionalProfile: { select: { isVerified: true, firmName: true } },
  consultantProfile: { select: { isVerified: true } },
  bmfProfile: { select: { isVerified: true, businessName: true } },
  corporateProfile: { select: { isVerified: true, companyName: true } },
} as const

type OtherUser = {
  id: string
  name: string
  profilePhoto: string | null
  logo: string | null
  role: string
  city: string | null
  state: string | null
  mobile: string | null
  email: string
  createdAt: Date
  professionalProfile: { isVerified: boolean; firmName: string | null } | null
  consultantProfile: { isVerified: boolean } | null
  bmfProfile: { isVerified: boolean; businessName: string | null } | null
  corporateProfile: { isVerified: boolean; companyName: string | null } | null
}

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Individual Homeowner',
  PROFESSIONAL: 'Professional',
  CONSULTANT: 'Consultant',
  BMF: 'Building Material Facilitator',
  CORPORATE: 'Corporate',
  ADMIN: 'ArchFacing Team',
  SUPER_ADMIN: 'ArchFacing Team',
}

function shapeOther(u: OtherUser) {
  const firm =
    u.professionalProfile?.firmName ??
    u.bmfProfile?.businessName ??
    u.corporateProfile?.companyName ??
    null
  return {
    id: u.id,
    name: firm ?? u.name,
    photo: u.profilePhoto ?? u.logo ?? null,
    role: ROLE_LABEL[u.role] ?? u.role,
    location: [u.city, u.state].filter(Boolean).join(', ') || null,
    phone: u.mobile,
    email: u.email,
    verified:
      u.professionalProfile?.isVerified ??
      u.consultantProfile?.isVerified ??
      u.bmfProfile?.isVerified ??
      u.corporateProfile?.isVerified ??
      false,
    joinedAt: u.createdAt.toISOString(),
  }
}

/**
 * Every conversation the reader is part of — on either side — newest first,
 * with the unread count of messages the OTHER person sent.
 */
export async function myConversations(meId: string): Promise<ConversationRow[]> {
  const rows = await prisma.conversation.findMany({
    where: { OR: [{ starterId: meId }, { ownerId: meId }] },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      starter: { select: otherSelect },
      owner: { select: otherSelect },
      post: { select: { slug: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
      _count: {
        select: { messages: { where: { readAt: null, NOT: { senderId: meId } } } },
      },
    },
  })

  return rows.map((c) => {
    const iAmStarter = c.starterId === meId
    const other = shapeOther((iAmStarter ? c.owner : c.starter) as OtherUser)
    return {
      id: c.id,
      subject: c.subject,
      source: c.source,
      postSlug: c.post?.slug ?? null,
      archived: iAmStarter ? c.starterArchived : c.ownerArchived,
      lastMessageAt: c.lastMessageAt.toISOString(),
      unread: c._count.messages,
      other,
      preview: c.messages[0]?.body ?? '',
    }
  })
}

export type ThreadMessage = {
  id: string
  body: string
  mine: boolean
  createdAt: string
  readAt: string | null
}

/** One thread's messages, ownership-checked. Returns null if not the reader's. */
export async function conversationThread(meId: string, conversationId: string) {
  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!c || (c.starterId !== meId && c.ownerId !== meId)) return null

  const messages: ThreadMessage[] = c.messages.map((m) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === meId,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }))
  return { id: c.id, subject: c.subject, source: c.source, messages }
}

/** Unread message count across every conversation — for the nav badge. */
export async function unreadMessageCount(meId: string): Promise<number> {
  return prisma.chatMessage
    .count({
      where: {
        NOT: { senderId: meId },
        readAt: null,
        conversation: { OR: [{ starterId: meId }, { ownerId: meId }] },
      },
    })
    .catch(() => 0)
}
