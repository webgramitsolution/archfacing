import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminShell } from '@/lib/guard'
import { prisma } from '@/lib/prisma'
import { can } from '@/config/permissions'
import { ALL_POST_TYPES } from '@/config/post-types'
import { Icon, type IconName } from '@/components/ui'
import { AdminPageHead, Panel, fmtDate } from '@/components/admin/parts'

export const metadata: Metadata = { title: 'Search' }
export const dynamic = 'force-dynamic'

/**
 * The top-bar search. One query across people, postings, leads, PACT seats
 * and support tickets — each block only for staff who can open that module,
 * so search never shows a row its reader could not otherwise reach.
 */

const TAKE = 8
const publicPath = (type: string, slug: string) => {
  const c = ALL_POST_TYPES.find((x) => x.type === type)
  return c ? `${c.publicPath}/${slug}` : '/'
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdminShell()
  const q = ((await searchParams).q ?? '').trim().slice(0, 80)
  const may = (p: Parameters<typeof can>[1]) => can(me.role, p, me.permissions)
  const ci = { contains: q, mode: 'insensitive' as const }

  const run = q.length >= 2
  const [users, posts, leads, pacts, tickets] = await Promise.all([
    run && may('admin:users')
      ? prisma.user.findMany({
          where: { deletedAt: null, OR: [{ name: ci }, { email: ci }, { mobile: { contains: q } }, { city: ci }, { corporateProfile: { companyName: ci } }, { professionalProfile: { firmName: ci } }] },
          select: { id: true, name: true, email: true, role: true, status: true, city: true },
          orderBy: { createdAt: 'desc' },
          take: TAKE,
        })
      : [],
    run && may('admin:moderate')
      ? prisma.post.findMany({
          where: { deletedAt: null, OR: [{ title: ci }, { slug: { contains: q.toLowerCase() } }, { city: ci }] },
          select: { id: true, title: true, slug: true, type: true, status: true, createdAt: true, author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: TAKE,
        })
      : [],
    run && may('admin:leads')
      ? prisma.enquiry.findMany({
          where: { OR: [{ contactName: ci }, { contactEmail: ci }, { contactPhone: { contains: q } }, { subject: ci }, { pincode: { startsWith: q } }] },
          select: { id: true, subject: true, contactName: true, pincode: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: TAKE,
        })
      : [],
    run && may('admin:pact')
      ? prisma.pact.findMany({
          where: { OR: [{ pincode: { startsWith: q } }, { city: ci }, { holder: { name: ci } }, { holder: { email: ci } }] },
          select: { id: true, pincode: true, city: true, serviceType: true, status: true, holder: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: TAKE,
        })
      : [],
    run && may('admin:support')
      ? prisma.supportTicket.findMany({
          where: { OR: [{ subject: ci }, { message: ci }, { user: { name: ci } }, { user: { email: ci } }] },
          select: { id: true, subject: true, status: true, createdAt: true, user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: TAKE,
        })
      : [],
  ])
  const total = users.length + posts.length + leads.length + pacts.length + tickets.length

  return (
    <div className="space-y-5">
      <AdminPageHead title="Search" />

      <form method="get" className="flex gap-2">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"><Icon name="search" className="h-4 w-4" /></span>
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Name, email, phone, company, PIN code, posting title…"
            className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
          />
        </label>
        <button type="submit" className="h-11 rounded-lg bg-brand px-5 text-[13px] font-semibold text-white hover:bg-brand-hover">Search</button>
      </form>

      {!run ? (
        <p className="py-10 text-center text-[13px] text-ink-3">Type at least two characters.</p>
      ) : total === 0 ? (
        <p className="py-10 text-center text-[13px] text-ink-3">Nothing matches “{q}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {users.length > 0 && (
            <Block title="People" count={users.length} icon="users">
              {users.map((u) => (
                <Row key={u.id} href={`/admin/users/${u.id}`} title={u.name} sub={`${u.email} · ${u.role.replace('_', ' ').toLowerCase()}${u.city ? ` · ${u.city}` : ''}`} tag={u.status.replace('_', ' ').toLowerCase()} />
              ))}
            </Block>
          )}
          {posts.length > 0 && (
            <Block title="Postings" count={posts.length} icon="file">
              {posts.map((p) => (
                <Row key={p.id} href={p.status === 'PUBLISHED' ? publicPath(p.type, p.slug) : `/admin/moderation?type=${p.type}`} title={p.title} sub={`${p.type.replace('_', ' ').toLowerCase()} · ${p.author.name} · ${fmtDate(p.createdAt)}`} tag={p.status.replace('_', ' ').toLowerCase()} />
              ))}
            </Block>
          )}
          {leads.length > 0 && (
            <Block title="Leads & Enquiries" count={leads.length} icon="inbox">
              {leads.map((l) => (
                <Row key={l.id} href={`/admin/leads?view=${l.id}`} title={l.subject} sub={`${l.contactName} · PIN ${l.pincode} · ${fmtDate(l.createdAt)}`} tag={l.status.replace('_', ' ').toLowerCase()} />
              ))}
            </Block>
          )}
          {pacts.length > 0 && (
            <Block title="PACT Seats" count={pacts.length} icon="map">
              {pacts.map((p) => (
                <Row key={p.id} href={`/admin/pact?q=${p.pincode}`} title={`PIN ${p.pincode} · ${p.serviceType}`} sub={`${p.holder?.name ?? 'No holder'}${p.city ? ` · ${p.city}` : ''}`} tag={p.status.toLowerCase()} />
              ))}
            </Block>
          )}
          {tickets.length > 0 && (
            <Block title="Support Tickets" count={tickets.length} icon="help">
              {tickets.map((t) => (
                <Row key={t.id} href={`/admin/support?view=${t.id}`} title={t.subject} sub={`${t.user.name} · ${fmtDate(t.createdAt)}`} tag={t.status.replace('_', ' ').toLowerCase()} />
              ))}
            </Block>
          )}
        </div>
      )}
    </div>
  )
}

function Block({ title, count, icon, children }: { title: string; count: number; icon: IconName; children: React.ReactNode }) {
  return (
    <Panel title={title} subtitle={count >= TAKE ? `first ${TAKE}` : String(count)} action={<Icon name={icon} className="h-4 w-4 text-ink-4" />}>
      <ul className="divide-y divide-line-soft">{children}</ul>
    </Panel>
  )
}

function Row({ href, title, sub, tag }: { href: string; title: string; sub: string; tag: string }) {
  return (
    <li>
      <Link href={href} className="row-hover flex items-center gap-3 rounded-lg px-2 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{title}</span>
          <span className="block truncate text-[11.5px] text-ink-3">{sub}</span>
        </span>
        <span className="shrink-0 rounded-pill bg-paper-3 px-2 py-0.5 text-[10.5px] font-semibold capitalize text-ink-3">{tag}</span>
      </Link>
    </li>
  )
}
