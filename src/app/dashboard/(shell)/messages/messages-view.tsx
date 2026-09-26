'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { cn } from '@/lib/utils'
import { SOURCE_HREF, SOURCE_LABEL, type ConversationRow } from '@/lib/chat'
import type { ThreadMessage } from '@/lib/chat'
import { loadThreadAction, sendMessageAction, setArchivedAction } from './actions'

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

function listStamp(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const dayStamp = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const timeStamp = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

const initials = (n: string) =>
  n.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

/**
 * The tabs. The reference draws Leads / Clients here; this platform keeps
 * leads on their own screen, so the two middle tabs carry what a chat can
 * actually be filtered by — the surface it came from.
 */
type TabKey = 'all' | 'unread' | 'ARTISTRY' | 'AROUND_US' | 'archived'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Messages' },
  { key: 'unread', label: 'Unread' },
  { key: 'ARTISTRY', label: 'Artistry' },
  { key: 'AROUND_US', label: 'Around Us' },
  { key: 'archived', label: 'Archived' },
]

// ──────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────

export function MessagesView({
  conversations,
  meName,
  initialId,
  initialDraft = '',
}: {
  conversations: ConversationRow[]
  meName: string
  /** A thread to open first — from a post's Chat / Enquiry button. */
  initialId?: string
  /** Text to start the box with (an enquiry opener); never auto-sent. */
  initialDraft?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(
    initialId ?? conversations.find((c) => !c.archived)?.id ?? null
  )
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [pending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  const counts = useMemo(() => {
    const live = conversations.filter((c) => !c.archived)
    return {
      all: live.length,
      unread: live.filter((c) => c.unread > 0).length,
      ARTISTRY: live.filter((c) => c.source === 'ARTISTRY').length,
      AROUND_US: live.filter((c) => c.source === 'AROUND_US').length,
      archived: conversations.filter((c) => c.archived).length,
    } as Record<TabKey, number>
  }, [conversations])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations
      .filter((c) => (tab === 'archived' ? c.archived : !c.archived))
      .filter((c) => {
        if (tab === 'unread') return c.unread > 0
        if (tab === 'ARTISTRY' || tab === 'AROUND_US') return c.source === tab
        return true
      })
      .filter((c) => (q ? `${c.other.name} ${c.subject} ${c.preview}`.toLowerCase().includes(q) : true))
  }, [conversations, tab, query])

  const active = conversations.find((c) => c.id === activeId) ?? null

  // Load the thread whenever the selected conversation changes.
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let cancelled = false
    setLoadingThread(true)
    loadThreadAction(activeId).then((res) => {
      if (cancelled) return
      setMessages(res.ok && res.messages ? res.messages : [])
      setLoadingThread(false)
      router.refresh() // refresh unread badges after the thread is marked read
    })
    return () => {
      cancelled = true
    }
    // router intentionally omitted — it is stable and would re-run this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function send() {
    const text = draft.trim()
    if (!text || !activeId) return
    const optimistic: ThreadMessage = {
      id: `tmp-${Date.now()}`,
      body: text,
      mine: true,
      createdAt: new Date().toISOString(),
      readAt: null,
    }
    setMessages((m) => [...m, optimistic])
    setDraft('')
    startTransition(async () => {
      const res = await sendMessageAction(activeId, text)
      if (!res.ok) {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id))
        setDraft(text)
      }
      router.refresh()
    })
  }

  function archiveActive() {
    if (!active) return
    startTransition(async () => {
      await setArchivedAction(active.id, !active.archived)
      setActiveId(null)
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 md:h-full">
      {/* ═══════════ header — title only, per the dashboard convention ═══════════ */}
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
          <Icon name="mail" className="h-[22px] w-[22px]" />
        </span>
        <h1 className="font-display text-[19px] font-bold leading-tight text-navy">Messages</h1>
      </header>

      {/* ═══════════ tabs ═══════════ */}
      <nav className="border-b border-line">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:gap-2">
          {TABS.map((t) => (
            <li key={t.key} className="shrink-0">
              <button
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] font-semibold transition-colors',
                  tab === t.key ? 'text-brand' : 'text-ink-2 hover:text-brand'
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'tabular rounded-pill px-1.5 py-0.5 text-[10.5px] font-bold',
                    tab === t.key ? 'bg-brand text-white' : 'bg-paper-3 text-ink-3'
                  )}
                >
                  {counts[t.key]}
                </span>
                {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-brand" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ═══════════ 3 panes ═══════════ */}
      {/* Tablet keeps the same two-pane shape as the computer, just a narrower
          list so the thread still has room; the contact rail joins from lg,
          where there is width for a third column. */}
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,186px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,272px)]">
        {/* ─── list ─── */}
        <section className="card flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
            <span className="flex items-center text-ink-4">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…"
              aria-label="Search messages"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] placeholder:text-ink-4 focus:outline-none"
            />
          </div>

          <ul className="scroll-slim-light min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
            {visible.length === 0 ? (
              <li className="px-4 py-10 text-center text-[12.5px] text-ink-3">
                {conversations.length === 0
                  ? 'No messages yet. Chats started from your Artistry and Around Us posts appear here.'
                  : 'No conversations in this tab.'}
              </li>
            ) : (
              visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                      activeId === c.id ? 'bg-info-soft' : 'hover:bg-paper-2'
                    )}
                  >
                    <Avatar name={c.other.name} photo={c.other.photo} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12.5px] font-bold text-ink">{c.other.name}</span>
                        <span className="shrink-0 text-[10.5px] text-ink-4">{listStamp(c.lastMessageAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3">
                          {c.preview || c.subject}
                        </span>
                        {c.unread > 0 && (
                          <span className="tabular flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-bold text-white">
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* ─── thread ─── */}
        <section className="card flex min-h-0 flex-col overflow-hidden">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-ink-3">
                <Icon name="mail" className="h-6 w-6" />
              </span>
              <p className="mt-3 font-display text-[14.5px] font-bold text-ink">Pick a conversation</p>
              <p className="mt-1 max-w-xs text-[12px] text-ink-3">
                Chats started from your Artistry and Around Us posts show up on the left.
              </p>
            </div>
          ) : (
            <>
              {/* thread header */}
              <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
                <Avatar name={active.other.name} photo={active.other.photo} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{active.other.name}</p>
                  <p className="truncate text-[11.5px] text-ink-3">
                    {active.other.role}
                    {active.other.location ? ` · ${active.other.location}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {active.other.phone && (
                    <a
                      href={`tel:${active.other.phone}`}
                      aria-label="Call"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-brand hover:text-brand"
                    >
                      <Icon name="phone" className="h-4 w-4" />
                    </a>
                  )}
                  <a
                    href={`mailto:${active.other.email}`}
                    aria-label="Email"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-brand hover:text-brand"
                  >
                    <Icon name="mail" className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* what the chat is about */}
              <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-paper-2 px-4 py-2">
                <span className="pill bg-paper-3 text-[10px] text-ink-3">{SOURCE_LABEL[active.source] ?? active.source}</span>
                {active.postSlug ? (
                  <Link
                    href={`${SOURCE_HREF[active.source] ?? '/artistry'}/${active.postSlug}`}
                    className="truncate text-[11.5px] font-semibold text-brand hover:underline"
                  >
                    {active.subject}
                  </Link>
                ) : (
                  <span className="truncate text-[11.5px] font-semibold text-ink-2">{active.subject}</span>
                )}
              </div>

              {/* messages */}
              <div ref={scrollRef} className="scroll-slim-light min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {loadingThread ? (
                  <p className="py-8 text-center text-[12px] text-ink-3">Loading…</p>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-[12px] text-ink-3">
                    No messages yet — say hello to start the conversation.
                  </p>
                ) : (
                  messages.map((m, i) => {
                    const showDay = i === 0 || dayStamp(messages[i - 1].createdAt) !== dayStamp(m.createdAt)
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <p className="my-3 text-center text-[10.5px] font-medium text-ink-4">{dayStamp(m.createdAt)}</p>
                        )}
                        <div className={cn('flex items-end gap-2', m.mine ? 'justify-end' : 'justify-start')}>
                          {!m.mine && <Avatar name={active.other.name} photo={active.other.photo} size={26} />}
                          <div className={cn('max-w-[74%]', m.mine ? 'items-end' : 'items-start')}>
                            <div
                              className={cn(
                                'rounded-card px-3.5 py-2.5 text-[12.5px] leading-relaxed',
                                m.mine
                                  ? 'bg-info-soft text-ink'
                                  : 'border border-line-soft bg-paper-2 text-ink-2'
                              )}
                            >
                              {m.body}
                            </div>
                            <p className={cn('mt-1 flex items-center gap-1 text-[10px] text-ink-4', m.mine && 'justify-end')}>
                              {timeStamp(m.createdAt)}
                              {m.mine && (
                                <Icon
                                  name="check"
                                  className={cn('h-3 w-3', m.readAt ? 'text-info' : 'text-ink-4')}
                                />
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* composer */}
              <div className="flex items-center gap-2 border-t border-line-soft px-3 py-2.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Type your message…"
                  aria-label="Message"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper-2 px-3.5 py-2.5 text-[12.5px] focus:border-brand focus:outline-none"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={pending || !draft.trim()}
                  className="btn-dark shrink-0 px-4 py-2.5 text-[12.5px]"
                >
                  <Icon name="arrow" className="h-4 w-4" />
                  Send
                </button>
              </div>
            </>
          )}
        </section>

        {/* ─── contact details ─── */}
        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto lg:flex">
          {active ? (
            <>
              <section className="card p-4">
                <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">Contact Details</h2>
                <div className="flex items-center gap-2.5">
                  <Avatar name={active.other.name} photo={active.other.photo} size={40} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-ink">
                      {active.other.name}
                      {active.other.verified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-ok">
                          <Icon name="shield" className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-3">{active.other.role}</p>
                  </div>
                </div>

                <ul className="mt-3 space-y-2">
                  {active.other.location && (
                    <DetailRow icon="map">{active.other.location}</DetailRow>
                  )}
                  {active.other.phone && <DetailRow icon="phone">{active.other.phone}</DetailRow>}
                  <DetailRow icon="mail">
                    <a href={`mailto:${active.other.email}`} className="truncate text-info hover:underline">
                      {active.other.email}
                    </a>
                  </DetailRow>
                  <DetailRow icon="calendar">Joined {dayStamp(active.other.joinedAt)}</DetailRow>
                </ul>
              </section>

              <section className="card p-4">
                <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">About this chat</h2>
                <dl className="space-y-2 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-3">Started from</dt>
                    <dd className="font-semibold text-ink">{SOURCE_LABEL[active.source] ?? active.source}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <dt className="shrink-0 text-ink-3">Post</dt>
                    <dd className="min-w-0 text-right font-semibold text-ink">
                      {active.postSlug ? (
                        <Link
                          href={`${SOURCE_HREF[active.source] ?? '/artistry'}/${active.postSlug}`}
                          className="text-brand hover:underline"
                        >
                          {active.subject}
                        </Link>
                      ) : (
                        active.subject
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-3">Last reply</dt>
                    <dd className="font-semibold text-ink">{listStamp(active.lastMessageAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="card p-4">
                <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">Quick Actions</h2>
                <div className="flex flex-col gap-2">
                  {active.other.phone && (
                    <a href={`tel:${active.other.phone}`} className="btn-outline w-full justify-center py-2 text-[12.5px]">
                      <Icon name="phone" className="h-4 w-4" />
                      Call {active.other.name.split(' ')[0]}
                    </a>
                  )}
                  <a href={`mailto:${active.other.email}`} className="btn-outline w-full justify-center py-2 text-[12.5px]">
                    <Icon name="mail" className="h-4 w-4" />
                    Send Email
                  </a>
                  <button
                    type="button"
                    onClick={archiveActive}
                    disabled={pending}
                    className={cn(
                      'btn w-full justify-center rounded-lg border py-2 text-[12.5px] font-semibold transition-colors',
                      active.archived
                        ? 'border-line bg-paper-2 text-ink hover:border-ink-3'
                        : 'border-danger/30 bg-danger-soft text-danger hover:bg-danger/10'
                    )}
                  >
                    <Icon name={active.archived ? 'inbox' : 'trash'} className="h-4 w-4" />
                    {active.archived ? 'Restore Chat' : 'Archive Chat'}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="card p-4">
              <p className="text-[12px] text-ink-3">Pick a conversation to see who it is with.</p>
            </section>
          )}
        </aside>
      </div>

      <span className="sr-only">Signed in as {meName}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Small parts
// ──────────────────────────────────────────────────────────────

function Avatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

function DetailRow({ icon, children }: { icon: 'map' | 'phone' | 'mail' | 'calendar'; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12px] text-ink-2">
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
      <span className="min-w-0 truncate">{children}</span>
    </li>
  )
}
