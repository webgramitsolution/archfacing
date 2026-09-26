'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { cn } from '@/lib/utils'
import { Icon } from './ui'
import { ConfirmDialog } from './confirm-dialog'

/**
 * The building blocks for forms.
 * The legends from PDF §7.9 are honoured here — ★ compulsory, the rest optional.
 */

export function Field({
  label,
  name,
  required,
  hint,
  error,
  children,
}: {
  label: string
  name: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[13px] font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-brand" aria-label="required">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-brand">
          <Icon name="alert" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input {...props} className={cn('input', error && 'input-error', className)} />
  )
}

export function Select({
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select {...props} className={cn('input', error && 'input-error', className)}>
      {children}
    </select>
  )
}

export function Textarea({
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={cn('input leading-relaxed', error && 'input-error', className)}
    />
  )
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'dark' | 'outline' | 'ghost'
}) {
  const styles = {
    primary: 'btn-primary',
    dark: 'btn-dark',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
  }[variant]

  return (
    <button {...props} className={cn(styles, className)}>
      {children}
    </button>
  )
}

/**
 * A submit button for a server-action <form>: disabled while the form is
 * submitting, with a pending label, so a double click cannot send it twice.
 * Takes the caller's own className, so it looks exactly like the button it
 * replaces.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Working…',
  className,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} className={className}>
      {pending ? pendingLabel : children}
    </button>
  )
}

/**
 * A destructive submit for a server-action <form>. The click opens the shared
 * ConfirmDialog first; only "confirm" submits the surrounding form, so the
 * form and its server action are unchanged. Disabled while submitting.
 */
export function ConfirmSubmitButton({
  children,
  className,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  pendingLabel = 'Working…',
}: {
  children: React.ReactNode
  className?: string
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'warn'
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button ref={ref} type="button" onClick={() => setOpen(true)} disabled={pending} aria-busy={pending || undefined} className={className}>
        {pending ? pendingLabel : children}
      </button>
      {open && (
        <ConfirmDialog
          confirm={{
            title,
            body,
            confirmLabel,
            cancelLabel,
            tone,
            run: async () => {
              ref.current?.closest('form')?.requestSubmit()
              return { ok: true }
            },
          }}
          busy={pending}
          error={null}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false)
            ref.current?.closest('form')?.requestSubmit()
          }}
        />
      )}
    </>
  )
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info' | 'success'
  children: React.ReactNode
}) {
  const styles = {
    error: 'border-brand-border bg-brand-soft',
    info: 'border-info/25 bg-info-soft',
    success: 'border-ok/25 bg-ok-soft',
  }[tone]

  const icon = { error: 'alert', info: 'help', success: 'check' } as const
  const iconColor = {
    error: 'text-brand',
    info: 'text-info',
    success: 'text-ok',
  }[tone]

  return (
    <div className={cn('flex gap-3 rounded-card border px-4 py-3.5', styles)}>
      <span className={cn('shrink-0 pt-0.5', iconColor)}>
        <Icon name={icon[tone]} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink">
        {children}
      </div>
    </div>
  )
}

/** Progress indicator for the registration wizard */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                done && 'bg-ok text-white',
                now && 'bg-brand text-white',
                !done && !now && 'bg-paper-3 text-ink-4'
              )}
            >
              {done ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-[12.5px] font-medium sm:inline',
                now ? 'text-ink' : 'text-ink-3'
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'h-px flex-1',
                  done ? 'bg-ok' : 'bg-line'
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
