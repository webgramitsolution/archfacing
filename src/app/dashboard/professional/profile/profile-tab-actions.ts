'use server'

/**
 * The professional "Profile & Portfolio" editor — one save action per tab, so
 * each tab persists ONLY its own fields (a partial update never nulls another
 * tab's data). Everything writes to the existing models — `User`,
 * `ProfessionalProfile`, `CorporateProfile` — no duplicate profile system.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/guard'
import { uploadFile } from '@/lib/upload'

/** Upload a profile photo or company logo → saved on the User row. */
export async function uploadProfileImageAction(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await requireRole('PROFESSIONAL')
  const file = formData.get('file')
  const target = formData.get('target') === 'logo' ? 'logo' : 'photo'
  if (!(file instanceof File)) return { ok: false, error: 'No image was received.' }

  const result = await uploadFile({ userId: user.id, file, kind: 'IMAGE', aspect: 'free', folder: 'profile' })
  if (!result.ok) return { ok: false, error: result.error }

  await prisma.user.update({
    where: { id: user.id },
    data: target === 'logo' ? { logo: result.url } : { profilePhoto: result.url },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, url: result.url }
}

/** Clear a profile photo or logo. */
export async function removeProfileImageAction(target: 'photo' | 'logo'): Promise<{ ok: boolean }> {
  const user = await requireRole('PROFESSIONAL')
  await prisma.user.update({
    where: { id: user.id },
    data: target === 'logo' ? { logo: null } : { profilePhoto: null },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export type TabState = {
  ok: boolean
  message?: string
  error?: string
  fieldErrors?: Record<string, string>
} | null

const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)
const optUrl = z.preprocess(
  blankToNull,
  z.string().url('Enter a full URL, starting https://').nullable()
).optional()

function fail(error: string, fieldErrors?: Record<string, string>): TabState {
  return { ok: false, error, fieldErrors }
}
function readErrors(e: z.ZodError): Record<string, string> {
  const f: Record<string, string> = {}
  for (const i of e.issues) f[String(i.path[0] ?? 'form')] ??= i.message
  return f
}
async function ensureProfile(userId: string) {
  await prisma.professionalProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, designaType: 'DESIGNA' },
  })
}

// ─── Tab 1: Basic Information ──────────────────────────────
const basicSchema = z.object({
  name: z.string().trim().min(2, 'Your name is needed').max(120),
  professionType: z.preprocess(blankToNull, z.string().max(120).nullable()),
  shortBio: z.preprocess(blankToNull, z.string().max(300).nullable()),
  bio: z.preprocess(blankToNull, z.string().max(1000).nullable()),
  city: z.preprocess(blankToNull, z.string().max(80).nullable()),
  state: z.preprocess(blankToNull, z.string().max(80).nullable()),
  expertise: z.array(z.string().trim().min(1)).max(16),
})

export async function saveBasicAction(_p: TabState, formData: FormData): Promise<TabState> {
  const user = await requireRole('PROFESSIONAL')
  const expertise = formData.getAll('expertise').map((c) => String(c).trim()).filter(Boolean)
  const parsed = basicSchema.safeParse({
    name: formData.get('name'),
    professionType: formData.get('professionType'),
    shortBio: formData.get('shortBio'),
    bio: formData.get('bio'),
    city: formData.get('city'),
    state: formData.get('state'),
    expertise,
  })
  if (!parsed.success) return fail('Please check the highlighted fields.', readErrors(parsed.error))
  const d = parsed.data

  await ensureProfile(user.id)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: d.name, city: d.city, state: d.state },
    }),
    prisma.professionalProfile.update({
      where: { userId: user.id },
      data: { professionType: d.professionType, shortBio: d.shortBio, bio: d.bio, expertise: d.expertise },
    }),
  ])
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Basic information saved.' }
}

