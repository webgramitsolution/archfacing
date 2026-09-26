'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Newsletter sign-up from the Club pages.
 *
 * Re-subscribing is treated as success rather than an error: telling someone
 * "this email is already registered" reveals who is on the list to anyone who
 * cares to probe it, and is no use to the person signing up either way.
 */

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  source: z.string().trim().max(40).optional(),
})

export type SubscribeState = {
  ok: boolean
  message: string
} | null

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    source: formData.get('source') ?? 'club',
  })

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' }
  }

  const { email, source } = parsed.data

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: source ?? 'club' },
      // Someone signing up again after unsubscribing is opting back in
      update: { unsubscribedAt: null },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // A duplicate here means they are already on the list — that is fine
      if (e.code === 'P2002') {
        return { ok: true, message: 'You are on the list. Watch your inbox.' }
      }
    }
    console.error('Newsletter subscribe failed:', e)
    return { ok: false, message: 'Could not sign you up just now. Please try again.' }
  }

  return { ok: true, message: 'Done — we will email you when the next event opens.' }
}
