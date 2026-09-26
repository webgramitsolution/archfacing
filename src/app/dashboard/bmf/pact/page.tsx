import type { Metadata } from 'next'
import { BUSINESS_RULES, termYears } from '@/config/permissions'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { PactBrowser } from '../../pact-browser'
import { pactPlanBlock } from '@/lib/pact'
import { MyPactList } from '../../my-pact-list'

export const metadata: Metadata = { title: 'My PACT' }

export default async function BmfPactPage() {
  const user = await requireRole('BMF')

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pincode: true,
      /*
       * No `professionalProfile` / `consultantProfile` here. This page is
       * behind `requireRole('BMF')`, so neither row can exist — they were two
       * joins that always came back null. `PactBrowser` only reads
       * `designaType` on its PROFESSIONAL branch and `lockedSubCategory` on
       * its CONSULTANT one; a BMF gets exactly one seat type, BMF.
       */
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
      <PageHeading title="My PACT" pdfRef="5.3.4">
        PACT stands for PIN Area Code Territory — an exclusive franchise over
        a PIN code for {termYears(BUSINESS_RULES.PACT_VALIDITY_YEARS)}, renewable. Every enquiry from that area comes straight
        to you.
      </PageHeading>

      {profile?.pacts.length ? (
        <div className="mb-10">
          <MyPactList pacts={profile.pacts} />
        </div>
      ) : null}

      <PactBrowser
        role={user.role}
        designaType={null}
        lockedSubCategory={null}
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
