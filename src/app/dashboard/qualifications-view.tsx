import { prisma } from '@/lib/prisma'
import { PageHeading } from '@/components/dashboard-shell'
import { deleteQualificationAction } from './qualification-actions'
import { AddQualificationForm } from './qualification-form'

export const LEVEL_LABEL: Record<string, string> = {
  TENTH: 'Class 10',
  TWELFTH: 'Class 12',
  DIPLOMA: 'Diploma',
  GRADUATION: 'Graduation',
  POST_GRADUATION: 'Post-graduation',
  PHD: 'PhD',
  PROFESSIONAL_MEMBERSHIP: 'Professional membership',
}
const ORDER = Object.keys(LEVEL_LABEL)

/** §4.3.3.2 — the qualifications list, shared by the Professional and Consultant dashboards. */
export async function QualificationsView({ userId }: { userId: string }) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      state: true,
      professionalProfile: { select: { qualifications: true } },
      consultantProfile: { select: { qualifications: true } },
    },
  })
  const rows = [...(u?.professionalProfile?.qualifications ?? u?.consultantProfile?.qualifications ?? [])]
    .sort((a, b) => ORDER.indexOf(b.level) - ORDER.indexOf(a.level) || b.passingYear - a.passingYear)

  return (
    <div className="space-y-5">
      <PageHeading title="Qualifications" />
      <section className="card p-5 md:p-6">
        <h2 className="font-display text-[16px] font-bold text-navy">Add a qualification</h2>
        <p className="mb-4 mt-0.5 text-[12.5px] text-ink-3">
          From Class 10 up to PhD, and professional memberships such as your COA registration. ArchFacing checks these during verification.
        </p>
        <AddQualificationForm defaultState={u?.state ?? ''} />
      </section>

      <section className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-ink-3">No qualifications added yet.</p>
        ) : (
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-paper-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">Level</th>
                <th className="px-4 py-2.5">Board / University</th>
                <th className="px-4 py-2.5">State</th>
                <th className="px-4 py-2.5">Year</th>
                <th className="px-4 py-2.5">Certificate</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-line-soft last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {LEVEL_LABEL[q.level] ?? q.level}
                    {q.membershipNo && <span className="block text-[11.5px] font-normal text-ink-3">No. {q.membershipNo}</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{q.boardOrUniv}</td>
                  <td className="px-4 py-3 text-ink-2">{q.state}</td>
                  <td className="tabular px-4 py-3 text-ink-2">{q.passingYear}</td>
                  <td className="px-4 py-3">
                    {q.certificateUrl ? (
                      <a href={q.certificateUrl} target="_blank" rel="noopener" className="text-[12px] font-semibold text-brand hover:underline">View</a>
                    ) : <span className="text-[12px] text-ink-4">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteQualificationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <button type="submit" className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-3 hover:border-danger hover:text-danger">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
