'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui'
import { cn } from '@/lib/utils'
import { choosePlanAction } from './membership-actions'

// ──────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────

export type PlanCardData = {
  id: string
  slug: string
  name: string
  tagline: string
  price: number
  months: number
  benefits: string[]
  maxProjects: number | null
  maxProducts: number | null
  maxAroundUs: number | null
  maxArtistry: number | null
  pactTerritories: number | null
  isPopular: boolean
}

/**
 * Each plan gets a visual identity by its slug. New slugs fall back to the
 * bronze look, so an admin adding a plan never renders an unstyled card.
 */
/**
 * Each tier's visual identity, keyed by slug (reference: Free / Bronze /
 * Silver / Gold cards). `cardBg` is the soft top-to-bottom wash, `badge` the
 * circular medal behind the icon, `check` the tick circle, `btn` the
 * full-width CTA gradient. New slugs fall back to bronze.
 */
const THEME: Record<
  string,
  {
    icon: IconName
    cardBg: string
    ring: string
    badge: string
    check: string
    btn: string
  }
> = {
  free: {
    icon: 'user',
    cardBg: 'bg-gradient-to-b from-white to-info-soft/40',
    ring: 'border-info/25',
    badge: 'bg-info-soft text-info',
    check: 'bg-info-soft text-info',
    btn: 'border border-info/40 bg-white text-info hover:bg-info-soft',
  },
  bronze: {
    icon: 'shield',
    cardBg: 'bg-gradient-to-b from-white to-brand-soft/50',
    ring: 'border-brand/25',
    badge: 'bg-gradient-to-br from-[#E8A06A] to-[#B26A38] text-white',
    check: 'bg-brand-soft text-brand',
    btn: 'border-0 bg-gradient-to-r from-brand to-[#EA580C] text-white hover:brightness-105',
  },
  silver: {
    icon: 'award',
    cardBg: 'bg-gradient-to-b from-white to-info-soft/50',
    ring: 'border-info',
    badge: 'bg-gradient-to-br from-[#AEB7C2] to-[#6B7688] text-white',
    check: 'bg-info text-white',
    btn: 'border-0 bg-gradient-to-r from-info to-[#1D4ED8] text-white hover:brightness-105',
  },
  gold: {
    icon: 'trophy',
    cardBg: 'bg-gradient-to-b from-white to-gold-soft/60',
    ring: 'border-gold-border',
    badge: 'bg-gradient-to-br from-[#E7C15A] to-[#B8860B] text-white',
    check: 'bg-gold-soft text-gold',
    btn: 'border-0 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white hover:brightness-105',
  },
}

const FALLBACK = THEME.bronze

const inr = (n: number) => n.toLocaleString('en-IN')

// ──────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────

