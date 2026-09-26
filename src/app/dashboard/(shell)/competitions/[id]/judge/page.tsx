import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageTitle, StatCard, EmptyState, Icon } from '@/components/ui'
import { listEntries, tally, daysToDeadline } from '@/lib/competition-entries'
import { formatINR } from '@/lib/utils'
import { JudgePanel, type JudgeEntry } from '../../judge-panel'

export const metadata: Metadata = { title: 'Judge entries' }

export default async function JudgeEntriesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAuth()

  const competition = await prisma.post.findFirst({
    where: { id, type: 'DESIGN_COMPETITION', deletedAt: null },
    select: {
      id: true, slug: true, title: true, authorId: true, status: true,
      prizeMoney: true, submissionDeadline: true, winnerAnnouncedAt: true,
    },
  })
  if (!competition) notFound()

  // Judging is the announcer's alone. Anyone else who follows the link is sent
  // to the public page rather than shown a bare error.
  if (competition.authorId !== user.id) {
    redirect(`/competition/${competition.slug}`)
  }

  const [entries, counts] = await Promise.all([
    listEntries(competition.id),
    tally(competition.id),
  ])

  const rows: JudgeEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    concept: e.concept,
    status: e.status,
    score: e.score,
    remarks: e.remarks,
    submittedAt: e.submittedAt.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    designerName: e.designer.name ?? 'A designer',
    designerRole: e.designer.role.replace('_', ' ').toLowerCase(),
    designerPlace: [e.designer.city, e.designer.state].filter(Boolean).join(', '),
    media: e.media.map((m) => ({ id: m.id, type: m.type, url: m.url, fileName: m.fileName })),
  }))

  const days = daysToDeadline(competition.submissionDeadline)

  return (
    <>

      <div>
        <div>
          <PageTitle
            eyebrow="Design Competition"
            title={competition.title}
            action={
              <Link href={`/competition/${competition.slug}`} className="btn-outline">
                View public page
              </Link>
            }
          >
            Every design submitted against your brief. Shortlist the ones worth a
            second look, then declare a winner when you are ready.
          </PageTitle>

          <ul className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <li><StatCard icon="inbox" value={String(counts.total)} label="Entries" /></li>
            <li><StatCard icon="star" value={String(counts.SHORTLISTED)} label="Shortlisted" tone="info" /></li>
            <li>
              <StatCard
                icon="rupee"
                value={competition.prizeMoney ? formatINR(Number(competition.prizeMoney)) : '—'}
                label="Prize"
              />
            </li>
            <li>
              <StatCard
                icon="clock"
                value={
                  competition.winnerAnnouncedAt
                    ? 'Closed'
                    : days === null
                      ? 'Open'
                      : days >= 0
                        ? `${days}d`
                        : 'Passed'
                }
                label={competition.winnerAnnouncedAt ? 'Result out' : 'To deadline'}
                tone={days !== null && days < 0 ? 'warn' : 'brand'}
              />
            </li>
          </ul>

          {rows.length === 0 ? (
            <EmptyState icon="inbox" title="No entries yet">
              {days !== null && days < 0
                ? 'The deadline passed without a single submission. You can post the brief again with a longer runway.'
                : 'Designers can submit until the deadline. Share the public page to bring more of them in.'}
            </EmptyState>
          ) : (
            <JudgePanel
              competitionId={competition.id}
              entries={rows}
              winnerAnnounced={Boolean(competition.winnerAnnouncedAt)}
            />
          )}

          <p className="mt-7 flex items-center gap-1.5 text-[12.5px] text-ink-4">
            <Icon name="help" className="h-3.5 w-3.5" />
            Declaring a winner marks every other entry not selected. You can
            reopen judging afterwards if you need to.
          </p>
        </div>
      </div>

    </>
  )
}