// ─── Tab 2: Contact Details ────────────────────────────────
const phone10 = z.preprocess(blankToNull, z.string().regex(/^[6-9]\d{9}$/, 'A 10-digit Indian mobile number').nullable())
const contactSchema = z.object({
  mobile: phone10,
  addressLine: z.preprocess(blankToNull, z.string().max(300).nullable()),
  pincode: z.preprocess(blankToNull, z.string().regex(/^\d{6}$/, 'A 6-digit PIN code').nullable()),
  altPhone: z.preprocess(blankToNull, z.string().regex(/^[6-9]\d{9}$/, 'A 10-digit number').nullable()),
  altEmail: z.preprocess(blankToNull, z.string().email('Enter a valid email').nullable()),
  website: optUrl,
  officeLandline: z.preprocess(blankToNull, z.string().max(20).nullable()),
  mapsLocation: z.preprocess(blankToNull, z.string().max(200).nullable()),
  whatsappNumber: z.preprocess(blankToNull, z.string().regex(/^[6-9]\d{9}$/, 'A 10-digit number').nullable()),
  preferredContactTime: z.preprocess(blankToNull, z.string().max(60).nullable()),
})

export async function saveContactAction(_p: TabState, formData: FormData): Promise<TabState> {
  const user = await requireRole('PROFESSIONAL')
  const parsed = contactSchema.safeParse({
    mobile: formData.get('mobile'),
    addressLine: formData.get('addressLine'),
    pincode: formData.get('pincode'),
    altPhone: formData.get('altPhone'),
    altEmail: formData.get('altEmail'),
    website: formData.get('website'),
    officeLandline: formData.get('officeLandline'),
    mapsLocation: formData.get('mapsLocation'),
    whatsappNumber: formData.get('whatsappNumber'),
    preferredContactTime: formData.get('preferredContactTime'),
  })
  if (!parsed.success) return fail('Please check the highlighted fields.', readErrors(parsed.error))
  const d = parsed.data
  const flag = (n: string) => formData.get(n) === '1'

  try {
    await ensureProfile(user.id)
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { mobile: d.mobile, addressLine: d.addressLine, pincode: d.pincode } }),
      prisma.professionalProfile.update({
        where: { userId: user.id },
        data: {
          altPhone: d.altPhone, altEmail: d.altEmail, website: d.website ?? undefined, officeLandline: d.officeLandline,
          mapsLocation: d.mapsLocation, whatsappNumber: d.whatsappNumber, preferredContactTime: d.preferredContactTime,
          allowCalls: flag('allowCalls'), allowEmails: flag('allowEmails'), allowWhatsapp: flag('allowWhatsapp'),
          showPhonePublic: flag('showPhonePublic'), showEmailPublic: flag('showEmailPublic'),
        },
      }),
    ])
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') && msg.includes('mobile'))
      return fail('That mobile number is already on another account.', { mobile: 'Already in use' })
    return fail('Could not save. Please try again.')
  }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Contact details saved.' }
}

// ─── Tab 3: Business Information ────────────────────────────
const yearNow = 2026
const businessSchema = z.object({
  firmName: z.preprocess(blankToNull, z.string().max(160).nullable()),
  businessType: z.preprocess(blankToNull, z.string().max(60).nullable()),
  yearEstablished: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().int().min(1900).max(yearNow).nullable()
  ),
  employeeCount: z.preprocess(blankToNull, z.string().max(30).nullable()),
  tagline: z.preprocess(blankToNull, z.string().max(100).nullable()),
  businessEmail: z.preprocess(blankToNull, z.string().email('Enter a valid email').nullable()),
  website: optUrl,
  primaryCategory: z.preprocess(blankToNull, z.string().max(120).nullable()),
  categories: z.array(z.string().trim().min(1)).max(16),
  serviceAreas: z.array(z.string().trim().min(1)).max(20),
  bio: z.preprocess(blankToNull, z.string().max(1000).nullable()),
})

