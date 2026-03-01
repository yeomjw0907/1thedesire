import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 어드민 기본 뷰 (읽기 전용)
 * 기준 문서: moderation-scenarios-v0.1.md
 *
 * 접근: ADMIN_EMAILS 환경변수에 이메일이 포함된 경우만 허용
 */
export default async function AdminPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  if (!adminEmails.includes(user.email ?? '')) {
    redirect('/home')
  }

  const admin = createAdminClient()

  // 최근 신고 목록
  const { data: reports } = await admin
    .from('reports')
    .select(`
      id,
      reason,
      created_at,
      reporter:reporter_id (nickname),
      target:target_user_id (nickname, account_status)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  // DM 상태 통계
  const { data: roomStats } = await admin
    .from('chat_rooms')
    .select('status')

  const statCounts: Record<string, number> = {}
  for (const r of roomStats ?? []) {
    statCounts[r.status] = (statCounts[r.status] ?? 0) + 1
  }

  // 최근 가입자
  const { data: recentUsers } = await admin
    .from('profiles')
    .select('id, nickname, gender, created_at, account_status, points')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-bg-900 px-4 py-6 pb-10">
      <h1 className="text-text-strong text-xl font-semibold mb-6">어드민</h1>

      {/* DM 통계 */}
      <section className="mb-8">
        <h2 className="text-text-muted text-xs font-medium tracking-widest uppercase mb-3">
          DM 현황
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'pending', label: '대기' },
            { key: 'agreed', label: '진행중' },
            { key: 'declined', label: '거절' },
            { key: 'expired', label: '만료' },
            { key: 'blocked', label: '차단' },
          ].map(({ key, label }) => (
            <div key={key} className="card text-center">
              <p className="text-text-strong text-lg font-bold tabular-nums"
                 style={{ fontFamily: 'Montserrat, monospace' }}>
                {statCounts[key] ?? 0}
              </p>
              <p className="text-text-muted text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 최근 신고 */}
      <section className="mb-8">
        <h2 className="text-text-muted text-xs font-medium tracking-widest uppercase mb-3">
          최근 신고
        </h2>
        {!reports || reports.length === 0 ? (
          <p className="text-text-muted text-sm px-1">신고 내역이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => {
              const reporter = report.reporter as unknown as { nickname: string } | null
              const target = report.target as unknown as { nickname: string; account_status: string } | null
              return (
                <div key={report.id} className="card">
                  <div className="flex items-start justify-between gap-2">
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
                      <span className={`px-2 py-0.5 rounded-chip text-[11px] border
                        ${target?.account_status === 'active'
                          ? 'bg-surface-750 text-text-muted border-surface-700'
                          : 'bg-state-danger/15 text-state-danger border-state-danger/30'}`}>
                        {target?.account_status ?? '-'}
                      </span>
                      <p className="text-text-muted text-[10px] mt-1">
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 최근 가입자 */}
      <section>
        <h2 className="text-text-muted text-xs font-medium tracking-widest uppercase mb-3">
          최근 가입자
        </h2>
        {!recentUsers || recentUsers.length === 0 ? (
          <p className="text-text-muted text-sm px-1">가입자가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {recentUsers.map((u) => (
              <div key={u.id} className="card flex items-center justify-between gap-2">
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
                  <span className="text-text-secondary text-xs tabular-nums"
                        style={{ fontFamily: 'Montserrat, monospace' }}>
                    {u.points}P
                  </span>
                  {u.account_status !== 'active' && (
                    <span className="px-2 py-0.5 rounded-chip text-[11px]
                                     bg-state-danger/15 text-state-danger border border-state-danger/30">
                      {u.account_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
