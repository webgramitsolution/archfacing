import type { Metadata } from 'next'
import { requirePermission } from '@/lib/guard'
import { AdminPageHead } from '@/components/admin/parts'
import { PodcastForm } from './podcast-form'

export const metadata: Metadata = { title: 'New Podcast' }

export default async function NewPodcastPage() {
  await requirePermission('seller:podcast')
  return (
    <div className="max-w-3xl">
      <AdminPageHead title="New Podcast episode">
        Interviews with legends, design talks and DIY — paste a YouTube or
        Dailymotion link and the video plays from there.
      </AdminPageHead>
      <PodcastForm />
    </div>
  )
}
