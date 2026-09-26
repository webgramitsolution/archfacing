'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { formatINR } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ProductCard as PC } from '@/config/directory-data'

/**
 * A merchandise card, laid out as the reference draws it:
 *
 *   photograph
 *   ★★★★☆  1 review          ← above the heading, not under it
 *   Product name
 *   ₹499  ₹850  41% off
 *   [1kg] [2kg] [5kg]        ← only when the product has variants
 *   [cart]  [ BUY NOW ]
 *
 * The rating row and the variant row are both conditional: a product with no
 * reviews does not draw an empty five-star rail, and one sold in a single size
 * does not draw a row with one pill in it.
 *
 * The buttons are ArchFacing orange rather than the reference's maroon — the
 * shape and the split are the design, the colour is this site's.
 */

/** Five stars, filled to the rating. Half-stars round down; there is no data
 *  precise enough here to justify drawing a half. */
function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)

  return (
    <span className="flex shrink-0 items-center gap-px" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={cn('h-3.5 w-3.5', n <= filled ? 'text-brand' : 'text-line')}
          fill="currentColor"
        >
          <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />
        </svg>
      ))}
    </span>
  )
}

export function ShopProductCard({
  product,
  isDemo,
}: {
  product: PC
  isDemo?: boolean
}) {
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-card bg-paper-3">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width:640px) 100vw, 260px"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        {/* ─── the rating, above the heading ─── */}
        {product.reviews > 0 && (
          <p className="mb-1.5 flex min-w-0 items-center gap-1.5">
            <Stars rating={product.rating} />
            <span className="truncate text-[12px] font-semibold text-ink">
              {product.reviews} {product.reviews === 1 ? 'review' : 'reviews'}
            </span>
          </p>
        )}

        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.4] text-ink">
          {product.name}
        </h3>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="tabular font-display text-[17px] font-bold text-ink">
            {formatINR(product.price)}
          </span>
          {product.mrp > product.price && (
            <>
              <span className="tabular text-[12px] text-ink-4 line-through">
                {formatINR(product.mrp)}
              </span>
              <span className="tabular text-[12px] font-semibold text-ok">
                {product.discount}% off
              </span>
            </>
          )}
        </p>

        {/* ─── the two actions ─── */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <span
            className="flex h-9 w-10 shrink-0 items-center justify-center rounded-[4px] border border-line text-ink-2 transition-colors group-hover:border-brand group-hover:text-brand"
            aria-hidden
          >
            <Icon name="cart" className="h-4 w-4" />
          </span>
          <span className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-[4px] bg-brand px-3 text-[12px] font-bold uppercase tracking-[0.06em] text-white transition-colors group-hover:bg-brand-hover">
            Buy Now
          </span>
        </div>
      </div>
    </>
  )

  // demo products have no real page behind them — don't link them
  if (isDemo) {
    return <li className="card group flex flex-col p-2">{body}</li>
  }

  return (
    <li>
      <Link
        href={`/merchandise/${product.slug}`}
        className="card-hover group flex h-full flex-col p-2"
      >
        {body}
      </Link>
    </li>
  )
}
