'use client'

import { isValidElement, useId } from 'react'

/**
 * A form field's caption tied to its control, for the admin wizards and filters.
 *
 * Their local `Field` / `F` helpers used to render a bare `<label>` next to the
 * input with no `htmlFor`, so screen readers announced unlabelled fields.
 *
 *  · A single <input>, <select> or <textarea> is wrapped in the <label>, which
 *    associates the two without needing ids.
 *  · Anything else (a radio group, a pair of date inputs) is a group named by
 *    the caption — wrapping it in a <label> would nest labels inside labels.
 *
 * The caption keeps the caller's class, so nothing changes visually.
 */
export function LabeledField({
  label,
  labelClassName,
  className,
  children,
}: {
  label: React.ReactNode
  labelClassName: string
  className?: string
  children: React.ReactNode
}) {
  const id = useId()
  const single =
    isValidElement(children) &&
    typeof children.type === 'string' &&
    ['input', 'select', 'textarea'].includes(children.type)

  if (single) {
    return (
      <label className={className ?? 'block'}>
        <span className={labelClassName}>{label}</span>
        {children}
      </label>
    )
  }

  return (
    <div role="group" aria-labelledby={id} className={className}>
      <span id={id} className={labelClassName}>
        {label}
      </span>
      {children}
    </div>
  )
}
