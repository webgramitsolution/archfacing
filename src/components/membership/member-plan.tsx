import type { CertificateData } from '@/lib/membership'
import { CertificateDialog } from './certificate-dialog'
import { VerifiedTick } from '@/components/verified-badge'
import { Icon } from '@/components/ui'

/**
 * The bottom of an author / artist card: the plan they bought, and their
 * membership certificate one click away. A top-plan member's strip is gold,
 * matching their gold tick; a member with no paid plan shows "Free Member"
 * and no certificate (there is nothing to certify).
 */
export function MemberPlanStrip({
  cert,
  tone,
}: {
  cert: CertificateData | null
  tone: 'gold' | 'blue' | null
}) {
  if (!cert) {
    return (
      <p className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-paper-3 py-2 text-[12px] font-medium text-ink-3">
        <Icon name="award" className="h-4 w-4" />
        Free Member
      </p>
    )
  }

  const gold = tone === 'gold'
  return (
    <div
      className={`mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
        gold ? 'border-[#F1D27A] bg-[#FFF8E1]' : 'border-line bg-paper-3'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {gold ? (
          <VerifiedTick className="h-5 w-5" tone="gold" />
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-warn to-amber-500 text-white">
            <Icon name="trophy" className="h-3 w-3" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-[10px] font-medium text-ink-4">Membership</span>
          <span className={`block truncate text-[12.5px] font-bold ${gold ? 'text-[#A77800]' : 'text-ink'}`}>
            {cert.membershipLevel} Plan
          </span>
        </span>
      </span>
      <CertificateDialog
        data={cert}
        trigger={
          <span className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">View Certificate</span>
        }
      />
    </div>
  )
}
