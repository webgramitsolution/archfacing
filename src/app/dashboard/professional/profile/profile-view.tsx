import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { VerifiedTick } from '@/components/blog'
import { cn } from '@/lib/utils'
import { ProfileHero } from './profile-hero'
import { ShareButton } from './share-button'
import { ProfileTabs } from './profile-tabs'
import { PactTab } from './pact-tab'
import type { MyPactData } from '@/lib/my-pact'

export type ProfileViewData = {
  hero: { images: string[]; eyebrow: string; heading: string; tagline: string | null; script: string | null }
  name: string
  subtitle: string
  firmName: string | null
  location: string
  pincode: string | null
  photo: string | null
  verified: boolean
  badgeTone: 'gold' | 'blue' | null
  tags: string[]
  stats: { products: number; projects: number; rating: number | null; reviewCount: number; views: number }
  sellerSlug: string | null
  about: string | null
  aboutLead: string | null
  highlights: { icon: IconName; title: string; sub?: string }[]
  business: { k: string; v: string; isUrl?: boolean }[]
  businessVerified: boolean
  gst: { rows: { k: string; v: string; mono?: boolean }[]; verified: boolean } | null
  products: { id: string; href: string; image: string | null; title: string; sub: string }[]
  projects: { id: string; href: string; image: string | null; title: string; sub: string }[]
  contact: { phone: string | null; email: string | null; address: string | null; location: string; pincode: string | null }
  social: { href: string; icon: IconName; label: string; color: string }[]
  documents: { label: string; icon: IconName; ok: boolean }[]
  documentsVerified: boolean
  reviews: { id: string; name: string; role: string; photo: string | null; rating: number; body: string | null; date: string }[]
  editHref: string
  /** The holder's own territories — same data the editor's My PACT tab shows. */
  pact: MyPactData
  leadsHref: string
  buyPactHref: string
}

// Gallery removed — it had no section of its own. Each tab points at a real
// section id so clicking it scrolls there (handled in ProfileTabs).
const PROFILE_TABS: { label: string; id: string }[] = [
  { label: 'Overview', id: 'overview' },
  { label: 'About', id: 'about' },
  { label: 'Products', id: 'products' },
  { label: 'Projects', id: 'projects' },
  { label: 'Services', id: 'business' },
  { label: 'My PACT', id: 'pact' },
  { label: 'Reviews', id: 'reviews' },
  { label: 'Contact', id: 'contact' },
]

