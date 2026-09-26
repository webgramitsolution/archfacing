'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { Field, Input, Textarea, Button, Alert } from '@/components/form'
import { INDIAN_STATES } from '@/config/states'
import { cn } from '@/lib/utils'
import { ImageUpload } from './image-upload'
import { PactTab } from './pact-tab'
import type { MyPactData } from '@/lib/my-pact'
import {
  saveBasicAction, saveContactAction, saveBusinessAction, saveGstAction, saveSocialAction,
  type TabState,
} from './profile-tab-actions'

type Data = {
  basic: {
    name: string; professionType: string; shortBio: string; bio: string
    city: string; state: string; photo: string | null; expertise: string[]
    verified: boolean; location: string
    /** The member's public ID — also the Artwork ID on their Artistry posts. */
    memberCode: string
  }
  contact: {
    mobile: string; email: string; addressLine: string; pincode: string
    altPhone: string; altEmail: string; website: string; officeLandline: string
    mapsLocation: string; whatsappNumber: string; preferredContactTime: string
    allowCalls: boolean; allowEmails: boolean; allowWhatsapp: boolean; showPhonePublic: boolean; showEmailPublic: boolean
    photo: string | null; name: string; professionType: string; location: string; verified: boolean
  }
  business: {
    firmName: string; businessType: string; yearEstablished: string; employeeCount: string
    tagline: string; businessEmail: string; website: string; memberSince: string
    logo: string | null; primaryCategory: string; categories: string[]; serviceAreas: string[]; description: string
    categoryOptions: string[]
  }
  gst: { gstNumber: string; panNumber: string; companyName: string; website: string; verified: boolean }
  social: {
    links: Record<'website' | 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'pinterest' | 'behance' | 'houzz', string>
    hidden: string[]
    name: string; photo: string | null; professionType: string; location: string; verified: boolean
  }
  verifications: { professional: boolean; business: boolean; gst: boolean; kyc: boolean }
  publicSlug: string | null
  reviews: { average: number; total: number }
  /** The holder's own territories — read on the server by `myPactData()`. */
  pact: MyPactData
  leadsHref: string
  buyPactHref: string
}

type TabId = 'basic' | 'contact' | 'business' | 'gst' | 'pact' | 'social' | 'documents' | 'reviews'
type SectionStatus = 'Complete' | 'In Progress' | 'Not Started'

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'contact', label: 'Contact Details' },
  { id: 'business', label: 'Business Information' },
  { id: 'gst', label: 'GST Details' },
  { id: 'pact', label: 'My PACT' },
  { id: 'social', label: 'Social Links' },
  { id: 'documents', label: 'Documents' },
  { id: 'reviews', label: 'Reviews & Ratings' },
]

export function ProfileWorkspace({ data, backHref, initialTab }: { data: Data; backHref?: string; initialTab?: string }) {
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : 'basic')

  const completion = useMemo(() => {
    const checks = [
      !!data.basic.name, !!data.basic.professionType, !!data.basic.bio, !!(data.basic.city && data.basic.state),
      !!data.contact.mobile, !!data.contact.addressLine,
      !!data.business.firmName, data.business.categories.length > 0,
      !!data.gst.gstNumber,
      Object.values(data.social.links).some(Boolean),
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [data])

  const sections = useMemo(() => {
    const st = (done: boolean, started: boolean): SectionStatus => (done ? 'Complete' : started ? 'In Progress' : 'Not Started')
    return {
      basic: st(!!(data.basic.name && data.basic.professionType && data.basic.shortBio && data.basic.bio && data.basic.city && data.basic.state), !!(data.basic.name || data.basic.bio)),
      contact: st(!!(data.contact.mobile && data.contact.addressLine), !!data.contact.mobile),
      business: st(!!(data.business.firmName && data.business.categories.length), !!data.business.firmName),
      gst: st(!!data.gst.gstNumber, !!data.gst.gstNumber),
      // Holding at least one territory counts as done; it is bought, not filled in.
      pact: st(data.pact.activeCount > 0, data.pact.rows.length > 0),
      social: st(Object.values(data.social.links).some(Boolean), Object.values(data.social.links).some(Boolean)),
      documents: st(data.verifications.professional, data.verifications.business),
      reviews: st(data.reviews.total > 0, data.reviews.total > 0),
    }
  }, [data])

  return (
    <div>
      {backHref && (
        <Link href={backHref} className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3 transition-colors hover:text-brand">
          <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Back to Profile
        </Link>
      )}
      {/* ── header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon name="user" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-[19px] font-bold tracking-tight text-ink">Edit Profile</h1>
            <p className="text-[12.5px] text-ink-3">
              Manage your professional profile to get more visibility and business opportunities.
            </p>
          </div>
        </div>
        {data.publicSlug && (
          <Link
            href={`/${data.publicSlug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <Icon name="eye" className="h-4 w-4" /> View Public Profile
          </Link>
        )}
      </div>

      {/* ── tab nav ── */}
      <div className="mb-5 border-b border-line">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
                tab === t.id ? 'text-brand' : 'text-ink-2 hover:text-brand'
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── My PACT runs full width: it carries a wide table and its own
             summary cards, so a right sidebar would only squeeze it ── */}
      {tab === 'pact' ? (
        <PactTab d={data.pact} leadsHref={data.leadsHref} buyHref={data.buyPactHref} />
      ) : (

      /* ── active tab + right sidebar ── */
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_236px] md:items-start lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0">
          {tab === 'basic' && <BasicTab d={data.basic} />}
          {tab === 'contact' && <ContactTab d={data.contact} />}
          {tab === 'business' && <BusinessTab d={data.business} />}
          {tab === 'gst' && <GstTab d={data.gst} />}
          {tab === 'social' && <SocialTab d={data.social} />}
          {tab === 'documents' && <DocumentsTab v={data.verifications} />}
          {tab === 'reviews' && <ReviewsTab r={data.reviews} />}
        </div>
        {tab === 'basic' ? (
          <BasicSidebar d={data.basic} completion={completion} sections={sections} publicSlug={data.publicSlug} />
        ) : tab === 'contact' ? (
          <ContactSidebar d={data.contact} publicSlug={data.publicSlug} />
        ) : tab === 'social' ? (
          <SocialSidebar d={data.social} publicSlug={data.publicSlug} />
        ) : (
          <EditorSidebar tab={tab} completion={completion} publicSlug={data.publicSlug} onComplete={() => setTab('basic')} />
        )}
      </div>
      )}
    </div>
  )
}

