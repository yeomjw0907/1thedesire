import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminUserActions } from '@/components/admin/AdminUserActions'
import type { AccountStatus } from '@/types'

/**
 * 관리자 전용 유저 상세
 * 프로필, 최근 게시글, 신고 이력, 포인트 이력, 제재 이력
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  const isDbAdmin = myProfile?.is_admin === true
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  const isEnvAdmin = adminEmails.includes(user.email ?? '')
  if (!isDbAdmin && !isEnvAdmin) redirect('/home')

  const { userId } = await params
  const admin = createAdminClient()

  const [profileRes, postsRes, reportsAsTargetRes, reportsAsReporterRes, pointTxRes, moderationRes] = await Promise.all([
    admin.from('profiles').select('id, nickname, gender, age_group, region, role, bio, avatar_url, account_status, points, created_at, withdrawn_at').eq('id', userId).single(),
    admin.from('posts').select('id, content, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('reports').select('id, reason, status, created_at, reporter:reporter_id (id, nickname)').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('reports').select('id, reason, status, created_at, target:target_user_id (id, nickname)').eq('reporter_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('point_transactions').select('id, type, amount, balance_after, policy_code, description, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    admin.from('moderation_actions').select('id, action_type, reason, created_at').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20),
  ])

  const { data: profile, error: profileError } = profileRes
  if (profileError || !profile) notFound()

  const posts = postsRes.data ?? []
  const reportsAsTarget = reportsAsTargetRes.data ?? []
  const reportsAsReporter = reportsAsReporterRes.data ?? []
  const pointTxs = pointTxRes.data ?? []
  const moderationActions = moderationRes.data ?? []

  const displayNickname = profile.withdrawn_at ? '탈퇴한 사용자' : (profile.nickname ?? '알 수 없음')

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-bg-900 px-4 py-6 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/admin?section=users" className="text-text-muted active:text-text-primary text-sm">
          ← 유저 목록
        </Link>
      </div>

      {/* 프로필 요약 */}
      <div className="card mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-text-strong text-lg font-semibold truncate">{displayNickname}</h1>
            <p className="text-text-muted text-xs mt-0.5">
              {profile.gender === 'female' ? '여' : profile.gender === 'male' ? '남' : '기타'}
              {profile.age_group ? ` · ${profile.age_group}` : ''}
              {profile.region ? ` · ${profile.region}` : ''}
            </p>
            <p className="text-text-muted text-xs mt-1">가입: {formatDate(profile.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-text-secondary text-sm tabular-nums">{profile.points}P</span>
            <span className={`px-2 py-0.5 rounded-chip text-[11px] border ${
              profile.account_status === 'active' ? 'bg-surface-750 text-text-muted border-surface-700' :
              profile.account_status === 'restricted' ? 'bg-state-warning/15 text-state-warning border-state-warning/30' :
              profile.account_status === 'suspended' ? 'bg-state-danger/15 text-state-danger border-state-danger/30' :
              'bg-state-danger/20 text-state-danger border-state-danger/40'
            }`}>
              {profile.account_status === 'active' ? '정상' : profile.account_status === 'restricted' ? '제한' : profile.account_status === 'suspended' ? '정지' : '영구정지'}
            </span>
          </div>
        </div>
        {profile.bio && (
          <p className="text-text-secondary text-sm border-t border-surface-700/50 pt-2 mt-2 line-clamp-3">
            {profile.bio}
          </p>
        )}
        <AdminUserActions
          userId={profile.id}
          nickname={displayNickname}
          currentStatus={profile.account_status as AccountStatus}
          currentPoints={profile.points}
        />
      </div>

      {/* 최근 게시글 */}
      <section className="mb-4">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-2">
          최근 게시글 ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="text-text-muted text-sm px-1">게시글이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="card py-2">
                <p className="text-text-muted text-[10px]">{formatDate(post.created_at)} · {post.status}</p>
                <p className="text-text-primary text-sm line-clamp-2 mt-0.5">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 신고 이력 (대상) */}
      <section className="mb-4">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-2">
          이 유저를 신고한 건 ({reportsAsTarget.length})
        </h2>
        {reportsAsTarget.length === 0 ? (
          <p className="text-text-muted text-sm px-1">없음</p>
        ) : (
          <div className="space-y-2">
            {reportsAsTarget.map((r) => {
              const reporter = r.reporter as unknown as { id: string; nickname: string } | null
              return (
                <div key={r.id} className="card py-2">
                  <p className="text-text-primary text-xs">
                    {reporter?.nickname ?? '?'} → {r.status} · {formatDate(r.created_at)}
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{r.reason}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 신고 이력 (신고자) */}
      <section className="mb-4">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-2">
          이 유저가 신고한 건 ({reportsAsReporter.length})
        </h2>
        {reportsAsReporter.length === 0 ? (
          <p className="text-text-muted text-sm px-1">없음</p>
        ) : (
          <div className="space-y-2">
            {reportsAsReporter.map((r) => {
              const target = r.target as unknown as { id: string; nickname: string } | null
              return (
                <div key={r.id} className="card py-2">
                  <p className="text-text-primary text-xs">
                    → {target?.nickname ?? '?'} · {r.status} · {formatDate(r.created_at)}
                  </p>
                  <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{r.reason}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 포인트 이력 */}
      <section className="mb-4">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-2">
          포인트 이력 ({pointTxs.length})
        </h2>
        {pointTxs.length === 0 ? (
          <p className="text-text-muted text-sm px-1">없음</p>
        ) : (
          <div className="space-y-1">
            {pointTxs.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-surface-700/30 text-xs">
                <span className="text-text-secondary">
                  {tx.type} {tx.amount > 0 ? `+${tx.amount}` : tx.amount}P
                </span>
                <span className="text-text-muted">{formatDate(tx.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 제재 이력 */}
      <section>
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-2">
          제재 이력 ({moderationActions.length})
        </h2>
        {moderationActions.length === 0 ? (
          <p className="text-text-muted text-sm px-1">없음</p>
        ) : (
          <div className="space-y-2">
            {moderationActions.map((log) => (
              <div key={log.id} className="card py-2">
                <p className="text-text-primary text-xs">
                  {log.action_type} · {formatDate(log.created_at)}
                </p>
                {log.reason && <p className="text-text-secondary text-xs mt-0.5">{log.reason}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
