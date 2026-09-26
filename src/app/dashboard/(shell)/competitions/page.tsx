import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { PageTitle, SectionHead, EmptyState, DataTable, Td, Icon } from '@/components/ui'
import {
  myEntries,
  roleMayEnter,
  daysToDeadline,
  ENTRY_STATUS_LABEL,
  ENTRY_STATUS_TONE,
} from '@/lib/competition-entries'
import { formatINR } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Design Competitions' }

/**
 * One page for both sides of a competition: the briefs this user announced,
 * and the briefs they answered. They are the same person in the PDF's model —
 * a professional can post a competition and enter someone else's.
 */
export default async function MyCompetitionsPage() {
  const user = await requireAuth()

  const [announced, entries] = await Promise.all([
    prisma.post.findMany({
      where: { type: 'DESIGN_COMPETITION', authorId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, slug: true, title: true, status: true, prizeMoney: true,
        submissionDeadline: true, winnerAnnouncedAt: true,
        _count: { select: { entries: true } },
      },
    }),
    roleMayEnter(user.role) ? myEntries(user.id) : Promise.resolve([]),
  ])

  return (
    <>

      <div>
        <div>
          <PageTitle
            eyebrow="Design Competition"
            title="My Design Competitions"
            action={
              <Link href="/competition" className="btn-outline">
                Browse open competitions
              </Link>
            }
          >
            Briefs you have announced, and the designs you have submitted to
            other people&rsquo;s.
          </PageTitle>

          {/* ═══════════ announced by me ═══════════ */}
          <section className="mb-10">
            <SectionHead title="Announced by you">
              Open one to read the entries and pick a winner.
            </SectionHead>

            <div className="mt-4">
              {announced.length === 0 ? (
                <EmptyState icon="grid" title="You have not announced a competition yet">
                  Post your requirement with a prize and a deadline, and designers
                  across India can answer it.
                </EmptyState>
              ) : (
                <DataTable head={['Competition', 'Prize', 'Deadline', 'Entries', 'Status', '']}>
                  {announced.map((c) => {
                    const days = daysToDeadline(c.submissionDeadline)
                    return (
                      <tr key={c.id}>
                        <Td>
                          <Link
                            href={`/competition/${c.slug}`}
                            className="font-semibold text-ink hover:text-brand"
                          >
                            {c.title}
                          </Link>
                        </Td>
                        <Td className="tabular">
                          {c.prizeMoney ? formatINR(Number(c.prizeMoney)) : '—'}
                        </Td>
                        <Td>
                          {c.submissionDeadline
                            ? c.submissionDeadline.toLocaleDateString('en-IN')
                            : 'Open'}
                          {days !== null && days >= 0 && !c.winnerAnnouncedAt && (
                            <span className="ml-1.5 text-[12px] text-ink-4">({days}d)</span>
                          )}
                        </Td>
                        <Td className="tabular font-semibold">{c._count.entries}</Td>
                        <Td>
                          {c.winnerAnnouncedAt ? (
                            <span className="pill-ok">Result out</span>
                          ) : c.status === 'PUBLISHED' ? (
                            <span className="pill-info">Open</span>
                          ) : (
                            <span className="pill-muted">{c.status.replace('_', ' ').toLowerCase()}</span>
                          )}
                        </Td>
                        <Td>
                          <Link
                            href={`/dashboard/competitions/${c.id}/judge`}
                            className="btn-primary px-3 py-1.5 text-[12px]"
                          >
                            {c.winnerAnnouncedAt ? 'View result' : 'Judge entries'}
                          </Link>
                        </Td>
                      </tr>
                    )
                  })}
                </DataTable>
              )}
            </div>
          </section>

          {/* ═══════════ my entries ═══════════ */}
          {roleMayEnter(user.role) && (
            <section>
              <SectionHead title="Your entries">
                Designs you have submitted. You can revise one until its deadline.
              </SectionHead>

              <div className="mt-4">
                {entries.length === 0 ? (
                  <EmptyState
                    icon="star"
                    title="You have not entered a competition yet"
                    action={
                      <Link href="/competition" className="btn-primary">
                        Find a brief to answer
                      </Link>
                    }
                  >
                    Clients post what they need designed, with a prize for the
                    design they pick.
                  </EmptyState>
                ) : (
                  <DataTable head={['Your entry', 'Competition', 'Prize', 'Deadline', 'Status', '']}>
                    {entries.map((e) => {
                      const days = daysToDeadline(e.competition.submissionDeadline)
                      const stillOpen =
                        !e.competition.winnerAnnouncedAt &&
                        e.status === 'SUBMITTED' &&
                        (days === null || days >= 0)
                      return (
                        <tr key={e.id}>
                          <Td className="font-semibold text-ink">{e.title}</Td>
                          <Td>
                            <Link
                              href={`/competition/${e.competition.slug}`}
                              className="text-ink-2 hover:text-brand"
                            >
                              {e.competition.title}
                            </Link>
                          </Td>
                          <Td className="tabular">
                            {e.competition.prizeMoney
                              ? formatINR(Number(e.competition.prizeMoney))
                              : '—'}
                          </Td>
                          <Td>
                            {e.competition.submissionDeadline
                              ? e.competition.submissionDeadline.toLocaleDateString('en-IN')
                              : 'Open'}
                          </Td>
                          <Td>
                            <span className={ENTRY_STATUS_TONE[e.status]}>
                              {ENTRY_STATUS_LABEL[e.status]}
                            </span>
                          </Td>
                          <Td>
                            {stillOpen ? (
                              <Link
                                href={`/dashboard/competitions/${e.competition.id}/submit`}
                                className="btn-outline px-3 py-1.5 text-[12px]"
                              >
                                Revise
                              </Link>
                            ) : (
                              <span className="text-[12px] text-ink-4">Locked</span>
                            )}
                          </Td>
                        </tr>
                      )
                    })}
                  </DataTable>
                )}
              </div>
            </section>
          )}

          <p className="mt-8 flex items-center gap-1.5 text-[12.5px] text-ink-4">
            <Icon name="help" className="h-3.5 w-3.5" />
            One entry per designer per competition — revise it rather than
            submitting a second.
          </p>
        </div>
      </div>

    </>
  )
}
