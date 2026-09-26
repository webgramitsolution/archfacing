'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { channelPrefs, dobFrom, extrasFrom, saveDocs } from '@/lib/wizard-save'

/** Interior/Landscape practitioners are Designi; everyone else Designa. */
function designaFor(type: string): 'DESIGNA' | 'DESIGNI' {
  return /interior|landscape/i.test(type) ? 'DESIGNI' : 'DESIGNA'
}

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid email').toLowerCase(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile').optional().or(z.literal('')),
  professionType: z.string().trim().min(1, 'Select a professional type').max(60),
  firmName: z.string().trim().max(120).optional(),
  experience: z.string().trim().optional(),
  coaNumber: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(600).optional(),
  categories: z.string().trim().optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  gender: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  pincode: z.union([z.literal(''), z.string().regex(/^\d{6}$/, 'The base PIN code must be 6 digits')]).optional(),
  portfolioUrl: z.union([z.literal(''), z.string().url('Enter a full portfolio URL (https://…)')]).optional(),
})

export type ProState = { ok: boolean; error?: string; note?: string; password?: string; created?: { name: string; email: string } } | null

export async function createProfessionalAction(_prev: ProState, formData: FormData): Promise<ProState> {
  const admin = await requirePermission('admin:users')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) if (typeof v === 'string') raw[k] = v.trim()

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Some fields need attention.' }
  const d = parsed.data

  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
  const exp = d.experience ? parseInt(d.experience, 10) : null
  const categories = (d.categories ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const sendCredentials = formData.get('sendCredentials') === 'on'
  const prefs = channelPrefs(formData)
  const extras = extrasFrom(formData, ['primaryCategory', 'subCategory', 'specialization', 'servicesOffered', 'portfolioUrl', 'country'], ['serviceCategories'])

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'PROFESSIONAL',
        status: 'PENDING_VERIFICATION',
        name: d.name,
        city: d.city || null,
        state: d.state || null,
        pincode: d.pincode || null,
        gender: d.gender || null,
        dateOfBirth: dobFrom(formData.get('dob')),
        addressLine: d.address || null,
        profileExtras: Object.keys(extras).length ? (extras as Prisma.InputJsonValue) : undefined,
        notificationPrefs: prefs ?? undefined,
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
        professionalProfile: {
          create: {
            designaType: designaFor(d.professionType),
            tier: 'PROFESSIONAL',
            professionType: d.professionType,
            firmName: d.firmName || null,
            experience: exp != null && !isNaN(exp) ? exp : null,
            coaNumber: d.coaNumber || null,
            bio: d.bio || null,
            categories,
            isVerified: false,
            isFeatured: formData.get('featured') === 'on',
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: 'PROFESSIONAL_CREATED', entityType: 'User', entityId: user.id, after: { email: d.email, professionType: d.professionType } },
    })

    const failed = await saveDocs(formData, user.id, admin.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailed = false
    if (sendCredentials) {
      try {
        const mail = employeeCredentialsEmail(d.name, d.email, password, `${appUrl}/login`)
        emailed = (await sendMail({ to: d.email, ...mail })).sent
      } catch (e) {
        console.error('Professional credentials email failed:', e)
      }
    }

    revalidatePath('/admin/professionals')
    return {
      ok: true,
      created: { name: d.name, email: d.email },
      // Not emailed (switched off, or mail not configured) → show it once.
      password: emailed ? undefined : password,
      note: failed.length ? `Some documents were not saved — ${failed.join('; ')}. Add them from the account page.` : undefined,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const t = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return { ok: false, error: t.includes('mobile') ? 'This mobile is already on another account.' : 'An account with this email already exists.' }
    }
    console.error('Professional create failed:', e)
    return { ok: false, error: 'Could not create the professional. Please try again.' }
  }
}
