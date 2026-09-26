import { requireAuth } from '@/lib/guard'
import { myConversations } from '@/lib/chat'
import { MessagesView } from './messages-view'

export const metadata = { title: 'Messages · ArchFacing' }

/**
 * Messages — the direct chats started from a post's Chat button on Artistry
 * and Around Us. Shared by every role (client, professional, consultant, BMF,
 * corporate) because the data is read from the reader's own side.
 *
 * Deliberately NOT wired to Leads / Enquiries: those are routed business and
 * live on their own screen.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; enquire?: string }>
}) {
  const me = await requireAuth()
  const [conversations, sp] = await Promise.all([myConversations(me.id), searchParams])
  // ?c= opens that thread; &enquire=1 (from a post's "Send Enquiry") types a
  // starter into the box — nothing is sent until the member presses Send.
  const opened = sp.c ? conversations.find((c) => c.id === sp.c) : undefined
  const initialDraft =
    opened && sp.enquire === '1'
      ? `Hi, I would like to enquire about “${opened.subject}”. `
      : ''
  return (
    <MessagesView
      conversations={conversations}
      meName={me.name ?? 'You'}
      initialId={opened?.id}
      initialDraft={initialDraft}
    />
  )
}
