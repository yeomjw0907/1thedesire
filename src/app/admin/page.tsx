import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminUserActions } from '@/components/admin/AdminUserActions'
import { AdminPostActions } from '@/components/admin/AdminPostActions'
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'
import type { AccountStatus } from '@/types'

/**
 * 어드민 콘솔
 * 기준 문서: admin-console-spec-v0.1.md, moderation-scenarios-v0.1.md
 *
 * 접근: ADMIN_EMAILS 환경변수에 이메일이 포함된 경우만 허용
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RBAC: DB is_admin 우선, 폴백으로 ADMIN_EMAILS 환경변수
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isDbAdmin = myProfile?.is_admin === true
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  const isEnvAdmin = adminEmails.includes(user.email ?? '')
  if (!isDbAdmin && !isEnvAdmin) redirect('/home')

  const { section } = await searchParams
  const activeSection = section ?? 'reports'

  const admin = createAdminClient()

  // DM 상태 통계
  const { data: roomStats } = await admin.from('chat_rooms').select('status')
  const statCounts: Record<string, number> = {}
  for (const r of roomStats ?? []) {
    statCounts[r.status] = (statCounts[r.status] ?? 0) + 1
  }

  // 신고 목록 (미처리 우선)
  const { data: reports } = await admin
    .from('reports')
    .select(`
      id, reason, status, created_at,
      reporter:reporter_id (id, nickname),
      target:target_user_id (id, nickname, account_status, points)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  // 최근 가입자
  const { data: recentUsers } = await admin
    .from('profiles')
    .select('id, nickname, gender, created_at, account_status, points')
    .order('created_at', { ascending: false })
    .limit(30)

  // 최근 게시글 (숨김 포함)
  const { data: recentPosts } = await admin
    .from('posts')
    .select(`
      id, content, status, created_at,
      profiles:user_id (id, nickname)
    `)
    .in('status', ['published', 'hidden'])
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-bg-900 px-4 py-6 pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text-strong text-xl font-semibold">어드민</h1>
        <AdminLogoutButton />
      </div>

      {/* DM 통계 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: 'pending', label: '대기' },
          { key: 'agreed', label: '진행중' },
          { key: 'expired', label: '만료' },
          { key: 'blocked', label: '차단' },
        ].map(({ key, label }) => (
          <div key={key} className="card text-center">
            <p className="text-text-strong text-lg font-bold tabular-nums">
              {statCounts[key] ?? 0}
            </p>
            <p className="text-text-muted text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* STI 검수 진입 */}
      <Link
        href="/admin/sti"
        className="flex items-center justify-between px-4 py-3 mb-4
                   bg-surface-800 rounded-card border border-surface-700/40
                   active:bg-surface-750 transition-colors"
      >
        <span className="text-text-secondary text-sm font-medium">최근검사 확인 검수</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-text-muted">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* 섹션 탭 */}
      <div className="flex gap-1 mb-5 border-b border-surface-700/40 pb-3">
        {[
          { key: 'reports', label: '신고' },
          { key: 'users', label: '유저' },
          { key: 'posts', label: '게시글' },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin?section=${key}`}
            className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors
                       ${activeSection === key
                         ? 'bg-desire-500/15 text-desire-400'
                         : 'text-text-muted'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* 신고 섹션 */}
      {activeSection === 'reports' && (
        <section>
          <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-3">
            신고 목록
          </h2>
          {!reports || reports.length === 0 ? (
            <p className="text-text-muted text-sm px-1">신고 내역이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => {
                const reporter = report.reporter as unknown as { id: string; nickname: string } | null
                const target = report.target as unknown as {
                  id: string; nickname: string; account_status: AccountStatus; points: number
                } | null
                return (
                  <div key={report.id} className="card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary text-sm">
                          <span className="text-text-muted">{reporter?.nickname}</span>
                          {' → '}
                          <span className="text-desire-400">{target?.nickname}</span>
                        </p>
                        <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">
                          {report.reason}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <StatusBadge status={report.status ?? 'pending'} />
                        <p className="text-text-muted text-[10px] mt-1">{formatDate(report.created_at)}</p>
                      </div>
                    </div>
                    {target && (
                      <AdminUserActions
                        userId={target.id}
                        nickname={target.nickname}
                        currentStatus={target.account_status}
                        currentPoints={target.points}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* 유저 섹션 */}
      {activeSection === 'users' && (
        <section>
          <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-3">
            최근 가입자
          </h2>
          {!recentUsers || recentUsers.length === 0 ? (
            <p className="text-text-muted text-sm px-1">가입자가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary text-sm">
                        {u.nickname}
                        <span className="text-text-muted text-xs ml-2">
                          {u.gender === 'female' ? '여' : u.gender === 'male' ? '남' : '기타'}
                        </span>
                      </p>
                      <p className="text-text-muted text-xs">{formatDate(u.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-text-secondary text-xs tabular-nums">
                        {u.points}P
                      </span>
                      <StatusBadge status={u.account_status} />
                    </div>
                  </div>
                  <AdminUserActions
                    userId={u.id}
                    nickname={u.nickname}
                    currentStatus={u.account_status as AccountStatus}
                    currentPoints={u.points}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 게시글 섹션 */}
      {activeSection === 'posts' && (
        <section>
          <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-3">
            최근 게시글
          </h2>
          {!recentPosts || recentPosts.length === 0 ? (
            <p className="text-text-muted text-sm px-1">게시글이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {recentPosts.map((post) => {
                const profile = post.profiles as unknown as { id: string; nickname: string } | null
                return (
                  <div key={post.id} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-text-secondary text-xs mb-1">
                          {profile?.nickname ?? '알 수 없음'}
                          {' · '}
                          {formatDate(post.created_at)}
                        </p>
                        <p className="text-text-primary text-sm leading-relaxed line-clamp-3">
                          {post.content}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                        <StatusBadge status={post.status} />
                        <AdminPostActions postId={post.id} currentStatus={post.status} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    active: { label: '정상', className: 'bg-surface-750 text-text-muted border-surface-700' },
    restricted: { label: '제한', className: 'bg-state-warning/15 text-state-warning border-state-warning/30' },
    suspended: { label: '정지', className: 'bg-state-danger/15 text-state-danger border-state-danger/30' },
    banned: { label: '영구정지', className: 'bg-state-danger/20 text-state-danger border-state-danger/40' },
    published: { label: '공개', className: 'bg-surface-750 text-text-muted border-surface-700' },
    hidden: { label: '숨김', className: 'bg-state-warning/15 text-state-warning border-state-warning/30' },
    pending: { label: '미처리', className: 'bg-state-warning/15 text-state-warning border-state-warning/30' },
    reviewed: { label: '검토완료', className: 'bg-trust-500/15 text-trust-400 border-trust-500/30' },
    dismissed: { label: '기각', className: 'bg-surface-750 text-text-muted border-surface-700' },
  }
  const cfg = configs[status] ?? configs.active
  return (
    <span className={`px-2 py-0.5 rounded-chip text-[11px] border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