// ═══════════════ right sidebar (all tabs) ═══════════════
const TIPS: Record<TabId, { title: string; icon: IconName; items: string[] }> = {
  basic: { title: 'Profile Tips', icon: 'user', items: ['Use a clear professional photo', 'Write a compelling bio', 'Add your specialisation', 'Keep information updated'] },
  contact: { title: 'Why it’s important', icon: 'phone', items: ['Helps clients contact you directly', 'Builds trust and credibility', 'Improves local search visibility', 'Keep details updated'] },
  business: { title: 'Business Tips', icon: 'building', items: ['Choose the correct category', 'Add relevant sub categories', 'Write a clear description', 'Highlight your USPs'] },
  gst: { title: 'Required for Product Selling', icon: 'bag', items: ['GST details are mandatory to sell products on ArchFacing', 'Fill in your GST information to activate product selling'] },
  // PACT renders full width and carries its own guidance, so this entry only
  // satisfies the Record and is never shown.
  pact: { title: 'About PACT', icon: 'map', items: ['A PACT is exclusive rights over a PIN code', 'Every enquiry from that area is routed to you'] },
  social: { title: 'Tips', icon: 'share', items: ['Add active social profiles', 'Showcase your best work', 'Helps build trust with clients', 'Keep links updated'] },
  documents: { title: 'Why Upload Documents?', icon: 'shield', items: ['Builds credibility and trust', 'Helps in verification process', 'Required for product selling', 'Increases profile visibility'] },
  reviews: { title: 'About Reviews', icon: 'star', items: ['Reviews come from real client interactions', 'They cannot be edited or added manually', 'Published reviews show on your public profile'] },
}

const GST_LINKS = ['How to get GST Number?', 'GST Registration Guide (PDF)', 'GST Benefits for Businesses', 'FAQs on GST']

