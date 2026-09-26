import { SettingsPanel, InfoRow } from '../settings-parts'

export const metadata = { title: 'Language & Region · ArchFacing' }

/**
 * ArchFacing runs in English for an India audience today — there is no
 * translation layer or multi-region routing behind the platform yet, so this
 * panel states the current setting honestly rather than offering a language
 * picker that would change nothing.
 */
export default function Page() {
  return (
    <SettingsPanel icon="globe" title="Language & Region" subtitle="Set your language and location preferences">
      <div className="grid gap-x-8 md:grid-cols-2">
        <InfoRow label="Language" value="English" />
        <InfoRow label="Region" value="India" />
        <InfoRow label="Currency" value="₹ Indian Rupee (INR)" />
        <InfoRow label="Time zone" value="IST (UTC+5:30)" />
      </div>
      <p className="mt-4 rounded-card border border-line-soft bg-paper-2 px-4 py-3 text-[12.5px] text-ink-3">
        Additional languages are on the roadmap. Your city and PIN code — which drive PACT and nearby
        results — are managed under Personal Information.
      </p>
    </SettingsPanel>
  )
}
