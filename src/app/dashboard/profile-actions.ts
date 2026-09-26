'use server'

/**
 * Edit Profile — PDF §5.1.1, §5.2.1, §5.3.1, §5.4.1.
 *
 * Every role edits the same User row, so one action serves all of them.
 * Email and role are deliberately not editable here: email is the sign-in
 * identity and changing it needs re-verification, and role decides what a
 * person may post.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/guard'

export type ProfileState = {
  ok: boolean
  message?: string
  error?: string
  fieldErrors?: Record<string, string>
} | null

/** Empty strings come back as null, so a cleared field really clears. */
const blankToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : v

const url = z
  .preprocess(blankToNull, z.string().url('Enter a full URL, starting https://').nullable())
  .optional()

const schema = z.object({
  name: z.string().trim().min(2, 'Your name is needed').max(120),
  mobile: z.preprocess(
    blankToNull,
    z
      .string()
      .regex(/^[6-9]\d{9}$/, 'A 10-digit Indian mobile number')
      .nullable()
  ),
  gender: z.preprocess(blankToNull, z.string().max(24).nullable()),
  addressLine: z.preprocess(blankToNull, z.string().max(240).nullable()),
  pincode: z.preprocess(
    blankToNull,
    z.string().regex(/^\d{6}$/, 'A 6-digit PIN code').nullable()
  ),
  city: z.preprocess(blankToNull, z.string().max(80).nullable()),
  state: z.preprocess(blankToNull, z.string().max(80).nullable()),
  facebookUrl: url,
  instagramUrl: url,
  linkedinUrl: url,
  youtubeUrl: url,
  twitterUrl: url,
})

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireAuth()

  const raw = Object.fromEntries(
    [
      'name', 'mobile', 'gender', 'addressLine', 'pincode', 'city', 'state',
      'facebookUrl', 'instagramUrl', 'linkedinUrl', 'youtubeUrl', 'twitterUrl',
    ].map((k) => [k, String(formData.get(k) ?? '')])
  )

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors }
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: parsed.data })
  } catch (e) {
    // A mobile number already on another account is the one collision worth
    // naming; anything else is a genuine fault.
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') && msg.includes('mobile')) {
      return {
        ok: false,
        error: 'That mobile number is already on another ArchFacing account.',
        fieldErrors: { mobile: 'Already in use' },
      }
    }
    console.error('Profile save failed:', e)
    return { ok: false, error: 'Your profile could not be saved. Please try again.' }
  }

  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Your profile has been saved.' }
}
