'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/guard'
import { getVerificationConfig, VerificationConfigSchema, VERIFICATION_KEY } from '@/lib/verification-config'
import { clearSettingsCache, getSetting } from '@/lib/settings'
import { sendMail, employeeCredentialsEmail } from '@/lib/mailer'
import { channelPrefs, extrasFrom, saveDocs } from '@/lib/wizard-save'

const schema = z.object({
  accountType: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  email: z.string().trim().email('Enter a valid email').toLowerCase(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile').optional().or(z.literal('')),
  gender: z.string().trim().max(20).optional(),
  dob: z.string().trim().optional(),
  city: z.string().trim().max(80).optional(),
  buyerType: z.string().trim().max(40).optional(),

  companyName: z.string().trim().max(150).optional(),
  tradeName: z.string().trim().max(150).optional(),
  gstNumber: z.string().trim().max(30).optional(),
  panNumber: z.string().trim().max(20).optional(),
  companyType: z.string().trim().max(60).optional(),
  industry: z.string().trim().max(80).optional(),
  companySize: z.string().trim().max(60).optional(),
  annualTurnover: z.string().trim().max(60).optional(),
  website: z.string().trim().max(150).optional(),
  yearEstablished: z.string().trim().max(10).optional(),
  businessDescription: z.string().trim().max(600).optional(),

  buyingPurpose: z.string().trim().max(60).optional(),
  orderValueRange: z.string().trim().max(60).optional(),
  specialRequirements: z.string().trim().max(400).optional(),
  billingAddress: z.string().trim().max(300).optional(),

  assignedRm: z.string().trim().max(80).optional(),
  pactArea: z.string().trim().max(80).optional(),
  accStatus: z.string().trim().optional(),
})

export type BuyerState =
  | { ok: boolean; error?: string; note?: string; password?: string; created?: { name: string; email: string } }
  | null

export async function createBuyerAction(_prev: BuyerState, formData: FormData): Promise<BuyerState> {
  const admin = await requirePermission('admin:users')

  const raw: Record<string, string> = {}
  const categories: string[] = []
  const brands: string[] = []
  for (const [k, v] of formData.entries()) {
    if (typeof v !== 'string') continue
    if (k === 'productCategories') categories.push(v)
    else if (k === 'preferredBrands') brands.push(v)
    else raw[k] = v.trim()
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Some fields need attention.' }
  const d = parsed.data

  if (d.accountType === 'COMPANY' && !d.companyName) {
    return { ok: false, error: 'Enter the company / organization name.' }
  }

  const password = `Af${randomBytes(4).toString('hex')}@${randomBytes(2).toString('hex')}`
  const dob = d.dob ? new Date(d.dob) : null
  const status = d.accStatus === 'inactive' ? 'SUSPENDED' : 'ACTIVE'
  const sendCredentials = formData.get('sendCredentials') === 'on'
  const prefs = channelPrefs(formData)
  // Brands typed as free text join any ticked ones.
  const typedBrands = String(formData.get('preferredBrandsText') ?? '').split(',').map((b) => b.trim()).filter(Boolean)
  const allBrands = [...new Set([...brands, ...typedBrands])].slice(0, 20)
  const pin = (formData.get('pactArea') as string | null)?.trim() ?? ''
  if (pin && !/^\d{6}$/.test(pin)) return { ok: false, error: 'The base PIN code must be 6 digits.' }
  const extras = extrasFrom(formData, [
    'nationality', 'bio', 'contactName', 'contactDesignation', 'contactEmail', 'contactMobile',
    'contact2Name', 'contact2Designation', 'contact2Email', 'contact2Mobile',
    'billingAddress2', 'billingCity', 'billingState', 'billingPincode', 'internalNotes',
  ])

  try {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        emailVerified: new Date(),
        mobile: d.mobile || null,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'CLIENT',
        status,
        name: d.name,
        gender: d.gender || null,
        dateOfBirth: dob && !isNaN(dob.getTime()) ? dob : null,
        city: d.city || null,
        pincode: pin || null,
        profileExtras: Object.keys(extras).length ? (extras as Prisma.InputJsonValue) : undefined,
        notificationPrefs: prefs ?? undefined,
        acquisitionSource: 'Direct',
        mustChangePassword: true,
        termsAcceptedAt: new Date(),
        createdById: admin.id,
        buyerProfile: {
          create: {
            accountType: d.accountType,
            buyerType: d.buyerType || null,
            industry: d.industry || null,
            companyName: d.accountType === 'COMPANY' ? d.companyName || null : null,
            tradeName: d.tradeName || null,
            gstNumber: d.gstNumber || null,
            panNumber: d.panNumber || null,
            companyType: d.companyType || null,
            companySize: d.companySize || null,
            annualTurnover: d.annualTurnover || null,
            website: d.website || null,
            yearEstablished: d.yearEstablished || null,
            businessDescription: d.businessDescription || null,
            productCategories: categories,
            buyingPurpose: d.buyingPurpose || null,
            orderValueRange: d.orderValueRange || null,
            preferredBrands: allBrands,
            specialRequirements: d.specialRequirements || null,
            billingAddress: d.billingAddress || null,
            assignedRm: d.assignedRm || null,
            pactArea: pin || null,
            isVerified: false,
            // "Pending Verification" puts the account straight into the queue.
            submittedAt: d.accStatus === 'pending' ? new Date() : null,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: { actorId: admin.id, action: 'BUYER_CREATED', entityType: 'User', entityId: user.id, after: { email: d.email, accountType: d.accountType, company: d.companyName ?? null } },
    })

    const failed = await saveDocs(formData, user.id, admin.id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailed = false
    if (sendCredentials) {
      try {
        const mail = employeeCredentialsEmail(d.name, d.email, password, `${appUrl}/login`)
        emailed = (await sendMail({ to: d.email, ...mail })).sent
      } catch (e) {
        console.error('Buyer credentials email failed:', e)
      }
    }

    revalidatePath('/admin/visitors')
    revalidatePath('/admin/visitors/verification')
    return {
      ok: true,
      created: { name: d.accountType === 'COMPANY' ? d.companyName || d.name : d.name, email: d.email },
      password: emailed ? undefined : password,
      note: failed.length ? `Some documents were not saved — ${failed.join('; ')}. Add them from the account page.` : undefined,
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const t = (e.meta?.target as string[] | undefined)?.join(', ') ?? ''
      return { ok: false, error: t.includes('mobile') ? 'This mobile is already on another account.' : 'An account with this email already exists.' }
    }
    console.error('Buyer create failed:', e)
    return { ok: false, error: 'Could not create the buyer / client. Please try again.' }
  }
}

// ═══════════════════════════════════════════════════════════
//  Verification queue — approve / send for review / reject
// ═══════════════════════════════════════════════════════════

const VERIFY_STATUS = z.enum(['VERIFIED', 'UNDER_REVIEW', 'REJECTED'])

/**
 * The wording each buyer receives is an admin-editable setting — edited on
 * /admin/visitors/verification/settings (or /admin/settings, Verification
 * group) and read here at send time, so a saved change is what goes out.
 */
const VERIFY_KEYS: Record<z.infer<typeof VERIFY_STATUS>, { prefix: 'verification.approved' | 'verification.review' | 'verification.rejected'; audit: string }> = {
  VERIFIED: { prefix: 'verification.approved', audit: 'BUYER_VERIFIED' },
  UNDER_REVIEW: { prefix: 'verification.review', audit: 'BUYER_UNDER_REVIEW' },
  REJECTED: { prefix: 'verification.rejected', audit: 'BUYER_REJECTED' },
}

async function verifyCopy(status: z.infer<typeof VERIFY_STATUS>) {
  const { prefix, audit } = VERIFY_KEYS[status]
  const [title, body] = await Promise.all([
    getSetting<string>(`${prefix}.subject`),
    getSetting<string>(`${prefix}.body`),
  ])
  return { title: String(title), body: String(body), audit }
}

/**
 * The queue's bulk bar and per-row buttons both post here.
 *
 * Bulk: `status` + one or more `ids` checkboxes. Row: a single `row` value of
 * `<userId>:<STATUS>`, so each row's buttons work without selecting anything.
 * Only CLIENT accounts that actually have a buyer profile are touched — an id
 * from anywhere else is ignored, never trusted.
 */
export async function setBuyerVerificationAction(formData: FormData): Promise<void> {
  const admin = await requirePermission('admin:users')

  let ids: string[]
  let statusRaw: string
  const row = formData.get('row')
  if (typeof row === 'string' && row.includes(':')) {
    const [id, st] = row.split(':')
    ids = [id]
    statusRaw = st
  } else {
    ids = formData.getAll('ids').filter((v): v is string => typeof v === 'string')
    statusRaw = String(formData.get('status') ?? '')
  }
  // Where to come back to — only ever a path on this queue.
  const back = String(formData.get('back') ?? '')
  const backTo = back.startsWith('/admin/visitors/verification') ? back.split('#')[0] : '/admin/visitors/verification'
  const finish = (notice: string): never => {
    revalidatePath('/admin/visitors/verification')
    revalidatePath('/admin/visitors')
    const sep = backTo.includes('?') ? '&' : '?'
    redirect(`${backTo.replace(/[?&]notice=[^&]*/g, '')}${sep}notice=${encodeURIComponent(notice)}`)
  }

  const status = VERIFY_STATUS.safeParse(statusRaw)
  ids = [...new Set(ids)].filter((id) => /^[a-z0-9]{10,40}$/i.test(id)).slice(0, 200)
  if (!status.success || ids.length === 0) finish('Select at least one account first.')
  const next = status.data!

  const cfg = await getVerificationConfig()
  const found = await prisma.user.findMany({
    where: { id: { in: ids }, role: 'CLIENT', deletedAt: null, buyerProfile: { isNot: null } },
    select: { id: true, name: true, email: true, buyerProfile: { select: { verificationStatus: true, accountType: true, documentsCount: true } } },
  })

  // Minimum documents (Verification Settings → rules) gate an approval.
  const minFor = (t?: string | null) => (t === 'COMPANY' ? cfg.rules.BUYER_COMPANY.minDocs : cfg.rules.BUYER_INDIVIDUAL.minDocs)
  const short = next === 'VERIFIED' ? found.filter((u) => (u.buyerProfile?.documentsCount ?? 0) < minFor(u.buyerProfile?.accountType)) : []
  const targets = found.filter((u) => !short.includes(u))
  if (targets.length === 0) {
    finish(short.length
      ? `Not approved — ${short.length === 1 ? short[0].name + ' has' : short.length + ' accounts have'} fewer documents than the settings require.`
      : 'Nothing changed.')
  }

  const copy = await verifyCopy(next)
  await prisma.$transaction([
    prisma.buyerProfile.updateMany({
      where: { userId: { in: targets.map((t) => t.id) } },
      data: { verificationStatus: next, isVerified: next === 'VERIFIED' },
    }),
    // "Notify user on status change" — Verification Settings → workflow.
    ...(cfg.notifyUser
      ? [prisma.notification.createMany({
          data: targets.map((t) => ({ userId: t.id, type: copy.audit, title: copy.title, body: copy.body, link: '/dashboard/settings' })),
        })]
      : []),
    prisma.auditLog.createMany({
      data: targets.map((t) => ({
        actorId: admin.id,
        action: copy.audit,
        entityType: 'BuyerProfile',
        entityId: t.id,
        before: { verificationStatus: t.buyerProfile?.verificationStatus ?? 'PENDING' },
        after: { verificationStatus: next },
      })),
    }),
  ])

  // "Send email notifications" — Verification Settings → workflow.
  if (cfg.emailUser) {
    await Promise.all(targets.map((t) =>
      sendMail({
        to: t.email,
        subject: copy.title,
        text: `Hello ${t.name},\n\n${copy.body}\n\n— ArchFacing`,
        html: `<p>Hello ${t.name.replace(/[<>&]/g, '')},</p><p>${copy.body.replace(/[<>&]/g, '')}</p><p>— ArchFacing</p>`,
      }).catch(() => null),
    ))
  }

  const verb = { VERIFIED: 'approved', UNDER_REVIEW: 'sent for review', REJECTED: 'rejected' }[next]
  finish(`${targets.length} account${targets.length === 1 ? '' : 's'} ${verb}.${short.length ? ` ${short.length} skipped — not enough documents.` : ''}`)
}

// ═══════════════════════════════════════════════════════════
//  Verification messages — the three notices the queue sends
// ═══════════════════════════════════════════════════════════

const MESSAGE_KEYS = [
  'verification.approved.subject', 'verification.approved.body',
  'verification.review.subject', 'verification.review.body',
  'verification.rejected.subject', 'verification.rejected.body',
] as const

export type VerificationMessagesState = { ok: boolean; error?: string } | null

/**
 * Saves ONLY the six verification-message keys. The general
 * saveSettingsAction writes every setting at once, so posting a partial form
 * to it would blank the rest — this one cannot touch anything else.
 */
export async function saveVerificationMessagesAction(
  _prev: VerificationMessagesState,
  formData: FormData,
): Promise<VerificationMessagesState> {
  const admin = await requirePermission('admin:users')

  const values: Record<string, string> = {}
  for (const key of MESSAGE_KEYS) {
    const raw = formData.get(key)
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (!text) return { ok: false, error: 'Every title and message needs some text.' }
    const max = key.endsWith('.subject') ? 120 : 600
    if (text.length > max) return { ok: false, error: `Keep each ${key.endsWith('.subject') ? 'title' : 'message'} under ${max} characters.` }
    values[key] = text
  }

  await prisma.$transaction([
    ...MESSAGE_KEYS.map((key) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: values[key] },
        update: { value: values[key] },
      }),
    ),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: 'SETTINGS_UPDATED', entityType: 'SiteSetting', entityId: 'verification.messages', after: values },
    }),
  ])
  clearSettingsCache()
  revalidatePath('/admin/visitors/verification/settings')
  revalidatePath('/admin/settings')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Verification Settings — general, rules, documents, workflow
