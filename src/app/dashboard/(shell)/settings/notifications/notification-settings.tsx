'use client'

import { useMemo, useState, useTransition } from 'react'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  CHANNELS,
  CHANNEL_META,
  DEFAULT_PREFS,
  NOTIF_GROUPS,
  type Channel,
  type NotifPrefs,
} from '@/lib/notification-prefs'
import { resetNotificationPrefsAction, saveNotificationPrefsAction } from './actions'

export function NotificationSettings({ initial }: { initial: NotifPrefs }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initial)
  const [saved, setSaved] = useState<string>(() => JSON.stringify(initial))
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  const dirty = JSON.stringify(prefs) !== saved

  function toggle(itemKey: string, ch: Channel) {
    setPrefs((prev) => ({ ...prev, [itemKey]: { ...prev[itemKey], [ch]: !prev[itemKey][ch] } }))
    setFlash(null)
  }

  /** A channel card is a master switch for its whole column. */
  function toggleColumn(ch: Channel) {
    const allOn = Object.values(prefs).every((row) => row[ch])
    setPrefs((prev) => Object.fromEntries(Object.entries(prev).map(([k, row]) => [k, { ...row, [ch]: !allOn }])))
    setFlash(null)
  }

  const columnState = useMemo(() => {
    const s = {} as Record<Channel, 'all' | 'some' | 'none'>
    for (const ch of CHANNELS) {
      const vals = Object.values(prefs).map((r) => r[ch])
      s[ch] = vals.every(Boolean) ? 'all' : vals.some(Boolean) ? 'some' : 'none'
    }
    return s
  }, [prefs])

  function save() {
    const snapshot = JSON.stringify(prefs)
    startTransition(async () => {
      const res = await saveNotificationPrefsAction(prefs)
      if (res.ok) {
        setSaved(snapshot)
        setFlash({ ok: true, text: 'Your notification preferences have been saved.' })
      } else {
        setFlash({ ok: false, text: res.error ?? 'Could not save. Please try again.' })
      }
    })
  }

  function reset() {
    startTransition(async () => {
      const res = await resetNotificationPrefsAction()
      if (res.ok) {
        const d = structuredClone(DEFAULT_PREFS)
        setPrefs(d)
        setSaved(JSON.stringify(d))
        setFlash({ ok: true, text: 'Notification preferences reset to default.' })
      } else {
        setFlash({ ok: false, text: 'Could not reset. Please try again.' })
      }
    })
  }

  return (
    <section className="card overflow-hidden">
      {/* ─── panel header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
            <Icon name="bell" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-[18px] font-bold leading-tight text-navy">Notification Settings</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-3">Choose how and when you want to be notified</p>
          </div>
        </div>
        <button type="button" onClick={reset} disabled={pending} className="btn-outline px-3.5 py-2 text-[12.5px]">
          <Icon name="clock" className="h-4 w-4" />
          Reset to Default
        </button>
      </div>

      {/* the body scrolls sideways on a narrow tablet rather than squashing the
          four toggle columns — the layout stays identical to the computer */}
      <div className="overflow-x-auto px-4 py-5 lg:px-6">
        <div className="min-w-[360px] space-y-7">
          {/* ─── channel master cards ─── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CHANNELS.map((ch) => {
              const st = columnState[ch]
              const m = CHANNEL_META[ch]
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleColumn(ch)}
                  aria-pressed={st !== 'none'}
                  title={`Turn ${m.label} ${st === 'all' ? 'off' : 'on'} for everything`}
                  className={cn(
                    'flex items-center gap-3 rounded-card border px-3.5 py-3 text-left transition-colors',
                    st === 'all'
                      ? 'border-info bg-info text-white shadow-card'
                      : st === 'some'
                        ? 'border-info/40 bg-info-soft text-ink'
                        : 'border-line bg-paper-2 text-ink hover:border-ink-3'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      st === 'all' ? 'bg-white/15 text-white' : cn('bg-paper', m.tint)
                    )}
                  >
                    <Icon name={m.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-[13px] font-bold', st === 'all' ? 'text-white' : 'text-ink')}>
                      {m.cardTitle}
                    </span>
                    <span className={cn('block truncate text-[11px]', st === 'all' ? 'text-white/80' : 'text-ink-3')}>
                      {m.cardSub}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* ─── groups ─── */}
          {NOTIF_GROUPS.map((group, gi) => (
            <div key={group.key}>
              {/* group header row — the channel column labels ride on the first one */}
              <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-end gap-x-2 border-b border-line-soft pb-2.5">
                <div>
                  <h3 className="font-display text-[15px] font-bold text-ink">{group.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">{group.desc}</p>
                </div>
                {CHANNELS.map((ch) => (
                  <div key={ch} className="flex flex-col items-center gap-1 pb-0.5">
                    {gi === 0 && (
                      <>
                        <Icon name={CHANNEL_META[ch].icon} className={cn('h-4 w-4', CHANNEL_META[ch].tint)} />
                        <span className="text-[10px] font-semibold text-ink-3">{CHANNEL_META[ch].label}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* item rows */}
              <div>
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-x-2 border-b border-line-soft py-3 last:border-0"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{item.desc}</p>
                    </div>
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="flex justify-center">
                        <Toggle on={prefs[item.key][ch]} onClick={() => toggle(item.key, ch)} label={`${item.title} — ${CHANNEL_META[ch].label}`} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── footer ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-paper-2 px-5 py-3.5 md:px-6">
        <div className="min-h-[20px] text-[12.5px]">
          {flash ? (
            <span className={cn('inline-flex items-center gap-1.5 font-medium', flash.ok ? 'text-ok' : 'text-danger')}>
              <Icon name={flash.ok ? 'check' : 'alert'} className="h-4 w-4" />
              {flash.text}
            </span>
          ) : dirty ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-warn">
              <Icon name="alert" className="h-4 w-4" />
              You have unsaved changes
            </span>
          ) : (
            <span className="text-ink-4">All changes saved</span>
          )}
        </div>
        <button type="button" onClick={save} disabled={pending || !dirty} className="btn-primary px-5 py-2.5">
          <Icon name="check" className="h-4 w-4" />
          {pending ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </section>
  )
}

/** The pill switch used in every toggle cell. */
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors',
        on ? 'bg-info' : 'bg-ink/15'
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all',
          on ? 'left-[21px]' : 'left-[3px]'
        )}
      />
    </button>
  )
}
