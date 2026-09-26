import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermission } from '@/lib/guard'
import { getBrandLogos } from '@/lib/brand-logos'
import { AdminPageHead, Panel } from '@/components/admin/parts'
import { brandLogoOpAction } from './actions'
import { AddBrandForm, EditBrandForm, LogoTile } from './brand-forms'

export const metadata: Metadata = { title: 'Trusted Brands' }
export const dynamic = 'force-dynamic'

/**
 * Trusted Brands — the logo strip under "Trusted by leading brands &
 * organisations" on the home page and "Our partners" on the club page.
 * Upload any logo; it is trimmed, fitted and shown exactly as previewed here.
 */
export default async function TrustedBrandsPage() {
  await requirePermission('admin:settings')
  const logos = await getBrandLogos({ includeHidden: true })
  const shown = logos.filter((l) => l.active)

  return (
    <div className="space-y-5">
      <AdminPageHead
        title="Trusted Brands"
        action={<Link href="/admin/settings" className="rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:border-ink-4">← Website Settings</Link>}
      />

      <Panel title="Live strip" subtitle={`${shown.length} shown`} action={<Link href="/#trusted-brands" className="text-[12px] font-semibold text-brand hover:underline">View on home page ›</Link>}>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-3">No logos are shown — the strip is hidden until you add one.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto rounded-lg bg-paper-2 p-4">
            {shown.map((l) => <LogoTile key={l.id} src={l.src} name={l.name} />)}
          </div>
        )}
      </Panel>

      <Panel title="Add a logo">
        <AddBrandForm />
        <p className="mt-3 text-[11px] text-ink-4">Any size or shape works: empty margins are trimmed automatically, transparency is kept, and the logo is centred in its tile. Use a logo only with the organisation’s permission.</p>
      </Panel>

      <Panel title="All logos" subtitle={String(logos.length)}>
        {logos.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-3">Nothing here yet.</p>
        ) : (
          <ol className="divide-y divide-line-soft">
            {logos.map((b, i) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-6 text-center text-[12px] font-semibold text-ink-4">{i + 1}</span>
                <div className="min-w-0 flex-1"><EditBrandForm b={b} /></div>
                <div className="flex gap-1">
                  {(['UP', 'DOWN', 'DELETE'] as const).map((op) => (
                    <form key={op} action={brandLogoOpAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="op" value={op} />
                      <button
                        type="submit"
                        disabled={(op === 'UP' && i === 0) || (op === 'DOWN' && i === logos.length - 1)}
                        aria-label={op === 'UP' ? 'Move left' : op === 'DOWN' ? 'Move right' : `Remove ${b.name}`}
                        className={'h-8 rounded-md px-2.5 text-[12px] font-semibold disabled:opacity-30 ' + (op === 'DELETE' ? 'bg-danger-soft text-danger' : 'border border-line text-ink-2 hover:border-brand')}
                      >
                        {op === 'UP' ? '←' : op === 'DOWN' ? '→' : 'Remove'}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}
