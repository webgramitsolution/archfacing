'use server'

/**
 * The Create Advertisement wizard — everything it writes.
 *
 * The campaign row is created at step 1 and updated after every step, which is
 * what makes "leave and come back" work: the draft on the Drafts screen IS the
 * campaign, not a copy of it.
 *
 * Two rules hold this together:
 *
 *  · **Ownership is checked on every call.** `owned()` refuses a campaign that
 *    is not the caller's, so no step action can touch another advertiser's
 *    row even if the id is guessed (§26).
 *  · **Status is never taken from the client.** The wizard sends field values;
 *    the transition to PENDING_REVIEW happens here, after the whole campaign
 *    has been validated. A browser cannot post its way to an approved ad.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/upload'
import { AD_ROLES, isSafeUrl, bookingTotal } from '@/lib/ads'
import { placementAvailability, type PlacementAvailability } from '@/lib/ad-marketplace'
import { limitsAcross, overLimit, parseSize } from '@/lib/ad-creative'
import { recordAdEvent } from '@/lib/ad-audit'
import { Prisma, type AdStatus } from '@prisma/client'

type Fail = { ok: false; error: string }
type Ok<T> = { ok: true } & T

// ═══════════════════════════════════════════════════════════
//  Guards
// ═══════════════════════════════════════════════════════════

async function advertiser() {
  const user = await requireAuth()
  if (!AD_ROLES.includes(user.role)) {
    throw new Error('Advertising is open to Corporate and BMF accounts only.')
  }
  return user
}

/** The campaign, if it belongs to this advertiser and can still be edited. */
async function owned(id: string, userId: string) {
  const row = await prisma.adBooking.findFirst({
    where: { id, advertiserId: userId },
    select: { id: true, status: true },
  })
  if (!row) return null
  return row
}

/** Which states the advertiser may still edit. */
const EDITABLE: AdStatus[] = ['DRAFT', 'REJECTED', 'CHANGES_REQUESTED']

// ═══════════════════════════════════════════════════════════
//  Step 1 — campaign details
// ═══════════════════════════════════════════════════════════

const step1 = z.object({
  title: z.string().trim().min(3, 'Give the campaign a name of at least 3 characters').max(100),
  description: z.string().trim().max(300).optional(),
  adTypeSlug: z.string().trim().min(1, 'Choose an advertisement type'),
  objective: z.string().trim().max(80).optional(),
  brandName: z.string().trim().max(120).optional(),
})

/**
 * Creates the campaign on the first Continue, updates it on every later one.
 *
 * Returns the id so the wizard can put `?draft=<id>` in the URL — from that
 * moment a reload, or a return from the Drafts screen, lands on the same row.
 */
export async function saveCampaignStepAction(
  id: string | null,
  input: unknown
): Promise<Ok<{ id: string }> | Fail> {
  const user = await advertiser()

  const parsed = step1.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the campaign details.' }
  }
  const d = parsed.data

  const type = await prisma.adType.findUnique({ where: { slug: d.adTypeSlug } })
  if (!type || !type.isActive) {
    return { ok: false, error: 'That advertisement type is not available.' }
  }

  const data = {
    title: d.title,
    description: d.description || null,
    objective: d.objective || null,
    adTypeId: type.id,
    // Falls back to the account name so a campaign always says who it is for.
    brandName: d.brandName || user.name,
  }

  if (id) {
    const row = await owned(id, user.id)

    if (row) {
      if (!EDITABLE.includes(row.status)) {
        return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
      }
      await prisma.adBooking.update({ where: { id }, data })
      revalidatePath('/dashboard/advertisements/drafts')
      return { ok: true, id }
    }

    /*
     * The id no longer names a campaign — so save the work as a new one.
     *
     * This happens for real: the draft is deleted from the Drafts screen in
     * another tab, or from an admin action, while the wizard still holds its
     * id in `?draft=`. Returning an error there was a dead end — every later
     * Continue sent the same dead id, so the reader could not get off step 1
     * and could not reach step 2 either, with no way out but to notice the
     * query string and edit it by hand. Falling through to the create below
     * keeps what they typed and the wizard rewrites the URL with the new id.
     */
  }

  const created = await prisma.adBooking.create({
    data: {
      ...data,
      advertiserId: user.id,
      status: 'DRAFT',
    },
    select: { id: true },
  })

  await recordAdEvent({
    actorId: user.id,
    campaignId: created.id,
    action: "AD_CAMPAIGN_CREATED",
    after: { title: d.title, type: d.adTypeSlug },
  })

  revalidatePath("/dashboard/advertisements/drafts")
  return { ok: true, id: created.id }
}

