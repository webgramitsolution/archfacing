import type { Role } from '@prisma/client'

/**
 * Where each role's profile page lives. Building the path from the role name
 * (`/dashboard/${role}/profile`) breaks for roles whose dashboard folder is
 * named differently — EXTERNAL_ADVERTISER lives under `/dashboard/advertiser`.
 * Staff have no member profile, so they fall back to their dashboard.
 */
const PROFILE_PATH: Partial<Record<Role, string>> = {
  CLIENT: '/dashboard/client/profile',
  PROFESSIONAL: '/dashboard/professional/profile',
  CONSULTANT: '/dashboard/consultant/profile',
  BMF: '/dashboard/bmf/profile',
  CORPORATE: '/dashboard/corporate/profile',
  EXTERNAL_ADVERTISER: '/dashboard/advertiser/profile',
}

/** The role's profile page (the public-facing view for a professional). */
export function profilePathFor(role: Role | string): string {
  return PROFILE_PATH[role as Role] ?? '/dashboard'
}

/** The page where the role edits its profile details. */
export function profileEditPathFor(role: Role | string): string {
  if (role === 'PROFESSIONAL') return '/dashboard/professional/profile/edit'
  return profilePathFor(role)
}
