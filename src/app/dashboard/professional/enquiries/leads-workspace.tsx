'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatINR } from '@/lib/utils'
import { replyAction, setLeadStatusAction, uploadLeadAttachmentAction, type LeadConversation } from '../../enquiry-actions'

// ── status vocabulary ──────────────────────────────────────────
const STATUS_META: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'New', cls: 'bg-brand-soft text-brand' },
  ASSIGNED: { label: 'New', cls: 'bg-brand-soft text-brand' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-warn-soft text-warn' },
  RESPONDED: { label: 'Responded', cls: 'bg-info-soft text-info' },
  CONVERTED: { label: 'Converted', cls: 'bg-ok-soft text-ok' },
  CLOSED: { label: 'Closed', cls: 'bg-paper-3 text-ink-3' },
  UNROUTED: { label: 'Unrouted', cls: 'bg-paper-3 text-ink-3' },
}
const STATUS_OPTIONS = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED']

// ── time helpers ───────────────────────────────────────────────
function timeShort(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function timeFull(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

type Tab = 'all' | 'unread' | 'starred' | 'assigned' | 'converted' | 'today' | 'inconv'

export function LeadsWorkspace({
  conversations,
  kpis,
  myId,
  initialQuery = '',
}: {
  conversations: LeadConversation[]
  kpis: { total: number; newToday: number; inConversation: number; converted: number }
  myId: string
  /** Pre-filled search — set when arriving from a PACT row's "View Leads". */
  initialQuery?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState(initialQuery)
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null)
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<{ url: string; name: string }[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const [openAcc, setOpenAcc] = useState<'contact' | 'enquiry' | 'status' | 'activity'>('contact')
  const [pending, start] = useTransition()

  const unreadCount = conversations.filter((c) => c.unread).length

  const filtered = useMemo(() => {
    let list = conversations
    if (tab === 'unread') list = list.filter((c) => c.unread)
    else if (tab === 'starred') list = list.filter((c) => starred.has(c.id))
    else if (tab === 'converted') list = list.filter((c) => c.status === 'CONVERTED')
    else if (tab === 'assigned') list = list // all are assigned to me on this page
    else if (tab === 'today') {
      const s = new Date(); s.setHours(0, 0, 0, 0)
      list = list.filter((c) => c.unread && new Date(c.latestAt) >= s)
    } else if (tab === 'inconv') {
      list = list.filter((c) => ['IN_PROGRESS', 'RESPONDED', 'ASSIGNED'].includes(c.status))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        c.buyer.name.toLowerCase().includes(q) ||
        c.buyer.phone.includes(q) ||
        c.buyer.email.toLowerCase().includes(q) ||
        c.latestSubject.toLowerCase().includes(q) ||
        // PIN code too, so "View Leads" from a PACT row filters to that area
        (c.buyer.pincode ?? '').includes(q) ||
        c.enquiries.some((e) => (e.category ?? '').toLowerCase().includes(q) || (e.pincode ?? '').includes(q))
      )
    }
    return list
  }, [conversations, tab, query, starred])

  const active = conversations.find((c) => c.id === selectedId) ?? filtered[0] ?? null

  // flat, chronological thread for the active conversation
  const thread = useMemo(() => {
    if (!active) return []
    type Item =
      | { kind: 'enquiry'; at: string; e: LeadConversation['enquiries'][number] }
      | { kind: 'msg'; at: string; mine: boolean; text: string; attachments: string[] }
    const items: Item[] = []
    for (const e of active.enquiries) {
      items.push({ kind: 'enquiry', at: e.createdAt, e })
      for (const r of e.responses) {
        items.push({ kind: 'msg', at: r.createdAt, mine: r.senderId === myId, text: r.message, attachments: r.attachments })
      }
    }
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [active, myId])

  function send(text: string) {
    if (!active || (text.trim().length < 2 && files.length === 0)) return
    start(async () => {
      setSendError(null)
      const r = await replyAction(active.latestEnquiryId, text.trim() || 'Sent a file', files.map((f) => f.url))
      if (r.ok) { setDraft(''); setFiles([]); router.refresh() }
      else setSendError(r.error ?? 'Your reply could not be sent.')
    })
  }

  function attach(file: File | undefined) {
    if (!file) return
    start(async () => {
      setSendError(null)
      const fd = new FormData()
      fd.append('file', file)
      const r = await uploadLeadAttachmentAction(fd)
      if (r.ok) setFiles((fs) => [...fs, { url: r.url, name: r.name }].slice(0, 5))
      else setSendError(r.error)
    })
  }

  function changeStatus(status: string) {
    if (!active) return
    start(async () => {
      await setLeadStatusAction(active.latestEnquiryId, status)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4 md:h-full">
      {/* ═══ heading + KPI cards, one row ═══ */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 lg:flex-nowrap">
        <h1 className="shrink-0 font-display text-[15px] font-bold tracking-tight text-ink">
          Leads &amp; Enquiries
        </h1>
        <div className="grid flex-1 grid-cols-4 gap-2 sm:gap-3">
          <Kpi icon="users" label="Total Inquiries" value={kpis.total} tint="bg-info-soft text-info" active={tab === 'all'} onClick={() => setTab('all')} />
          <Kpi icon="clock" label="New Today" value={kpis.newToday} tint="bg-brand-soft text-brand" active={tab === 'today'} onClick={() => setTab('today')} />
          <Kpi icon="bell" label="In Conversation" value={kpis.inConversation} tint="bg-warn-soft text-warn" active={tab === 'inconv'} onClick={() => setTab('inconv')} />
          <Kpi icon="check" label="Converted" value={kpis.converted} tint="bg-ok-soft text-ok" active={tab === 'converted'} onClick={() => setTab('converted')} />
        </div>
      </div>

      {/* ═══ workspace ═══ */}
      {/* Height-bounded so the chat header and composer stay fixed while only
          the message area scrolls — from `md` up it is the same multi-column
          layout as desktop. */}
      <div className="grid min-h-[420px] gap-3 md:-mb-6 md:min-h-0 md:flex-1 md:grid-cols-[200px_minmax(0,1fr)_220px] lg:gap-4 lg:grid-cols-[280px_minmax(0,1fr)_290px]">
        {/* ─── LEFT: conversation list ─── */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white">
          <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line px-2 py-2 text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabBtn on={tab === 'all'} onClick={() => setTab('all')}>All <span className={tab === 'all' ? 'text-white' : 'text-ink-4'}>({conversations.length})</span></TabBtn>
            <TabBtn on={tab === 'unread'} onClick={() => setTab('unread')}>Unread {unreadCount > 0 && <span className="text-brand">({unreadCount})</span>}</TabBtn>
            <TabBtn on={tab === 'starred'} onClick={() => setTab('starred')}>Starred</TabBtn>
            <TabBtn on={tab === 'assigned'} onClick={() => setTab('assigned')}>Assigned</TabBtn>
          </div>

          <div className="shrink-0 border-b border-line p-2.5">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, product, message…"
                className="h-9 w-full rounded-lg border border-line bg-paper-2 pl-8 pr-3 text-[12.5px] focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <ul tabIndex={0} className="min-h-0 flex-1 overflow-y-auto outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-[12.5px] text-ink-3">No conversations here yet.</li>
            ) : filtered.map((c) => {
              const on = active?.id === c.id
              const st = STATUS_META[c.status] ?? STATUS_META.NEW
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 border-b border-line-soft px-3 py-3 text-left transition-colors',
                      on ? 'bg-brand-soft/50' : 'hover:bg-paper-2'
                    )}
                  >
                    <Avatar name={c.buyer.name} src={c.buyer.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-ink">{c.buyer.name}</span>
                        <span className="shrink-0 text-[10.5px] text-ink-4">{timeShort(c.latestAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <Icon name="inbox" className="h-3 w-3 shrink-0 text-ink-4" />
                        <span className="truncate text-[11.5px] text-ink-2">{c.latestSubject}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10.5px] font-semibold', st.cls)}>{st.label}</span>
                        {c.newCount > 0 && (
                          <span className="tabular ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                            {c.newCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* ─── CENTER: chat thread ─── */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center text-[13.5px] text-ink-3">
              Select a conversation to view the enquiry.
            </div>
          ) : (
            <>
              {/* header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
                <Avatar name={active.buyer.name} src={active.buyer.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{active.buyer.name}</p>
                  <p className="flex items-center gap-3 text-[11.5px] text-ink-3">
                    {active.buyer.phone && <span className="flex items-center gap-1"><Icon name="phone" className="h-3 w-3" />{active.buyer.phone}</span>}
                    {active.buyer.city && <span className="flex items-center gap-1"><Icon name="map" className="h-3 w-3" />{active.buyer.city}{active.buyer.state ? `, ${active.buyer.state}` : ''}</span>}
                  </p>
                </div>
                <button type="button" onClick={() => toggleStar(active.id, starred, setStarred)}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-lg border border-line', starred.has(active.id) ? 'text-brand' : 'text-ink-3 hover:text-brand')}>
                  <Icon name="star" className="h-4 w-4" />
                </button>
              </div>

              {/* thread — the only scrolling area; header above and composer
                  below stay fixed. Scrollbar hidden, scroll by swipe or ↑/↓. */}
              <div tabIndex={0} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-paper-2/40 px-4 py-5 outline-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {thread.map((item, i) =>
                  item.kind === 'enquiry' ? (
                    <EnquiryCard key={`e-${item.e.id}-${i}`} e={item.e} />
                  ) : (
                    <MessageBubble key={`m-${i}`} mine={item.mine} text={item.text} attachments={item.attachments} at={item.at} />
                  )
                )}
              </div>

              {/* composer */}
              <div className="shrink-0 border-t border-line p-3">
                {(files.length > 0 || sendError) && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {files.map((f, i) => (
                      <span key={f.url} className="inline-flex items-center gap-1 rounded-full bg-paper-3 px-2.5 py-1 text-[11px] text-ink-2">
                        <Icon name="file" className="h-3 w-3" /> <span className="max-w-[140px] truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-ink-4 hover:text-danger">×</button>
                      </span>
                    ))}
                    {sendError && <span role="alert" className="text-[11.5px] text-danger">{sendError}</span>}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-3 hover:text-brand" aria-label="Attach a file" title="Attach an image or PDF">
                    <Icon name="file" className="h-4 w-4" />
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={pending || files.length >= 5}
                      onChange={(e) => { attach(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft) } }}
                    rows={1}
                    placeholder="Type a message…"
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-[13px] focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={pending || (draft.trim().length < 2 && files.length === 0)}
                    onClick={() => send(draft)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ─── RIGHT: an accordion — exactly one section open at a time ─── */}
        {active && (
          <aside tabIndex={0} className="hidden min-h-0 flex-col gap-2 overflow-y-auto outline-none [-ms-overflow-style:none] [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
            <Acc
              id="contact" title="Contact Details" open={openAcc} setOpen={setOpenAcc}
              badge={
                <span
                  title={active.routingReason ?? undefined}
                  className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    active.recipientType === 'PACT' ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok')}
                >
                  {active.recipientType === 'PACT' ? 'PACT' : 'Direct'}
                </span>
              }
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={active.buyer.name} src={active.buyer.avatar} big />
                <p className="text-[13.5px] font-bold text-ink">{active.buyer.name}</p>
              </div>
              <dl className="mt-3 space-y-2 text-[11.5px]">
                {active.buyer.phone && <Row icon="phone" v={active.buyer.phone} />}
                {active.buyer.email && <Row icon="mail" v={active.buyer.email} />}
                {(active.buyer.city || active.buyer.pincode) && <Row icon="map" v={[active.buyer.city, active.buyer.pincode].filter(Boolean).join(' · ')} />}
                <Row icon="grid" v={`Source: ${labelSource(active.enquiries[active.enquiries.length - 1].sourceType)}`} />
                <Row icon="clock" v={timeFull(active.latestAt)} />
              </dl>
            </Acc>

            <Acc
              id="enquiry" title="Enquiry Details" open={openAcc} setOpen={setOpenAcc}
              badge={active.count > 1 ? <span className="text-[10.5px] font-semibold text-brand">{active.count} enquiries</span> : undefined}
            >
              <EnquiryDetailsBody e={active.enquiries[active.enquiries.length - 1]} />
            </Acc>

            <Acc id="status" title="Lead Status" open={openAcc} setOpen={setOpenAcc}>
              <select
                value={STATUS_OPTIONS.includes(active.status) ? active.status : 'NEW'}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={pending}
                className="w-full rounded-lg border border-line bg-paper-2 px-3 py-2 text-[12.5px] focus:border-brand focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => send('Please find our quotation attached. Let me know if you would like to schedule a site visit or need a customised quote.')}
                disabled={pending}
                className="btn-primary mt-3 w-full justify-center disabled:opacity-50"
              >
                Send Quotation
              </button>
            </Acc>

            <Acc id="activity" title="Recent Activity" open={openAcc} setOpen={setOpenAcc}>
              <ol className="space-y-3">
                {buildTimeline(active, myId).slice(0, 8).map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', t.tint)}>
                      <Icon name={t.icon} className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11.5px] font-medium leading-snug text-ink">{t.text}</span>
                      <span className="block text-[10.5px] text-ink-4">{timeFull(t.at)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Acc>
          </aside>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Pieces
// ══════════════════════════════════════════════════════════════

function toggleStar(id: string, set: Set<string>, setter: (s: Set<string>) => void) {
  const next = new Set(set)
  next.has(id) ? next.delete(id) : next.add(id)
  setter(next)
}

function Kpi({
  icon, label, value, tint, active, onClick,
}: {
  icon: IconName; label: string; value: number; tint: string
  active?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2.5 rounded-card border bg-white px-3 py-2 text-left shadow-card transition-colors hover:border-brand/60',
        active ? 'border-brand ring-1 ring-brand' : 'border-line'
      )}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint)}>
        <Icon name={icon} className="h-[15px] w-[15px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10.5px] leading-tight text-ink-3">{label}</span>
        <span className="tabular block font-display text-[16px] font-bold leading-tight text-ink lg:text-[18px]">{value.toLocaleString('en-IN')}</span>
      </span>
    </button>
  )
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-lg px-2 py-1 font-medium transition-colors',
        on ? 'bg-brand text-white' : 'text-ink-2 hover:bg-paper-2'
      )}
    >
      {children}
    </button>
  )
}

function Avatar({ name, src, big }: { name: string; src?: string | null; big?: boolean }) {
  const size = big ? 'h-10 w-10 text-[13px]' : 'h-9 w-9 text-[12px]'
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover', size)} />
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand', size)}>
      {initials(name)}
    </span>
  )
}

function Row({ icon, v }: { icon: IconName; v: string }) {
  return (
    <div className="flex items-start gap-2 text-ink-2">
      <Icon name={icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" />
      <span className="min-w-0 break-words">{v}</span>
    </div>
  )
}

function EnquiryCard({ e }: { e: LeadConversation['enquiries'][number] }) {
  const st = STATUS_META[e.status] ?? STATUS_META.NEW
  return (
    <div className="mx-auto max-w-[92%] rounded-xl border border-brand-border bg-brand-soft/40 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New Enquiry</span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10.5px] font-semibold', st.cls)}>{st.label}</span>
        <span className="ml-auto text-[11px] text-ink-4">{timeFull(e.createdAt)}</span>
      </div>

      {/* feature image + heading — clickable, opens the product/project page */}
      <ClickableCard href={e.detailHref}>
        {e.productImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.productImage}
            alt={e.productTitle ?? ''}
            className="h-16 w-16 shrink-0 rounded-lg border border-brand-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('text-[12.5px] font-bold text-ink', e.detailHref && 'group-hover/card:text-brand')}>{e.subject}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <Meta k="Category" v={cap(e.category ?? '')} />
            {e.budget ? <Meta k="Budget" v={formatINR(e.budget)} /> : null}
            {e.city && <Meta k="Location" v={`${e.city}${e.pincode ? ` · ${e.pincode}` : ''}`} />}
            <Meta k="Source" v={labelSource(e.sourceType)} />
          </dl>
        </div>
      </ClickableCard>

      {e.message && <p className="mt-2 border-t border-brand-border/50 pt-2 text-[12px] leading-relaxed text-ink-2">{e.message}</p>}
      {e.detailHref && (
        <a href={e.detailHref} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
          {e.isProject ? 'View Project' : 'View Product'} <Icon name="arrow" className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

/** The image + heading block — a link to the detail page when there is one. */
function ClickableCard({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="group/card flex gap-3">
        {children}
      </a>
    )
  }
  return <div className="flex gap-3">{children}</div>
}

/** One accordion section — clicking a header opens it and closes the others;
 *  the open one cannot be collapsed, so exactly one is always open. */
function Acc({
  id, title, open, setOpen, badge, children,
}: {
  id: 'contact' | 'enquiry' | 'status' | 'activity'
  title: string
  open: string
  setOpen: (v: 'contact' | 'enquiry' | 'status' | 'activity') => void
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  const isOpen = open === id
  return (
    <div className="shrink-0 overflow-hidden rounded-card border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen(id)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{title}</h3>
        {badge}
        <Icon
          name="arrow"
          className={cn('ml-auto h-3.5 w-3.5 shrink-0 text-ink-4 transition-transform', isOpen && 'rotate-90')}
        />
      </button>
      {isOpen && <div className="border-t border-line-soft px-4 py-3">{children}</div>}
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ink-4">{k}</dt>
      <dd className="truncate font-semibold text-ink">{v}</dd>
    </div>
  )
}

function MessageBubble({ mine, text, attachments, at }: { mine: boolean; text: string; attachments: string[]; at: string }) {
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed',
        mine ? 'rounded-br-md bg-ok-soft text-ink' : 'rounded-bl-md bg-white text-ink shadow-card'
      )}>
        <p className="whitespace-pre-line">{text}</p>
        {attachments?.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {attachments.map((a, i) => (
              <a key={i} href={a} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11.5px] font-medium text-brand hover:underline">
                <Icon name="file" className="h-3.5 w-3.5" /> Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
        <span className="mt-1 block text-right text-[10px] text-ink-4">{clock(at)}</span>
      </div>
    </div>
  )
}

function EnquiryDetailsBody({ e }: { e: LeadConversation['enquiries'][number] }) {
  return (
    <>
      {e.detailHref && e.productImage && (
        <a href={e.detailHref} target="_blank" rel="noopener noreferrer"
          className="group/pc mb-3 flex items-center gap-2.5 rounded-lg border border-line bg-paper-2 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.productImage} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[11.5px] font-semibold text-ink group-hover/pc:text-brand">{e.productTitle ?? e.subject}</span>
            <span className="text-[10.5px] text-brand">{e.isProject ? 'View project →' : 'View product →'}</span>
          </span>
        </a>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-[11.5px]">
        <Field k="Interested In" v={cap(e.category ?? '')} />
        <Field k="Project Type" v={cap(e.subCategory ?? '—')} />
        <Field k="Budget Range" v={e.budget ? formatINR(e.budget) : '—'} />
        <Field k="Location" v={e.city || '—'} />
      </dl>
      {e.message && (
        <div className="mt-3 border-t border-line-soft pt-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-4">Message</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{e.message}</p>
        </div>
      )}
    </>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ink-4">{k}</dt>
      <dd className="mt-0.5 break-words font-semibold text-ink">{v}</dd>
    </div>
  )
}

// ── timeline builder ──
function buildTimeline(c: LeadConversation, myId: string) {
  const items: { at: string; text: string; icon: IconName; tint: string }[] = []
  for (const e of c.enquiries) {
    items.push({ at: e.createdAt, text: `New enquiry: ${e.subject}`, icon: 'inbox', tint: 'bg-brand-soft text-brand' })
    for (const r of e.responses) {
      items.push(
        r.senderId === myId
          ? { at: r.createdAt, text: 'You replied to the enquiry', icon: 'arrow', tint: 'bg-info-soft text-info' }
          : { at: r.createdAt, text: 'Buyer sent a message', icon: 'mail', tint: 'bg-paper-3 text-ink-3' }
      )
    }
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

// ── small utils ──
function cap(s: string) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function labelSource(s: string) {
  return cap(s.replace(/_/g, ' ').toLowerCase())
}