// ═══════════════════════════════════════════════════════════
//  Step 2 — creative
// ═══════════════════════════════════════════════════════════

/**
 * Uploads one creative file.
 *
 * `aspect: 'free'` because a banner is 1620×450 and a sidebar is 300×600 —
 * neither is 5:3, and the placement decides the shape, not the uploader.
 * Everything else `uploadFile` enforces still applies: the size cap, the
 * magic-byte check, the quota, and the re-encode that strips EXIF.
 */
export async function uploadCreativeAction(
  formData: FormData
): Promise<Ok<{ url: string; key: string; measured: CreativeMeasurement }> | Fail> {
  const user = await advertiser()

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

  const result = await uploadFile({
    userId: user.id,
    file,
    kind: 'IMAGE',
    aspect: 'free',
    folder: 'ads',
    // §14 — the wizard reports the fit to the advertiser and the previews
    // extend the artwork with its own colours, so both need this measured.
    analysePalette: true,
  })

  if (!result.ok) return { ok: false, error: result.error }
  return {
    ok: true,
    url: result.url,
    key: result.key,
    measured: {
      width: result.width ?? null,
      height: result.height ?? null,
      palette: result.palette ?? null,
    },
  }
}

/**
 * What the upload measured, carried back through the client.
 *
 * The browser cannot invent these — they come from `uploadCreativeAction`,
 * which read them off the file with sharp — but they travel through the
 * client on their way to being stored, so they are validated here like any
 * other input rather than trusted.
 */
const palette = z.object({
  left: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  right: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  dominant: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  isDark: z.boolean(),
})

export type CreativeMeasurement = {
  width: number | null
  height: number | null
  palette: z.infer<typeof palette> | null
}

const measured = {
  imageWidth: z.number().int().positive().max(20000).nullish(),
  imageHeight: z.number().int().positive().max(20000).nullish(),
  imagePalette: palette.nullish(),
  mobileImageWidth: z.number().int().positive().max(20000).nullish(),
  mobileImageHeight: z.number().int().positive().max(20000).nullish(),
  mobileImagePalette: palette.nullish(),
}

const step2 = z.object({
  imageUrl: z.string().trim().min(1, 'Upload a desktop creative'),
  imageKey: z.string().trim().optional(),
  mobileImageUrl: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  /*
   * The hard caps here are the ceiling, not the rule.
   *
   * The rule is placement-aware — a 728 x 90 bar takes a 25-character
   * headline, a 1200 x 300 banner takes 40 — and it is enforced at
   * submission, where every booked placement is known. See
   * `limitsAcross` in lib/ad-creative.ts and `submitCampaignAction`.
   */
  headline: z.string().trim().min(2, 'Write a headline').max(100),
  tagline: z.string().trim().max(100).optional(),
  ctaText: z.string().trim().min(1, 'Write the button text').max(50),
  targetUrl: z.string().trim().min(1, 'Add the landing page address'),
  ...measured,
})

export async function saveCreativeStepAction(id: string, input: unknown): Promise<Ok<object> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(row.status)) {
    return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
  }

  const parsed = step2.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the creative.' }
  }
  const d = parsed.data

  // The landing page is rendered into an anchor that visitors click, so a
  // `javascript:` URL here would run for everyone who sees the ad.
  if (!isSafeUrl(d.targetUrl)) {
    return { ok: false, error: 'The landing page must be a full http:// or https:// address.' }
  }

  await prisma.adBooking.update({
    where: { id },
    data: {
      imageUrl: d.imageUrl,
      imageKey: d.imageKey || null,
      // What the files ARE, not just where they are. Every preview reads
      // these to fit the artwork without cropping it and to generate the
      // backdrop from the artwork's own colours.
      imageWidth: d.imageWidth ?? null,
      imageHeight: d.imageHeight ?? null,
      imagePalette: (d.imagePalette ?? null) as Prisma.InputJsonValue,
      mobileImageUrl: d.mobileImageUrl || null,
      mobileImageWidth: d.mobileImageWidth ?? null,
      mobileImageHeight: d.mobileImageHeight ?? null,
      mobileImagePalette: (d.mobileImagePalette ?? null) as Prisma.InputJsonValue,
      logoUrl: d.logoUrl || null,
      headline: d.headline,
      tagline: d.tagline || null,
      ctaText: d.ctaText,
      targetUrl: d.targetUrl,
    },
  })

  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Step 3 — placement
