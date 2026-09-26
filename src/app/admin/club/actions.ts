'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { cancelEventRegistration, EventRegistrationError } from '@/lib/club-registration'

export type ClubOpState = { ok: boolean; message: string; id?: string } | null

const ID = z.string().regex(/^[a-z0-9]{10,40}$/i)
const refresh = (slug?: string) => {
  revalidatePath('/admin/club')
  revalidatePath('/club')
  revalidatePath('/club/events')
  if (slug) revalidatePath(`/club/events/${slug}`)
}
const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const lines = (v: FormDataEntryValue | null) => String(v ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

const EVENT = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(4).max(140),
  type: z.enum(['SEMINAR', 'EXHIBITION', 'WEBINAR', 'NETWORKING', 'CONFERENCE', 'WORKSHOP']),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(8000),
  heroImage: z.string().trim().url('Hero image must be a full https:// URL').refine((u) => u.startsWith('https://'), 'Hero image must be https'),
  startsAt: z.string().min(1, 'Start date is required'),
  endsAt: z.string().min(1, 'End date is required'),
  venueName: z.string().trim().max(140).optional(),
  venueAddress: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  contactEmail: z.union([z.literal(''), z.string().trim().email()]).optional(),
  totalSeats: z.coerce.number().int().min(1).max(100000),
  standardPrice: z.coerce.number().min(0).max(10_000_000),
  earlyBirdPrice: z.string().optional(),
  earlyBirdTill: z.string().optional(),
  spotPrice: z.string().optional(),
  taxPercent: z.coerce.number().min(0).max(40),
})

/**
 * Create or edit an event. Speakers, agenda and FAQs are line-based
 * ("Name | Role | Company | photo URL", "10:00 AM | 11:00 AM | Title | Speaker",
 * "Question | Answer") and are replaced as a set on every save.
 */
export async function saveEventAction(_p: ClubOpState, fd: FormData): Promise<ClubOpState> {
  const admin = await requirePermission('admin:club')
  const parsed = EVENT.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the fields.' }
  const d = parsed.data
  const startsAt = new Date(d.startsAt)
  const endsAt = new Date(d.endsAt)
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) return { ok: false, message: 'Enter valid start and end times.' }
  if (endsAt <= startsAt) return { ok: false, message: 'The event must end after it starts.' }
  const num = (v?: string) => (v && v.trim() !== '' ? Number(v) : null)
  const early = num(d.earlyBirdPrice)
  const spot = num(d.spotPrice)
  const earlyTill = d.earlyBirdTill ? new Date(d.earlyBirdTill) : null
  if (early != null && (!Number.isFinite(early) || early < 0)) return { ok: false, message: 'Early-bird price must be 0 or more.' }
  if (spot != null && (!Number.isFinite(spot) || spot < 0)) return { ok: false, message: 'Spot price must be 0 or more.' }
  if (early != null && !earlyTill) return { ok: false, message: 'Give the early-bird price a closing date.' }
  const isOnline = fd.get('isOnline') === 'on'
  const includes = lines(fd.get('includes')).slice(0, 12)
  const audience = lines(fd.get('audience')).slice(0, 12)

  const speakers = lines(fd.get('speakers')).slice(0, 30).map((l, i) => {
    const [name, role, company, photo] = l.split('|').map((x) => x.trim())
    return { name, role: role || '', company: company || '', photo: photo || '', sortOrder: i }
  }).filter((x) => x.name)
  const agenda = lines(fd.get('agenda')).slice(0, 40).map((l, i) => {
    const [startTime, endTime, title, speaker] = l.split('|').map((x) => x.trim())
    return { startTime: startTime || '', endTime: endTime || '', title: title || '', speaker: speaker || null, sortOrder: i }
  }).filter((x) => x.title)
  const faqs = lines(fd.get('faqs')).slice(0, 30).map((l, i) => {
    const [question, ...rest] = l.split('|')
    return { question: (question ?? '').trim(), answer: rest.join('|').trim(), sortOrder: i }
  }).filter((x) => x.question && x.answer)

  const data = {
    title: d.title, type: d.type, summary: d.summary, description: d.description, heroImage: d.heroImage,
    startsAt, endsAt, isOnline, venueName: d.venueName || null, venueAddress: d.venueAddress || null, city: d.city || null,
    contactPhone: d.contactPhone || null, contactEmail: d.contactEmail || null,
    totalSeats: d.totalSeats, standardPrice: d.standardPrice, earlyBirdPrice: early, earlyBirdTill: earlyTill,
    spotPrice: spot, taxPercent: d.taxPercent, includes, audience,
  }

  let id = d.id && ID.safeParse(d.id).success ? d.id : null
  let slug = ''
  try {
    const saved = await prisma.$transaction(async (tx) => {
      let ev
      if (id) {
        const cur = await tx.clubEvent.findUnique({ where: { id }, select: { seatsTaken: true } })
        if (!cur) throw new Error('GONE')
        if (d.totalSeats < cur.seatsTaken) throw new Error(`SEATS:${cur.seatsTaken}`)
        ev = await tx.clubEvent.update({ where: { id }, data })
        await tx.clubEventSpeaker.deleteMany({ where: { eventId: id } })
        await tx.clubAgendaItem.deleteMany({ where: { eventId: id } })
        await tx.clubEventFaq.deleteMany({ where: { eventId: id } })
      } else {
        let base = slugify(d.title) || 'event'
        if (await tx.clubEvent.count({ where: { slug: base } })) base = `${base}-${Date.now().toString(36).slice(-4)}`
        ev = await tx.clubEvent.create({ data: { ...data, slug: base, status: 'DRAFT' } })
      }
      if (speakers.length) await tx.clubEventSpeaker.createMany({ data: speakers.map((x) => ({ ...x, eventId: ev.id })) })
      if (agenda.length) await tx.clubAgendaItem.createMany({ data: agenda.map((x) => ({ ...x, eventId: ev.id })) })
      if (faqs.length) await tx.clubEventFaq.createMany({ data: faqs.map((x) => ({ ...x, eventId: ev.id })) })
      await tx.auditLog.create({
        data: { actorId: admin.id, action: id ? 'CLUB_EVENT_UPDATED' : 'CLUB_EVENT_CREATED', entityType: 'ClubEvent', entityId: ev.id, after: { title: d.title } },
      })
      return ev
    })
    id = saved.id
    slug = saved.slug
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('SEATS:')) return { ok: false, message: `${e.message.slice(6)} seats are already taken — keep at least that many.` }
    if (e instanceof Error && e.message === 'GONE') return { ok: false, message: 'That event no longer exists.' }
    throw e
  }
  refresh(slug)
  return { ok: true, message: d.id ? 'Event saved.' : 'Event created as a draft — publish it when it is ready.', id: id! }
}

