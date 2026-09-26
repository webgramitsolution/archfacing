import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { pricingTiers } from '@/lib/club-events'

/**
 * Registering for an ArchFacing Club event — the same shape as a club
 * membership purchase (src/lib/club.ts):
 *
 *   startEventRegistration  holds a seat (atomically) and, for a paid tier,
 *                           opens a CREATED Payment. A free tier confirms at once.
 *   confirmEventRegistration turns a PAID payment into a CONFIRMED ticket.
 *                           Idempotent.
 *   cancelEventRegistration  frees the seat (admin or member).
 *
 * The seat is taken with a conditional increment (seatsTaken < totalSeats),
 * so two people can never buy the last seat twice.
 */

export class EventRegistrationError extends Error {}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const count = await tx.payment.count({ where: { invoiceNumber: { not: null } } })
  return `AF/${year}/${String(count + 1).padStart(6, '0')}`
}

function ticketCode(): string {
  return 'AFC-' + randomBytes(4).toString('hex').toUpperCase()
}

export async function startEventRegistration(eventId: string, userId: string) {
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const event = await tx.clubEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, status: true, startsAt: true, endsAt: true, totalSeats: true,
        earlyBirdPrice: true, earlyBirdTill: true, standardPrice: true, spotPrice: true, taxPercent: true,
      },
    })
    if (!event || event.status !== 'PUBLISHED') throw new EventRegistrationError('This event is not open for registration.')
    if (now > event.endsAt) throw new EventRegistrationError('This event has already ended.')

    const existing = await tx.clubRegistration.findUnique({ where: { eventId_userId: { eventId, userId } } })
    if (existing && existing.status !== 'CANCELLED') {
      if (existing.status === 'PENDING_PAYMENT') return { free: false as const, registrationId: existing.id, paymentId: existing.paymentId, resumed: true }
      throw new EventRegistrationError('You are already registered for this event.')
    }

    // Hold a seat — only succeeds while one is left.
    const held = await tx.clubEvent.updateMany({
      where: { id: eventId, seatsTaken: { lt: event.totalSeats } },
      data: { seatsTaken: { increment: 1 } },
    })
    if (held.count !== 1) throw new EventRegistrationError('This event is sold out.')

    const tier = pricingTiers(event, now).find((t) => t.state === 'live')
    const amount = tier ? tier.price : Number(event.standardPrice)
    const tax = Math.round(amount * Number(event.taxPercent)) / 100
    const code = ticketCode()

    if (amount <= 0) {
      const reg = existing
        ? await tx.clubRegistration.update({
            where: { id: existing.id },
            data: { tier: tier?.key ?? 'STANDARD', amount: 0, taxAmount: 0, status: 'CONFIRMED', paymentId: null, ticketCode: code },
          })
        : await tx.clubRegistration.create({
            data: { eventId, userId, tier: tier?.key ?? 'STANDARD', amount: 0, taxAmount: 0, status: 'CONFIRMED', ticketCode: code },
          })
      await tx.notification.create({
        data: { userId, type: 'CLUB_EVENT_CONFIRMED', title: 'You are registered', body: `${event.title} — ticket ${code}.`, link: '/dashboard/club' },
      })
      return { free: true as const, registrationId: reg.id, ticketCode: code }
    }

    const payment = await tx.payment.create({
      data: {
        userId,
        purpose: 'CLUB_EVENT',
        status: 'CREATED',
        amount: new Prisma.Decimal(amount),
        taxAmount: new Prisma.Decimal(tax),
        totalAmount: new Prisma.Decimal(amount + tax),
        referenceId: eventId,
        metadata: { eventTitle: event.title, tier: tier?.key ?? 'STANDARD' },
      },
    })
    const reg = existing
      ? await tx.clubRegistration.update({
          where: { id: existing.id },
          data: { tier: tier?.key ?? 'STANDARD', amount, taxAmount: tax, status: 'PENDING_PAYMENT', paymentId: payment.id, ticketCode: code },
        })
      : await tx.clubRegistration.create({
          data: { eventId, userId, tier: tier?.key ?? 'STANDARD', amount, taxAmount: tax, status: 'PENDING_PAYMENT', paymentId: payment.id, ticketCode: code },
        })
    return { free: false as const, registrationId: reg.id, paymentId: payment.id, total: amount + tax, resumed: false }
  })
}

export async function confirmEventRegistration(paymentId: string, gatewayPaymentId?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment || payment.purpose !== 'CLUB_EVENT') throw new EventRegistrationError('Payment not found.')
    const reg = await tx.clubRegistration.findFirst({ where: { paymentId }, include: { event: { select: { title: true } } } })
    if (!reg) throw new EventRegistrationError('The registration for this payment is missing.')
    if (payment.status === 'PAID') return { alreadyDone: true, ticketCode: reg.ticketCode }

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'PAID', paidAt: new Date(), razorpayPaymentId: gatewayPaymentId ?? null, invoiceNumber: await nextInvoiceNumber(tx) },
    })
    await tx.clubRegistration.update({ where: { id: reg.id }, data: { status: 'CONFIRMED' } })
    await tx.notification.create({
      data: { userId: reg.userId, type: 'CLUB_EVENT_CONFIRMED', title: 'Your seat is confirmed', body: `${reg.event.title} — ticket ${reg.ticketCode}.`, link: '/dashboard/club' },
    })
    return { alreadyDone: false, ticketCode: reg.ticketCode }
  })
}

/** Cancels a registration and gives its seat back. */
export async function cancelEventRegistration(registrationId: string) {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.clubRegistration.findUnique({ where: { id: registrationId }, include: { event: { select: { title: true } } } })
    if (!reg || reg.status === 'CANCELLED') throw new EventRegistrationError('That registration is not active.')
    await tx.clubRegistration.update({ where: { id: reg.id }, data: { status: 'CANCELLED' } })
    await tx.clubEvent.updateMany({ where: { id: reg.eventId, seatsTaken: { gt: 0 } }, data: { seatsTaken: { decrement: 1 } } })
    if (reg.paymentId) {
      await tx.payment.updateMany({ where: { id: reg.paymentId, status: { in: ['CREATED', 'PENDING'] } }, data: { status: 'FAILED' } })
    }
    await tx.notification.create({
      data: { userId: reg.userId, type: 'CLUB_EVENT_CANCELLED', title: 'Registration cancelled', body: reg.event.title, link: '/club/events' },
    })
    return reg
  })
}
