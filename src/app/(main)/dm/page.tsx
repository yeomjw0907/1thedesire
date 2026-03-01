import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { ChatRoomStatus } from '@/types'

/**
 * DM 목록 화면
 * 기준 문서: home-centered-ia-v0.1.md, home-centered-page-structure-v0.1.md §2
 *
 * 탭: 전체 / 응답대기 / 요청
 * - 전체: 내가 보낸 + 받은 + 진행 중인 대화 전부
 * - 응답대기: 내가 보낸 DM 중 상대 응답이 없는 건 (initiator_id === me && status === pending)
 * - 요청: 나에게 온 신규 요청 (receiver_id === me && status === pending)
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
  const activeTab = tab === 'unread' ? 'unread' : tab === 'requests' ? 'requests' : 'all'

  // 전체 내 채팅방 조회
  const { data: allRooms } = await supabase
    .from('chat_rooms')
    .select(`
      id,
      status,
      initiator_id,
      receiver_id,
      request_expires_at,
      created_at,
      initiator:initiator_id (id, nickname, age_group, region),
      receiver:receiver_id (id, nickname, age_group, region)
    `)
    .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100)

  const rooms = (allRooms ?? []) as unknown as ChatRoom[]

  // 탭별 필터링
  let filteredRooms: ChatRoom[]
  if (activeTab === 'unread') {
    // 응답대기 = 내가 보낸 DM 중 상대가 아직 수락하지 않은 건 (내가 initiator인 pending)
    filteredRooms = rooms.filter(
      (r) => r.status === 'pending' && r.initiator_id === user.id
    )
  } else if (activeTab === 'requests') {
    // 요청 = 나에게 온 신규 요청 (내가 receiver인 pending)
    filteredRooms = rooms.filter(
      (r) => r.status === 'pending' && r.receiver_id === user.id
    )
  } else {
    // 전체
    filteredRooms = rooms
  }

  // 응답대기 탭 배지용 카운트 (내가 보낸 대기 중)
  const unreadCount = rooms.filter(
    (r) => r.status === 'pending' && r.initiator_id === user.id
  ).length

  // 요청 탭 배지용 카운트 (나에게 온 대기 중)
  const requestCount = rooms.filter(
    (r) => r.status === 'pending' && r.receiver_id === user.id
  ).length

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
          <TabLink href="/dm" active={activeTab === 'all'}>
            전체
          </TabLink>
          <TabLink href="/dm?tab=unread" active={activeTab === 'unread'} badge={unreadCount > 0 ? unreadCount : undefined}>
            응답대기
          </TabLink>
          <TabLink href="/dm?tab=requests" active={activeTab === 'requests'} badge={requestCount > 0 ? requestCount : undefined}>
            요청
          </TabLink>
        </div>
      </header>

      {/* 목록 */}
      <div className="flex-1 px-4 py-4 space-y-2">
        {filteredRooms.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          filteredRooms.map((room) => {
            const initiator = room.initiator as UserStub | null
            const receiver = room.receiver as UserStub | null
            const isSender = initiator?.id === user.id
            const other = isSender ? receiver : initiator

            return (
              <Link key={room.id} href={`/dm/${room.id}`} className="block">
                <div className="card active:opacity-70 transition-opacity">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* 아바타 */}
                      <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center
                                      flex-shrink-0 text-text-muted text-sm font-medium">
                        {other?.nickname?.[0] ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-text-strong font-medium text-sm">
                          {other?.nickname ?? '알 수 없음'}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {other?.age_group} · {other?.region}
                        </p>
                      </div>
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
                    <p className="text-text-muted text-[11px] mt-2 ml-11.5">
                      {isSender ? '수락 대기 중' : '요청이 왔습니다'} ·{' '}
                      <ExpiryText expiresAt={room.request_expires_at} />
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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UserStub = { id: string; nickname: string; age_group: string; region: string }
type ChatRoom = {
  id: string
  status: string
  initiator_id: string
  receiver_id: string
  request_expires_at: string | null
  created_at: string
  initiator: unknown
  receiver: unknown
}

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

function TabLink({
  href,
  active,
  badge,
  children,
}: {
  href: string
  active: boolean
  badge?: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`relative px-4 py-1.5 rounded-chip text-sm font-medium transition-colors duration-150
                 ${active ? 'bg-desire-500/15 text-desire-400' : 'text-text-muted'}`}
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-desire-500
                         text-white text-[10px] flex items-center justify-center font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
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
    // 'declined': legacy DB record only — DM 거절 기능 제거로 신규 생성 불가.
    // 이 케이스는 현재 제품 플로우에서 절대 신규 진입하지 않음. 과거 레코드 렌더링 방어만.
    declined: {
      label: '종료됨',
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
    all: { title: 'DM이 아직 없습니다', sub: '홈에서 마음에 드는 글에 DM을 보내보세요' },
    unread: { title: '응답 대기 중인 DM이 없습니다', sub: '내가 보낸 DM 중 상대가 아직 수락하지 않은 건이 여기 표시됩니다' },
    requests: { title: '받은 요청이 없습니다', sub: '나에게 온 새로운 DM 요청이 여기 표시됩니다' },
  }
  const msg = messages[tab] ?? messages.all
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">{msg.title}</p>
      {msg.sub && <p className="text-text-muted text-sm">{msg.sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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
