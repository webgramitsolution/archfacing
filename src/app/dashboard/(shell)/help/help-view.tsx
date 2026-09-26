'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { createSupportTicketAction, type TicketState } from './actions'

// ──────────────────────────────────────────────────────────────
//  Content — the help catalogue (edit here; page reads from these)
// ──────────────────────────────────────────────────────────────

const CATEGORIES: { icon: IconName; tint: string; title: string; sub: string; href: string }[] = [
  { icon: 'file', tint: 'bg-info-soft text-info', title: 'Getting Started', sub: 'Learn the basics', href: '#articles' },
  { icon: 'user', tint: 'bg-brand-soft text-brand', title: 'Manage Account', sub: 'Update your profile', href: '/dashboard/settings' },
  { icon: 'box', tint: 'bg-[#F5F3FF] text-[#7C3AED]', title: 'Projects & Products', sub: 'Post, edit and manage', href: '/dashboard/professional/projects' },
  { icon: 'award', tint: 'bg-gold-soft text-gold', title: 'Membership & Plans', sub: 'Billing & plan details', href: '/dashboard/membership' },
  { icon: 'chart', tint: 'bg-pact-soft text-pact', title: 'Leads & Enquiries', sub: 'Manage your leads', href: '/dashboard/professional/enquiries' },
  { icon: 'settings', tint: 'bg-info-soft text-info', title: 'Technical Support', sub: 'Fix technical issues', href: '#contact' },
]

const ARTICLES: { icon: IconName; tint: string; title: string; sub: string; href: string }[] = [
  { icon: 'box', tint: 'bg-info-soft text-info', title: 'How to post a new project', sub: 'Step-by-step guide to create and publish a project.', href: '/dashboard/professional/projects/new' },
  { icon: 'chart', tint: 'bg-pact-soft text-pact', title: 'How Consultant PACT works', sub: 'Learn how to buy PACT and receive leads.', href: '/dashboard/professional/pact' },
  { icon: 'award', tint: 'bg-gold-soft text-gold', title: 'How to upgrade or change your plan?', sub: 'Manage your membership and billing.', href: '/dashboard/membership' },
  { icon: 'bag', tint: 'bg-brand-soft text-brand', title: 'How to add products and services', sub: 'List your products and services to get more enquiries.', href: '/dashboard/professional/products/new' },
  { icon: 'shield', tint: 'bg-info-soft text-info', title: 'How to verify your account?', sub: 'Complete KYC and get verified badge.', href: '/dashboard/professional/profile/edit' },
]

const FAQS: { q: string; a: string }[] = [
  { q: 'What is Consultant PACT?', a: 'PACT is your exclusive PIN-code territory. Holding a PACT for an area means enquiries from that area are routed to you — one holder per PIN code, so you are the go-to professional there.' },
  { q: 'How do I receive leads?', a: 'Buyers send enquiries from your listings and from Consult Nearby. Every enquiry for a PIN code you hold a PACT for lands in Leads / Enquiries, and you are notified by your chosen channels.' },
  { q: 'Can I upgrade or downgrade my plan anytime?', a: 'Yes. Open Membership & Plans and pick another plan — the change applies right away and everything you have published stays live.' },
  { q: 'How are leads distributed?', a: 'A lead goes to the direct owner of the listing and, in parallel, to every professional who holds a matching PACT territory — so a buyer reaches the right people without a middleman.' },
  { q: 'What payment methods are accepted?', a: 'Cards, UPI and net-banking through our payment gateway. Membership and PACT are billed for the term shown at checkout, with GST added as applicable.' },
  { q: 'How to delete or edit my project/product?', a: 'Open My Projects or My Products, use the row actions to edit, duplicate or delete, or unpublish to move a listing back to draft.' },
  { q: 'How can I contact a buyer?', a: 'Reply to their enquiry from Leads / Enquiries — the thread keeps the conversation in one place and shows the buyer’s contact details once they reach out.' },
  { q: 'Is there a refund policy?', a: 'Membership and PACT charges are for a fixed term and are generally non-refundable once active. Raise a support ticket for any billing issue and our team will look into it.' },
]

type Contact = { icon: IconName; tint: string; title: string; line: string; sub: string; href?: string; badge?: string; opensTicket?: boolean }

