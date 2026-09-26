import { requireAuth } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { ConfirmSubmitButton } from '@/components/form'
import { getVerificationConfig, documentsFor, docKindFor } from '@/lib/verification-config'
import { SettingsPanel } from '../settings-parts'
import { UploadDocumentForm } from './upload-form'
import { removeMyDocumentAction } from './actions'

export const metadata = { title: 'Verification Documents' }
export const dynamic = 'force-dynamic'

const PILL: Record<string, [string, string]> = {
  SUBMITTED: ['pill-info', 'In review'],
  ACCEPTED: ['pill-ok', 'Accepted'],
  REJECTED: ['pill-warn', 'Rejected'],
}

export default async function Page() {
  const me = await requireAuth()
  const [u, cfg, docs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: { status: true, professionalProfile: { select: { tier: true } }, buyerProfile: { select: { accountType: true } } },
    }),
    getVerificationConfig(),
    prisma.verificationDocument.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, docName: true, fileName: true, url: true, status: true, note: true, createdAt: true },
    }),
  ])
  const types = documentsFor(cfg, docKindFor(me.role, u?.professionalProfile?.tier, u?.buyerProfile?.accountType))
  const missing = types.filter((t) => t.required && !docs.some((d) => d.docName === t.name && d.status !== 'REJECTED'))
  const minDocs = me.role === 'CLIENT'
    ? cfg.rules[u?.buyerProfile?.accountType === 'COMPANY' ? 'BUYER_COMPANY' : 'BUYER_INDIVIDUAL'].minDocs
    : 0
  const usable = docs.filter((d) => d.status !== 'REJECTED').length

  return (
    <div className="space-y-5">
      <SettingsPanel icon="file" title="Verification Documents" subtitle="Upload the documents our team needs to verify your account">
        <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
          <span className={u?.status === 'ACTIVE' ? 'pill-ok' : 'pill-warn'}>{u?.status === 'ACTIVE' ? 'Account verified' : 'Verification pending'}</span>
          {minDocs > 0 && <span className={usable >= minDocs ? 'pill-ok' : 'pill-info'}>{usable} of {minDocs} documents</span>}
          {missing.length > 0 && <span className="pill-warn">Still needed: {missing.map((m) => m.name).join(', ')}</span>}
        </div>
        {types.length === 0 ? (
          <p className="text-[13px] text-ink-3">No documents are needed for your account type right now.</p>
        ) : (
          <UploadDocumentForm types={types.map((t) => ({ id: t.id, name: t.name, required: t.required }))} />
        )}
      </SettingsPanel>

      <SettingsPanel icon="list" title="Your uploads" subtitle={`${docs.length} document${docs.length === 1 ? '' : 's'}`}>
        {docs.length === 0 ? (
          <p className="text-[13px] text-ink-3">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {docs.map((d) => {
              const [pill, label] = PILL[d.status] ?? ['pill-muted', d.status]
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{d.docName}</p>
                    <p className="truncate text-[11.5px] text-ink-3">
                      <a href={d.url} target="_blank" rel="noopener" className="hover:text-brand hover:underline">{d.fileName}</a>
                      {' · '}{d.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {d.status === 'REJECTED' && d.note && <p className="mt-0.5 text-[11.5px] text-warn">{d.note}</p>}
                  </div>
                  <span className={pill}>{label}</span>
                  {d.status !== 'ACCEPTED' && (
                    <form action={removeMyDocumentAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <ConfirmSubmitButton className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-3 hover:border-danger hover:text-danger" title="Remove this document?" body="The uploaded file will be withdrawn from your verification documents." confirmLabel="Remove" pendingLabel="Removing…">Remove</ConfirmSubmitButton>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </SettingsPanel>
    </div>
  )
}
