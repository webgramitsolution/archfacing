'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAssociate } from '@/lib/design-associates'

/**
 * The storefront contact form.
 *
 * The message is delivered as an in-app Notification to the seller — the same
 * inbox every other platform event already lands in — so nothing here invents
 * a mailbox. Contact details ride inside the body for the seller to reply to.
 *
 * Public and unauthenticated by design: a storefront visitor should not need
 * an account to ask a question. The zod parse is the gate.
 */

const ContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().email('That email address does not look right.'),
  message: z.string().trim().min(10, 'Tell them a little more — at least 10 characters.').max(2000),
  /** The mandatory data-storage consent. The promotional one is optional. */
  consentStorage: z.literal('on', {
    errorMap: () => ({ message: 'Please accept the data-storage consent to send your message.' }),
  }),
})

export type ContactState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function sendSellerMessageAction(
  _prev: ContactState | null,
  formData: FormData
): Promise<ContactState> {
  const parsed = ContactSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    message: formData.get('message'),
    consentStorage: formData.get('consentStorage'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  const slug = String(formData.get('company') ?? '')
  const seller = await getAssociate(slug)
  if (!seller) return { ok: false, error: 'This seller is no longer available.' }

  const { firstName, lastName, email, message } = parsed.data
  const from = [firstName, lastName].filter(Boolean).join(' ')
  const promo = formData.get('consentPromo') === 'on'

  await prisma.notification.create({
    data: {
      userId: seller.id,
      type: 'STOREFRONT_MESSAGE',
      title: `New message from ${from}`,
      body:
        `${message}\n\n— ${from} <${email}>` +
        (promo ? '\n(Happy to receive promotional updates.)' : ''),
      link: '/dashboard/notifications',
    },
  })

  return { ok: true }
}