export async function saveBusinessAction(_p: TabState, formData: FormData): Promise<TabState> {
  const user = await requireRole('PROFESSIONAL')
  const categories = formData.getAll('categories').map((c) => String(c).trim()).filter(Boolean)
  const serviceAreas = formData.getAll('serviceAreas').map((c) => String(c).trim()).filter(Boolean)
  const parsed = businessSchema.safeParse({
    firmName: formData.get('firmName'),
    businessType: formData.get('businessType'),
    yearEstablished: formData.get('yearEstablished'),
    employeeCount: formData.get('employeeCount'),
    tagline: formData.get('tagline'),
    businessEmail: formData.get('businessEmail'),
    website: formData.get('website'),
    primaryCategory: formData.get('primaryCategory'),
    categories,
    serviceAreas,
    bio: formData.get('bio'),
  })
  if (!parsed.success) return fail('Please check the highlighted fields.', readErrors(parsed.error))
  const d = parsed.data

  await ensureProfile(user.id)
  await prisma.professionalProfile.update({
    where: { userId: user.id },
    data: {
      firmName: d.firmName,
      businessType: d.businessType,
      yearEstablished: d.yearEstablished,
      employeeCount: d.employeeCount,
      tagline: d.tagline,
      businessEmail: d.businessEmail,
      website: d.website ?? null,
      // primary category first, then the sub-categories (deduped)
      categories: [...new Set([...(d.primaryCategory ? [d.primaryCategory] : []), ...d.categories])],
      serviceAreas: d.serviceAreas,
      bio: d.bio ?? undefined,
    },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Business information saved.' }
}

// ─── Tab 4: GST Details ────────────────────────────────────
const gstSchema = z.object({
  gstNumber: z.preprocess(
    blankToNull,
    z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/, 'Enter a valid 15-character GSTIN').nullable()
  ),
  panNumber: z.preprocess(
    blankToNull,
    z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid 10-character PAN').nullable()
  ),
  companyName: z.preprocess(blankToNull, z.string().max(200).nullable()),
  website: optUrl,
})

export async function saveGstAction(_p: TabState, formData: FormData): Promise<TabState> {
  const user = await requireRole('PROFESSIONAL')
  const parsed = gstSchema.safeParse({
    gstNumber: formData.get('gstNumber'),
    panNumber: formData.get('panNumber'),
    companyName: formData.get('companyName'),
    website: formData.get('website'),
  })
  if (!parsed.success) return fail('Please check the highlighted fields.', readErrors(parsed.error))

  const { gstNumber, panNumber, companyName, website } = parsed.data
  // GST/PAN live on the shared CorporateProfile row (a selling professional
  // fills the same record a Corporate does). Registering needs the full set —
  // GSTIN, PAN and the legal company name — because CorporateProfile requires
  // them; without all three we cannot open the row.
  if (gstNumber && panNumber && companyName) {
    await prisma.corporateProfile.upsert({
      where: { userId: user.id },
      update: { gstNumber, panNumber, companyName, website: website ?? undefined },
      create: { userId: user.id, gstNumber, panNumber, companyName, website: website ?? undefined },
    })
  } else if (gstNumber || panNumber || companyName) {
    return fail('To register GST, please fill the GSTIN, PAN and legal business name together.')
  }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'GST details saved.' }
}

// ─── Tab 5: Social Links ───────────────────────────────────
const SOCIAL_KEYS = ['website', 'linkedin', 'instagram', 'facebook', 'youtube', 'pinterest', 'behance', 'houzz'] as const
const socialSchema = z.object({
  website: optUrl, linkedin: optUrl, instagram: optUrl, facebook: optUrl,
  youtube: optUrl, pinterest: optUrl, behance: optUrl, houzz: optUrl,
})

export async function saveSocialAction(_p: TabState, formData: FormData): Promise<TabState> {
  const user = await requireRole('PROFESSIONAL')
  const parsed = socialSchema.safeParse(
    Object.fromEntries(SOCIAL_KEYS.map((k) => [k, formData.get(k)]))
  )
  if (!parsed.success) return fail('Please check the highlighted URLs.', readErrors(parsed.error))
  const d = parsed.data
  // a platform is hidden when its "Show on Profile" toggle is off
  const socialHidden = SOCIAL_KEYS.filter((k) => formData.get(`show_${k}`) !== '1')

  await ensureProfile(user.id)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        linkedinUrl: d.linkedin ?? null, instagramUrl: d.instagram ?? null, facebookUrl: d.facebook ?? null,
        youtubeUrl: d.youtube ?? null, pinterestUrl: d.pinterest ?? null, behanceUrl: d.behance ?? null, houzzUrl: d.houzz ?? null,
      },
    }),
    prisma.professionalProfile.update({
      where: { userId: user.id },
      data: { website: d.website ?? undefined, socialHidden },
    }),
  ])
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Social links saved.' }
}
