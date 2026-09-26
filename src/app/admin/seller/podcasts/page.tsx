import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { requirePermission } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { AdminPageHead } from '@/components/admin/parts'
import { Icon } from '@/components/ui'

export const metadata: Metadata = { title: 'Podcast' }
export const dynamic = 'force-dynamic'

export default async function SellerPodcastsPage() {
  await requirePermission('seller:podcast')
  const episodes = await prisma.post.findMany({
    where: { type: 'PODCAST', deletedAt: null },
    include: { media: { where: { type: 'VIDEO_LINK' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rise flex items-start justify-between gap-4">
        <AdminPageHead title="Podcast Episodes">
          Paste a YouTube or Dailymotion link — ArchFacing auto-fetches the thumbnail and plays the video on this website (no redirect).
        </AdminPageHead>
        <Link href="/admin/seller/new-podcast" className="btn-primary shrink-0"><Icon name="plus" className="h-4 w-4" /> Add Podcast</Link>
      </div>

      {episodes.length === 0 ? (
        <div className="rise rise-1 rounded-card border border-line bg-white p-16 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-ink-4"><Icon name="monitor" className="h-6 w-6" /></span>
          <p className="mt-3 text-[13px] font-semibold text-ink">No episodes yet</p>
          <p className="mt-1 text-[12px] text-ink-3">Add your first podcast episode from a video link.</p>
        </div>
      ) : (
        <section className="rise rise-1 grid grid-cols-2 gap-4 md:grid-cols-3">
          {episodes.map((e) => (
            <Link key={e.id} href={`/podcast/${e.slug}`} className="group overflow-hidden rounded-card border border-line bg-white shadow-card transition-shadow hover:shadow-lift">
              <span className="relative block aspect-video overflow-hidden bg-paper-3">
                {e.media[0]?.thumbnailUrl ? <Image src={e.media[0].thumbnailUrl} alt="" fill sizes="360px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-ink-4"><Icon name="monitor" className="h-7 w-7" /></span>}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
              </span>
              <span className="block p-3">
                <span className="block truncate text-[13px] font-semibold text-ink group-hover:text-brand">{e.title}</span>
                <span className="mt-0.5 block truncate text-[11px] capitalize text-ink-3">{e.category.replace(/-/g, ' ')}</span>
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
