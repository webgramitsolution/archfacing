'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import type { LeadDetail, LeadRecipientView } from '@/lib/admin-leads'
import { ManageBox, NotesPanel, ReplyBox, RouteBox } from './lead-manage'

/**
 * Right-side enquiry detail drawer. Receives the fully-resolved LeadDetail from
 * the server page (fetched via leadDetail) and switches tabs client-side. The
 * "Assigned Users" tab is the point of the whole module — who received the
 * lead, why, and how each delivery is progressing.
 */

const fmtDateTime = (d: Date) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const STATUS_BADGE: Record<string, string> = {
  NEW: 'bg-[#EAF2FF] text-[#2563EB]', ASSIGNED: 'bg-[#EAF2FF] text-[#2563EB]',
  IN_PROGRESS: 'bg-warn-soft text-warn', RESPONDED: 'bg-ok-soft text-ok',
  CONVERTED: 'bg-ok-soft text-ok', CLOSED: 'bg-paper-3 text-ink-3', UNROUTED: 'bg-danger-soft text-danger',
}
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export function LeadDrawer({ d, closeHref }: { d: LeadDetail; closeHref: string }) {
  const [tab, setTab] = useState<'details' | 'assigned' | 'notes' | 'activity'>('assigned')
  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'assigned', label: `Assigned Users (${d.recipients.length})` },
    { key: 'notes', label: `Notes (${d.notes.length})` },
    { key: 'activity', label: 'Activity' },
  ] as const

  return (
    <aside className="flex w-[286px] shrink-0 flex-col rounded-card border border-line bg-white shadow-card">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-[15px] font-bold text-ink">Enquiry Details</h2>
        <Link href={closeHref} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-4 hover:bg-paper-3 hover:text-ink"><Icon name="alert" className="h-4 w-4 rotate-45" /></Link>
      </div>

      {/* person */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">{initials(d.contactName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink">{d.contactName}</p>
            <p className="truncate text-[11.5px] text-ink-3">{d.sourceTitle ?? d.sourceLabel}</p>
          </div>
          <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_BADGE[d.status] ?? 'bg-paper-3 text-ink-3'}`}>{label(d.status)}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <a href={`tel:${d.contactPhone}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand"><Icon name="phone" className="h-3.5 w-3.5" /> Call</a>
          <a href={`https://wa.me/${d.contactPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-semibold text-ink-2 hover:border-ok hover:text-ok"><Icon name="phone" className="h-3.5 w-3.5" /> WhatsApp</a>
          <a href={`mailto:${d.contactEmail ?? ''}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11.5px] font-semibold text-ink-2 hover:border-brand hover:text-brand"><Icon name="mail" className="h-3.5 w-3.5" /> Email</a>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-3 flex items-center gap-1 border-b border-line px-3">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={'border-b-2 px-2 py-2 text-[11.5px] font-medium transition-colors ' + (tab === t.key ? 'border-brand text-brand' : 'border-transparent text-ink-3 hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'details' && <DetailsTab d={d} />}
        {tab === 'assigned' && <AssignedTab d={d} />}
        {tab === 'notes' && <NotesPanel d={d} />}
        {tab === 'activity' && <ActivityTab d={d} />}
      </div>

      {/* footer */}
      <div className="border-t border-line p-3">
        <ReplyBox d={d} />
      </div>
    </aside>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft py-2 last:border-0">
      <span className="text-[11.5px] text-ink-3">{k}</span>
      <span className="text-right text-[12px] font-medium text-ink">{v}</span>
    </div>
  )
}

function DetailsTab({ d }: { d: LeadDetail }) {
  return (
    <div>
      <Row k="Enquiry ID" v={<span className="font-mono text-[11px]">{d.id.slice(-10).toUpperCase()}</span>} />
      <Row k="Enquiry Type" v={d.sourceLabel} />
      <Row k="Customer" v={d.contactName} />
      <Row k="Phone" v={d.contactPhone} />
      <Row k="Email" v={d.contactEmail ?? '—'} />
      <Row k="Category" v={d.category ?? '—'} />
      <Row k="Product / Project" v={d.sourceTitle ?? '—'} />
      <Row k="Location" v={[d.city, d.state].filter(Boolean).join(', ') || '—'} />
      <Row k="Pincode" v={<span className="font-mono">{d.pincode}</span>} />
      <Row k="Source" v={d.sourceLabel} />
      <Row k="Date & Time" v={fmtDateTime(d.createdAt)} />
      <Row k="Current Status" v={label(d.status)} />
      <div className="mt-3 rounded-lg bg-paper-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Message</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{d.message}</p>
      </div>
      <Row k="Handled by" v={d.employeeName ?? 'Nobody yet'} />
      <ManageBox d={d} />
    </div>
  )
}

function RecipientCard({ r, index, pactOrdinal, extraCount }: { r: LeadRecipientView; index: number; pactOrdinal: number; extraCount: number }) {
  const isDirect = r.type === 'DIRECT'
  const heading = isDirect
    ? `${index}. Direct Lead (Website Owner)`
    : pactOrdinal === 1
      ? `${index}. PACT Lead (Same Pincode + Category)`
      : `${index}. Additional PACT Recipient${extraCount > 1 ? `s (${extraCount})` : ''}`
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-bold text-ink">{heading}</p>
      <div className="rounded-lg border border-line p-3">
        <div className="flex items-center gap-2.5">
          <span className={'flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold ' + (isDirect ? 'bg-ok-soft text-ok' : 'bg-[#EAF2FF] text-[#2563EB]')}>{initials(r.company ?? r.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{r.company ?? r.name}</p>
            <p className="truncate text-[10.5px] text-ink-3">{isDirect ? 'Primary Recipient' : 'PACT Holder'}</p>
          </div>
          <span className={'rounded-pill px-2 py-0.5 text-[10px] font-bold ' + (isDirect ? 'bg-ok-soft text-ok' : 'bg-[#EAF2FF] text-[#2563EB]')}>{isDirect ? 'Direct' : 'PACT'}</span>
        </div>
        {r.sentAt && <p className="mt-2 text-[10.5px] text-ink-3">Sent on {fmtDateTime(r.sentAt)}</p>}
        {r.reason && !isDirect && (
          <p className="mt-2 rounded-md bg-paper-2 px-2.5 py-1.5 text-[10.5px] text-ink-2"><span className="font-semibold">Reason:</span> {r.reason}.</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-3">
          <span className={'rounded-pill px-1.5 py-0.5 font-semibold ' + deliveryTint(r.deliveryStatus)}>{label(r.deliveryStatus)}</span>
          {r.openedAt && <span>· Opened</span>}
          {r.respondedAt && <span>· Responded</span>}
          {r.convertedAt && <span>· Converted</span>}
        </div>
      </div>
    </div>
  )
}

function deliveryTint(s: string): string {
  if (s === 'CONVERTED' || s === 'RESPONDED') return 'bg-ok-soft text-ok'
  if (s === 'OPENED' || s === 'DELIVERED') return 'bg-[#EAF2FF] text-[#2563EB]'
  if (s === 'FAILED') return 'bg-danger-soft text-danger'
  return 'bg-paper-3 text-ink-3'
}

function AssignedTab({ d }: { d: LeadDetail }) {
  if (d.recipients.length === 0) {
    return (
      <div className="py-8 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-warn-soft text-warn"><Icon name="alert" className="h-5 w-5" /></span>
        <p className="mt-2 text-[12.5px] font-semibold text-ink">Unassigned</p>
        <p className="mt-1 text-[11.5px] text-ink-3">No owner and no matching PACT holder. Route it to a member below.</p>
        <div className="mt-4 text-left"><RouteBox id={d.id} /></div>
      </div>
    )
  }
  let pactSeen = 0
  const extraPact = Math.max(0, d.pactCount - 1)
  return (
    <div className="space-y-4">
      {d.recipients.map((r, i) => {
        const pactOrdinal = r.type === 'PACT' ? ++pactSeen : 0
        return <RecipientCard key={r.id} r={r} index={i + 1} pactOrdinal={pactOrdinal} extraCount={extraPact} />
      })}

      {/* Lead route summary */}
      <div>
        <p className="mb-2 text-[12px] font-bold text-ink">Lead Route Summary</p>
        <div className="flex items-center gap-3 rounded-lg bg-paper-2 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white"><Icon name="inbox" className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold text-ink">Enquiry Received</p>
            <p className="text-[10.5px] text-ink-3">{d.sourceLabel}</p>
          </div>
          <Icon name="arrow" className="h-4 w-4 shrink-0 text-ink-4" />
          <div className="shrink-0 text-right">
            <p className="text-[10.5px] text-ink-2">{d.directCount} Direct Recipient</p>
            <p className="text-[10.5px] text-ink-2">+ {d.pactCount} PACT Recipient{d.pactCount === 1 ? '' : 's'}</p>
            <p className="text-[11px] font-bold text-ink">Total: {d.recipients.length} User{d.recipients.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>
      <RouteBox id={d.id} />
    </div>
  )
}

function ActivityTab({ d }: { d: LeadDetail }) {
  const events = [
    { at: d.createdAt, text: 'Enquiry created' },
    ...d.recipients.map((r) => ({ at: r.sentAt ?? d.createdAt, text: `${r.type === 'DIRECT' ? 'Direct' : 'PACT'} Lead → ${r.company ?? r.name}` })),
    ...d.log.map((l) => ({
      at: l.at,
      text: `${{ LEAD_UPDATED: 'Updated', LEAD_REPLIED: 'Replied', LEAD_ROUTED: 'Routed' }[l.action] ?? l.action.replace(/_/g, ' ').toLowerCase()}${l.detail ? ` — ${l.detail}` : ''} · ${l.by}`,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-2">{e.text}</p>
            <p className="text-[10.5px] text-ink-4">{fmtDateTime(e.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
