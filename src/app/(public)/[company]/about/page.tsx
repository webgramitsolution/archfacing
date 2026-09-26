import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/ui'
import { getAssociate, disciplineOf, tierLabel } from '@/lib/design-associates'

/**
 * About Us — the associate's own profile, as they wrote it.
 *
 * Every line comes from `ProfessionalProfile` and `User`, which their
 * dashboard owns. There is no About form belonging to the storefront: edit the
 * profile and this page changes, because it is the same record.
 */

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const a = await getAssociate((await params).company)
  if (!a) return { title: 'Not found' }
  return { title: `About — ${a.firmName || a.name}` }
}

export default async function Page({ params }: { params: Promise<{ company: string }> }) {
  const a = await getAssociate((await params).company)
  if (!a) notFound()

  const who = a.firmName || a.name

  return (
    <div className="container-af grid gap-7 py-7 md:grid-cols-[1fr_320px] lg:items-start">
      <div className="min-w-0">
        <h2 className="font-display text-[20px] font-bold text-ink">About {who}</h2>

        {a.bio ? (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">
            {a.bio}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-ink-3">
            {who} has not written a profile description yet.
          </p>
        )}

        {a.categories.length > 0 && (
          <>
            <h3 className="mt-7 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
              Specialisations
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {a.categories.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-card border border-line bg-paper px-3 py-2.5"
                >
                  <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-ok" />
                  <span className="min-w-0 truncate text-[12.5px] capitalize text-ink-2">
                    {c.replace(/-/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <aside className="min-w-0">
        <div className="card p-4">
          <h3 className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
            Associate Details
          </h3>
          <dl className="flex flex-col gap-2.5 text-[13px]">
            {a.designaType && (
              <Row
                label="Classification"
                value={`${a.designaType} — ${disciplineOf(a.designaType)}`}
              />
            )}
            {a.tier && <Row label="Category" value={tierLabel(a.tier)} />}
            <Row label="Location" value={a.location || '—'} />
            {a.experience != null && <Row label="Experience" value={`${a.experience} years`} />}
            {a.coaNumber && <Row label="COA" value={a.coaNumber} />}
            <Row
              label="On ArchFacing"
              value={a.memberSince.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            />
          </dl>
        </div>

        {/* §3.1.7.1 — the PACT is what makes them an associate */}
        {a.pacts.length > 0 && (
          <div className="card mt-4 p-4">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
              <Icon name="target" className="h-4 w-4 text-brand" />
              PACT Territory
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {a.pacts.map((p) => (
                <li
                  key={p.pincode + p.serviceType}
                  className="tabular rounded-card border border-brand-border bg-brand-soft px-2.5 py-1 text-[11.5px] font-semibold text-brand"
                >
                  {p.pincode}
                  {p.city && <span className="font-normal"> · {p.city}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-snug text-ink-3">
              A PIN Area Code Territory is held by one associate at a time.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-2.5 last:border-0 last:pb-0">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}
