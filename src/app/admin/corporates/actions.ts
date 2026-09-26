'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma, type Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { extrasFrom, saveDocs } from '@/lib/wizard-save'

const schema = z.object({
  companyName: z.string().trim().min(2, 'Enter the company name').max(150),
  companyType: z.enum(['CORPORATE', 'BMF']).default('CORPORATE'),
  email: z.string().trim().email('Enter a valid business email').toLowerCase(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone').optional().or(z.literal('')),
  website: z.string().trim().max(200).optional(),
  yearFounded: z.string().trim().optional(),
  gstNumber: z.string().trim().max(20).optional(),
  panNumber: z.string().trim().max(15).optional(),
  categories: z.string().trim().optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  addressLine: z.string().trim().max(200).optional(),
  pincode: z.string().trim().max(6).optional(),
})

export type CorpState = { ok: boolean; error?: string; note?: string; password?: string; created?: { name: string; email: string } } | null

export async function createCorporateAction(_prev: CorpState, formData: FormData): Promise<CorpState> {
  const admin = await requirePermission('admin:users')

  const raw: Record<string, string> = {}
  for (const [k, v] of formData.entries()) if (typeof v === 'string') raw[k] = v.trim()

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Some fields need attention.' }
  const d = parsed.data

  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
  const categories = (d.categories ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const year = d.yearFounded ? parseInt(d.yearFounded, 10) : null
  const incorporationDate = year && !isNaN(year) ? new Date(Date.UTC(year, 0, 1)) : null
  const isBmf = d.companyType === 'BMF'
  if (formData.get('confirm') !== 'on') return { ok: false, error: 'Tick the confirmation before creating the account.' }
  const sendCredentials = formData.get('sendCredentials') === 'on'
  const same = formData.get('opsSame') === 'on'
  const extras = extrasFrom(formData, [
    'brandName', 'companySize', 'tagline', 'primaryIndustry', 'secondaryIndustry', 'cinNumber', 'legalEntity', 'registrationNumber',
    'annualTurnover', 'overview', 'addressLine2', 'mapLocation',
    'contactName', 'contactDesignation', 'contactEmail', 'contactMobile', 'contact2Name', 'contact2Designation', 'contact2Email', 'contact2Mobile',
    ...(same ? [] : ['opsAddress1', 'opsAddress2', 'opsState', 'opsCity', 'opsPincode']),
  ])
  if (same) extras.operationalAddress = 'Same as registered office'

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(password, 12),
        role: (isBmf ? 'BMF' : 'CORPORATE') as Role,
        status: 'PENDING_VERIFICATION',
        name: d.companyName,
        city: d.city || null,
        state: d.state || null,
        addressLine: d.addressLine || null,
        pincode: d.pincode || null,
        profileExtras: Object.keys(extras).length ? (extras as Prisma.InputJsonValue) : undefined,
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
        ...(isBmf
          ? {
              bmfProfile: {
                create: {
                  designaType: 'DESIGNA',
                  businessName: d.companyName,
                  gstNumber: d.gstNumber || null,
                  productCategories: categories,
                  isVerified: false,
                },
              },
            }
          : {
              corporateProfile: {
                create: {
                  companyName: d.companyName,
                  gstNumber: d.gstNumber || '',
                  panNumber: d.panNumber || '',
                  incorporationDate,
                  website: d.website || null,
                  productCategories: categories,
                  isVerified: false,
                },
              },
            }),
      },
    })

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: 'CORPORATE_CREATED', entityType: 'User', entityId: user.id, after: { email: d.email, type: d.companyType } },
    })

    const failed = await saveDocs(formData, user.id, admin.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailed = false
    if (sendCredentials) {
      try {
        const mail = employeeCredentialsEmail(d.companyName, d.email, password, `${appUrl}/login`)
        emailed = (await sendMail({ to: d.email, ...mail })).sent
      } catch (e) {
        console.error('Corporate credentials email failed:', e)
      }
    }

    revalidatePath('/admin/corporates')
    return {
      ok: true,
      created: { name: d.companyName, email: d.email },
      password: emailed ? undefined : password,
      note: failed.length ? `Some documents were not saved — ${failed.join('; ')}. Add them from the account page.` : undefined,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const t = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return { ok: false, error: t.includes('mobile') ? 'This phone is already on another account.' : 'An account with this email already exists.' }
    }
    console.error('Corporate create failed:', e)
    return { ok: false, error: 'Could not create the corporate. Please try again.' }
  }
}
