/**
 * Artwork comments — post, the no-phone rule, who may delete, notification.
 * Run: npx tsx tests/post-comments.check.ts
 */
import { prisma } from '../src/lib/prisma'
import { addComment, CommentError, deleteComment, listComments } from '../src/lib/post-comments'

let fails = 0
const ok = (c: boolean, m: string) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fails++ }

async function main() {
  const art = await prisma.post.findFirst({ where: { type: 'ARTISTRY', status: 'PUBLISHED', deletedAt: null }, select: { id: true, authorId: true } })
  const other = await prisma.user.findFirst({ where: { role: 'CLIENT', deletedAt: null, id: { not: art?.authorId } }, select: { id: true } })
  const third = await prisma.user.findFirst({ where: { role: 'PROFESSIONAL', deletedAt: null, id: { notIn: [art?.authorId ?? '', other?.id ?? ''] } }, select: { id: true } })
  if (!art || !other || !third) throw new Error('need an artwork, a client and a professional')
  const started = new Date()

  try {
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

    const notif = await prisma.notification.count({ where: { userId: art.authorId, type: 'POST_COMMENT', createdAt: { gte: started } } })
    ok(notif >= 1, 'the artwork owner is notified')

    let denied = false
    try { await deleteComment({ id: third.id, role: 'PROFESSIONAL' }, mine!.id) } catch (e) { denied = e instanceof CommentError }
    ok(denied, 'a stranger’s delete is refused')

    await deleteComment({ id: other.id, role: 'CLIENT' }, mine!.id)
    list = await listComments(art.id)
    ok(!list.some((c) => c.id === mine!.id), 'a deleted comment disappears')
  } finally {
    await prisma.postComment.deleteMany({ where: { postId: art.id, createdAt: { gte: started } } })
    await prisma.notification.deleteMany({ where: { userId: art.authorId, type: 'POST_COMMENT', createdAt: { gte: started } } })
    await prisma.$disconnect()
  }
}

main().then(
  () => { console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0) },
  (e) => { console.error(e); process.exit(1) }
)
