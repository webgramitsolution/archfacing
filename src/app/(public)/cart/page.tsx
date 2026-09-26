import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCart, FLAT_SHIPPING } from '@/lib/commerce'
import { freeShippingThreshold } from '@/lib/settings'
import { CartView } from './cart-view'

export const metadata: Metadata = { title: 'Cart' }

export default async function CartPage() {
  const session = await auth()
  if (!session?.user) redirect('/login?next=/cart')

  const [cart, me, freeAbove] = await Promise.all([
    getCart(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true, mobile: true, addressLine: true,
        pincode: true, city: true, state: true,
      },
    }),
    freeShippingThreshold(),
  ])

  return (
    <>
      <SiteHeader />

      <main className="bg-paper"><div className="container-af py-10">
        <header className="mb-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">
            Your Cart
          </h1>
          {cart.count > 0 && (
            <p className="mt-1.5 text-[14px] text-ink-2">
              {cart.count} {cart.count === 1 ? 'item' : 'items'}
            </p>
          )}
        </header>

        <CartView
          items={cart.items}
          subtotal={cart.subtotal}
          tax={cart.tax}
          total={cart.total}
          freeShippingAbove={freeAbove}
          flatShipping={FLAT_SHIPPING}
          address={{
            name: me?.name ?? '',
            phone: me?.mobile ?? '',
            address: me?.addressLine ?? '',
            pincode: me?.pincode ?? '',
            city: me?.city ?? '',
            state: me?.state ?? '',
          }}
        />
      </div></main>

      <SiteFooter />
    </>
  )
}
