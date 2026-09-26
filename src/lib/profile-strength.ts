/**
 * One definition of "how complete is this profile", used everywhere it is
 * shown.
 *
 * It was computed twice from two different field lists — the sidebar counted
 * User columns, the dashboard's rail card counted a mix of columns, the PACT
 * and the Club plan — so the same screen could carry two numbers both labelled
 * profile strength and they could disagree. One list, one answer.
 *
 * ⚠️ Only fields the Edit Profile form can actually set belong here. The
 *    number sits above a "Complete now" link, so every point it is short has
 *    to be a point that link can win back.
 *
 *    · `profilePhoto` is deliberately absent: no photo upload exists anywhere
 *      in the app, so counting it capped every account at 7/8 — 88% — with no
 *      way to finish. Add it the day an avatar can be uploaded.
 *    · `gender` is absent too: the form offers it, but its first option is
 *      "Prefer not to say", so counting it would hold anyone who chooses that
 *      below 100% for the life of the account.
 *
 *    `email` is always set — it is how you sign in — so it is a free point
 *    rather than a real question. It stays because it is genuinely part of a
 *    profile, and removing it would only rescale the same answer.
 */

/** Pass to a Prisma `select` so the caller reads exactly what is counted. */
export const PROFILE_STRENGTH_SELECT = {
  name: true,
  email: true,
  mobile: true,
  addressLine: true,
  pincode: true,
  city: true,
  state: true,
} as const

export type ProfileStrengthFields = Record<
  keyof typeof PROFILE_STRENGTH_SELECT,
  unknown
>

/** 0-100, rounded. */
export function strengthOf(u: ProfileStrengthFields | null | undefined): number {
  if (!u) return 0
  const keys = Object.keys(PROFILE_STRENGTH_SELECT) as (keyof ProfileStrengthFields)[]
  const filled = keys.filter((k) => Boolean(u[k])).length
  return Math.round((filled / keys.length) * 100)
}

/** The line under the bar. Reads correctly at every value, 100 included. */
export function strengthNote(percent: number): string {
  if (percent >= 100) return 'Your profile is complete.'
  if (percent >= 80) return 'Your profile is almost complete.'
  if (percent >= 50) return 'A fuller profile brings in more leads.'
  return 'Add your contact and address details to start receiving leads.'
}

// ═══════════════════════════════════════════════════════════
//  Corporate
// ═══════════════════════════════════════════════════════════

/**
 * A Corporate account's profile is the company's, not the signatory's.
 *
 * The seven User columns above still count — a company with no address takes
 * no PACT leads — but the fields a buyer actually looks for live on
 * `CorporateProfile`, so they are counted alongside. Same rule as the base
 * list: only fields the Edit Profile form can set.
 *
 * `isVerified` is deliberately absent. Verification is granted by the
 * ArchFacing team, not filled in by the company, and the number sits above a
 * "Complete now" link — every point it is short has to be a point that link
 * can win back.
 */
export const CORPORATE_PROFILE_SELECT = {
  companyName: true,
  companyLogo: true,
  website: true,
  gstNumber: true,
  panNumber: true,
  productCategories: true,
} as const

export type CorporateStrengthFields = {
  companyName: unknown
  companyLogo: unknown
  website: unknown
  gstNumber: unknown
  panNumber: unknown
  productCategories: unknown
}

/** 0-100, over the User columns and the company's own fields together. */
export function corporateStrengthOf(
  u: ProfileStrengthFields | null | undefined,
  c: CorporateStrengthFields | null | undefined
): number {
  const userKeys = Object.keys(PROFILE_STRENGTH_SELECT) as (keyof ProfileStrengthFields)[]
  const companyKeys = Object.keys(CORPORATE_PROFILE_SELECT) as (keyof CorporateStrengthFields)[]

  const userFilled = u ? userKeys.filter((k) => Boolean(u[k])).length : 0
  const companyFilled = c
    ? companyKeys.filter((k) => {
        const v = c[k]
        return Array.isArray(v) ? v.length > 0 : Boolean(v)
      }).length
    : 0

  const total = userKeys.length + companyKeys.length
  return Math.round(((userFilled + companyFilled) / total) * 100)
}