/** The support channels — email and phone come from Website Settings → Contact. */
function contactsFor(email: string, phone: string): Contact[] {
  const digits = phone.replace(/\D/g, '')
  const intl = digits.length === 10 ? `91${digits}` : digits
  return [
    // There is no live chat: this opens the ticket form, which is answered from /admin/support.
    { icon: 'help', tint: 'bg-info-soft text-info', title: 'Support Ticket', line: 'Write to our team', sub: 'Tracked until it is closed', opensTicket: true },
    { icon: 'mail', tint: 'bg-brand-soft text-brand', title: 'Email Support', line: email, sub: 'Response within 12 hours', href: `mailto:${email}` },
    ...(digits
      ? [
          { icon: 'phone' as IconName, tint: 'bg-pact-soft text-pact', title: 'Call Support', line: phone, sub: 'Mon - Sat, 9 AM - 6 PM', href: `tel:+${intl}` },
          { icon: 'phone' as IconName, tint: 'bg-ok-soft text-ok', title: 'WhatsApp Support', line: phone, sub: 'Chat on WhatsApp', href: `https://wa.me/${intl}` },
        ]
      : []),
  ]
}

const RESOURCES: { icon: IconName; label: string; href: string }[] = [
  { icon: 'download', label: 'User Guide (PDF)', href: '/legal/need-help' },
  { icon: 'monitor', label: 'Video Tutorials', href: '/legal/need-help' },
  { icon: 'shield', label: 'Platform Policies', href: '/legal/privacy' },
  { icon: 'file', label: 'Terms & Conditions', href: '/legal/terms' },
]

const POPULAR = ['Post Project', 'Membership Plan', 'Consultant PACT', 'Payment Issues', 'Edit Profile', 'Leads Not Received']

const norm = (s: string) => s.toLowerCase()

// ──────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────

