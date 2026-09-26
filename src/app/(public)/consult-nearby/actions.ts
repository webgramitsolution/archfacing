'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import type { PactServiceType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { findRecipient, createEnquiry } from '@/lib/enquiry'
import { sendMail } from '@/lib/mailer'

/** Used to show "who will respond" on the form — changes nothing */
export async function previewRecipientAction(
  pincode: string,
  serviceType: PactServiceType,
  subCategory?: string | null
) {
  if (!/^[1-9]\d{5}$/.test(pincode)) return null

  const [place, routing] = await Promise.all([
    prisma.pincode.findUnique({ where: { code: pincode } }),
    findRecipient(pincode, serviceType, subCategory),
  ])

  if (!place) return null

  return {
    district: place.district,
    state: place.state,
    routed: routing.routed,
    via: routing.routed ? routing.via : null,
    distanceKm: routing.routed && routing.via === 'nearby' ? routing.distanceKm : null,
  }
}

const schema = z.object({
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  serviceType: z.enum(['DESIGNA', 'DESIGNI', 'CONSULTANT', 'BMF']),
  subCategory: z.string().trim().optional(),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(180),
  message: z.string().trim().min(20, 'Describe your requirement clearly — at least 20 characters'),
  budget: z.coerce.number().min(0).optional(),
  contactName: z.string().trim().min(2, 'Enter your name').max(120),
  contactPhone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  contactEmail: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
})

export type EnquiryState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
  routedTo?: string | null
}

export async function submitEnquiryAction(
  _prev: EnquiryState | null,
  formData: FormData
): Promise<EnquiryState> {
  const session = await auth()

  // §5.1.2 — login is required to send an enquiry, so the reply can
  // reach the same person and to keep spam out
  if (!session?.user) {
    redirect('/login?next=/consult-nearby')
  }

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string' && v.trim()) raw[k] = v.trim()
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const key = String(i.path[0] ?? 'form')
      fieldErrors[key] ??= i.message
    }
    return { ok: false, error: 'Please correct the highlighted fields.', fieldErrors, values: raw }
  }

  const d = parsed.data

  // §7.4.1 — sub-category is required for Consultant
  if (d.serviceType === 'CONSULTANT' && !d.subCategory) {
    return {
      ok: false,
      error: 'Please correct the highlighted fields.',
      fieldErrors: { subCategory: 'Select the type of consultant you need' },
      values: raw,
    }
  }

  try {
    const { pactRecipients } = await createEnquiry({
      clientId: session.user.id,
      pincode: d.pincode,
      serviceType: d.serviceType,
      subCategory: d.subCategory,
      subject: d.subject,
      message: d.message,
      budget: d.budget ?? null,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      contactEmail: d.contactEmail || session.user.email,
    })

    // email every matched PACT holder — if it fails, the enquiry still stands
    if (pactRecipients.length) {
      const holders = await prisma.user.findMany({
        where: { id: { in: pactRecipients.map((r) => r.holderId) } },
        select: { email: true, name: true },
      })
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      await Promise.all(
        holders.map((holder) =>
          sendMail({
            to: holder.email,
            subject: `New enquiry — PIN ${d.pincode}`,
            text: [
              `Hello ${holder.name},`,
              '',
              `A new enquiry has come in from your PACT area.`,
              '',
              `Subject: ${d.subject}`,
              `PIN: ${d.pincode}`,
              `Contact: ${d.contactName} · ${d.contactPhone}`,
              '',
              d.message,
              '',
              `Reply here: ${appUrl}/dashboard`,
            ].join('\n'),
            html: `<p>Hello ${holder.name},</p>
<p>A new enquiry has come in from your PACT area.</p>
<p><strong>${d.subject}</strong><br>PIN ${d.pincode} · ${d.contactName} · ${d.contactPhone}</p>
<p>${d.message}</p>
<p><a href="${appUrl}/dashboard">Reply now →</a></p>`,
          }).catch((e) => console.error('Enquiry email failed to send:', e))
        )
      )
    }

    return {
      ok: true,
      routedTo: pactRecipients[0]?.holderName ?? null,
    }
  } catch (e) {
    console.error('Enquiry fail:', e)
    return { ok: false, error: 'Could not send the enquiry. Please try again.', values: raw }
  }
}
