/**
 * Artwork comments — post, the no-phone rule, who may delete, notification.
 * Run: TEST_DATABASE_URL=... npx tsx tests/post-comments.check.ts
 *
 * Builds its own artwork + three @commenttest.dev users; all removed in finally
 * (the post, its comments and the notifications cascade with the users).
 */
import './_test-env.mjs'
import { prisma } from '../src/lib/prisma'
import { addComment, CommentError, deleteComment, listComments } from '../src/lib/post-comments'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

const DOMAIN = '@commenttest.dev'

async function main() {
  const stamp = Date.now()
  const userIds: string[] = []
  const mkUser = async (tag: string, role: 'PROFESSIONAL' | 'CLIENT') => {
    const u = await prisma.user.create({
      data: { email: `${tag}-${stamp}${DOMAIN}`, name: `Comment ${tag}`, role, status: 'ACTIVE', emailVerified: new Date() },
      select: { id: true },
    })
    userIds.push(u.id)
    return u
  }

  try {
    const artist = await mkUser('artist', 'PROFESSIONAL')
    const other = await mkUser('client', 'CLIENT')
    const third = await mkUser('third', 'PROFESSIONAL')
    const art = await prisma.post.create({
      data: {
        type: 'ARTISTRY', status: 'PUBLISHED', publishedAt: new Date(), authorId: artist.id,
        title: 'Comment test artwork', slug: `commenttest-${stamp}`,
        description: 'Throwaway artwork for the comments check.', category: 'painting', year: 2026,
      },
      select: { id: true, authorId: true },
    })

    await addComment(other.id, art.id, 'Beautiful detailing on the jharokhas.')
    let list = await listComments(art.id, { id: other.id, role: 'CLIENT' })
    const mine = list.find((c) => c.body.startsWith('Beautiful detailing'))
    ok(Boolean(mine), 'a comment is saved and listed')
    ok(mine?.canDelete === true, 'its author may delete it')

    const asThird = await listComments(art.id, { id: third.id, role: 'PROFESSIONAL' })
    ok(asThird.find((c) => c.id === mine?.id)?.canDelete === false, 'a stranger may not')

    const asOwner = await listComments(art.id, { id: art.authorId, role: 'PROFESSIONAL' })
    ok(asOwner.find((c) => c.id === mine?.id)?.canDelete === true, 'the artwork owner may')

    let blocked = false
    try { await addComment(other.id, art.id, 'Call me on 98765 43210 for details') } catch (e) { blocked = e instanceof CommentError }
    ok(blocked, 'a phone number in a comment is refused')

    let tooShort = false
    try { await addComment(other.id, art.id, ' ') } catch (e) { tooShort = e instanceof CommentError }
    ok(tooShort, 'an empty comment is refused')

    const notif = await prisma.notification.count({ where: { userId: art.authorId, type: 'POST_COMMENT' } })
    ok(notif >= 1, 'the artwork owner is notified')

    let denied = false
    try { await deleteComment({ id: third.id, role: 'PROFESSIONAL' }, mine!.id) } catch (e) { denied = e instanceof CommentError }
    ok(denied, 'a stranger’s delete is refused')

    await deleteComment({ id: other.id, role: 'CLIENT' }, mine!.id)
    list = await listComments(art.id)
    ok(!list.some((c) => c.id === mine!.id), 'a deleted comment disappears')
  } finally {
    // Posts, comments and notifications cascade from User.
    await prisma.user.deleteMany({ where: { id: { in: userIds }, email: { endsWith: DOMAIN } } })
    await prisma.$disconnect()
  }
}

main().then(
  () => { console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0) },
  (e) => { console.error(e); process.exit(1) }
)
