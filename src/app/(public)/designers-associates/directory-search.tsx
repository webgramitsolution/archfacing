'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import { INDIAN_STATES } from '@/config/states'
import {
  DESIGNA_CATEGORIES,
  DESIGNI_CATEGORIES,
  CONSULTANT_GROUPS,
} from '@/config/taxonomy'

const PROFESSIONS = [
  { value: 'DESIGNA', label: 'Architect (Designa)' },
  { value: 'DESIGNI', label: 'Interior Designer (Designi)' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'BMF', label: 'Building Materials' },
]

/** Hero search — the five fields from the mockup */
export function DirectorySearch() {
  const router = useRouter()
  const [profession, setProfession] = useState('')
  const [category, setCategory] = useState('')
  const [pincode, setPincode] = useState('')
  const [city, setCity] = useState('')

  const categories =
    profession === 'DESIGNA'
      ? DESIGNA_CATEGORIES
      : profession === 'DESIGNI'
        ? DESIGNI_CATEGORIES
        : profession === 'CONSULTANT'
          ? CONSULTANT_GROUPS.flatMap((g) => g.children ?? [])
          : []

  function search() {
    const p = new URLSearchParams()
    if (profession) p.set('profession', profession)
    if (category) p.set('category', category)
    if (pincode) p.set('pincode', pincode)
    if (city) p.set('city', city)
    router.push(`/designers-associates?${p}`)
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-paper-2 p-2 sm:flex-row sm:items-center">
      <select
        value={profession}
        onChange={(e) => {
          setProfession(e.target.value)
          setCategory('')
        }}
        aria-label="Profession / Skill"
        className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-[13px] text-ink focus:outline-none"
      >
        <option value="">Profession / Skill</option>
        {PROFESSIONS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={!categories.length}
        aria-label="Select Category"
        className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-[13px] text-ink focus:outline-none disabled:text-ink-4"
      >
        <option value="">Select Category</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>{c.name}</option>
        ))}
      </select>

      <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />

      <span className="flex min-w-0 flex-1 items-center gap-1.5 px-3">
        <Icon name="map" className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter Pincode"
          aria-label="Pincode"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:outline-none"
        />
      </span>

      <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        aria-label="Select City"
        className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-[13px] text-ink focus:outline-none"
      >
        <option value="">Select City</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={search}
        className="shrink-0 rounded-lg bg-brand px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Find Professionals
      </button>
    </div>
  )
}
