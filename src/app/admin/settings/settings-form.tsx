'use client'

import { useActionState } from 'react'
import { saveSettingsAction, type SettingsState } from './actions'
import { Field, Input, Textarea, Button, Alert } from '@/components/form'
import { SectionHead } from '@/components/ui'
import {
  SETTING_GROUPS,
  settingsInGroup,
  type SettingDef,
} from '@/config/site-settings'

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [state, submit, pending] = useActionState<SettingsState | null, FormData>(
    saveSettingsAction,
    null
  )

  const err = (key: string) => state?.fieldErrors?.[key]
  /** Prefer what the admin last typed, so an error never wipes the form */
  const val = (key: string) => state?.values?.[key] ?? initial[key] ?? ''

  return (
    <form
      // remount on every result so the fields pick up the returned values
      key={state ? `r${state.saved ?? 0}-${state.ok}-${Object.keys(state.fieldErrors ?? {}).length}` : 'r0'}
      action={submit}
      className="flex flex-col gap-8"
    >
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      {state?.ok && (
        <Alert tone="success">
          {state.saved === 0
            ? 'Nothing to save — every setting already holds this value.'
            : `${state.saved} ${state.saved === 1 ? 'setting was' : 'settings were'} updated.`}
        </Alert>
      )}

      {SETTING_GROUPS.map((group) => (
        <section key={group} className="card p-6">
          <SectionHead title={group}>{GROUP_NOTE[group]}</SectionHead>

          <div className="grid gap-5 sm:grid-cols-2">
            {settingsInGroup(group).map((def) => (
              <div
                key={def.key}
                className={
                  def.kind === 'textarea' || def.kind === 'boolean'
                    ? 'sm:col-span-2'
                    : undefined
                }
              >
                <SettingField def={def} value={val(def.key)} error={err(def.key)} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
        <p className="text-[12.5px] text-ink-3">
          Only the values you changed are written to the database.
        </p>
      </div>
    </form>
  )
}

const GROUP_NOTE: Record<string, string> = {
  Contact: 'Shown to visitors on the Contact page and in the site footer',
  'Social Media': 'The footer social plugs. A blank URL hides its icon',
  Commerce: 'Applied to merchandise orders and invoices',
  Content: 'How public listings behave',
  Platform: 'Site-wide notices and switches',
}

function SettingField({
  def,
  value,
  error,
}: {
  def: SettingDef
  value: string
  error?: string
}) {
  if (def.kind === 'boolean') {
    const on = value === 'true'
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-paper-3 p-4">
        <input
          type="checkbox"
          name={def.key}
          defaultChecked={on}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">{def.label}</span>
          <span className="block text-[12px] text-ink-3">{def.help}</span>
        </span>
      </label>
    )
  }

  if (def.kind === 'textarea') {
    return (
      <Field
        label={def.label}
        name={def.key}
        required={def.required}
        hint={def.help}
        error={error}
      >
        <Textarea
          id={def.key}
          name={def.key}
          rows={3}
          defaultValue={value}
          error={!!error}
        />
      </Field>
    )
  }

  const type =
    def.kind === 'number'
      ? 'number'
      : def.kind === 'email'
        ? 'email'
        : def.kind === 'url'
          ? 'url'
          : 'text'

  return (
    <Field
      label={def.label}
      name={def.key}
      required={def.required}
      hint={def.help}
      error={error}
    >
      <Input
        id={def.key}
        name={def.key}
        type={type}
        min={def.min}
        max={def.max}
        step={def.kind === 'number' ? 1 : undefined}
        defaultValue={value}
        error={!!error}
      />
    </Field>
  )
}
