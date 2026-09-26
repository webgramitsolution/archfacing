import { Icon } from '@/components/ui'

/**
 * Pieces the admin Add wizards share, so each saves the same way.
 * Server-safe (no hooks) — plain inputs that post with the wizard's form.
 */

/** One upload box per document type from Verification Settings; posts as doc_<id>. */
export function DocInputs({ types }: { types: { id: string; name: string; required: boolean }[] }) {
  if (types.length === 0) {
    return <p className="text-[12.5px] text-ink-3">No document types apply to this account — add them in Verification Settings.</p>
  }
  return (
    <div className="grid grid-cols-3 gap-4">
      {types.map((d) => (
        <label key={d.id} className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-2">{d.name}{d.required && <span className="text-danger"> *</span>}</span>
          <span className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-2 px-2 text-center text-ink-4">
            <Icon name="download" className="h-5 w-5 rotate-180" />
            <input type="file" name={`doc_${d.id}`} accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 w-full text-[10.5px] file:mr-1 file:rounded file:border-0 file:bg-white file:px-2 file:py-1 file:text-[10.5px] file:font-semibold" />
            <span className="text-[9.5px]">JPG, PNG, PDF</span>
          </span>
        </label>
      ))}
    </div>
  )
}

/** Email / SMS / WhatsApp switches → the member's notification matrix. */
export function NotifyChannels() {
  return (
    <div className="flex flex-wrap gap-4">
      <input type="hidden" name="notify_present" value="1" />
      {[['notify_email', 'Email Notifications'], ['notify_sms', 'SMS Notifications'], ['notify_whatsapp', 'WhatsApp Notifications']].map(([n, l]) => (
        <label key={n} className="flex items-center gap-2 text-[11.5px] text-ink-2">
          <input type="checkbox" name={n} defaultChecked className="h-3.5 w-3.5 rounded border-line accent-brand" /> {l}
        </label>
      ))}
    </div>
  )
}

/** "Email the login details" switch. Unticked → the password is shown to the admin once. */
export function SendCredentials({ who }: { who: string }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-ink-2">
      <input type="checkbox" name="sendCredentials" defaultChecked className="h-3.5 w-3.5 rounded border-line accent-brand" /> Send login credentials to the {who} by email
    </label>
  )
}

/** Shown on the success screen when credentials were not emailed. */
export function OneTimePassword({ password }: { password?: string }) {
  if (!password) return null
  return (
    <p className="mx-auto mt-3 max-w-md rounded-lg bg-warn-soft px-3 py-2 text-[12px] text-warn">
      Credentials were not emailed. Temporary password (shown once): <span className="font-mono font-bold">{password}</span> — the user must change it on first sign-in.
    </p>
  )
}
