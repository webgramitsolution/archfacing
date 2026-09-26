import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { PostForm } from '../../post-form'
import { MyPostings } from '../../my-postings'
import { categoriesFor } from '../../post-actions'
import { POST_TYPES } from '@/config/post-types'

const config = POST_TYPES.AROUND_US

export const metadata: Metadata = { title: config.dashboardLabel }

export default async function Page() {
  const user = await requireRole('PROFESSIONAL')

  const [categories, me] = await Promise.all([
    categoriesFor(config),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { pincode: true, state: true },
    }),
  ])

  return (
    <div>
      <PageHeading title={config.dashboardLabel} pdfRef={config.pdfRef}>
        {config.description}
      </PageHeading>

      <MyPostings config={config} />

      <PostForm
        config={config}
        categories={categories}
        defaultPincode={me?.pincode}
        defaultState={me?.state}
      />
    </div>
  )
}
