import { z } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * Verification Settings — one JSON row in SiteSetting ('verification.config').
 *
 * Every field here is READ somewhere; that is the rule this file exists for.
 *
 *   enabled, rules.*.required   → src/app/(auth)/actions.ts, at registration:
 *                                 decides PENDING_VERIFICATION vs ACTIVE.
 *   rules.BUYER_*.minDocs       → setBuyerVerificationAction: an account with
 *                                 fewer documents cannot be approved.
 *   notifyUser / emailUser      → setBuyerVerificationAction, and the
 *                                 professional verify / reject actions.
 *   defaultReviewerId           → registration: the reviewer is notified of
 *                                 every new account waiting on them.
 *   escalateAfterHours / To     → runVerificationMaintenance (daily cron).
 *   revalidateMonths / reminderDays → runVerificationMaintenance.
 *   documentTypes               → the document checklists in the add-account
 *                                 wizards and the settings page.
 */

export const ROLE_RULES = ['PROFESSIONAL', 'STUDENT', 'CONSULTANT', 'BMF', 'CORPORATE'] as const
export const BUYER_RULES = ['BUYER_INDIVIDUAL', 'BUYER_COMPANY'] as const
export type RoleRuleKey = (typeof ROLE_RULES)[number]
export type BuyerRuleKey = (typeof BUYER_RULES)[number]

const DocType = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(2).max(60),
  appliesTo: z.enum(['ALL', 'BUYER', 'COMPANY', 'PROFESSIONAL', 'STUDENT', 'BMF', 'CORPORATE']),
  required: z.boolean(),
  active: z.boolean(),
})
export type VerificationDocType = z.infer<typeof DocType>

export const VerificationConfigSchema = z.object({
  enabled: z.boolean(),
  rules: z.object({
    PROFESSIONAL: z.object({ required: z.boolean() }),
    STUDENT: z.object({ required: z.boolean() }),
    CONSULTANT: z.object({ required: z.boolean() }),
    BMF: z.object({ required: z.boolean() }),
    CORPORATE: z.object({ required: z.boolean() }),
    BUYER_INDIVIDUAL: z.object({ minDocs: z.number().int().min(0).max(10) }),
    BUYER_COMPANY: z.object({ minDocs: z.number().int().min(0).max(10) }),
  }),
  notifyUser: z.boolean(),
  emailUser: z.boolean(),
  defaultReviewerId: z.string().nullable(),
  escalateAfterHours: z.number().int().min(0).max(720),
  escalateTo: z.enum(['SUPER_ADMIN', 'ADMIN']),
  /** 0 = a verification never lapses. */
  revalidateMonths: z.number().int().min(0).max(120),
  reminderDays: z.number().int().min(0).max(90),
  documentTypes: z.array(DocType).max(40),
})
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>

/** Mirrors how the platform behaved before these settings existed. */
export const DEFAULT_VERIFICATION: VerificationConfig = {
  enabled: true,
  rules: {
    PROFESSIONAL: { required: true },
    STUDENT: { required: false },
    CONSULTANT: { required: true },
    BMF: { required: true },
    CORPORATE: { required: true },
    BUYER_INDIVIDUAL: { minDocs: 0 },
    BUYER_COMPANY: { minDocs: 1 },
  },
  notifyUser: true,
  emailUser: true,
  defaultReviewerId: null,
  escalateAfterHours: 48,
  escalateTo: 'SUPER_ADMIN',
  revalidateMonths: 0,
  reminderDays: 30,
  documentTypes: [
    { id: 'aadhaar', name: 'Aadhaar Card', appliesTo: 'ALL', required: false, active: true },
    { id: 'pan', name: 'PAN Card', appliesTo: 'ALL', required: true, active: true },
    { id: 'gst', name: 'GST Certificate', appliesTo: 'COMPANY', required: true, active: true },
    { id: 'registration', name: 'Business Registration', appliesTo: 'COMPANY', required: false, active: true },
    { id: 'college-id', name: 'College ID Card', appliesTo: 'STUDENT', required: true, active: true },
    { id: 'coa', name: 'COA Registration', appliesTo: 'PROFESSIONAL', required: false, active: true },
    { id: 'address', name: 'Address Proof', appliesTo: 'ALL', required: false, active: true },
    { id: 'trade-license', name: 'Trade License', appliesTo: 'BMF', required: false, active: true },
  ],
}

export const VERIFICATION_KEY = 'verification.config'

/** The saved config merged over the defaults; a malformed row falls back safely. */
export async function getVerificationConfig(): Promise<VerificationConfig> {
  const row = await prisma.siteSetting.findUnique({ where: { key: VERIFICATION_KEY } }).catch(() => null)
  if (!row) return DEFAULT_VERIFICATION
  const v = row.value as Partial<VerificationConfig>
  const merged = {
    ...DEFAULT_VERIFICATION,
    ...v,
    rules: { ...DEFAULT_VERIFICATION.rules, ...(v.rules ?? {}) },
  }
  const parsed = VerificationConfigSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_VERIFICATION
}

/** Which rule governs a new account. */
export function ruleKeyFor(role: string, tier?: string | null): RoleRuleKey | null {
  if (role === 'PROFESSIONAL') return tier === 'STUDENT' ? 'STUDENT' : 'PROFESSIONAL'
  if (role === 'CONSULTANT' || role === 'BMF' || role === 'CORPORATE') return role
  return null
}

