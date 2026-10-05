import Link from 'next/link'
import { auth, dashboardPathFor, messagesPathFor } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Logo } from './logo'
import { MegaMenu } from './mega-menu'
import { LocationPicker } from './location-picker'
import { HeaderSearch } from './header-search'
import { AccountMenu } from './account-menu'
import { HeaderHelpCart } from './header-help-cart'
import { Icon, type IconName } from './ui'
import { HEADER_NAV } from '@/config/nav'
import { PhoneHeader, type PhoneHeaderOptions } from './mobile/phone-header'
import { drawerItems, mobileSession } from '@/lib/mobile-shell'
import { cn } from '@/lib/utils'

/**
 * §6.1.1 — ArchFacing's header, in two bars as per the mockup.
 *
 *   top    : logo · city · search · CTA · account
 *   bottom : nav with dropdowns
 */
export async function SiteHeader({
  hideOnPhone = false,
  phone: phoneOptions,
}: {
  /** The home page draws its own phone header inside the hero. */
  hideOnPhone?: boolean
  /** How this page's phone header looks — search row, city pill, dark tone. */
  phone?: PhoneHeaderOptions
} = {}) {
  const session = await auth()
  const user = session?.user
  const phone = await mobileSession()

  const unread = user
    ? await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      })
    : 0

  return (
    <>
      {/*
        Zero-height static anchor. Next.js scrolls to the page's FIRST element
        on client navigation, and skips (with a console warning) when that
        element is position:sticky — which the header is. This span gives it a
        static target, so every navigation lands at the top of the page again.
      */}
      <span aria-hidden className="block h-0" />
    <header className={cn('sticky top-0 z-50 bg-white', hideOnPhone && 'hidden md:block')}>
      {/* ─── phones: the app header (below md only) ─── */}
      <PhoneHeader items={drawerItems()} user={phone.user} unread={phone.unread} options={phoneOptions} />

      {/* ─── top bar (md and up) ─── */}
      <div className="hidden border-b border-line md:block">
        <div className="container-af flex items-center gap-3 py-2.5 lg:gap-4">
          <Logo size="sm" priority />
          <div className="hidden md:block">
            <LocationPicker />
          </div>
          <HeaderSearch />

          {/*
            lg, not xl: a maximised browser on a 1280-wide screen leaves about
            1265px of viewport once the scrollbar is off, so an xl gate hid
            this button on exactly the size most people use.

            The label matches where it goes. "Get Best Price" reads like a
            quote form; the page it opens is Consult Nearby.
          */}
          <Link
            href="/consult-nearby"
            className="header-control hidden shrink-0 items-center whitespace-nowrap border border-brand px-4 text-[13px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white lg:inline-flex"
          >
            Consult Nearby
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-4">
            {user ? (
              <>
                {/* Same row as the signed-out header (client rule) — only
                    Notifications and the avatar are added. Dashboard, Messages
                    and Help live in the avatar's dropdown. */}
                <IconLink href="/products" label="Product" icon="box" />
                <IconLink href="/projects" label="Project" icon="grid" />
                <IconLink href="/merchandise" label="Merchandise" icon="bag" />
                <IconLink href="/dashboard/notifications" label="Notifications" icon="bell" badge={unread} />

                <AccountMenu
                  name={phone.user?.name ?? user.name ?? 'Account'}
                  photo={phone.user?.photo ?? null}
                  messagesHref={messagesPathFor(user.role)}
                  role={user.role}
                  dashboardHref={dashboardPathFor(user.role)}
                  isAdmin={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'}
                  isSeller={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMIN_SELLER'}
                />
              </>
            ) : (
              <>
                <IconLink href="/products" label="Product" icon="box" />
                <IconLink href="/projects" label="Project" icon="grid" />
                <IconLink href="/merchandise" label="Merchandise" icon="bag" />
                <HeaderHelpCart />
                {/* Stacked like the icons beside it — icon on top, label
                    under — so the row reads as one set rather than five
                    stacked links and a sixth lying on its side. */}
                <Link
                  href="/login"
                  className="flex flex-col items-center gap-1 border-l border-line pl-4 text-ink-2 transition-colors hover:text-brand"
                >
                  <Icon name="user" />
                  <span className="whitespace-nowrap text-[11.5px] font-medium leading-none">
                    Sign In
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── nav bar ─── */}
      <nav aria-label="Main" className="relative hidden border-b border-line bg-white md:block">
        <div className="container-af">
          {/*
            Every item is visible at once — the row never scrolls.

            The type steps down as the viewport narrows (13.5px → 12px → 11px)
            and the gaps close with it, so all ten items fit on a laptop. Below
            md the row wraps onto a second line rather than being cut off:
            wrapping keeps every item reachable, which a horizontal scroll strip
            on a touch device does not.
          */}
          {/* nowrap only from 1024 up. At 768 the ten items need about 811px,
              so forcing a single row there pushed the bar past the viewport and
              scrolled the whole page sideways. */}
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 md:flex-nowrap md:gap-x-1.5 lg:gap-x-4 xl:gap-x-6">
            {HEADER_NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <MegaMenu item={item} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
    </>
  )
}

function IconLink({
  href,
  label,
  icon,
  badge,
}: {
  href: string
  label: string
  icon: IconName
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="relative hidden flex-col items-center gap-1 text-ink-2 transition-colors hover:text-brand sm:flex"
    >
      <Icon name={icon} />
      {/* 11.5px, not 10.5: below about 11px these read as unlabelled icons,
          which is exactly the complaint they were added to answer. */}
      <span className="whitespace-nowrap text-[11.5px] font-medium leading-none">
        {label}
      </span>
      {badge ? (
        <span className="tabular absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  )
}
