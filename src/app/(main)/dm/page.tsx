import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { ChatRoomStatus } from '@/types'

/**
 * DM 목록 화면
 * 기준 문서: wireframes-v0.1.md §5, hifi-ui-spec-v0.1.md §5
 *
 * 탭: 대기 / 진행중 / 종료
 */
export default async function DmListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab === 'active' ? 'active' : tab === 'closed' ? 'closed' : 'pending'

  const statusMap: Record<string, ChatRoomStatus[]> = {
    pending: ['pending'],
    active: ['agreed'],
    closed: ['declined', 'expired', 'blocked'],
  }

  const statuses = statusMap[activeTab]

  const { data: rooms } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      status,
      request_expires_at,
      created_at,
      initiator:initiator_id (id, nickname, age_group, region),
      receiver:receiver_id (id, nickname, age_group, region)
    `)
    .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col min-h-full">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-bg-900/95 backdrop-blur-sm
                         border-b border-surface-700 px-5 pt-4 pb-3">
        <h1 className="text-text-strong text-lg font-semibold tracking-tight mb-3">
          DM
        </h1>

        {/* 탭 */}
        <div className="flex gap-1">
          {(['pending', 'active', 'closed'] as const).map((t) => {
            const labels = { pending: '대기', active: '진행중', closed: '종료' }
            return (
              <Link
                key={t}
                href={`/dm?tab=${t}`}
                className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors duration-150
                           ${activeTab === t
                             ? 'bg-desire-500/15 text-desire-400'
                             : 'text-text-muted'}`}
              >
                {labels[t]}
              </Link>
            )
          })}
        </div>
      </header>

      {/* 목록 */}
      <div className="flex-1 px-4 py-4 space-y-2">
        {!rooms || rooms.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          rooms.map((room) => {
            const initiator = room.initiator as unknown as { id: string; nickname: string; age_group: string; region: string } | null
            const receiver = room.receiver as unknown as { id: string; nickname: string; age_group: string; region: string } | null
            const isSender = initiator?.id === user.id
            const other = isSender ? receiver : initiator

            return (
              <Link key={room.id} href={`/dm/${room.id}`} className="block">
                <div className="card active:opacity-70 transition-opacity">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-text-strong font-medium text-sm">
                        {other?.nickname ?? '알 수 없음'}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {other?.age_group} · {other?.region}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                      <StatusBadge
                        status={room.status as ChatRoomStatus}
                        isSender={isSender}
                      />
                      <span className="text-text-muted text-[10px]">
                        {formatTimeAgo(room.created_at)}
                      </span>
                    </div>
                  </div>

                  {room.status === 'pending' && room.request_expires_at && (
                    <p className="text-text-muted text-[11px] mt-2">
                      {isSender ? '수락 대기 중' : '요청이 왔습니다'} · <ExpiryText expiresAt={room.request_expires_at} />
                    </p>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, isSender }: { status: ChatRoomStatus; isSender: boolean }) {
  const configs: Record<ChatRoomStatus, { label: string; className: string }> = {
    pending: {
      label: isSender ? '대기중' : '수락 요청',
      className: 'bg-state-warning/15 text-state-warning border-state-warning/30',
    },
    agreed: {
      label: '대화중',
      className: 'bg-trust-500/15 text-trust-400 border-trust-500/30',
    },
    declined: {
      label: '거절됨',
      className: 'bg-surface-750 text-text-muted border-surface-700',
    },
    expired: {
      label: '만료됨',
      className: 'bg-surface-750 text-text-muted border-surface-700',
    },
    blocked: {
      label: '차단됨',
      className: 'bg-state-danger/15 text-state-danger border-state-danger/30',
    },
    closed: {
      label: '종료됨',
      className: 'bg-surface-750 text-text-muted border-surface-700',
    },
  }

  const config = configs[status]
  return (
    <span className={`px-2 py-0.5 rounded-chip text-[11px] border ${config.className}`}>
      {config.label}
    </span>
  )
}

function ExpiryText({ expiresAt }: { expiresAt: string }) {
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return <span>만료됨</span>
  const hours = Math.floor(remaining / 3600000)
  const mins = Math.floor((remaining % 3600000) / 60000)
  if (hours > 0) return <span>{hours}시간 {mins}분 남음</span>
  return <span>{mins}분 남음</span>
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; sub: string }> = {
    pending: { title: '대기 중인 요청이 없습니다', sub: '상대방 프로필에서 DM을 신청해보세요' },
    active: { title: '진행 중인 대화가 없습니다', sub: '수락된 DM 요청이 여기에 표시됩니다' },
    closed: { title: '종료된 대화가 없습니다', sub: '' },
  }
  const msg = messages[tab] ?? messages.pending
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">{msg.title}</p>
      {msg.sub && <p className="text-text-muted text-sm">{msg.sub}</p>}
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '방금'
  if (diffMins < 60) return `${diffMins}분 전`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}시간 전`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}일 전`
  return new Date(dateString).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
