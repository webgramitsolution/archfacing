'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from './ui'

/**
 * The last stacked icon in the top bar. On the merchandise storefront it is the
 * Cart; everywhere else it is Help. Same icon-over-label shape as its siblings.
 */
export function HeaderHelpCart() {
  const path = usePathname()
  const onShop = path === '/merchandise' || path.startsWith('/merchandise/') || path === '/cart'

  const { href, label, icon } = onShop
    ? { href: '/cart', label: 'Cart', icon: 'cart' as const }
    : { href: '/legal/need-help', label: 'Help', icon: 'help' as const }

  return (
    <Link
      href={href}
      className="relative hidden flex-col items-center gap-1 text-ink-2 transition-colors hover:text-brand sm:flex"
    >
      <Icon name={icon} />
      <span className="whitespace-nowrap text-[11.5px] font-medium leading-none">{label}</span>
    </Link>
  )
}
