import Link from 'next/link'
import type { Pact } from '@prisma/client'
import { renewalOpen } from '@/lib/pact'

/** My current PACTs — shown at the top of the dashboard */
export function MyPactList({ pacts }: { pacts: Pact[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Your PACTs</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pacts.map((p) => {
          const renewable = renewalOpen(p)

          return (
            <li
              key={p.id}
              className={`rounded-card border bg-paper-2 p-4 ${
                p.status === 'SUSPENDED'
                  ? 'border-brand border-l-[3px]'
                  : 'border-line'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-lg font-semibold">{p.pincode}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    p.status === 'ACTIVE'
                      ? 'text-ok'
                      : p.status === 'RESERVED'
                        ? 'text-info'
                        : 'text-brand'
                  }`}
                >
                  {p.status === 'ACTIVE'
                    ? 'Active'
                    : p.status === 'RESERVED'
                      ? 'Reserved'
                      : 'Suspended'}
                </span>
              </div>

              <p className="mt-0.5 text-[13px] text-ink-2">
                {p.city ? `${p.city} · ` : ''}
                {p.state}
              </p>

              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                {p.serviceType}
                {p.subCategory !== '-' && ` · ${p.subCategory.replace(/-/g, ' ')}`}
              </p>

              {p.status === 'ACTIVE' && p.expiresAt && (
                <p className="mt-2 text-[12.5px] text-ink-3">
                  Valid until{' '}
                  {p.expiresAt.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}

              {renewable && (
                <Link href="/dashboard/pact/renew" className="mt-2 inline-block text-[12.5px] font-semibold text-brand hover:underline">
                  Renewal is open — renew now →
                </Link>
              )}

              {p.status === 'SUSPENDED' && p.suspensionReason && (
                <p className="mt-2 text-[12.5px] text-brand">{p.suspensionReason}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
