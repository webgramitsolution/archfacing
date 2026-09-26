import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { getAssociate } from '@/lib/design-associates'

/**
 * Reviews on this associate's storefront.
 *
 * ★ ArchFacing has no review model yet.
 *
 *   The schema carries exactly one kind of rating — `CompetitionEntry` jury
 *   scores — and those belong to a competition entry, not to a professional.
 *   There is no Product review, no Project review and no Profile review to
 *   read, so there is nothing this page could honestly average.
 *
 *   The page therefore says so, plainly, instead of printing a "4.8 (128
 *   reviews)" that no row anywhere supports. When the review system is built
 *   this page reads it — and it will read the ORIGINAL reviews, still attached
 *   to the product or project they were written about, rather than a copy
 *   made for the storefront.
 */

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return { title: 'Not found' }
  return { title: `Reviews — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const who = a.firmName || a.name

  return (
    <div className="container-af py-7">
      <div className="mb-5">
        <h2 className="font-display text-[20px] font-bold text-ink">Reviews</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          What clients say about {who}.
        </p>
      </div>

      <div className="card px-6 py-14 text-center">
        <Icon name="star" className="mx-auto h-9 w-9 text-ink-4" />
        <p className="mt-3 font-display text-[15px] font-bold text-ink">No reviews yet</p>
        <p className="mx-auto mt-1.5 max-w-lg text-balance text-[13px] leading-relaxed text-ink-3">
          Client reviews are not yet open on ArchFacing. When they are, the
          reviews written about {who}&apos;s projects and products will appear
          here — each one still attached to the work it was written about.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link
            href={`/consult-nearby?pincode=${a.pacts[0]?.pincode ?? ''}`}
            className="btn-primary px-5"
          >
            Send an enquiry instead
          </Link>
          <Link
            href={`/${a.slug}/projects`}
            className="rounded-card border border-line bg-paper px-5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            See their work
          </Link>
        </div>
      </div>
    </div>
  )
}