function EditorSidebar({ tab, completion, publicSlug, onComplete }: { tab: TabId; completion: number; publicSlug: string | null; onComplete: () => void }) {
  const tip = TIPS[tab]
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <aside className="flex flex-col gap-4 md:sticky md:top-4">
      {/* Profile Completion */}
      <section className="card p-5">
        <h3 className="font-display text-[14px] font-bold text-ink">Profile Completion</h3>
        <div className="mt-3 flex items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-paper-3" />
              <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-ok" strokeDasharray={c} strokeDashoffset={c * (1 - completion / 100)} />
            </svg>
            <span className="absolute text-[13px] font-bold text-ink">{completion}%</span>
          </span>
          <p className="text-[11.5px] leading-relaxed text-ink-3">Complete your profile to get more visibility and business leads.</p>
        </div>
        <button type="button" onClick={onComplete} className="mt-3 w-full rounded-lg bg-navy py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90">
          Complete Now
        </button>
      </section>

      {/* contextual tips (per tab) */}
      <section className={cn('rounded-card border p-5', tab === 'gst' ? 'border-brand/30 bg-brand-soft/40' : 'border-line bg-paper-2')}>
        <div className="flex items-center gap-2">
          <Icon name={tip.icon} className="h-4 w-4 text-brand" />
          <h3 className="font-display text-[13.5px] font-bold text-ink">{tip.title}</h3>
        </div>
        <ul className="mt-2.5 flex flex-col gap-2">
          {tip.items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[12px] leading-snug text-ink-2">
              <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Need Help */}
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <Icon name="help" className="h-4 w-4 text-brand" />
          <h3 className="font-display text-[13.5px] font-bold text-ink">Need Help?</h3>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">Our support team is here to help you with your profile.</p>
        <Link href="/legal/need-help" className="mt-3 block rounded-lg border border-line bg-white py-2 text-center text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
          Contact Support
        </Link>
      </section>

      {/* Useful Links — GST tab only (reference) */}
      {tab === 'gst' && (
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Icon name="file" className="h-4 w-4 text-brand" />
            <h3 className="font-display text-[13.5px] font-bold text-ink">Useful Links</h3>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {GST_LINKS.map((l) => (
              <li key={l}>
                <span className="flex items-start gap-2 text-[12px] font-medium text-brand">
                  <Icon name="arrow" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {publicSlug && (
        <Link href={`/${publicSlug}`} className="text-center text-[12px] font-semibold text-brand hover:underline">
          View public profile →
        </Link>
      )}
    </aside>
  )
}

// ═══════════════ Basic tab sidebar — Profile Preview + Completion Status ═══════════════
const SECTION_LABELS: [TabId, string][] = [
  ['basic', 'Basic Information'], ['contact', 'Contact Details'], ['business', 'Business Information'],
  ['gst', 'GST Details'], ['social', 'Social Links'], ['documents', 'Documents'], ['reviews', 'Reviews & Ratings'],
]

function BasicSidebar({ d, completion, sections, publicSlug }: { d: Data['basic']; completion: number; sections: Record<TabId, SectionStatus>; publicSlug: string | null }) {
  const r = 26, c = 2 * Math.PI * r
  const initials = d.name.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <aside className="flex flex-col gap-4 md:sticky md:top-4">
      {/* Profile Preview */}
      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 px-5 pt-4">
          <Icon name="eye" className="h-4 w-4 text-brand" />
          <h3 className="font-display text-[14px] font-bold text-ink">Profile Preview</h3>
        </div>
        <div className="mt-3">
          <div className="relative h-24 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/profile-hero-default.png" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="px-5 pb-4">
            <span className="relative -mt-8 mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-paper-3 shadow-lift">
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt="" className="h-full w-full object-cover" />
              ) : <span className="font-display text-[16px] font-bold text-brand">{initials}</span>}
            </span>
            <p className="flex items-center gap-1 font-display text-[15px] font-bold text-ink">
              {d.name || 'Your Name'}
              {d.verified && <Icon name="check" className="h-3.5 w-3.5 text-brand" />}
            </p>
            <p className="text-[12px] text-ink-2">{d.professionType || 'Professional Title'}</p>
            {d.location && <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-3"><Icon name="map" className="h-3 w-3" /> {d.location}</p>}
            {d.expertise.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {d.expertise.slice(0, 3).map((t) => <li key={t} className="rounded-full bg-paper-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2">{t}</li>)}
              </ul>
            )}
            {d.shortBio && (
              <>
                <p className="mt-3 text-[11.5px] font-bold uppercase tracking-wide text-ink-3">Professional Summary</p>
                <p className="mt-0.5 line-clamp-3 text-[12px] leading-relaxed text-ink-2">{d.shortBio}</p>
              </>
            )}
            {publicSlug && <Link href={`/${publicSlug}`} className="mt-2.5 inline-block text-[12px] font-semibold text-brand hover:underline">View Full Profile →</Link>}
          </div>
        </div>
      </section>

      {/* Completion Status */}
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <Icon name="chart" className="h-4 w-4 text-brand" />
          <h3 className="font-display text-[14px] font-bold text-ink">Completion Status</h3>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
              <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-paper-3" />
              <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-ok" strokeDasharray={c} strokeDashoffset={c * (1 - completion / 100)} />
            </svg>
            <span className="absolute text-[12px] font-bold text-ink">{completion}%</span>
          </span>
          <p className="text-[11.5px] leading-relaxed text-ink-3">Complete your profile to get more visibility and business opportunities.</p>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-line-soft">
          {SECTION_LABELS.map(([key, label]) => {
            const s = sections[key]
            return (
              <li key={key} className="flex items-center gap-2 py-2">
                <Icon name={s === 'Complete' ? 'check' : 'clock'} className={cn('h-4 w-4 shrink-0', s === 'Complete' ? 'text-ok' : s === 'In Progress' ? 'text-brand' : 'text-ink-4')} />
                <span className="flex-1 text-[12px] text-ink-2">{label}</span>
                <span className={cn('text-[11px] font-semibold', s === 'Complete' ? 'text-ok' : s === 'In Progress' ? 'text-brand' : 'text-ink-4')}>{s}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}

// ═══════════════ Contact tab sidebar — Preview + Contact Information ═══════════════
function ContactSidebar({ d, publicSlug }: { d: Data['contact']; publicSlug: string | null }) {
  const initials = d.name.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const mapUrl = (d.mapsLocation || d.location) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.mapsLocation || d.location)}` : null
  const rows = [
    d.mobile && { icon: 'phone' as IconName, val: `+91 ${d.mobile}`, action: 'Call', cls: 'bg-ok-soft text-ok' },
    d.whatsappNumber && { icon: 'phone' as IconName, val: `+91 ${d.whatsappNumber}`, action: 'WhatsApp', cls: 'bg-ok-soft text-ok' },
    d.email && { icon: 'mail' as IconName, val: d.email, action: 'Email', cls: 'bg-info-soft text-info' },
    d.website && { icon: 'globe2' as IconName, val: d.website.replace(/^https?:\/\//, ''), action: 'Visit Site', cls: 'bg-info-soft text-info' },
  ].filter(Boolean) as { icon: IconName; val: string; action: string; cls: string }[]

  return (
    <aside className="flex flex-col gap-4 md:sticky md:top-4">
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2"><Icon name="eye" className="h-4 w-4 text-brand" /><h3 className="font-display text-[14px] font-bold text-ink">Preview on Profile</h3></div>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-3">
            {d.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.photo} alt="" className="h-full w-full object-cover" />
            ) : <span className="font-display text-[15px] font-bold text-brand">{initials}</span>}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-display text-[14px] font-bold text-ink">{d.name || 'Your Name'}{d.verified && <Icon name="check" className="h-3.5 w-3.5 text-brand" />}</p>
            <p className="text-[12px] text-ink-2">{d.professionType || 'Professional'}</p>
            {d.location && <p className="flex items-center gap-1 text-[11px] text-ink-3"><Icon name="map" className="h-3 w-3" /> {d.location}</p>}
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.action} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-2"><Icon name={r.icon} className="h-3.5 w-3.5 shrink-0 text-ink-4" /><span className="truncate">{r.val}</span></span>
              <span className={cn('shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold', r.cls)}>{r.action}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="text-[12px] text-ink-3">Add contact details to preview them here.</li>}
        </ul>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2"><Icon name="map" className="h-4 w-4 text-brand" /><h3 className="font-display text-[14px] font-bold text-ink">Contact Information on Profile</h3></div>
        <p className="mt-0.5 text-[11px] text-ink-3">This is how your contact information will appear on your public profile.</p>
        {d.addressLine && <p className="mt-3 flex items-start gap-2 text-[12px] text-ink-2"><Icon name="map" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" />{d.addressLine}</p>}
        {(d.mapsLocation || d.location) && (
          <a href={mapUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-card border border-line">
            <span className="relative flex h-28 items-center justify-center bg-gradient-to-br from-info-soft to-paper-3">
              <span className="absolute inset-0 opacity-40 [background-image:linear-gradient(#0002_1px,transparent_1px),linear-gradient(90deg,#0002_1px,transparent_1px)] [background-size:18px_18px]" />
              <span className="relative flex flex-col items-center rounded-lg bg-white px-3 py-1.5 shadow-card"><Icon name="map" className="h-5 w-5 text-brand" /><span className="text-[11px] font-semibold text-ink">{(d.mapsLocation || d.location).split(',')[0]}</span></span>
            </span>
          </a>
        )}
        {publicSlug && <Link href={`/${publicSlug}`} className="mt-3 inline-block text-[12px] font-semibold text-brand hover:underline">View public profile →</Link>}
      </section>
    </aside>
  )
}

// ═══════════════ Social tab sidebar — Preview + Tips + Need Help ═══════════════
function SocialSidebar({ d, publicSlug }: { d: Data['social']; publicSlug: string | null }) {
  const initials = d.name.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const shown = SOCIAL_NETWORKS.filter((n) => d.links[n.key] && !d.hidden.includes(n.key))
  return (
    <aside className="flex flex-col gap-4 md:sticky md:top-4">
      {/* Preview on Public Profile */}
      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 px-5 pt-4"><Icon name="eye" className="h-4 w-4 text-brand" /><h3 className="font-display text-[14px] font-bold text-ink">Preview on Public Profile</h3></div>
        <div className="mt-3">
          <div className="relative h-24 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/profile-hero-default.png" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="px-5 pb-4">
            <span className="relative -mt-8 mb-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-paper-3 shadow-lift">
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.photo} alt="" className="h-full w-full object-cover" />
              ) : <span className="font-display text-[16px] font-bold text-brand">{initials}</span>}
            </span>
            <p className="flex items-center gap-1 font-display text-[15px] font-bold text-ink">{d.name || 'Your Name'}{d.verified && <Icon name="check" className="h-3.5 w-3.5 text-brand" />}</p>
            <p className="text-[12px] text-ink-2">{d.professionType || 'Professional'}</p>
            {d.location && <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-3"><Icon name="map" className="h-3 w-3" /> {d.location}</p>}
            {shown.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {shown.map((n) => (
                  <li key={n.key}><a href={d.links[n.key]} target="_blank" rel="noopener noreferrer" aria-label={n.label}><SocialBadge color={n.color} mark={n.mark} /></a></li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[11.5px] text-ink-3">Enabled links will appear here.</p>}
          </div>
        </div>
      </section>

      {/* Social Link Tips */}
      <section className="rounded-card border border-line bg-paper-2 p-5">
        <div className="flex items-center gap-2"><span>💡</span><h3 className="font-display text-[13.5px] font-bold text-ink">Social Link Tips</h3></div>
        <ul className="mt-2.5 flex flex-col gap-2 text-[12px] text-ink-2">
          {['Use official and active social media profiles', 'Keep links updated', 'Showcase your best work', 'Helps build trust with clients', 'Increases your visibility and reach'].map((t) => (
            <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" /> {t}</li>
          ))}
        </ul>
      </section>

      {/* Need Help */}
      <section className="card p-5">
        <div className="flex items-center gap-2"><Icon name="help" className="h-4 w-4 text-brand" /><h3 className="font-display text-[13.5px] font-bold text-ink">Need Help?</h3></div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">Our support team is here to help you with your profile.</p>
        <Link href="/legal/need-help" className="mt-3 block rounded-lg border border-line bg-white py-2 text-center text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">Contact Support</Link>
      </section>
      {publicSlug && <Link href={`/${publicSlug}`} className="text-center text-[12px] font-semibold text-brand hover:underline">View public profile →</Link>}
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────
function Saved({ state }: { state: TabState }) {
  if (!state) return null
  if (state.ok) return <Alert tone="success">{state.message ?? 'Saved.'}</Alert>
  return <Alert tone="error">{state.error ?? 'Please check the form.'}</Alert>
}

function Card({ title, hint, badge, children }: { title: string; hint?: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-ok">
            {badge}
          </span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[12.5px] text-ink-3">{hint}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function SaveBar({ pending, label = 'Save & Continue' }: { pending: boolean; label?: string }) {
  return (
    <div className="flex justify-end pt-1">
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : label} {!pending && <Icon name="arrow" className="h-4 w-4" />}
      </Button>
    </div>
  )
}

// ── Tab 1: Basic ──
function Counter({ value, max }: { value: number; max: number }) {
  return <span className={cn('mt-1 block text-right text-[11px] tabular-nums', value > max ? 'text-brand' : 'text-ink-4')}>{value}/{max}</span>
}

function BasicTab({ d }: { d: Data['basic'] }) {
  const [state, action, pending] = useActionState(saveBasicAction, null)
  const [shortBio, setShortBio] = useState(d.shortBio)
  const [about, setAbout] = useState(d.bio)

  return (
    <form action={action}>
      <Card title="Basic Information" hint="Tell us about yourself and your professional identity.">
        <Saved state={state} />

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {/* Profile Photo — spans both columns */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Profile Photo <span className="text-brand">*</span></label>
            <ImageUpload current={d.photo} target="photo" shape="circle" full />
          </div>

          {/* The member's public ID — read-only, shown as the Artwork ID on Artistry */}
          <div className="md:col-span-2">
            <label htmlFor="memberCode" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Artwork ID</label>
            <div className="flex max-w-md items-center gap-2">
              <Input id="memberCode" value={'#' + d.memberCode} readOnly className="flex-1 font-mono tracking-wide" />
              <span className="shrink-0 text-[11.5px] text-ink-3">Shown on your Artistry posts</span>
            </div>
          </div>

          {/* Full Name + Professional Title */}
          <Field label="Full Name" name="name" required error={state?.fieldErrors?.name}>
            <Input id="name" name="name" required defaultValue={d.name} error={!!state?.fieldErrors?.name} />
          </Field>
          <Field label="Professional Title" name="professionType" hint="e.g. Architect, Interior Designer, Landscape Designer">
            <Input id="professionType" name="professionType" defaultValue={d.professionType} placeholder="Architect" />
          </Field>

          {/* Short Bio + Profile Tips */}
          <div>
            <label htmlFor="shortBio" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Short Bio <span className="text-brand">*</span></label>
            <Textarea id="shortBio" name="shortBio" rows={3} value={shortBio} onChange={(e) => setShortBio(e.target.value)} maxLength={300} placeholder="A one-line professional introduction." />
            <Counter value={shortBio.length} max={300} />
          </div>
          <div className="rounded-card bg-info-soft/50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-[15px]">💡</span>
              <h4 className="font-display text-[13.5px] font-bold text-ink">Profile Tips</h4>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2 text-[12px] text-ink-2">
              {['Use a clear professional photo', 'Write a compelling bio', 'Add your specialization', 'Keep information updated'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-3.5 w-3.5 shrink-0 text-info" /> {t}</li>
              ))}
            </ul>
          </div>

          {/* About Me + Areas of Expertise */}
          <div>
            <label htmlFor="bio" className="mb-1.5 block text-[12.5px] font-semibold text-ink">About Me (Detailed) <span className="text-brand">*</span></label>
            <Textarea id="bio" name="bio" rows={5} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={1000} placeholder="A detailed professional description." />
            <Counter value={about.length} max={1000} />
          </div>
          <TagField name="expertise" label="Areas of Expertise (Tags)" initial={d.expertise} placeholder="Add an expertise and press Enter" />

          {/* City + State */}
          <Field label="City" name="city" required>
            <Input id="city" name="city" defaultValue={d.city} />
          </Field>
          <Field label="State" name="state" required>
            <select id="state" name="state" defaultValue={d.state} className="input">
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <SaveBar pending={pending} />
      </Card>
    </form>
  )
}

// ── Tab 2: Contact ──
function PhoneField({ label, name, defaultValue, verified, error, optional }: { label: string; name: string; defaultValue: string; verified?: boolean; error?: string; optional?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label} {!optional && <span className="text-brand">*</span>}{optional && <span className="text-[11px] font-normal text-ink-4">(Optional)</span>}</label>
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-paper-2 px-2.5 py-2 text-[13px]">🇮🇳 +91</span>
        <Input id={name} name={name} inputMode="numeric" maxLength={10} defaultValue={defaultValue} error={!!error} className="flex-1" placeholder="98765 43210" />
        {verified && <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ok-soft px-2.5 py-2 text-[11.5px] font-semibold text-ok"><Icon name="check" className="h-3 w-3" /> Verified</span>}
      </div>
      {error && <p className="mt-1 text-[12px] font-medium text-brand">{error}</p>}
    </div>
  )
}
function Check({ name, label, on }: { name: string; label: string; on: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-[12.5px] text-ink-2">
      <input type="checkbox" name={name} value="1" defaultChecked={on} className="h-4 w-4 rounded border-line text-brand accent-[color:var(--brand,#F97316)]" />
      {label}
    </label>
  )
}

function ContactTab({ d }: { d: Data['contact'] }) {
  const [state, action, pending] = useActionState(saveContactAction, null)
  const [addr, setAddr] = useState(d.addressLine)
  const mapUrl = d.mapsLocation || d.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.mapsLocation || d.location)}`
    : null

  return (
    <form action={action}>
      <Card title="Contact Details" hint="Add your contact information so clients can reach you easily.">
        <Saved state={state} />
        <div className="grid gap-5 xl:grid-cols-[1fr_248px]">
          {/* form fields */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PhoneField label="Phone Number" name="mobile" defaultValue={d.mobile} verified={!!d.mobile} error={state?.fieldErrors?.mobile} />
              <PhoneField label="Alternate Phone Number" name="altPhone" defaultValue={d.altPhone} error={state?.fieldErrors?.altPhone} optional />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Email Address <span className="text-brand">*</span></label>
                <div className="flex items-center gap-2">
                  <Input id="email" name="email" defaultValue={d.email} disabled className="flex-1" />
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ok-soft px-2.5 py-2 text-[11.5px] font-semibold text-ok"><Icon name="check" className="h-3 w-3" /> Verified</span>
                </div>
              </div>
              <Field label="Alternate Email" name="altEmail" error={state?.fieldErrors?.altEmail}>
                <Input id="altEmail" name="altEmail" defaultValue={d.altEmail} error={!!state?.fieldErrors?.altEmail} placeholder="contact@company.in" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website" name="website" error={state?.fieldErrors?.website}>
                <Input id="website" name="website" defaultValue={d.website} error={!!state?.fieldErrors?.website} placeholder="https://…" />
              </Field>
              <Field label="Office Landline" name="officeLandline" hint="Optional">
                <Input id="officeLandline" name="officeLandline" defaultValue={d.officeLandline} placeholder="0124 456 7890" />
              </Field>
            </div>
            <div>
              <label htmlFor="addressLine" className="mb-1.5 block text-[12.5px] font-semibold text-ink">Office Address <span className="text-brand">*</span></label>
              <Textarea id="addressLine" name="addressLine" rows={2} value={addr} onChange={(e) => setAddr(e.target.value)} maxLength={300} />
              <Counter value={addr.length} max={300} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="mapsLocation" className="text-[12.5px] font-semibold text-ink">Google Maps Location <span className="text-brand">*</span></label>
                {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-semibold text-brand hover:underline">Change Location</a>}
              </div>
              <Input id="mapsLocation" name="mapsLocation" defaultValue={d.mapsLocation || d.location} placeholder="Search a location…" />
              {(d.mapsLocation || d.location) && (
                <a href={mapUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-card border border-line">
                  <span className="relative flex h-32 items-center justify-center bg-gradient-to-br from-info-soft to-paper-3">
                    <span className="absolute inset-0 opacity-40 [background-image:linear-gradient(#0002_1px,transparent_1px),linear-gradient(90deg,#0002_1px,transparent_1px)] [background-size:20px_20px]" />
                    <span className="relative flex flex-col items-center rounded-lg bg-white px-3 py-1.5 shadow-card">
                      <Icon name="map" className="h-5 w-5 text-brand" />
                      <span className="text-[11px] font-semibold text-ink">{(d.mapsLocation || d.location).split(',')[0]}</span>
                    </span>
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* why + preferences */}
          <div className="flex flex-col gap-4">
            <section className="rounded-card bg-info-soft/40 p-4">
              <div className="flex items-center gap-2"><span>💡</span><h4 className="font-display text-[13px] font-bold text-ink">Why it&apos;s important?</h4></div>
              <ul className="mt-2.5 flex flex-col gap-2 text-[12px] text-ink-2">
                {['Helps clients contact you directly', 'Builds trust and credibility', 'Enables enquiries and project discussions', 'Improves local search visibility', 'Keep details updated'].map((t) => (
                  <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" /> {t}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-card border border-line bg-paper-2 p-4">
              <div className="flex items-center gap-2"><Icon name="settings" className="h-4 w-4 text-brand" /><h4 className="font-display text-[13px] font-bold text-ink">Contact Preferences</h4></div>
              <p className="mt-0.5 text-[11px] text-ink-3">Choose how you want to be contacted.</p>
              <div className="mt-3 flex flex-col gap-2.5">
                <Check name="allowCalls" label="Allow calls" on={d.allowCalls} />
                <Check name="allowEmails" label="Allow emails" on={d.allowEmails} />
                <Check name="allowWhatsapp" label="Allow WhatsApp messages" on={d.allowWhatsapp} />
                <Check name="showPhonePublic" label="Show phone number on public profile" on={d.showPhonePublic} />
                <Check name="showEmailPublic" label="Show email address on public profile" on={d.showEmailPublic} />
              </div>
              <div className="mt-3">
                <label htmlFor="preferredContactTime" className="mb-1 block text-[12px] font-semibold text-ink">Preferred Contact Time</label>
                <select id="preferredContactTime" name="preferredContactTime" defaultValue={d.preferredContactTime} className="input">
                  {['Business Hours (9 AM – 6 PM)', 'Morning (9 AM – 12 PM)', 'Afternoon (12 PM – 4 PM)', 'Evening (4 PM – 8 PM)', 'Anytime'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-[12px] font-semibold text-ink">WhatsApp Number <span className="text-[10.5px] font-normal text-ink-4">(Optional)</span></label>
                <div className="flex items-center gap-2">
                  <span className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2 py-2 text-[12px]">🇮🇳 +91</span>
                  <Input id="whatsappNumber" name="whatsappNumber" inputMode="numeric" maxLength={10} defaultValue={d.whatsappNumber} error={!!state?.fieldErrors?.whatsappNumber} className="flex-1" placeholder="98765 43210" />
                </div>
              </div>
            </section>
          </div>
        </div>
        <SaveBar pending={pending} />
      </Card>
    </form>
  )
}

// ── Tab 3: Business ──
const BUSINESS_TYPES = ['Individual', 'Proprietorship', 'Partnership', 'LLP', 'Private Limited Company', 'Public Limited Company', 'Other']
const EMPLOYEE_RANGES = ['1 - 10', '11 - 50', '51 - 200', '201 - 500', '500+']

function TagField({ name, label, initial, placeholder, suggestions }: { name: string; label: string; initial: string[]; placeholder: string; suggestions?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial)
  const [next, setNext] = useState('')
  const add = (v: string) => { const t = v.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setNext('') }
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label} <span className="text-brand">*</span></label>
      {tags.map((t) => <input key={t} type="hidden" name={name} value={t} />)}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white p-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-1 text-[12px] font-medium text-info">
            {t}
            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-info/70 hover:text-info">×</button>
          </span>
        ))}
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(next) } }}
          placeholder={tags.length ? '' : placeholder}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 text-[13px] outline-none"
        />
      </div>
      {suggestions && suggestions.filter((s) => !tags.includes(s)).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3 hover:border-brand hover:text-brand">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function BusinessTab({ d }: { d: Data['business'] }) {
  const [state, action, pending] = useActionState(saveBusinessAction, null)
  const primary = d.primaryCategory || d.categories[0] || ''
  const subs = d.categories.filter((c) => c !== primary)

  return (
    <form action={action}>
      <Card title="Business Information" hint="Tell us about your business or firm. This information is visible on your public profile.">
        <Saved state={state} />

        {/* 1. Company Information */}
        <div>
          <h3 className="text-[13px] font-bold text-info">1. Company Information</h3>
          <p className="mb-3 text-[11.5px] text-ink-3">Add your company or firm details.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business / Firm Name" name="firmName" required>
              <Input id="firmName" name="firmName" defaultValue={d.firmName} />
            </Field>
            <Field label="Business Type" name="businessType">
              <select id="businessType" name="businessType" defaultValue={d.businessType} className="input">
                <option value="">Select…</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Year of Establishment" name="yearEstablished" error={state?.fieldErrors?.yearEstablished}>
              <Input id="yearEstablished" name="yearEstablished" inputMode="numeric" maxLength={4} defaultValue={d.yearEstablished} placeholder="e.g. 2019" error={!!state?.fieldErrors?.yearEstablished} />
            </Field>
            <Field label="Number of Employees" name="employeeCount">
              <select id="employeeCount" name="employeeCount" defaultValue={d.employeeCount} className="input">
                <option value="">Select…</option>
                {EMPLOYEE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Company Logo</label>
            <ImageUpload current={d.logo} target="logo" shape="square" label={d.logo ? 'Change Logo' : 'Upload Logo'} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Tagline / Motto" name="tagline">
              <Input id="tagline" name="tagline" defaultValue={d.tagline} maxLength={100} placeholder="Designing Spaces for a Better Tomorrow" />
            </Field>
            <Field label="Company Website" name="website" error={state?.fieldErrors?.website}>
              <Input id="website" name="website" defaultValue={d.website} placeholder="https://…" error={!!state?.fieldErrors?.website} />
            </Field>
            <Field label="Business Email (Official)" name="businessEmail" error={state?.fieldErrors?.businessEmail}>
              <Input id="businessEmail" name="businessEmail" defaultValue={d.businessEmail} placeholder="info@company.in" error={!!state?.fieldErrors?.businessEmail} />
            </Field>
            <Field label="Member Since" name="memberSince">
              <Input id="memberSince" name="memberSince" defaultValue={d.memberSince} disabled />
            </Field>
          </div>
        </div>

        {/* 2. Business Category & Services */}
        <div className="border-t border-line-soft pt-4">
          <h3 className="text-[13px] font-bold text-info">2. Business Category &amp; Services</h3>
          <p className="mb-3 text-[11.5px] text-ink-3">Add your business categories and service areas.</p>
          <Field label="Primary Category" name="primaryCategory">
            <select id="primaryCategory" name="primaryCategory" defaultValue={primary} className="input">
              <option value="">Select…</option>
              {[...new Set([primary, ...d.categoryOptions].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="mt-4">
            <TagField name="categories" label="Sub Categories" initial={subs} placeholder="Add a sub category and press Enter" suggestions={d.categoryOptions} />
          </div>
          <div className="mt-4">
            <TagField name="serviceAreas" label="Service Areas" initial={d.serviceAreas} placeholder="Add a city / region and press Enter" />
          </div>
        </div>

        {/* 3. Business Description */}
        <div className="border-t border-line-soft pt-4">
          <h3 className="text-[13px] font-bold text-info">3. Business Description</h3>
          <p className="mb-3 text-[11.5px] text-ink-3">Describe your business, what you do and what makes you different.</p>
          <Textarea id="bio" name="bio" rows={4} defaultValue={d.description} maxLength={1000} placeholder="We provide end-to-end architecture and interior design services…" />
        </div>

        <SaveBar pending={pending} />
      </Card>
    </form>
  )
}

// ── Tab 4: GST ──
function GstTab({ d }: { d: Data['gst'] }) {
  const [state, action, pending] = useActionState(saveGstAction, null)
  return (
    <form action={action}>
      <Card title="GST Details" hint="GST details are required if you want to sell products or services on ArchFacing." badge="Recommended">
        <Saved state={state} />
        <div className="flex gap-2.5 rounded-lg border border-warn/30 bg-warn-soft/50 px-3.5 py-3">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p className="text-[12px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Why GST Details?</span> GST details help build trust with buyers
            and are mandatory for product sellers. Your GST information will be shown on invoices and used for tax compliance.
          </p>
        </div>
        {d.verified && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold text-ok">
            <Icon name="check" className="h-3 w-3" /> GST Verified
          </span>
        )}
        <Field label="GST Number (GSTIN)" name="gstNumber" error={state?.fieldErrors?.gstNumber}>
          <Input id="gstNumber" name="gstNumber" defaultValue={d.gstNumber} error={!!state?.fieldErrors?.gstNumber} className="font-mono uppercase" placeholder="06AAACR1234A1Z5" />
        </Field>
        <Field label="PAN Number" name="panNumber" error={state?.fieldErrors?.panNumber}>
          <Input id="panNumber" name="panNumber" defaultValue={d.panNumber} error={!!state?.fieldErrors?.panNumber} className="font-mono uppercase" placeholder="AAACR1234A" />
        </Field>
        <Field label="Legal Business Name (as per GST)" name="companyName">
          <Input id="companyName" name="companyName" defaultValue={d.companyName} />
        </Field>
        <Field label="Website" name="website" error={state?.fieldErrors?.website}>
          <Input id="website" name="website" defaultValue={d.website} error={!!state?.fieldErrors?.website} placeholder="https://…" />
        </Field>
        <p className="rounded-lg border border-line bg-paper-2 px-3.5 py-2.5 text-[12px] text-ink-3">
          Your GST and PAN are stored securely and used only for invoicing and compliance. They are never shown in full on your public profile.
        </p>
        <SaveBar pending={pending} label="Save Changes" />
      </Card>
    </form>
  )
}

// ── Tab 5: Social ──
type SocialKey = keyof Data['social']['links']
export const SOCIAL_NETWORKS: { key: SocialKey; label: string; color: string; mark: IconName | string; placeholder: string }[] = [
  { key: 'website', label: 'Website', color: '#475569', mark: 'globe2', placeholder: 'https://www.yoursite.in' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', mark: 'in', placeholder: 'https://www.linkedin.com/in/username' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F', mark: 'image', placeholder: 'https://www.instagram.com/username' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', mark: 'f', placeholder: 'https://www.facebook.com/username' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000', mark: 'monitor', placeholder: 'https://www.youtube.com/@username' },
  { key: 'pinterest', label: 'Pinterest', color: '#E60023', mark: 'P', placeholder: 'https://www.pinterest.com/username' },
  { key: 'behance', label: 'Behance', color: '#1769FF', mark: 'Be', placeholder: 'https://www.behance.net/username' },
  { key: 'houzz', label: 'Houzz', color: '#4DBC15', mark: 'h', placeholder: 'https://www.houzz.in/pro/username' },
]

export function SocialBadge({ color, mark, className }: { color: string; mark: IconName | string; className?: string }) {
  const isIcon = ['globe2', 'image', 'monitor'].includes(mark)
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white', className)} style={{ backgroundColor: color }}>
      {isIcon ? <Icon name={mark as IconName} className="h-4 w-4" /> : <span className="text-[12px] font-bold">{mark}</span>}
    </span>
  )
}

function SocialTab({ d }: { d: Data['social'] }) {
  const [state, action, pending] = useActionState(saveSocialAction, null)
  return (
    <form action={action}>
      <Card title="Social Links" hint="Add your social media and professional links to showcase your work and connect with clients.">
        <Saved state={state} />
        <ul className="flex flex-col gap-3">
          {SOCIAL_NETWORKS.map((n) => {
            const url = d.links[n.key]
            const shown = !d.hidden.includes(n.key)
            return (
              <li key={n.key} className="flex flex-wrap items-center gap-3">
                <div className="flex w-[130px] shrink-0 items-center gap-2.5">
                  <SocialBadge color={n.color} mark={n.mark} />
                  <span className="text-[13px] font-semibold text-ink">{n.label}</span>
                </div>
                <Input id={n.key} name={n.key} defaultValue={url} error={!!state?.fieldErrors?.[n.key]} placeholder={n.placeholder} className="min-w-[180px] flex-1" />
                <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-2">
                  <input type="checkbox" name={`show_${n.key}`} value="1" defaultChecked={shown} className="peer sr-only" />
                  <span className="relative h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-ok">
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                  <span className="hidden text-[12px] text-ink-3 sm:inline">Show on Profile</span>
                </label>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
                    Visit <Icon name="arrow" className="h-3 w-3" />
                  </a>
                ) : <span className="w-10 shrink-0" />}
              </li>
            )
          })}
        </ul>
        <div className="flex items-start gap-2 rounded-lg border border-info/20 bg-info-soft/40 px-3.5 py-2.5">
          <Icon name="help" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-[12px] text-ink-2">Only the social links you enable will be visible on your public profile. Make sure the links are correct and up to date.</p>
        </div>
        <SaveBar pending={pending} />
      </Card>
    </form>
  )
}

// ── Tab 6: Documents (verification status; files stay private) ──
function DocumentsTab({ v }: { v: Data['verifications'] }) {
  const rows = [
    { ok: v.professional, label: 'Professional Identity', note: 'Verified by ArchFacing' },
    { ok: v.business, label: 'Registered Business', note: 'Company registration on file' },
    { ok: v.gst, label: 'GST Certificate', note: 'GSTIN verified' },
    { ok: v.kyc, label: 'KYC', note: 'Identity documents verified' },
  ]
  return (
    <Card title="Documents & Verification" hint="Your verification status. Document files are stored privately and never shown publicly.">
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 rounded-card border border-line-soft bg-paper-2 px-3.5 py-3">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', r.ok ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-4')}>
              <Icon name={r.ok ? 'check' : 'clock'} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">{r.label}</p>
              <p className="text-[11.5px] text-ink-3">{r.note}</p>
            </div>
            <span className={cn('ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', r.ok ? 'bg-ok-soft text-ok' : 'bg-paper-3 text-ink-3')}>
              {r.ok ? 'Verified' : 'Pending'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-3">
        Upload or replace verification documents on the{' '}
        <a href="/dashboard/settings/documents" className="font-semibold text-brand hover:underline">Verification Documents</a> page.
      </p>
    </Card>
  )
}

// ── Tab 7: Reviews (read-only, links to the full page) ──
function ReviewsTab({ r }: { r: Data['reviews'] }) {
  return (
    <Card title="Reviews & Ratings" hint="Reviews clients leave on your products, projects and content. This is read-only.">
      {r.total === 0 ? (
        <p className="text-[13px] text-ink-3">No reviews yet. They appear here as clients review your work.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center rounded-card border border-line bg-white px-6 py-4">
            <span className="font-display text-[30px] font-bold leading-none text-ink">{r.average.toFixed(1)}</span>
            <span className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Icon key={i} name="star" className={cn('h-3.5 w-3.5', i <= Math.round(r.average) ? 'text-brand' : 'text-line')} />
              ))}
            </span>
            <span className="mt-1 text-[11.5px] text-ink-3">{r.total} review{r.total === 1 ? '' : 's'}</span>
          </div>
          <p className="text-[13px] text-ink-2">
            You have <strong>{r.total}</strong> review{r.total === 1 ? '' : 's'} across your listings.
          </p>
        </div>
      )}
      <div className="pt-1">
        <Link href="/dashboard/professional/reviews" className="btn-primary w-fit">
          <Icon name="star" className="h-4 w-4" /> Open full Reviews &amp; Ratings
        </Link>
      </div>
    </Card>
  )
}
