import Image from 'next/image'
import { LOGO_URL } from '@/components/logo'
import type { CertificateData } from '@/lib/membership'

/**
 * The printable Membership Certificate — an A4-landscape parchment card that
 * renders a seller's active ArchFacing Club plan as a formal certificate,
 * matching the SevenDial reference: cream ground, double gold border, Georgia
 * serif, one page in print.
 *
 * Pure and presentational — it takes fully-resolved data and holds no state, so
 * it works inside the modal dialog and on the standalone print route alike.
 */

const GOLD = '#8B6914'
const NAVY = '#1a365d'
const BODY = '#4a5568'
const CREAM = '#f5f0e6'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function MembershipCertificate({ data }: { data: CertificateData }) {
  // The firm line only when it says something the member name does not.
  const firm = data.companyName && data.companyName.trim() !== data.directorName.trim() ? data.companyName : null
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { margin: 0 !important; padding: 0 !important; width: 297mm !important; height: 210mm !important; overflow: hidden !important; background: ${CREAM} !important; }
          .print-certificate-wrapper { background: ${CREAM} !important; min-height: 210mm !important; height: 210mm !important; width: 297mm !important; padding: 0 !important; margin: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
          .print-certificate { width: 280mm !important; height: 195mm !important; max-width: 280mm !important; max-height: 195mm !important; margin: 0 auto !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; page-break-after: avoid !important; page-break-before: avoid !important; background: ${CREAM} !important; }
          .print-certificate-inner { width: 100% !important; height: 100% !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="print-certificate-wrapper flex items-center justify-center" style={{ background: CREAM }}>
        <div
          className="print-certificate relative w-full max-w-[95vw] overflow-hidden rounded-[6px] shadow-lift sm:max-w-[85vw] md:max-w-[820px] lg:max-w-[900px]"
          style={{ background: CREAM }}
        >
          <div
            className="print-certificate-inner relative w-full p-4 sm:p-6 md:aspect-[297/210] md:p-8"
            style={{ background: CREAM }}
          >
            {/* double gold border */}
            <div className="absolute inset-3 border-4 sm:inset-4 md:inset-6" style={{ borderColor: GOLD }} />
            <div className="absolute inset-5 border-2 sm:inset-6 md:inset-8" style={{ borderColor: GOLD }} />

            <div className="relative flex flex-col items-center justify-between gap-5 px-3 py-8 sm:px-5 md:absolute md:inset-12 md:gap-0 md:px-0 md:py-8">
              {/* header */}
              <div className="space-y-2 text-center sm:space-y-3">
                <h1 className="text-2xl font-bold tracking-wider sm:text-3xl md:text-4xl lg:text-5xl" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>
                  CERTIFICATE
                </h1>
                <p className="text-sm uppercase tracking-widest sm:text-base md:text-lg" style={{ color: GOLD }}>
                  OF MEMBERSHIP
                </p>
                <div className="mx-auto h-0.5 w-24 sm:w-32 md:w-40" style={{ background: GOLD }} />
                <p className="pt-2 text-xs uppercase tracking-wide sm:text-sm md:text-base" style={{ color: GOLD }}>
                  This Certificate is Proudly Presented To
                </p>
              </div>

              {/* company */}
              <div className="-mt-2 space-y-2 text-center sm:space-y-3">
                {/* The member's own name — the certificate is theirs (client rule).
                    Their firm, when it is a different name, sits under it. */}
                <h2 className="text-xl font-bold sm:text-2xl md:text-4xl lg:text-5xl" style={{ color: NAVY, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  {data.directorName}
                </h2>
                {firm && (
                  <p className="text-xs sm:text-sm md:text-base" style={{ color: BODY }}>
                    of <strong>{firm}</strong>
                  </p>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-wide sm:text-base md:text-lg" style={{ color: GOLD }}>
                    {data.membershipLevel} Member
                  </p>
                  <p className="text-xs sm:text-sm md:text-base" style={{ color: GOLD }}>
                    Trusted B2B Marketplace Partner
                  </p>
                </div>
              </div>

              {/* description */}
              <div className="-mt-2 px-4 text-center sm:px-8 md:px-16">
                <p className="text-xs leading-relaxed sm:text-sm md:text-base" style={{ color: BODY }}>
                  This certificate acknowledges <strong>{data.directorName}</strong>
                  {firm ? <> of <strong>{firm}</strong></> : null} as a verified and trusted member
                  on ArchFacing — India&apos;s architecture and design marketplace
                  {data.pactPins.length > 0 ? <>, holding the PACT area{data.pactPins.length > 1 ? 's' : ''} <strong>{data.pactPins.join(', ')}</strong></> : null}.
                  The member has met all verification standards and maintains good standing in our community.
                </p>
              </div>

              {/* brand + contact */}
              <div className="space-y-1 text-center">
                <Image src={LOGO_URL} alt="ArchFacing" width={150} height={44} className="mx-auto h-8 w-auto object-contain sm:h-10 md:h-12" unoptimized />
                <p className="text-xs sm:text-sm" style={{ color: BODY }}>
                  support@archfacing.com
                </p>
              </div>

              {/* GST, location, dates */}
              <div className="w-full">
                <div className="mb-3 text-center sm:mb-4">
                  <p className="text-xs font-medium sm:text-sm" style={{ color: BODY }}>
                    GST: {data.gstNumber}
                  </p>
                  <p className="text-xs sm:text-sm" style={{ color: BODY }}>
                    {[data.city, data.state].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div className="flex items-end justify-between px-2 sm:px-4 md:px-8">
                  <div className="text-left">
                    <div className="mb-2 w-24 border-t-2 sm:w-32 md:w-40" style={{ borderColor: GOLD }} />
                    <p className="text-xs font-semibold sm:text-sm" style={{ color: GOLD }}>Issue Date</p>
                    <p className="text-xs font-medium sm:text-sm" style={{ color: BODY }}>{fmtDate(data.issueDate)}</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2 ml-auto w-24 border-t-2 sm:w-32 md:w-40" style={{ borderColor: GOLD }} />
                    <p className="text-xs font-semibold sm:text-sm" style={{ color: GOLD }}>Valid Until</p>
                    <p className="text-xs font-medium sm:text-sm" style={{ color: BODY }}>{fmtDate(data.expiryDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