export function MembershipView({
  plans,
  currentPlanId,
  expiresAt,
}: {
  plans: PlanCardData[]
  currentPlanId: string | null
  currentPlanName: string | null
  startsAt: string | null
  expiresAt: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // The plan the reader has picked (its card shows the selected border). null
  // until they click one; cleared once the switch goes through.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  function confirmSelection(plan: PlanCardData) {
    startTransition(async () => {
      const res = await choosePlanAction(plan.id)
      if (res.ok) {
        setSelectedId(null)
        setFlash({ ok: true, text: `You're now on the ${res.planName} plan. Your membership is active.` })
        router.refresh()
      } else {
        setFlash({ ok: false, text: res.error ?? 'Something went wrong. Please try again.' })
      }
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="space-y-5">
      {/* ═══════════ result banner ═══════════ */}
      {flash && (
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-card border px-4 py-3 text-[13px] font-medium',
            flash.ok ? 'border-ok/30 bg-ok-soft text-ok' : 'border-danger/30 bg-danger-soft text-danger'
          )}
        >
          <Icon name={flash.ok ? 'check' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{flash.text}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
            <Icon name="plus" className="h-4 w-4 rotate-45" />
          </button>
        </div>
      )}

      {/* ═══════════ page header — matches the reference, holds on tablet ═══════════ */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-gold-soft text-gold">
            <Icon name="award" className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0">
            <h1 className="whitespace-nowrap font-display text-[15px] font-bold leading-tight text-navy md:text-[16px]">
              Membership &amp; Plans
            </h1>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-3 md:text-[11.5px]">
              Choose the right plan to grow your business, get more leads and unlock premium features.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/legal/need-help" className="btn-outline whitespace-nowrap px-3 py-1.5 text-[12.5px]">
            <Icon name="help" className="h-4 w-4" />
            Need Help?
          </Link>
        </div>
      </header>

      {/* ═══════════ hero banner ═══════════ */}
      <section className="relative overflow-hidden rounded-card bg-navy text-white">
        {/* the building photo lives on the right and dissolves into the navy */}
        <span aria-hidden className="absolute inset-0">
          <Image src="/img/profile-hero-default.png" alt="" fill sizes="100vw" className="object-cover object-right" priority />
          {/* navy sits only under the copy on the left and fades to fully
              transparent before the middle — the building stays clean on the
              right, with no seam */}
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(90deg, #092143 0%, #092143 44%, rgba(9,33,67,0.5) 58%, transparent 74%)',
            }}
          />
        </span>

        <div className="relative max-w-[600px] px-5 py-4 md:px-7 md:py-5">
          <h2 className="font-display text-[17px] font-bold leading-tight md:text-[20px]">
            Grow Your Business with the Right Plan
          </h2>
          <p className="mt-1 max-w-md text-[11.5px] leading-snug text-white/75">
            Get more visibility, quality leads and premium features with our flexible membership plans.
          </p>

          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
            {HERO_CHIPS.map((c) => (
              <span key={c.label} className="flex items-center gap-1 text-[9.5px] font-medium">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15">
                  <Icon name={c.icon} className="h-2.5 w-2.5" />
                </span>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* the script line, echoing the reference's corner flourish */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 right-5 hidden text-right text-[15px] leading-tight text-gold-light/90 lg:block"
          style={{ fontFamily: 'cursive' }}
        >
          Connect<br />Collaborate<br />Create Better Spaces
        </span>
      </section>

      {/* ═══════════ plan cards ═══════════ */}
      <section
        id="plans"
        className={cn(
          'grid gap-5 md:items-start',
          plans.length >= 4
            ? 'md:grid-cols-4 md:gap-3 lg:gap-5'
            : plans.length === 2
              ? 'md:mx-auto md:max-w-3xl md:grid-cols-2'
              : 'md:grid-cols-3'
        )}
      >
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            // Free is the plan of everyone who has no paid plan running.
            isCurrent={plan.id === currentPlanId || (plan.price === 0 && !currentPlanId)}
            expiryDate={expiryDate}
            selected={selectedId === plan.id}
            pending={pending}
            onSelect={() => setSelectedId(plan.id)}
            onConfirm={() => confirmSelection(plan)}
          />
        ))}
      </section>

      {/* ═══════════ why upgrade — bottom strip ═══════════ */}
      <section className="grid gap-5 rounded-card border border-line bg-paper-2 p-5 sm:grid-cols-2 md:grid-cols-4">
        {WHY.map((w) => (
          <div key={w.title} className="flex items-start gap-3">
            <span className={cn('chip-icon', w.tint)}>
              <Icon name={w.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-ink">{w.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{w.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  A single plan card
// ──────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  expiryDate,
  selected,
  pending,
  onSelect,
  onConfirm,
}: {
  plan: PlanCardData
  isCurrent: boolean
  expiryDate: string | null
  selected: boolean
  pending: boolean
  onSelect: () => void
  onConfirm: () => void
}) {
  // Corporate tiers reuse the silver/gold look (slug `corporate-silver` etc.).
  const t = THEME[plan.slug.replace('corporate-', '')] ?? FALLBACK
  const popular = plan.isPopular
  const monthly = Math.round(plan.price / Math.max(plan.months, 1))
  const free = plan.price === 0
  // Free is never "bought" — it is simply what an account has without a paid plan.
  const selectable = !isCurrent && !free

  return (
    <div
      onClick={selectable && !selected ? onSelect : undefined}
      role={selectable ? 'button' : undefined}
      aria-pressed={selectable ? selected : undefined}
      className={cn(
        'relative isolate flex h-full flex-col overflow-hidden rounded-[16px] border shadow-card transition-all',
        t.cardBg,
        selectable && 'cursor-pointer',
        selected
          ? 'border-2 border-brand shadow-lift ring-2 ring-brand/25'
          : isCurrent
            ? 'border-2 border-ok/50'
            : popular
              ? 'border-2 border-info shadow-lift md:-mt-3'
              : cn('border-2', t.ring, selectable && 'hover:shadow-lift')
      )}
    >
      {/* Gold's corner flourishes, as the reference draws it. */}
      {plan.slug.endsWith('gold') && (
        <>
          <span aria-hidden className="pointer-events-none absolute -left-10 -top-10 -z-10 h-28 w-28 rounded-full bg-navy/10 blur-xl" />
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 -z-10 h-28 w-28 rounded-full bg-gold/25 blur-xl" />
        </>
      )}

      {/* selected tick — the unmistakable "this one is picked" mark */}
      {selected && (
        <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-card">
          <Icon name="check" className="h-3.5 w-3.5" />
        </span>
      )}

      {popular && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-info to-[#1D4ED8] py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-white">
          <Icon name="award" className="h-4 w-4" />
          Most Popular
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* medal + name */}
        <div className="flex items-center gap-3.5">
          <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-sm', t.badge)}>
            <Icon name={t.icon} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[22px] font-bold leading-tight text-navy">{plan.name}</h3>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{plan.tagline}</p>
          </div>
        </div>

        {/* price */}
        <div className="mt-5">
          <div className="flex items-end gap-1.5">
            <span className="tabular font-display text-[40px] font-extrabold leading-none text-navy">{free ? 'Free' : `₹${inr(monthly)}`}</span>
            {!free && <span className="mb-1.5 text-[14px] text-ink-3">/month</span>}
          </div>
          {free ? (
            <p className="mt-2 text-[12.5px] text-ink-3">No payment · No PACT</p>
          ) : plan.months >= 12 && (
            <p className="mt-2 text-[12.5px] text-ink-3">
              Billed annually at <span className="tabular font-semibold text-ink-2">₹{inr(plan.price)}</span>
            </p>
          )}
        </div>

        <div className="mt-5 h-px bg-line" />

        {/* benefits */}
        <ul className="mt-5 flex flex-1 flex-col gap-3">
          {plan.benefits.map((b) => {
            // Free lists what it does NOT include ("No PACT territory") — a
            // muted cross, exactly as the reference draws that one row.
            const isNegative = free && /^no /i.test(b)
            return (
              <li key={b} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-2">
                <span
                  className={cn(
                    'mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full',
                    isNegative ? 'bg-paper-3 text-ink-4' : t.check
                  )}
                >
                  {isNegative ? (
                    <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  ) : (
                    <Icon name="check" className="h-3 w-3" />
                  )}
                </span>
                <span className={cn('min-w-0', isNegative && 'text-ink-4')}>{b}</span>
              </li>
            )
          })}
        </ul>

        {/* action */}
        <div className="mt-6">
          {isCurrent ? (
            <div className="flex flex-col items-center gap-1 rounded-lg border border-ok/40 bg-ok-soft py-2.5 text-[13.5px] font-semibold text-ok">
              <span className="flex items-center gap-1.5">
                <Icon name="check" className="h-4 w-4" />
                Current Plan
              </span>
              {expiryDate && !free && <span className="text-[11px] font-medium text-ok/80">Active until {expiryDate}</span>}
            </div>
          ) : free ? (
            <div className="rounded-lg border border-info/40 bg-white py-2.5 text-center text-[13.5px] font-semibold text-info">
              Included with every account
            </div>
          ) : selected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onConfirm()
              }}
              disabled={pending}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold transition-all',
                t.btn
              )}
            >
              <Icon name="check" className="h-4 w-4" />
              {pending ? 'Activating…' : 'Confirm & Activate'}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold transition-all',
                t.btn
              )}
            >
              Get {plan.name} Plan
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
//  Static copy
// ──────────────────────────────────────────────────────────────

const HERO_CHIPS: { icon: IconName; label: string }[] = [
  { icon: 'shield', label: 'Verified Profile' },
  { icon: 'users', label: 'More Leads' },
  { icon: 'help', label: 'Premium Support' },
  { icon: 'chart', label: 'Business Growth' },
]

const WHY: { icon: IconName; tint: string; title: string; body: string }[] = [
  { icon: 'eye', tint: 'bg-info-soft text-info', title: 'More Visibility', body: 'Showcase your work to thousands of potential clients.' },
  { icon: 'users', tint: 'bg-pact-soft text-pact', title: 'Quality Leads', body: 'Get genuine enquiries from verified buyers.' },
  { icon: 'chart', tint: 'bg-brand-soft text-brand', title: 'Business Growth', body: 'Scale your business with better opportunities.' },
  { icon: 'help', tint: 'bg-gold-soft text-gold', title: 'Dedicated Support', body: 'Our team is always here to help you.' },
]
