import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ChatRoomClient } from '@/components/dm/ChatRoomClient'
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

  const { data: room } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      status,
      initiator_id,
      receiver_id,
      request_expires_at,
      initiator:initiator_id (id, nickname, age_group, region),
      receiver:receiver_id (id, nickname, age_group, region)
    `)
    .eq('id', roomId)
    .single()

  if (!room) notFound()

  const isParticipant = room.initiator_id === user.id || room.receiver_id === user.id
  if (!isParticipant) redirect('/dm')

  // consent_event: request_viewed 기록 (receiver가 처음 볼 때)
  if (room.receiver_id === user.id && room.status === 'pending') {
    await supabase.from('consent_events').upsert(
      {
        room_id: roomId,
        actor_id: user.id,
        event_type: 'request_viewed',
        metadata: {},
      },
      { onConflict: 'room_id,actor_id,event_type' }
    )
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, content, message_type, message_status, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200)

  const initiator = room.initiator as unknown as { id: string; nickname: string } | null
  const receiver = room.receiver as unknown as { id: string; nickname: string } | null
  const isSender = room.initiator_id === user.id
  const otherProfile = isSender ? receiver : initiator
  const otherNickname = otherProfile?.nickname ?? '알 수 없음'

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3
                         border-b border-surface-700/60 bg-bg-900/95
                         backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
        <Link
          href="/dm"
          className="text-text-muted active:text-text-secondary transition-colors p-1 -ml-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-text-strong font-medium text-sm truncate">{otherNickname}</p>
          <RoomStatusText status={room.status as ChatRoomStatus} />
        </div>
        <Link
          href={`/profile/${otherProfile?.id}`}
          className="text-text-muted text-xs active:opacity-70 transition-opacity flex-shrink-0"
        >
          프로필
        </Link>
      </header>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-hidden">
        <ChatRoomClient
          room={{
            id: room.id,
            status: room.status as ChatRoomStatus,
            initiator_id: room.initiator_id,
            receiver_id: room.receiver_id,
            request_expires_at: room.request_expires_at,
          }}
          messages={(messages ?? []) as {
            id: string
            sender_id: string
            content: string
            message_type: 'text' | 'system'
            message_status: string
            created_at: string
          }[]}
          currentUserId={user.id}
          otherNickname={otherNickname}
        />
      </div>
    </div>
  )
}

function RoomStatusText({ status }: { status: ChatRoomStatus }) {
  const texts: Partial<Record<ChatRoomStatus, { text: string; color: string }>> = {
    pending: { text: '수락 대기 중', color: 'text-state-warning' },
    agreed: { text: '대화 중', color: 'text-trust-400' },
    declined: { text: '거절됨', color: 'text-text-muted' },
    expired: { text: '만료됨', color: 'text-text-muted' },
    blocked: { text: '차단됨', color: 'text-state-danger' },
  }
  const config = texts[status] ?? { text: status, color: 'text-text-muted' }
  return <p className={`text-[11px] ${config.color}`}>{config.text}</p>
}