// ═══════════════════════════════════════════════════════════

/**
 * Saves the chosen placements.
 *
 * The first is the campaign's primary placement; the rest go into
 * `AdCampaignPlacement`, which is what lets one campaign run in several places
 * at once. Prices are read from the placement rows here — a client that posts
 * its own price is ignored.
 */
export async function savePlacementStepAction(
  id: string,
  slugs: string[]
): Promise<Ok<{ total: number }> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(row.status)) {
    return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
  }

  if (!Array.isArray(slugs) || slugs.length === 0) {
    return { ok: false, error: 'Choose at least one placement.' }
  }

  const placements = await prisma.adPlacement.findMany({
    where: { slug: { in: slugs }, isActive: true },
  })
  if (placements.length !== slugs.length) {
    return { ok: false, error: 'One of those placements is no longer available.' }
  }

  // Keep the advertiser's own ordering: the first tile they picked is the one
  // the campaign is filed under.
  const ordered = slugs
    .map((s) => placements.find((p) => p.slug === s))
    .filter((p): p is (typeof placements)[number] => Boolean(p))

  const [primary, ...extra] = ordered

  await prisma.$transaction(async (tx) => {
    await tx.adBooking.update({ where: { id }, data: { placementId: primary.id } })
    await tx.adCampaignPlacement.deleteMany({ where: { bookingId: id } })
    if (extra.length) {
      await tx.adCampaignPlacement.createMany({
        data: extra.map((p, i) => ({
          bookingId: id,
          placementId: p.id,
          price: p.weeklyPrice,
          priority: i + 2,
        })),
      })
    }
  })

  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true, total: ordered.reduce((sum, p) => sum + Number(p.weeklyPrice), 0) }
}

// ═══════════════════════════════════════════════════════════
//  Step 4 — audience
// ═══════════════════════════════════════════════════════════

const step4 = z.object({
  country: z.string().trim().default('India'),
  states: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  pincodes: z.array(z.string()).default([]),
  pactAreas: z.array(z.string()).default([]),
  productCategories: z.array(z.string()).default([]),
  projectCategories: z.array(z.string()).default([]),
  professionalCategories: z.array(z.string()).default([]),
  audienceRoles: z.array(z.string()).default([]),
})

export async function saveAudienceStepAction(id: string, input: unknown): Promise<Ok<object> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(row.status)) {
    return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
  }

  const parsed = step4.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Check the audience settings.' }
  }
  const d = parsed.data

  if (d.audienceRoles.length === 0) {
    return { ok: false, error: 'Choose at least one audience type.' }
  }

  await prisma.adTargeting.upsert({
    where: { bookingId: id },
    create: { bookingId: id, ...d },
    update: d,
  })

  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Step 5 — schedule
// ═══════════════════════════════════════════════════════════

const step5 = z.object({
  startsAt: z.string().min(1, 'Choose a start date'),
  endsAt: z.string().min(1, 'Choose an end date'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export async function saveScheduleStepAction(id: string, input: unknown): Promise<Ok<{ days: number }> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(row.status)) {
    return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
  }

  const parsed = step5.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the dates.' }
  }

  const startsAt = new Date(`${parsed.data.startsAt}T00:00:00`)
  const endsAt = new Date(`${parsed.data.endsAt}T00:00:00`)

  if (Number.isNaN(+startsAt) || Number.isNaN(+endsAt)) {
    return { ok: false, error: 'Those dates could not be read.' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (startsAt < today) return { ok: false, error: 'The start date cannot be in the past.' }
  if (endsAt <= startsAt) return { ok: false, error: 'The end date must be after the start date.' }

  const days = Math.round((+endsAt - +startsAt) / 86_400_000)

  // §13 — the placements have to be free for the whole window. Checked here as
  // well as in the step's own preview, so a client that ignored the preview
  // cannot save a clashing schedule.
  const current = await prisma.adBooking.findUnique({
    where: { id },
    select: {
      placement: { select: { slug: true } },
      extraPlacements: { select: { placement: { select: { slug: true } } } },
    },
  })

  const slugs = [
    ...(current?.placement ? [current.placement.slug] : []),
    ...(current?.extraPlacements.map((e) => e.placement.slug) ?? []),
  ]

  if (slugs.length) {
    const rows = await placementAvailability(slugs, startsAt, endsAt, id)
    const clash = rows.filter((r) => !r.available)
    if (clash.length) {
      return {
        ok: false,
        error: `${clash.map((c) => c.name).join(', ')} ${
          clash.length === 1 ? 'is' : 'are'
        } fully booked for those dates. Choose different dates or another placement.`,
      }
    }
  }

  await prisma.adBooking.update({
    where: { id },
    data: {
      startsAt,
      endsAt,
      startTime: parsed.data.startTime || null,
      endTime: parsed.data.endTime || null,
      weeks: Math.max(1, Math.ceil(days / 7)),
    },
  })

  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true, days }
}

// ═══════════════════════════════════════════════════════════
//  Step 6 — package
// ═══════════════════════════════════════════════════════════

export async function savePackageStepAction(id: string, slug: string): Promise<Ok<object> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(row.status)) {
    return { ok: false, error: 'This campaign has been submitted and can no longer be edited.' }
  }

  const pkg = await prisma.adPackage.findUnique({ where: { slug } })
  if (!pkg || !pkg.isActive) return { ok: false, error: 'That package is not available.' }

  await prisma.adBooking.update({ where: { id }, data: { packageId: pkg.id } })

  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════