/** Does a new account of this kind wait for verification? */
export function needsVerification(cfg: VerificationConfig, role: string, tier?: string | null): boolean {
  const key = ruleKeyFor(role, tier)
  if (!key) return false
  return cfg.enabled && cfg.rules[key].required
}

/** Document types that apply to an account kind, active only. */
/** Which document list applies to an account. */
export function docKindFor(role: string, tier?: string | null, accountType?: string | null): VerificationDocType['appliesTo'] {
  if (role === 'CLIENT') return accountType === 'COMPANY' ? 'COMPANY' : 'BUYER'
  if (role === 'PROFESSIONAL') return tier === 'STUDENT' ? 'STUDENT' : 'PROFESSIONAL'
  if (role === 'BMF' || role === 'CORPORATE') return role
  return 'ALL'
}

export function documentsFor(cfg: VerificationConfig, kind: VerificationDocType['appliesTo']): VerificationDocType[] {
  return cfg.documentTypes.filter((d) => d.active && (d.appliesTo === 'ALL' || d.appliesTo === kind))
}

// ═══════════════════════════════════════════════════════════
//  Daily maintenance — escalation and re-verification
// ═══════════════════════════════════════════════════════════

const HOUR = 3_600_000
const DAY = 86_400_000

/**
 * Run by /api/cron/pact once a day.
 *
 * 1. Escalation — accounts still waiting after `escalateAfterHours` are
 *    reported once a day to every active SUPER_ADMIN (or ADMIN).
 * 2. Re-verification — when `revalidateMonths` > 0, a buyer whose last
 *    approval (the latest BUYER_VERIFIED audit row) is older than that goes
 *    back to PENDING; `reminderDays` before that they are warned once.
 */
export async function runVerificationMaintenance(now = new Date()) {
  const cfg = await getVerificationConfig()
  let escalated = 0
  let reminded = 0
  let lapsed = 0

  if (cfg.enabled && cfg.escalateAfterHours > 0) {
    const cutoff = new Date(now.getTime() - cfg.escalateAfterHours * HOUR)
    const [pros, buyers] = await Promise.all([
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION', deletedAt: null, createdAt: { lt: cutoff } } }),
      prisma.buyerProfile.count({ where: { verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] }, submittedAt: { lt: cutoff } } }),
    ])
    escalated = pros + buyers
    if (escalated > 0) {
      const targets = await prisma.user.findMany({
        where: { role: cfg.escalateTo, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      })
      if (targets.length) {
        await prisma.notification.createMany({
          data: targets.map((t) => ({
            userId: t.id,
            type: 'VERIFICATION_ESCALATED',
            title: `${escalated} verification${escalated === 1 ? '' : 's'} waiting over ${cfg.escalateAfterHours} h`,
            body: `${pros} member account${pros === 1 ? '' : 's'} and ${buyers} buyer${buyers === 1 ? '' : 's'} still need a decision.`,
            link: buyers > 0 ? '/admin/visitors/verification?status=PENDING' : '/admin/users?status=pending',
          })),
        })
      }
    }
  }

  if (cfg.revalidateMonths > 0) {
    const verified = await prisma.buyerProfile.findMany({ where: { verificationStatus: 'VERIFIED' }, select: { userId: true } })
    if (verified.length) {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'BUYER_VERIFIED', entityId: { in: verified.map((v) => v.userId) } },
        orderBy: { createdAt: 'desc' },
        select: { entityId: true, createdAt: true },
      })
      const lastOk = new Map<string, Date>()
      for (const l of logs) if (!lastOk.has(l.entityId)) lastOk.set(l.entityId, l.createdAt)

      for (const v of verified) {
        const at = lastOk.get(v.userId)
        if (!at) continue
        const lapseAt = new Date(at)
        lapseAt.setMonth(lapseAt.getMonth() + cfg.revalidateMonths)
        if (lapseAt <= now) {
          await prisma.$transaction([
            prisma.buyerProfile.update({ where: { userId: v.userId }, data: { verificationStatus: 'PENDING', submittedAt: now } }),
            prisma.notification.create({
              data: { userId: v.userId, type: 'VERIFICATION_LAPSED', title: 'Please verify your account again', body: 'Your verification has lapsed. Upload current documents to stay verified.', link: '/dashboard/settings' },
            }),
            prisma.auditLog.create({ data: { action: 'BUYER_VERIFICATION_LAPSED', entityType: 'BuyerProfile', entityId: v.userId } }),
          ])
          lapsed++
        } else if (cfg.reminderDays > 0) {
          const remindFrom = lapseAt.getTime() - cfg.reminderDays * DAY
          // Once: only on the day the reminder window opens.
          if (now.getTime() >= remindFrom && now.getTime() < remindFrom + DAY) {
            await prisma.notification.create({
              data: {
                userId: v.userId, type: 'VERIFICATION_REMINDER', title: 'Your verification is due for renewal',
                body: `It lapses on ${lapseAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
                link: '/dashboard/settings',
              },
            })
            reminded++
          }
        }
      }
    }
  }
  return { escalated, reminded, lapsed }
}
