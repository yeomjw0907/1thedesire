import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ChatRoomClient } from '@/components/dm/ChatRoomClient'
import { ChatRoomHeaderMenu } from '@/components/dm/ChatRoomHeaderMenu'
import { PullToRefresh } from '@/components/home/PullToRefresh'
import type { ChatRoomStatus } from '@/types'

/**
 * 채팅방 상세 화면
 * 기준 문서: wireframes-v0.1.md §5, hifi-ui-spec-v0.1.md §5
 */
export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { roomId } = await params

  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      status,
      initiator_id,
      receiver_id,
      request_expires_at,
      initiator:initiator_id (id, nickname, age_group, region, withdrawn_at),
      receiver:receiver_id (id, nickname, age_group, region, withdrawn_at)
    `)
    .eq('id', roomId)
    .single()

  if (roomError || !room) notFound()

  const isParticipant = room.initiator_id === user.id || room.receiver_id === user.id
  if (!isParticipant) redirect('/dm')

  const consentPromise =
    room.receiver_id === user.id && room.status === 'pending'
      ? supabase.from('consent_events').upsert(
          {
            room_id: roomId,
            actor_id: user.id,
            event_type: 'request_viewed',
            metadata: {},
          },
          { onConflict: 'room_id,actor_id,event_type' }
        )
      : Promise.resolve({ data: null, error: null })

  const messagesPromise = supabase
    .from('messages')
    .select('id, sender_id, content, message_type, message_status, created_at, image_url')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200)

  const [consentRes, messagesRes, reportRes] = await Promise.all([
    consentPromise,
    messagesPromise,
    supabase.from('reports').select('id').eq('target_room_id', roomId).limit(1).maybeSingle(),
  ])
  const messages = messagesRes.data ?? []
  const roomReported = !reportRes.error && !!reportRes.data

  const initiator = room.initiator as unknown as { id: string; nickname: string | null; withdrawn_at?: string | null } | null
  const receiver = room.receiver as unknown as { id: string; nickname: string | null; withdrawn_at?: string | null } | null
  const isSender = room.initiator_id === user.id
  const otherProfile = isSender ? receiver : initiator
  const otherNickname = otherProfile?.withdrawn_at ? '탈퇴한 사용자' : (otherProfile?.nickname ?? '알 수 없음')
  let otherAvatarUrl: string | null = null
  if (otherProfile?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', otherProfile.id)
      .single()
    otherAvatarUrl = profile?.avatar_url ?? null
  }

  return (
    <PullToRefresh>
      <div className="flex flex-col flex-1 min-h-0 overscroll-y-contain">
        {/* 헤더 */}
        <header className="flex items-center gap-3 px-4 pt-4 pb-3
                         border-b border-surface-700/60 bg-bg-900/95
                         backdrop-blur-sm flex-shrink-0">
        <Link
          href="/dm"
          className="text-text-muted active:text-text-secondary transition-colors p-1 -ml-1 flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        {/* 상대 아바타 */}
        <div className="w-9 h-9 rounded-full bg-surface-700 border border-surface-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-text-muted text-sm font-medium">
          {otherAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{otherNickname[0] ?? '?'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${otherProfile?.id}?from=dm`}
            className="block text-text-strong font-medium text-sm truncate active:opacity-70 transition-opacity"
          >
            {otherNickname}
          </Link>
          <RoomStatusText status={room.status as ChatRoomStatus} />
        </div>
        <ChatRoomHeaderMenu
          roomId={room.id}
          otherUserId={otherProfile?.id ?? ''}
          otherNickname={otherNickname}
          roomStatus={room.status as ChatRoomStatus}
        />
      </header>

      {/* 채팅 영역: 남는 높이만 사용해 입력창이 항상 보이게 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ChatRoomClient
          room={{
            id: room.id,
            status: room.status as ChatRoomStatus,
            initiator_id: room.initiator_id,
            receiver_id: room.receiver_id,
            request_expires_at: room.request_expires_at,
          }}
          messages={messages as {
            id: string
            sender_id: string
            content: string
            message_type: 'text' | 'system' | 'image'
            message_status: string
            created_at: string
            image_url?: string | null
            read_at?: string | null
          }[]}
          currentUserId={user.id}
          otherNickname={otherNickname}
          otherAvatarUrl={otherAvatarUrl}
          roomReported={roomReported}
        />
      </div>
      </div>
    </PullToRefresh>
  )
}

function RoomStatusText({ status }: { status: ChatRoomStatus }) {
  const texts: Partial<Record<ChatRoomStatus, { text: string; color: string }>> = {
    pending: { text: '수락 대기 중', color: 'text-state-warning' },
    agreed: { text: '대화 중', color: 'text-trust-400' },
    expired: { text: '만료됨', color: 'text-text-muted' },
    blocked: { text: '차단됨', color: 'text-state-danger' },
  }
  const config = texts[status] ?? { text: status, color: 'text-text-muted' }
  return <p className={`text-[11px] ${config.color}`}>{config.text}</p>
}
