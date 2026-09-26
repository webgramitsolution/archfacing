/**
 * Server-side permission guards.
 *
 * ⚠️ On the client, `can()` only hides UI. The real enforcement happens here —
 *    every Server Action and route handler must use one of these.
 */

import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { auth, dashboardPathFor } from './auth'
import { prisma } from './prisma'
import { can, GRANTABLE_KEYS, type Permission } from '@/config/permissions'

/**
 * Login required — otherwise redirect to /login.
 *
 * ⚠️ The session lives in a JWT, so the role/status it carries is only as fresh
 * as the last login. Trusting it alone would let a user who has been banned or
 * deleted by an admin keep browsing for up to 30 days. So we fetch the current
 * state from the DB on every protected page — it is a light query and it is
 * essential for security.
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true, profilePhoto: true, logo: true, permissions: true },
  })

  if (!fresh || fresh.deletedAt) redirect('/login?error=notfound')
  if (fresh.status === 'BANNED') redirect('/login?error=banned')
  if (fresh.status === 'SUSPENDED') redirect('/login?error=suspended')

  // Return the real role from the DB, not the stale one from the JWT.
  // profilePhoto/logo travel with it so the sidebar, header and every avatar
  // across the dashboard show the picture the user uploaded, not just initials.
  return { ...session.user, role: fresh.role, status: fresh.status, name: fresh.name, profilePhoto: fresh.profilePhoto ?? fresh.logo ?? null, permissions: fresh.permissions }
}

/** This permission is required — otherwise send the user back to their dashboard */
export async function requirePermission(permission: Permission) {
  const user = await requireAuth()
  if (!can(user.role, permission, user.permissions)) {
    redirect(`${dashboardPathFor(user.role)}?error=forbidden`)
  }
  return user
}

/**
 * Staff who may enter the admin shell: the admin roles, plus any RM employee
 * a SUPER_ADMIN has granted at least one admin module.
 */
export async function requireAdminShell() {
  const user = await requireAuth()
  const adminRole = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMIN_SELLER'
  const granted = user.role === 'RM_EMPLOYEE' && user.permissions.some((p) => GRANTABLE_KEYS.has(p))
  if (!adminRole && !granted) redirect(`${dashboardPathFor(user.role)}?error=forbidden`)
  return user
}

/** One of these roles is required */
export async function requireRole(...roles: Role[]) {
  const user = await requireAuth()
  if (user.role !== 'SUPER_ADMIN' && !roles.includes(user.role)) {
    redirect(`${dashboardPathFor(user.role)}?error=forbidden`)
  }
  return user
}

/**
 * For Server Actions — throws instead of redirecting, so the caller can handle
 * the error itself.
 */
export async function assertPermission(permission: Permission) {
  const session = await auth()
  if (!session?.user) throw new Error('UNAUTHENTICATED')
  if (session.user.status !== 'ACTIVE') throw new Error('ACCOUNT_INACTIVE')
  if (!can(session.user.role, permission)) throw new Error('FORBIDDEN')
  return session.user
}