// ═══════════════════════════════════════════════════════════

export type VerificationConfigState = { ok: boolean; error?: string } | null

/**
 * Saves the whole verification config in one row. Every value is validated
 * against VerificationConfigSchema, and the default reviewer must be an
 * active staff member.
 */
export async function saveVerificationConfigAction(
  _prev: VerificationConfigState,
  fd: FormData,
): Promise<VerificationConfigState> {
  const admin = await requirePermission('admin:users')
  const on = (k: string) => fd.get(k) === 'on'
  const num = (k: string) => Number(fd.get(k) ?? 0)

  let documentTypes: unknown = []
  try {
    documentTypes = JSON.parse(String(fd.get('documentTypes') ?? '[]'))
  } catch {
    return { ok: false, error: 'The document list could not be read. Reload and try again.' }
  }

  const reviewer = String(fd.get('defaultReviewerId') ?? '')
  const candidate = {
    enabled: on('enabled'),
    rules: {
      PROFESSIONAL: { required: on('req_PROFESSIONAL') },
      STUDENT: { required: on('req_STUDENT') },
      CONSULTANT: { required: on('req_CONSULTANT') },
      BMF: { required: on('req_BMF') },
      CORPORATE: { required: on('req_CORPORATE') },
      BUYER_INDIVIDUAL: { minDocs: num('min_BUYER_INDIVIDUAL') },
      BUYER_COMPANY: { minDocs: num('min_BUYER_COMPANY') },
    },
    notifyUser: on('notifyUser'),
    emailUser: on('emailUser'),
    defaultReviewerId: reviewer || null,
    escalateAfterHours: num('escalateAfterHours'),
    escalateTo: String(fd.get('escalateTo') ?? 'SUPER_ADMIN'),
    revalidateMonths: num('revalidateMonths'),
    reminderDays: num('reminderDays'),
    documentTypes,
  }
  const parsed = VerificationConfigSchema.safeParse(candidate)
  if (!parsed.success) {
    const i = parsed.error.issues[0]
    return { ok: false, error: i ? `${i.path.join(' › ')}: ${i.message}` : 'Some values are not valid.' }
  }
  const names = parsed.data.documentTypes.map((d) => d.name.toLowerCase())
  if (new Set(names).size !== names.length) return { ok: false, error: 'Two document types have the same name.' }

  if (parsed.data.defaultReviewerId) {
    const ok = await prisma.user.count({
      where: { id: parsed.data.defaultReviewerId, role: { in: ['RM_EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', deletedAt: null },
    })
    if (!ok) return { ok: false, error: 'The default reviewer must be an active staff member.' }
  }

  const before = await prisma.siteSetting.findUnique({ where: { key: VERIFICATION_KEY } })
  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: VERIFICATION_KEY },
      create: { key: VERIFICATION_KEY, value: parsed.data },
      update: { value: parsed.data },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id, action: 'SETTINGS_UPDATED', entityType: 'SiteSetting', entityId: VERIFICATION_KEY,
        before: before?.value ?? Prisma.JsonNull, after: parsed.data,
      },
    }),
  ])
  revalidatePath('/admin/visitors/verification/settings')
  revalidatePath('/admin/visitors/verification')
  return { ok: true }
}
