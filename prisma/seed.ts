/**
 * ArchFacing — Database seed
 *
 *   pnpm db:seed
 *
 * This script does the following:
 *   1. Loads the PDF's complete category taxonomy into the DB
 *   2. Creates the first Super Admin
 *   3. Inserts site settings (header menu, footer)
 *
 * Nothing breaks if you run it again — everything is an upsert.
 */

import { PrismaClient, type PostType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  PROJECT_CATEGORIES,
  PRODUCT_CATEGORIES,
  AROUND_US_CATEGORIES,
  ARTISTRY_CATEGORIES,
  BLOG_CATEGORIES,
  COMPETITION_CATEGORIES,
  MERCHANDISE_CATEGORIES,
  PODCAST_CATEGORIES,
  type TaxonomyNode,
} from '../src/config/taxonomy'

const prisma = new PrismaClient()

/** Inserts one taxonomy tree into the Category table */
async function seedTree(type: PostType, nodes: TaxonomyNode[], parentId?: string) {
  let order = 0
  for (const node of nodes) {
    const existing = await prisma.category.findUnique({
      where: { type_slug: { type, slug: node.slug } },
    })

    const record = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { name: node.name, parentId: parentId ?? null, sortOrder: order },
        })
      : await prisma.category.create({
          data: {
            type,
            slug: node.slug,
            name: node.name,
            parentId: parentId ?? null,
            sortOrder: order,
          },
        })

    order += 1

    if (node.children?.length) {
      await seedTree(type, node.children, record.id)
    }
  }
  return nodes.length
}

/**
 * ⚠️ The Designa/Designi/Consultant service categories are deliberately
 *    NOT inserted into the DB.
 *
 *    They were previously placed under the PROJECT type, which made options
 *    such as "DESIGNA" and "Consultants" show up in the Projects filter —
 *    even though they are not posting categories at all.
 *
 *    In the registration form and the PACT engine they are read directly
 *    from `src/config/taxonomy.ts`, so a DB copy is not needed in the
 *    first place.
 */

async function seedCategories() {
  console.log('\n📁 Inserting categories…')

  const jobs: Array<[string, PostType, TaxonomyNode[]]> = [
    ['Projects', 'PROJECT', PROJECT_CATEGORIES],
    ['Products', 'PRODUCT', PRODUCT_CATEGORIES],
    ['Around Us', 'AROUND_US', AROUND_US_CATEGORIES],
    ['Artistry', 'ARTISTRY', ARTISTRY_CATEGORIES],
    ['Blog', 'BLOG', BLOG_CATEGORIES],
    ['Design Competition', 'DESIGN_COMPETITION', COMPETITION_CATEGORIES],
    ['Merchandise', 'MERCHANDISE', MERCHANDISE_CATEGORIES],
    ['Podcast', 'PODCAST', PODCAST_CATEGORIES],
  ]

  for (const [label, type, tree] of jobs) {
    await seedTree(type, tree)
    const count = await prisma.category.count({ where: { type } })
    console.log(`   ✓ ${label.padEnd(20)} ${count} categories`)
  }

}

async function seedSuperAdmin() {
  console.log('\n👤 Creating Super Admin…')

  const mobile = process.env.SEED_SUPERADMIN_MOBILE ?? '9667987129'
  const email = process.env.SEED_SUPERADMIN_EMAIL ?? 'admin@archfacing.com'
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'ChangeMe@123'

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
    create: {
      email,
      emailVerified: new Date(),
      mobile,
      mobileVerified: true,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      name: 'ArchFacing Admin',
      termsAcceptedAt: new Date(),
      storageQuotaMb: 100_000,
    },
  })

  console.log(`   ✓ ${admin.email}`)
  console.log(`   ✓ Mobile: ${admin.mobile}`)
  console.log(`   ⚠ Password: ${password}  — change it after your first login`)
}

async function seedSiteSettings() {
  console.log('\n⚙  Inserting site settings…')

  // §6.1.1 — Header menu
  const headerMenu = [
    { label: 'Projects', href: '/projects' },
    { label: 'Products', href: '/products' },
    { label: 'Around Us', href: '/around-us' },
    { label: 'Artistry', href: '/artistry' },
    { label: 'Membership', href: '/membership' },
    { label: 'Merchandise', href: '/merchandise' },
    { label: 'Advertisements', href: '/advertisements' },
    { label: 'Consult Nearby', href: '/consult-nearby' },
    { label: 'Podcast', href: '/podcast' },
    { label: 'Blog', href: '/blog' },
  ]

  // §6.1.2 — Footer
  const footerLinks = [
    { label: 'About Us', href: '/legal/about' },
    { label: 'Contact Us', href: '/legal/contact' },
    { label: 'Need Help', href: '/legal/need-help' },
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'Cookies Policy', href: '/legal/cookies' },
    { label: 'Return, Refund & Cancellation', href: '/legal/refund' },
    { label: 'Terms & Conditions', href: '/legal/terms' },
  ]

  const socialLinks = {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
  }

  const contact = {
    supportEmail: 'support@archfacing.com',
    infoEmail: 'info@archfacing.com',
    phone: '+91 9667987129',
    responseTime: '24 hours',
  }

  const settings: Array<[string, unknown]> = [
    ['header.menu', headerMenu],
    ['footer.links', footerLinks],
    ['footer.social', socialLinks],
    ['site.contact', contact],
    ['site.tagline', 'We the Designa and Designi'],
    ['site.logoUrl', 'https://ik.imagekit.io/archfacing/ArchFacing%20Logo/ArchFacing%20Logo.webp'],
  ]

  for (const [key, value] of settings) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    })
  }

  console.log(`   ✓ ${settings.length} settings`)
}

async function main() {
  console.log('═'.repeat(58))
  console.log('  ArchFacing — Database Seed')
  console.log('═'.repeat(58))

  await seedCategories()
  await seedSuperAdmin()
  await seedSiteSettings()

  const totals = {
    categories: await prisma.category.count(),
    users: await prisma.user.count(),
    settings: await prisma.siteSetting.count(),
  }

  console.log('\n' + '─'.repeat(58))
  console.log(`  ✅ Done —  ${totals.categories} categories · ${totals.users} user · ${totals.settings} settings`)
  console.log('─'.repeat(58) + '\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:\n', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
