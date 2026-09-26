'use client'

/**
 * The phone listing selects (Products / Projects).
 *
 * A plain <select> inside (or attached by `form=` to) the page's GET filter
 * form. Picking an option submits that form straight away, so the phone never
 * needs an "Apply" tap — the filter tile beside the selects still submits it
 * for anyone without JavaScript.
 */
export function PhoneSelect({
  name,
  label,
  srLabel,
  value,
  options,
  form,
  className = '',
}: {
  name: string
  /** The first, empty option — also the accessible name unless `srLabel` is given. */
  label: string
  srLabel?: string
  value: string
  options: { value: string; label: string }[]
  form?: string
  className?: string
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{srLabel ?? label}</span>
      <select
        name={name}
        form={form}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 w-full min-w-0 appearance-none truncate rounded-[10px] border border-line bg-white pl-2.5 pr-6 text-[12px] font-semibold text-ink outline-none focus:border-brand"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  )
}
