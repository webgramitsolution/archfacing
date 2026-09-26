import Image from 'next/image'
import Link from 'next/link'

import { Icon } from '@/components/ui'
import type { VisitorCard } from '@/lib/visitor'

/**
 * The card grid the visitor's Saved / Recently Viewed pages share.
 *
 * Server-rendered; the only interactivity is the links themselves.
 */

const TYPE_LABEL: Record<string, string> = {
  PROJECT: 'Project',
  PRODUCT: 'Product',
  ARTISTRY: 'Artistry',
  BLOG: 'Blog',
  AROUND_US: 'Around Us',
  MERCHANDISE: 'Merchandise',
  DESIGN_COMPETITION: 'Competition',
  PODCAST: 'Podcast',
}

export function VisitorCardGrid({ items }: { items: VisitorCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <Link
            href={item.href}
            className="card-hover group flex h-full min-w-0 flex-col overflow-hidden"
          >
            <span className="relative block aspect-[16/10] overflow-hidden bg-paper-3">
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 24vw, (min-width:640px) 45vw, 92vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink-4">
                  <Icon name="image" className="h-6 w-6" />
                </span>
              )}
              <span className="pill-brand absolute left-2.5 top-2.5">
                {TYPE_LABEL[item.type] ?? item.type}
              </span>
            </span>

            <span className="block min-w-0 flex-1 p-3.5">
              <span className="block truncate text-[13.5px] font-semibold text-ink transition-colors group-hover:text-brand">
                {item.title}
              </span>
              <span className="mt-1 block truncate text-[11.5px] text-ink-3">By {item.author}</span>
              {item.place && (
                <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11.5px] text-ink-4">
                  <Icon name="map" className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.place}</span>
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