//  Step 7 — submit
// ═══════════════════════════════════════════════════════════

/**
 * The only place a campaign leaves DRAFT.
 *
 * Everything is re-checked here against the stored row, not against what the
 * browser sent: a wizard that skipped a step, or a draft edited in another tab,
 * is caught at this line rather than reaching the review queue half-filled.
 *
 * The Payment row is created alongside, in the same shape the existing booking
 * flow uses, so the advertiser's invoices stay in one series.
 */
export async function submitCampaignAction(
  id: string,
  acceptedTerms: boolean
): Promise<Ok<{ paymentId: string; total: number }> | Fail> {
  const user = await advertiser()

  if (!acceptedTerms) {
    return { ok: false, error: 'Please accept the Terms & Conditions and Advertising Policy.' }
  }

  const c = await prisma.adBooking.findFirst({
    where: { id, advertiserId: user.id },
    include: {
      placement: true,
      package: true,
      targeting: true,
      extraPlacements: { include: { placement: true } },
    },
  })
  if (!c) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (!EDITABLE.includes(c.status)) {
    return { ok: false, error: 'This campaign has already been submitted.' }
  }

  const missing: string[] = []
  if (!c.adTypeId) missing.push('advertisement type')
  if (!c.imageUrl) missing.push('creative')
  if (!c.headline) missing.push('headline')
  if (!c.targetUrl) missing.push('landing page')
  if (!c.placementId) missing.push('placement')
  if (!c.targeting || c.targeting.audienceRoles.length === 0) missing.push('audience')
  if (!c.startsAt || !c.endsAt) missing.push('schedule')
  if (!c.packageId) missing.push('package')

  if (missing.length) {
    return {
      ok: false,
      error: `Still to do: ${missing.join(', ')}. Go back and complete ${missing.length === 1 ? 'it' : 'them'}.`,
    }
  }

  /*
   * §8 — the words must fit the smallest slot the campaign booked.
   *
   * Checked here and not only in the browser. The counters on step 2 stop the
   * field at the limit, but a campaign can be built in one order and have a
   * tighter placement added afterwards — book a 728 x 90 bar after writing a
   * forty-character headline and the headline no longer fits. So the limits
   * are recomputed from the placements as stored, at the moment of
   * submission, which is the only point at which both are known and final.
   */
  const bookedSizes = [
    ...(c.placement ? [c.placement.size] : []),
    ...c.extraPlacements.map((e) => e.placement.size),
  ].map(parseSize)

  const limits = limitsAcross(bookedSizes)
  const tooLong = overLimit(
    {
      headline: c.headline ?? '',
      description: c.tagline ?? '',
      cta: c.ctaText ?? '',
      brand: c.brandName ?? '',
    },
    limits
  )

  if (tooLong.length) {
    return {
      ok: false,
      error:
        `${tooLong.join(' and ')} ${tooLong.length === 1 ? 'is' : 'are'} too long for the ` +
        `smallest placement you booked (headline ${limits.headline}` +
        `${limits.description > 0 ? `, description ${limits.description}` : ''}` +
        `, button ${limits.cta} characters). Shorten ${tooLong.length === 1 ? 'it' : 'them'} on step 2, ` +
        `or remove that placement on step 3.`,
    }
  }

  // The price is computed here, from the package and placement rows. A client
  // that posts an amount is ignored entirely (§26).
  const packagePrice = c.package ? Number(c.package.price) : 0
  const extras = c.extraPlacements.reduce((sum, e) => sum + Number(e.price), 0)
  const amount = Math.round((packagePrice + extras) * 100) / 100
  const taxPercent = c.package ? Number(c.package.taxPercent) : 18
  const tax = Math.round(amount * taxPercent) / 100
  const total = Math.round((amount + tax) * 100) / 100

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId: user.id,
        purpose: 'ADVERTISEMENT',
        status: 'CREATED',
        amount: new Prisma.Decimal(amount),
        taxAmount: new Prisma.Decimal(tax),
        totalAmount: new Prisma.Decimal(total),
        referenceId: c.id,
        metadata: {
          package: c.package?.slug ?? null,
          placements: [
            ...(c.placement ? [c.placement.slug] : []),
            ...c.extraPlacements.map((e) => e.placement.slug),
          ],
          startsAt: c.startsAt!.toISOString(),
          endsAt: c.endsAt!.toISOString(),
        },
      },
    })

    await tx.adBooking.update({
      where: { id: c.id },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        paymentId: payment.id,
        // A resubmission clears the old verdict but keeps the count, so the
        // Rejected screen can say how many times it has been round.
        rejectionCode: null,
        rejectionReason: null,
        resubmitCount:
          c.status === 'REJECTED' || c.status === 'CHANGES_REQUESTED'
            ? c.resubmitCount + 1
            : c.resubmitCount,
      },
    })

    await recordAdEvent({
      actorId: user.id,
      campaignId: c.id,
      action: c.status === "DRAFT" ? "AD_SUBMITTED" : "AD_RESUBMITTED",
      before: { status: c.status },
      after: { status: "PENDING_REVIEW", total },
      tx,
    })

    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'AD_SUBMITTED',
        title: 'Advertisement submitted',
        body: `"${c.title}" is with our team for review. We usually respond within one working day.`,
        link: '/dashboard/advertisements/pending',
      },
    })

    return { paymentId: payment.id }
  })

  revalidatePath('/dashboard/advertisements')
  revalidatePath('/dashboard/advertisements/drafts')
  revalidatePath('/dashboard/advertisements/pending')
  revalidatePath('/admin/ads')

  return { ok: true, paymentId: result.paymentId, total }
}

