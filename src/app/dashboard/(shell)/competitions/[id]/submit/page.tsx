import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageTitle, Callout, Icon } from '@/components/ui'
import { entryGate, myEntry, daysToDeadline } from '@/lib/competition-entries'
import { formatINR } from '@/lib/utils'
import { EntryForm } from '../../entry-form'

export const metadata: Metadata = { title: 'Submit your design' }

export default async function SubmitEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAuth()

  const competition = await prisma.post.findFirst({
    where: { id, type: 'DESIGN_COMPETITION', deletedAt: null },
    select: {
      id: true, slug: true, title: true, description: true, status: true,
      authorId: true, prizeMoney: true, submissionDeadline: true,
      winnerAnnouncedAt: true, juryRequired: true, city: true, state: true,
    },
  })
  if (!competition) notFound()

  const [entry, gate] = await Promise.all([
    myEntry(competition.id, user.id),
    Promise.resolve(entryGate(competition, user.id, user.role)),
  ])

  const days = daysToDeadline(competition.submissionDeadline)

  return (
    <>

      <div>
        <div>
          <PageTitle
            eyebrow="Design Competition"
            title={entry ? 'Revise your entry' : 'Submit your design'}
          >
            {entry
              ? 'You can keep changing your entry until the deadline, or until it has been judged.'
              : 'One entry per designer. You can revise it as often as you like before the deadline.'}
          </PageTitle>

          <div className="grid gap-6 md:grid-cols-[1fr_300px] lg:items-start">
            <div className="min-w-0">
              {gate.open ? (
                <EntryForm
                  competitionId={competition.id}
                  competitionTitle={competition.title}
                  backHref="/dashboard/competitions"
                  existing={
                    entry
                      ? {
                          title: entry.title,
                          concept: entry.concept,
                          media: entry.media.map((m) => ({
                            id: m.id, type: m.type, url: m.url, fileName: m.fileName,
                          })),
                        }
                      : null
                  }
                />
              ) : (
                <Callout tone="warn" icon="alert" title="This competition is not open to you">
                  {gate.reason}
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link href={`/competition/${competition.slug}`} className="btn-outline">
                      View the competition
                    </Link>
                    <Link href="/competition" className="btn-ghost">
                      Browse others
                    </Link>
                  </div>
                </Callout>
              )}
            </div>

            <aside className="flex flex-col gap-4">
              <section className="card p-5">
                <h2 className="font-display text-[15px] font-bold text-ink">The brief</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  {competition.description}
                </p>
                <Link
                  href={`/competition/${competition.slug}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:gap-2.5"
                >
                  Read the full brief
                  <Icon name="arrow" className="h-3.5 w-3.5 transition-all" />
                </Link>
              </section>

              <section className="card p-5">
                <dl className="flex flex-col gap-2.5 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-4">Prize</dt>
                    <dd className="tabular font-semibold text-ink">
                      {competition.prizeMoney ? formatINR(Number(competition.prizeMoney)) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-4">Deadline</dt>
                    <dd className="text-right font-medium text-ink-2">
                      {competition.submissionDeadline
                        ? competition.submissionDeadline.toLocaleDateString('en-IN')
                        : 'Open'}
                    </dd>
                  </div>
                  {days !== null && days >= 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-4">Time left</dt>
                      <dd className={days <= 3 ? 'font-semibold text-brand' : 'font-medium text-ink-2'}>
                        {days} day{days === 1 ? '' : 's'}
                      </dd>
                    </div>
                  )}
                  {competition.juryRequired ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-4">Jury</dt>
                      <dd className="tabular font-medium text-ink-2">
                        {competition.juryRequired} members
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-4">Location</dt>
                    <dd className="text-right font-medium text-ink-2">
                      {[competition.city, competition.state].filter(Boolean).join(', ') || '—'}
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </div>

    </>
  )
}