export function ProfileView({ d }: { d: ProfileViewData }) {
  const initials = d.name.replace(/^(ar|er|dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const publicUrl = d.sellerSlug ? `/${d.sellerSlug}` : null
  const mapUrl = d.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.location)}` : null

  return (
    <div className="-mx-4 -mt-4 flex flex-col md:-mx-6 md:-mt-6">
      {/* ═══════════ hero ═══════════ */}
      <ProfileHero
        images={d.hero.images}
        eyebrow={d.hero.eyebrow}
        heading={d.hero.heading}
        tagline={d.hero.tagline}
        script={d.hero.script}
      />

      <div className="px-4 md:px-6">
        {/* ═══════════ identity + stats + actions ═══════════ */}
        <div className="border-b border-line">
          <div className="flex flex-col gap-4 pb-4 pt-3 md:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <span className="relative -mt-12 flex h-24 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-4 border-white bg-paper-3 shadow-lift lg:h-28 lg:w-28">
                {d.photo ? (
                  <Image src={d.photo} alt={d.name} fill sizes="112px" className="object-cover" />
                ) : (
                  <span className="font-display text-[26px] font-bold text-brand">{initials}</span>
                )}
              </span>
              <div className="min-w-0 pb-0.5">
                <h1 className="flex items-center gap-1.5 font-display text-[17px] font-semibold leading-tight text-ink lg:text-[19px]">
                  <span className="truncate">{d.name}</span>
                  {d.verified && <VerifiedTick className="h-4 w-4 shrink-0" tone={d.badgeTone} />}
                </h1>
                <p className="mt-0.5 text-[12.5px] font-medium text-ink-2">{d.subtitle}</p>
                {d.firmName && d.firmName !== d.name && <p className="text-[12.5px] text-ink-3">{d.firmName}</p>}
                <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-3">
                  <Icon name="map" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{d.location || 'India'}{d.pincode ? ` (${d.pincode})` : ''}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {d.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5FE] px-2 py-0.5 text-[10.5px] font-semibold text-[#0077C8]">
                      <VerifiedTick className="h-3.5 w-3.5" tone={d.badgeTone} /> Verified Professional
                    </span>
                  )}
                  {d.tags.map((t) => (
                    <span key={t} className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 lg:items-end">
              <div className="flex items-center gap-5 sm:gap-7">
                <Stat value={d.stats.products.toLocaleString('en-IN')} label="Products" />
                <Stat value={d.stats.projects.toLocaleString('en-IN')} label="Projects" />
                <Stat value={d.stats.rating ? String(d.stats.rating) : '—'} label={d.stats.rating ? `(${d.stats.reviewCount} Reviews)` : 'No reviews'} star />
                <Stat value={d.stats.views.toLocaleString('en-IN')} label="Posting Views" />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link href={d.editHref} className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90">
                  <Icon name="edit" className="h-4 w-4" /> Edit Profile
                </Link>
                {publicUrl && (
                  <Link href={publicUrl} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand">
                    <Icon name="eye" className="h-4 w-4" /> View Public Profile
                  </Link>
                )}
                {publicUrl && (
                  <ShareButton url={publicUrl} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ tab bar (client — scrolls to each section) ═══════════ */}
        <ProfileTabs tabs={PROFILE_TABS} />

        {/* ═══════════ body ═══════════ */}
        <div id="overview" className="grid gap-6 py-6 md:grid-cols-[minmax(0,1fr)_300px] md:items-start lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ─────────── LEFT ─────────── */}
          <div className="flex min-w-0 flex-col gap-5">
            {/* About */}
            <section id="about" className="card scroll-mt-4 p-5">
              <SectionHead icon="user" title="About" />
              {d.aboutLead && <p className="mt-2.5 text-[13px] font-medium text-ink">{d.aboutLead}</p>}
              {d.about ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                  {d.about.length > 300 ? <>{d.about.slice(0, 300)}… </> : d.about}
                  {publicUrl && d.about.length > 300 && <Link href={`${publicUrl}/about`} className="font-semibold text-brand hover:underline">Read More →</Link>}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-3">You have not written an about section yet.</p>
              )}
              {d.highlights.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {d.highlights.map((h) => (
                    <li key={h.title} className="flex flex-col items-center gap-2 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon name={h.icon} className="h-5 w-5" /></span>
                      <span className="text-[11.5px] font-semibold leading-tight text-ink">{h.title}</span>
                      {h.sub && <span className="text-[10.5px] leading-tight text-ink-3">{h.sub}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Business Information */}
            {d.business.length > 0 && (
              <section id="business" className="card scroll-mt-4 p-5">
                <SectionHead icon="building" title="Business Information" badge={d.businessVerified ? 'Verified Business' : undefined} />
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
                  {d.business.map((r) => (
                    <div key={r.k}>
                      <dt className="text-[10.5px] uppercase tracking-wide text-ink-4">{r.k}</dt>
                      <dd className="mt-0.5 text-[12.5px] font-medium text-ink">
                        {r.isUrl ? <a href={r.v} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{r.v}</a> : r.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* GST Details */}
            {d.gst && (
              <section className="card p-5">
                <SectionHead icon="shield" title="GST Details" badge={d.gst.verified ? 'GST Verified' : undefined} />
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
                  {d.gst.rows.map((r) => (
                    <div key={r.k}>
                      <dt className="text-[10.5px] uppercase tracking-wide text-ink-4">{r.k}</dt>
                      <dd className={cn('mt-0.5 text-[12.5px] font-medium text-ink', r.mono && 'font-mono')}>{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <Featured id="products" icon="box" title="Featured Products" viewAll={publicUrl ? `${publicUrl}/products` : d.editHref} items={d.products} empty="You have not published any products yet." />
            <Featured id="projects" icon="file" title="Featured Projects" viewAll={publicUrl ? `${publicUrl}/projects` : d.editHref} items={d.projects} empty="You have not published any projects yet." />
          </div>

          {/* ─────────── RIGHT SIDEBAR ─────────── */}
          <aside className="flex flex-col gap-5">
            {/* Get in Touch */}
            <section id="contact" className="card scroll-mt-4 p-5">
              <div className="flex items-center gap-2">
                <Icon name="phone" className="h-4 w-4 text-brand" />
                <h3 className="font-display text-[14px] font-bold text-ink">Get in Touch</h3>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-3">Let&apos;s discuss your project requirements.</p>
              {/* A preview of the buttons visitors see on the public profile —
                  not actions for the owner, so they are marked disabled. */}
              <div className="mt-3 flex flex-col gap-2">
                <span aria-disabled="true" className="inline-flex cursor-default items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-[13px] font-bold text-white opacity-95">
                  <Icon name="mail" className="h-4 w-4" /> Send Enquiry
                </span>
                <span aria-disabled="true" className="inline-flex cursor-default items-center justify-center gap-2 rounded-lg border border-line bg-white py-2.5 text-[13px] font-semibold text-ink">
                  <Icon name="phone" className="h-4 w-4" /> Request a Call Back
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-2.5 text-[12.5px] text-ink-2">
                {d.contact.phone && <ContactRow icon="phone">{d.contact.phone}</ContactRow>}
                {d.contact.email && <ContactRow icon="mail">{d.contact.email}</ContactRow>}
                {(d.contact.address || d.contact.location) && (
                  <ContactRow icon="map">{d.contact.address || d.contact.location}{d.contact.pincode ? ` – ${d.contact.pincode}` : ''}</ContactRow>
                )}
              </ul>
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="group mt-3 block overflow-hidden rounded-card border border-line">
                  <span className="relative flex h-24 items-center justify-center bg-gradient-to-br from-info-soft to-paper-3">
                    <span className="absolute inset-0 opacity-40 [background-image:linear-gradient(#0002_1px,transparent_1px),linear-gradient(90deg,#0002_1px,transparent_1px)] [background-size:16px_16px]" />
                    <span className="relative flex flex-col items-center">
                      <Icon name="map" className="h-6 w-6 text-brand" />
                      <span className="mt-0.5 text-[11px] font-semibold text-ink">{(d.contact.location || 'Location').split(',')[0]}</span>
                    </span>
                  </span>
                  <span className="flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-brand group-hover:underline">
                    View on Map →
                  </span>
                </a>
              )}
            </section>

            {/* Follow Us */}
            {d.social.length > 0 && (
              <section className="card p-5">
                <div className="flex items-center gap-2">
                  <Icon name="share" className="h-4 w-4 text-brand" />
                  <h3 className="font-display text-[14px] font-bold text-ink">Follow Us</h3>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2.5">
                  {d.social.map((s) => (
                    <li key={s.label}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5"
                        style={{ backgroundColor: s.color }}>
                        <Icon name={s.icon} className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Documents */}
            <section className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="file" className="h-4 w-4 text-brand" />
                  <h3 className="font-display text-[14px] font-bold text-ink">Documents</h3>
                </div>
                {d.documentsVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">
                    <Icon name="check" className="h-3 w-3" /> Verified Documents
                  </span>
                )}
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-line-soft">
                {d.documents.map((doc) => (
                  <li key={doc.label} className="flex items-center gap-2.5 py-2">
                    <Icon name={doc.icon} className={cn('h-4 w-4 shrink-0', doc.ok ? 'text-ok' : 'text-ink-4')} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{doc.label}</span>
                    <span className={cn('shrink-0 text-[11px] font-semibold', doc.ok ? 'text-ok' : 'text-ink-4')}>
                      {doc.ok ? 'Verified' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Client Reviews */}
            <section id="reviews" className="card scroll-mt-4 p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="star" className="h-4 w-4 text-brand" />
                  <h3 className="font-display text-[14px] font-bold text-ink">Client Reviews</h3>
                </div>
                <Link href="/dashboard/professional/reviews" className="shrink-0 text-[11.5px] font-semibold text-brand hover:underline">View All Reviews →</Link>
              </div>
              {d.reviews.length === 0 ? (
                <p className="text-[12.5px] text-ink-3">No reviews yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.reviews.map((r) => (
                    <li key={r.id} className="rounded-card border border-line-soft bg-paper-2 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {r.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{r.name?.[0]?.toUpperCase() ?? '?'}</span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-bold text-ink">{r.name}</p>
                            <p className="text-[10.5px] text-ink-3">{r.role}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10.5px] text-ink-4">{r.date}</span>
                      </div>
                      <span className="mt-1.5 flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" className={cn('h-3 w-3', i <= r.rating ? 'text-warn' : 'text-line')} />)}
                      </span>
                      {r.body && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">“{r.body}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>

        {/* ═══════════ My PACT — full width, same component the editor uses ═══════════ */}
        <section id="pact" className="scroll-mt-4 pb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
              <Icon name="map" className="h-[18px] w-[18px]" />
            </span>
            <h2 className="font-display text-[16px] font-bold text-ink">My PACT</h2>
          </div>
          <PactTab d={d.pact} leadsHref={d.leadsHref} buyHref={d.buyPactHref} />
        </section>
      </div>
    </div>
  )
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <div className="text-center">
      <span className="flex items-center justify-center gap-1 font-display text-[20px] font-bold leading-none text-ink lg:text-[24px]">
        {value}{star && <Icon name="star" className="h-4 w-4 text-warn" />}
      </span>
      <span className="mt-1 block text-[10.5px] text-ink-3">{label}</span>
    </div>
  )
}

function SectionHead({ icon, title, badge }: { icon: IconName; title: string; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name={icon} className="h-4 w-4" /></span>
      <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
      {badge && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[10.5px] font-semibold text-ok"><Icon name="check" className="h-3 w-3" /> {badge}</span>}
    </div>
  )
}

function ContactRow({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-4" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}

function Featured({ id, icon, title, viewAll, items, empty }: { id: string; icon: IconName; title: string; viewAll: string; items: ProfileViewData['products']; empty: string }) {
  return (
    <section id={id} className="card scroll-mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon name={icon} className="h-4 w-4" /></span>
          <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
        </div>
        <Link href={viewAll} className="shrink-0 text-[12px] font-semibold text-brand hover:underline">View All →</Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.id} className="min-w-0">
              <Link href={it.href} className="card-hover group flex h-full flex-col overflow-hidden">
                <span className="relative block aspect-[4/3] overflow-hidden bg-paper-3">
                  {it.image ? (
                    <Image src={it.image} alt="" fill sizes="(min-width:640px) 22vw, 46vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-ink-4"><Icon name={icon} className="h-6 w-6" /></span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 p-2.5">
                  <span className="line-clamp-1 text-[12.5px] font-semibold text-ink group-hover:text-brand">{it.title}</span>
                  <span className="line-clamp-1 text-[11px] text-ink-3">{it.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