/** Throws the draft away. Only a draft — a submitted campaign is cancelled, not deleted. */
export async function deleteDraftAction(id: string): Promise<Ok<object> | Fail> {
  const user = await advertiser()
  const row = await owned(id, user.id)
  if (!row) return { ok: false, error: 'This campaign no longer exists — go back to step 1 and continue, and it will be saved as a new one.' }
  if (row.status !== 'DRAFT') {
    return { ok: false, error: 'Only a draft can be deleted.' }
  }

  await prisma.adBooking.delete({ where: { id } })
  revalidatePath('/dashboard/advertisements/drafts')
  return { ok: true }
}

/** What one week on the chosen placements costs — shown while picking them. */
export async function placementQuoteAction(slugs: string[]) {
  await advertiser()
  const placements = await prisma.adPlacement.findMany({
    where: { slug: { in: slugs }, isActive: true },
  })
  return placements.reduce((sum, p) => sum + Number(bookingTotal(p, 1).total), 0)
}

/**
 * §13 — whether the chosen placements are free on those dates.
 *
 * Called by step 5 as the dates change, and again inside
 * `saveScheduleStepAction` so a clash cannot be walked past by a client that
 * ignored the answer.
 */
export async function checkAvailabilityAction(
  id: string | null,
  slugs: string[],
  startsAt: string,
  endsAt: string
): Promise<{ ok: true; rows: PlacementAvailability[] } | Fail> {
  await advertiser()

  if (!slugs.length || !startsAt || !endsAt) return { ok: true, rows: [] }

  const from = new Date(`${startsAt}T00:00:00`)
  const to = new Date(`${endsAt}T00:00:00`)
  if (Number.isNaN(+from) || Number.isNaN(+to) || to <= from) {
    return { ok: false, error: 'Those dates could not be read.' }
  }

  return { ok: true, rows: await placementAvailability(slugs, from, to, id ?? undefined) }
}
