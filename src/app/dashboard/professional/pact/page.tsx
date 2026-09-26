import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { PactBrowser } from '../../pact-browser'
import { pactPlanBlock } from '@/lib/pact'

export const metadata: Metadata = { title: 'Buy PACT' }

export default async function ProfessionalPactPage() {
  const user = await requireRole('PROFESSIONAL')

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pincode: true,
      professionalProfile: { select: { designaType: true } },
      consultantProfile: { select: { subCategory: true } },
      pacts: {
        where: { status: { in: ['ACTIVE', 'RESERVED', 'SUSPENDED'] } },
        orderBy: { purchasedAt: 'desc' },
      },
    },
  })

  // Free plan → no PACT; a paid plan caps how many (lib/pact.ts pactPlanBlock).
  const planBlock = user.status === 'ACTIVE' ? await pactPlanBlock(user.id) : null
  const canBuy = user.status === 'ACTIVE' && !planBlock

  return (
    <div>
      {/*
        Buy only. The holder's own territories now live in the profile editor's
        "My PACT" tab, so listing them again here would be the same table in two
        places; this page is what "Buy New PACT" opens.
      */}
      <PageHeading title="Buy PACT" pdfRef="5.2.8" />

      <PactBrowser
        role={user.role}
        designaType={profile?.professionalProfile?.designaType ?? null}
        lockedSubCategory={profile?.consultantProfile?.subCategory ?? null}
        homePincode={profile?.pincode ?? null}
        canBuy={canBuy}
        blockedReason={
          canBuy
            ? undefined
            : planBlock
              ? planBlock.message
              : 'Your account is still under verification. ArchFacing is reviewing your qualifications — you will be able to purchase a PACT once that is complete.'
        }
      />
    </div>
  )
}