/** Publish, unpublish (draft), cancel or mark completed. Cancelling notifies every confirmed attendee. */
export async function setEventStatusAction(fd: FormData): Promise<void> {
  const admin = await requirePermission('admin:club')
  const id = ID.safeParse(fd.get('id'))
  const status = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).safeParse(fd.get('status'))
  if (!id.success || !status.success) return
  const ev = await prisma.clubEvent.findUnique({ where: { id: id.data }, select: { slug: true, title: true, status: true } })
  if (!ev || ev.status === status.data) return
  const attendees = status.data === 'CANCELLED'
    ? await prisma.clubRegistration.findMany({ where: { eventId: id.data, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } }, select: { userId: true } })
    : []
  await prisma.$transaction([
    prisma.clubEvent.update({ where: { id: id.data }, data: { status: status.data } }),
    ...(attendees.length
      ? [prisma.notification.createMany({
          data: attendees.map((a) => ({ userId: a.userId, type: 'CLUB_EVENT_CANCELLED', title: 'An event you registered for was cancelled', body: `${ev.title}. The ArchFacing team will contact you about your registration.`, link: '/club/events' })),
        })]
      : []),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: `CLUB_EVENT_${status.data}`, entityType: 'ClubEvent', entityId: id.data, before: { status: ev.status }, after: { status: status.data, notified: attendees.length } },
    }),
  ])
  refresh(ev.slug)
}

/** Admin side of a registration: mark attended, or cancel (seat returned). */
export async function registrationOpAction(fd: FormData): Promise<void> {
  const admin = await requirePermission('admin:club')
  const id = ID.safeParse(fd.get('id'))
  const op = String(fd.get('op') ?? '')
  if (!id.success) return
  if (op === 'ATTENDED') {
    const r = await prisma.clubRegistration.updateMany({ where: { id: id.data, status: 'CONFIRMED' }, data: { status: 'ATTENDED' } })
    if (r.count) await prisma.auditLog.create({ data: { actorId: admin.id, action: 'CLUB_REG_ATTENDED', entityType: 'ClubRegistration', entityId: id.data } })
  } else if (op === 'CANCEL') {
    try {
      await cancelEventRegistration(id.data)
      await prisma.auditLog.create({ data: { actorId: admin.id, action: 'CLUB_REG_CANCELLED', entityType: 'ClubRegistration', entityId: id.data } })
    } catch (e) {
      if (!(e instanceof EventRegistrationError)) throw e
    }
  }
  refresh()
}

/** Club membership plans — price, term, benefits, on/off. */
export async function saveClubPlanAction(_p: ClubOpState, fd: FormData): Promise<ClubOpState> {
  const admin = await requirePermission('admin:club')
  const P = z.object({
    id: ID, name: z.string().trim().min(2).max(40), price: z.coerce.number().min(0).max(10_000_000),
    months: z.coerce.number().int().min(1).max(240), taxPercent: z.coerce.number().min(0).max(40),
  })
  const parsed = P.safeParse(Object.fromEntries(fd))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the values.' }
  const d = parsed.data
  const before = await prisma.clubPlan.findUnique({ where: { id: d.id } })
  if (!before) return { ok: false, message: 'That plan no longer exists.' }
  await prisma.$transaction([
    prisma.clubPlan.update({
      where: { id: d.id },
      data: { name: d.name, price: d.price, months: d.months, taxPercent: d.taxPercent, benefits: lines(fd.get('benefits')).slice(0, 20), isActive: fd.get('isActive') === 'on' },
    }),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'CLUB_PLAN_UPDATED', entityType: 'ClubPlan', entityId: d.id, before: { price: Number(before.price), months: before.months, isActive: before.isActive } as Prisma.InputJsonValue, after: { price: d.price, months: d.months } },
    }),
  ])
  refresh()
  return { ok: true, message: `${d.name} saved.` }
}