export function HelpView({ openTickets, supportEmail, supportPhone }: { openTickets: number; supportEmail: string; supportPhone: string }) {
  const CONTACTS = useMemo(() => contactsFor(supportEmail, supportPhone), [supportEmail, supportPhone])
  const [query, setQuery] = useState('')
  const [ticketOpen, setTicketOpen] = useState(false)

  const q = norm(query.trim())
  const articles = useMemo(
    () => (q ? ARTICLES.filter((a) => norm(a.title + ' ' + a.sub).includes(q)) : ARTICLES),
    [q]
  )
  const faqs = useMemo(() => (q ? FAQS.filter((f) => norm(f.q + ' ' + f.a).includes(q)) : FAQS), [q])
  const searching = q.length > 0

  return (
    <div className="space-y-5">
      {/* ═══════════ header ═══════════ */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-info-soft text-info">
            <Icon name="help" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold leading-tight text-navy">Help &amp; Support</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-snug text-ink-3">
              We&rsquo;re here to help you. Find answers, get support and make the most of your ArchFacing experience.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-card border border-info/20 bg-info-soft px-3.5 py-2 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            <span className="leading-tight">
              <span className="block text-[12px] font-semibold text-ink">Need immediate help?</span>
              <span className="block text-[11px] text-ink-3">Our support team is online</span>
            </span>
          </div>
          <button type="button" onClick={() => setTicketOpen(true)} className="btn-dark px-4 py-2.5 text-[13px]">
            <Icon name="help" className="h-4 w-4" />
            Contact Support
          </button>
        </div>
      </header>

      {/* ═══════════ hero / search ═══════════ */}
      <section className="relative overflow-hidden rounded-card bg-navy text-white">
        <span aria-hidden className="absolute inset-0">
          <Image src="/img/profile-hero-default.png" alt="" fill sizes="100vw" className="object-cover object-right" priority />
          <span
            className="absolute inset-0"
            style={{ backgroundImage: 'linear-gradient(90deg, #071A36 0%, #071A36 50%, rgba(7,26,54,0.6) 66%, transparent 82%)' }}
          />
        </span>

        <div className="relative max-w-[760px] px-6 py-7 md:px-9 md:py-8">
          <h2 className="font-display text-[24px] font-bold leading-tight md:text-[28px]">How can we help you today?</h2>
          <p className="mt-1.5 text-[13px] leading-snug text-white/75">
            Search for help articles, guides or get in touch with our support team.
          </p>

          {/* search */}
          <div className="mt-4 flex overflow-hidden rounded-lg bg-white shadow-card">
            <span className="flex items-center pl-3.5 text-ink-4">
              <Icon name="search" className="h-[18px] w-[18px]" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search for help articles, e.g. "How to post a project?"'
              aria-label="Search help articles"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[13.5px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
            <button type="button" onClick={() => { /* filtering is live */ }} className="shrink-0 bg-brand px-6 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90">
              Search
            </button>
          </div>

          {/* popular searches */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-white/70">Popular searches:</span>
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuery(p)}
                className="rounded-pill border border-white/15 bg-white/10 px-3 py-1 text-[11.5px] font-medium text-white/90 transition-colors hover:bg-white/20"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 hidden text-right text-[22px] leading-tight text-white/95 lg:block"
          style={{ fontFamily: 'cursive' }}
        >
          Your<br />Success<br /><span className="text-gold-light">Our Support</span>
        </span>
      </section>

      {/* ═══════════ category cards ═══════════ */}
      <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="card-hover group flex items-center gap-2.5 p-3.5"
          >
            <span className={cn('chip-icon h-10 w-10 shrink-0', c.tint)}>
              <Icon name={c.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-ink group-hover:text-brand">{c.title}</span>
              <span className="block truncate text-[11px] text-ink-3">{c.sub}</span>
            </span>
            <Icon name="arrow" className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      {/* ═══════════ articles · faq · contact ═══════════ */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* ─── popular help articles ─── */}
        <div id="articles" className="card scroll-mt-24 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15.5px] font-bold text-ink">
              {searching ? 'Matching Articles' : 'Popular Help Articles'}
            </h3>
            <Link href="/legal/need-help" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
              View All <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="flex flex-col">
            {articles.length === 0 ? (
              <li className="py-6 text-center text-[12.5px] text-ink-3">No articles match “{query}”.</li>
            ) : (
              articles.map((a) => (
                <li key={a.title}>
                  <Link href={a.href} className="group flex items-start gap-3 border-b border-line-soft py-3 last:border-0">
                    <span className={cn('chip-icon h-9 w-9 shrink-0', a.tint)}>
                      <Icon name={a.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink group-hover:text-brand">{a.title}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{a.sub}</span>
                    </span>
                    <Icon name="arrow" className="mt-1 h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* ─── FAQ ─── */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15.5px] font-bold text-ink">
              {searching ? 'Matching Questions' : 'Frequently Asked Questions'}
            </h3>
            <Link href="/legal/need-help" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
              View All <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col">
            {faqs.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-ink-3">No questions match “{query}”.</p>
            ) : (
              faqs.map((f) => <FaqRow key={f.q} q={f.q} a={f.a} defaultOpen={searching} />)
            )}
          </div>
        </div>

        {/* ─── contact ─── */}
        <div id="contact" className="card scroll-mt-24 p-5">
          <h3 className="font-display text-[15.5px] font-bold text-ink">Contact Our Support Team</h3>
          <p className="mt-1 text-[12px] leading-snug text-ink-3">
            Get in touch with our friendly support team. We typically respond within a few hours.
          </p>
          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {CONTACTS.map((c) => (
              <ContactCard key={c.title} c={c} onLiveChat={() => setTicketOpen(true)} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ticket · track · resources · illustration ═══════════ */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* submit ticket */}
        <div className="card flex flex-col p-5">
          <span className="chip-icon mb-3 h-10 w-10 bg-info-soft text-info">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <h3 className="text-[14px] font-bold text-ink">Submit a Support Ticket</h3>
          <p className="mt-1 flex-1 text-[12px] leading-snug text-ink-3">
            Can&rsquo;t find what you&rsquo;re looking for? Raise a support ticket and our team will get back to you.
          </p>
          <button type="button" onClick={() => setTicketOpen(true)} className="btn-dark mt-4 w-full py-2.5 text-[13px]">
            <Icon name="plus" className="h-4 w-4" />
            Create Support Ticket
          </button>
        </div>

        {/* track tickets */}
        <div className="card flex flex-col p-5">
          <span className="chip-icon mb-3 h-10 w-10 bg-brand-soft text-brand">
            <Icon name="file" className="h-5 w-5" />
          </span>
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
            Track Your Tickets
            {openTickets > 0 && <span className="pill-brand text-[10px]">{openTickets} open</span>}
          </h3>
          <p className="mt-1 flex-1 text-[12px] leading-snug text-ink-3">
            View the status of your previously raised tickets.
          </p>
          <Link href="/dashboard/help/tickets" className="btn-outline mt-4 w-full justify-center py-2.5 text-[13px]">
            <Icon name="list" className="h-4 w-4" />
            View My Tickets
          </Link>
        </div>

        {/* resources */}
        <div className="card p-5">
          <span className="chip-icon mb-3 h-10 w-10 bg-info-soft text-info">
            <Icon name="grid" className="h-5 w-5" />
          </span>
          <h3 className="text-[14px] font-bold text-ink">Help Resources</h3>
          <p className="mt-1 text-[12px] leading-snug text-ink-3">
            Download guides, watch tutorials and explore resources.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {RESOURCES.map((r) => (
              <li key={r.label}>
                <Link href={r.href} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-info hover:underline">
                  <Icon name={r.icon} className="h-4 w-4 shrink-0" />
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* illustration */}
        <div className="flex flex-col items-center justify-center rounded-card border border-info/20 bg-info-soft p-5 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-info text-white shadow-card">
            <Icon name="help" className="h-7 w-7" />
          </span>
          <p className="mt-3 font-display text-[14.5px] font-bold text-ink">We&rsquo;re here to help you!</p>
          <p className="mt-1 text-[12px] leading-snug text-ink-3">Still need help? Our support team is just a message away.</p>
          <button type="button" onClick={() => setTicketOpen(true)} className="btn-primary mt-3 px-4 py-2 text-[12.5px]">
            Contact Support
          </button>
        </div>
      </section>

      {ticketOpen && <TicketModal onClose={() => setTicketOpen(false)} />}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  FAQ row — expand/collapse
// ──────────────────────────────────────────────────────────────

function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line-soft last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-ink">{q}</span>
        <Icon name="arrow" className={cn('h-4 w-4 shrink-0 text-ink-4 transition-transform', open ? '-rotate-90' : 'rotate-90')} />
      </button>
      {open && <p className="pb-3 pr-6 text-[12.5px] leading-relaxed text-ink-2">{a}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Contact card
// ──────────────────────────────────────────────────────────────

function ContactCard({
  c,
  onLiveChat,
}: {
  c: Contact
  onLiveChat: () => void
}) {
  const inner = (
    <>
      <span className={cn('chip-icon h-9 w-9 shrink-0', c.tint)}>
        <Icon name={c.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
          {c.title}
          {c.badge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              {c.badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-2">{c.line}</span>
        {c.sub && <span className="block text-[10.5px] text-ink-4">{c.sub}</span>}
      </span>
    </>
  )
  const cls = 'flex items-start gap-2.5 rounded-card border border-line-soft bg-paper-2 p-3 transition-colors hover:border-ink-3'

  if (c.opensTicket) {
    return (
      <button type="button" onClick={onLiveChat} className={cn(cls, 'text-left')}>
        {inner}
      </button>
    )
  }
  const external = c.href?.startsWith('http')
  return (
    <a href={c.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={cls}>
      {inner}
    </a>
  )
}

// ──────────────────────────────────────────────────────────────
//  Create-ticket modal
// ──────────────────────────────────────────────────────────────

const TICKET_CATEGORIES = ['general', 'billing', 'leads', 'technical', 'account', 'other']

function TicketModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<TicketState | null, FormData>(createSupportTicketAction, null)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-navy/45" />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg overflow-hidden rounded-card border border-line bg-paper shadow-lift">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-card bg-info-soft text-info">
              <Icon name="help" className="h-5 w-5" />
            </span>
            <h3 className="font-display text-[16px] font-bold text-navy">Create Support Ticket</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink">
            <Icon name="plus" className="h-5 w-5 rotate-45" />
          </button>
        </div>

        {state?.ok ? (
          <div className="px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <p className="mt-3 font-display text-[16px] font-bold text-ink">Ticket raised</p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              Your reference is <span className="tabular font-semibold text-ink">#{state.ref}</span>. Our team will reply within a few hours.
            </p>
            <div className="mt-4 flex justify-center gap-2.5">
              <Link href="/dashboard/help/tickets" className="btn-outline px-4 py-2 text-[13px]">View My Tickets</Link>
              <button type="button" onClick={onClose} className="btn-primary px-4 py-2 text-[13px]">Done</button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-3.5 px-5 py-4">
            {state && !state.ok && state.error && (
              <p className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] font-medium text-danger">
                <Icon name="alert" className="h-4 w-4" />
                {state.error}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Subject</span>
              <input name="subject" required maxLength={150} className="input" placeholder="Brief summary of your issue" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Category</span>
              <select name="category" className="input capitalize" defaultValue="general">
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] font-semibold text-ink-2">Message</span>
              <textarea name="message" required rows={4} maxLength={4000} className="input resize-none" placeholder="Describe your issue in detail…" />
            </label>
            <div className="flex justify-end gap-2.5 pt-1">
              <button type="button" onClick={onClose} disabled={pending} className="btn-ghost px-4 py-2 text-[13px]">Cancel</button>
              <button type="submit" disabled={pending} className="btn-primary px-5 py-2.5">
                <Icon name="plus" className="h-4 w-4" />
                {pending ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
