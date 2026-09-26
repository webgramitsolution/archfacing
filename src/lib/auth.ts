/**
 * ArchFacing authentication — Auth.js v5
 *
 * Two methods:
 *   1. Email + OTP      — for registrants (sent via Hostinger SMTP)
 *   2. Email + Password — for Super Admin, Admin-Seller and RM Employee
 *
 * Mobile OTP will be added later — at that point a third provider will appear
 * and User.mobile will become required.
 *
 * ★ A single /login page serves everyone. After login the user's role decides
 *   which dashboard they are sent to — see dashboardPathFor().
 */

import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { Role, UserStatus } from '@prisma/client'
import { prisma } from './prisma'
import { checkVerifiedToken, normalizeEmail } from './otp'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      status: UserStatus
      mobile: string | null
      mustChangePassword: boolean
    } & DefaultSession['user']
  }
}

/** Roles that may only use the email + password provider. */
const PASSWORD_ONLY_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE']

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },

  providers: [
    /** Admin, Admin-Seller and RM Employee — email + password */
    Credentials({
      id: 'password',
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        if (user.status !== 'ACTIVE') return null
        if (user.deletedAt) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.profilePhoto,
          role: user.role,
          status: user.status,
          mobile: user.mobile,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),

    /**
     * Registrants — email + OTP.
     *
     * The OTP has already been checked by `verifyOtp()` before reaching here,
     * and a short-lived token was issued in exchange. This provider only
     * redeems that token to create the session.
     *
     * (Mobile OTP will be added later — another provider will appear here then.)
     */
    Credentials({
      id: 'otp',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Verification token', type: 'text' },
      },
      async authorize(creds) {
        const email = normalizeEmail(String(creds?.email ?? ''))
        const token = String(creds?.token ?? '')
        if (!email || !token) return null

        const valid = await checkVerifiedToken(email, token, 'LOGIN', true)
        if (!valid) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || user.status === 'BANNED' || user.deletedAt) return null
        if (user.status === 'SUSPENDED') return null
        // Staff sign in with email + password only (see the header). An email
        // code alone must never open an admin, seller or RM account.
        if (PASSWORD_ONLY_ROLES.includes(user.role)) return null

        // ⚠️ Do NOT change status here. PENDING_VERIFICATION means ArchFacing
        // has yet to check the user's qualification/COA (§3.1.8.1) — verifying
        // an email address does not complete that check. Changing status on
        // login would let any professional bypass admin verification.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            emailVerified: user.emailVerified ?? new Date(),
          },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.profilePhoto,
          role: user.role,
          status: user.status,
          mobile: user.mobile,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: Role }).role
        token.status = (user as { status: UserStatus }).status
        token.mobile = (user as { mobile: string | null }).mobile
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword
      }

      // If an admin changed the role/status, pick it up on session refresh
      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, mustChangePassword: true },
        })
        if (fresh) {
          token.role = fresh.role
          token.status = fresh.status
          token.mustChangePassword = fresh.mustChangePassword
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.status = token.status as UserStatus
      session.user.mobile = (token.mobile ?? null) as string | null
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
  },
})

// ═══════════════════════════════════════════════════════════
//  Role → Dashboard routing
// ═══════════════════════════════════════════════════════════

/**
 * Where each role lands after login.
 * The RM Employee signs in through this same /login page and reaches their own
 * dashboard — there is no separate login page for them.
 */
export function dashboardPathFor(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin'
    case 'ADMIN_SELLER':
      return '/admin/seller'
    case 'RM_EMPLOYEE':
      return '/dashboard/employee'
    case 'CLIENT':
      return '/dashboard/client'
    case 'PROFESSIONAL':
      return '/dashboard/professional'
    case 'CONSULTANT':
      return '/dashboard/consultant'
    case 'BMF':
      return '/dashboard/bmf'
    case 'CORPORATE':
      return '/dashboard/corporate'
    case 'EXTERNAL_ADVERTISER':
      return '/dashboard/advertiser'
    default:
      return '/dashboard/client'
  }
}

/**
 * Where the header's "Messages" icon should point for this role.
 *
 * Enquiries live under each role's own folder, so a single `/dashboard/enquiries`
 * would 404. Roles that receive enquiries go to their enquiries screen; the rest
 * go to the consultations screen where they can see the ones they sent. Anything
 * without either lands on its dashboard root rather than a dead URL.
 */
export function messagesPathFor(role: Role): string {
  switch (role) {
    // Every member role now shares one Messages screen — the direct chats
    // started from Artistry and Around Us posts. Leads keep their own page.
    case 'PROFESSIONAL':
    case 'CONSULTANT':
    case 'BMF':
    case 'CLIENT':
    case 'CORPORATE':
      return '/dashboard/messages'
    case 'RM_EMPLOYEE':
      return '/dashboard/employee/leads'
    default:
      return dashboardPathFor(role)
  }
}
