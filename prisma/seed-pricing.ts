/**
 * The initial PACT prices.
 * §3.1.8.4 — "Charges will be decided by Archfacing and revised time to time"
 * So these are only the starting values; they can be changed from the admin panel.
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const PRICES = [
  { serviceType: 'DESIGNA' as const, price: 25000, renewalPrice: 10000 },
  { serviceType: 'DESIGNI' as const, price: 25000, renewalPrice: 10000 },
  { serviceType: 'CONSULTANT' as const, price: 15000, renewalPrice: 6000 },
  { serviceType: 'BMF' as const, price: 20000, renewalPrice: 8000 },
]

async function main() {
  console.log('\n💰 Inserting PACT prices…\n')

  for (const p of PRICES) {
    const existing = await prisma.pactPrice.findFirst({
      where: { serviceType: p.serviceType, state: null },
    })

    const data = {
      serviceType: p.serviceType,
      state: null,
      price: new Prisma.Decimal(p.price),
      renewalPrice: new Prisma.Decimal(p.renewalPrice),
      taxPercent: new Prisma.Decimal(18),
      isActive: true,
    }

    if (existing) {
      await prisma.pactPrice.update({ where: { id: existing.id }, data })
    } else {
      await prisma.pactPrice.create({ data })
    }

    const total = p.price * 1.18
    console.log(
      `   ${p.serviceType.padEnd(12)} ₹${p.price.toLocaleString('en-IN')}` +
        ` + 18% GST = ₹${total.toLocaleString('en-IN')}` +
        `   (renewal ₹${p.renewalPrice.toLocaleString('en-IN')})`
    )
  }

  console.log('\n   ✓ For 10 years · can be changed from the admin panel\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
