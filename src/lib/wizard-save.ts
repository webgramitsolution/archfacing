import { DEFAULT_PREFS, type NotifPrefs } from '@/lib/notification-prefs'
import { addVerificationDocument, DocError } from '@/lib/verification-docs'

/**
 * Shared by the admin "Add …" wizards so every field they show is saved.
 *
 *   extrasFrom   the optional details without a column of their own →
 *                User.profileExtras (shown on /admin/users/[id]).
 *   channelPrefs the wizard's Email / SMS / WhatsApp switches → the same
 *                User.notificationPrefs matrix the member edits in Settings.
 *   saveDocs     every doc_<typeId> file input → a VerificationDocument.
 */

/** Keep only filled values; arrays keep their non-empty entries. */
export function extrasFrom(fd: FormData, single: string[], multi: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of single) {
    const v = fd.get(k)
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 600)
  }
  for (const k of multi) {
    const vs = fd.getAll(k).map(String).map((s) => s.trim()).filter(Boolean).slice(0, 30)
    if (vs.length) out[k] = vs
  }
  return out
}

/** The default matrix with whole channels switched off where the admin said so. */
export function channelPrefs(fd: FormData): NotifPrefs | null {
  if (!fd.has('notify_present')) return null
  const on = { email: fd.get('notify_email') === 'on', sms: fd.get('notify_sms') === 'on', whatsapp: fd.get('notify_whatsapp') === 'on' }
  return Object.fromEntries(
    Object.entries(DEFAULT_PREFS).map(([k, v]) => [k, { ...v, email: v.email && on.email, sms: v.sms && on.sms, whatsapp: v.whatsapp && on.whatsapp }]),
  )
}

/** Uploads every attached document; returns the ones that failed, for the admin to see. */
export async function saveDocs(fd: FormData, ownerId: string, uploaderId: string): Promise<string[]> {
  const failed: string[] = []
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith('doc_') || !(value instanceof File) || value.size === 0) continue
    try {
      await addVerificationDocument({ ownerId, uploaderId, docTypeId: key.slice(4), file: value })
    } catch (e) {
      failed.push(e instanceof DocError ? `${value.name}: ${e.message}` : value.name)
    }
  }
  return failed
}

export const dobFrom = (v: FormDataEntryValue | null): Date | null => {
  if (typeof v !== 'string' || !v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) || d > new Date() ? null : d
}
