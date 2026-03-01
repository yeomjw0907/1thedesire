import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StiCheckSubmission } from '@/types/sti'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function slaDiff(submittedAt: string): string {
  const diffMs = Date.now() - new Date(submittedAt).getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) return `${diffHours}시간 경과`
  return `${Math.floor(diffHours / 24)}일 경과`
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  under_review: '검토 중',
  approved: '승인',
  rejected: '반려',
  deleted: '삭제',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-state-warning/15 text-state-warning border-state-warning/30',
  under_review: 'bg-trust-500/15 text-trust-400 border-trust-500/30',
  approved: 'bg-state-success/15 text-state-success border-state-success/30',
  rejected: 'bg-state-danger/15 text-state-danger border-state-danger/30',
  deleted: 'bg-surface-750 text-text-muted border-surface-700',
}

export default async function AdminStiPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
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

  const { filter } = await searchParams
  const activeFilter = filter ?? 'active'

  const admin = createAdminClient()

  // 통계
  const { data: allSubs } = await admin
    .from('sti_check_submissions')
    .select('status')

  const counts: Record<string, number> = {}
  for (const sub of allSubs ?? []) {
    counts[sub.status] = (counts[sub.status] ?? 0) + 1
  }

  // 제출 목록
  let query = admin
    .from('sti_check_submissions')
    .select('*')
    .order('submitted_at', { ascending: true })

  if (activeFilter === 'active') {
    query = query.in('status', ['pending', 'under_review'])
  } else {
    query = query.eq('status', activeFilter)
  }

  const { data: submissions } = await query.limit(50)

  // 만료 예정 배지 (7일 이내)
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 7)
  const { data: expiringSoon } = await admin
    .from('sti_check_badges')
    .select('user_id, expires_at, is_public')
    .eq('verification_status', 'verified')
    .lte('expires_at', soonDate.toISOString())
    .gte('expires_at', new Date().toISOString())
    .order('expires_at')

  return (
    <div className="min-h-screen bg-bg-900 px-4 py-6 pb-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-text-strong text-xl font-semibold">최근검사 확인 검수</h1>
        <Link href="/admin" className="text-text-muted text-sm active:text-text-primary">
          ← 어드민
        </Link>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: 'pending', label: '대기' },
          { key: 'under_review', label: '검토중' },
          { key: 'approved', label: '승인' },
          { key: 'rejected', label: '반려' },
        ].map(({ key, label }) => (
          <div key={key} className="card text-center">
            <p className="text-text-strong text-lg font-bold tabular-nums"
               style={{ fontFamily: 'Montserrat, monospace' }}>
              {counts[key] ?? 0}
            </p>
            <p className="text-text-muted text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-5 border-b border-surface-700/40 pb-3 overflow-x-auto">
        {[
          { key: 'active', label: '처리 대기' },
          { key: 'pending', label: '대기' },
          { key: 'under_review', label: '검토중' },
          { key: 'approved', label: '승인' },
          { key: 'rejected', label: '반려' },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={`/admin/sti?filter=${key}`}
            className={`px-3 py-1.5 rounded-chip text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                       ${activeFilter === key
                         ? 'bg-desire-500/15 text-desire-400'
                         : 'text-text-muted'}`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* 제출 목록 */}
      <section className="space-y-2 mb-6">
        {!submissions || submissions.length === 0 ? (
          <p className="text-text-muted text-sm px-1">해당 항목이 없습니다.</p>
        ) : (
          (submissions as StiCheckSubmission[]).map((sub) => (
            <Link
              key={sub.id}
              href={`/admin/sti/${sub.id}`}
              className="card flex items-start justify-between gap-3 active:bg-surface-750 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-text-muted text-xs font-mono truncate mb-1">
                  {sub.user_id.slice(0, 8)}...
                </p>
                <p className="text-text-secondary text-xs">
                  검사일: {sub.test_date}
                </p>
                <p className="text-text-muted text-xs mt-0.5">
                  제출: {formatDate(sub.submitted_at)} · {slaDiff(sub.submitted_at)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`px-2 py-0.5 rounded-chip text-[11px] border
                                  ${STATUS_CLASS[sub.status] ?? STATUS_CLASS.pending}`}>
                  {STATUS_LABEL[sub.status] ?? sub.status}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>

      {/* 만료 예정 */}
      {expiringSoon && expiringSoon.length > 0 && (
        <section>
          <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-3">
            7일 이내 만료 예정 ({expiringSoon.length}건)
          </h2>
          <div className="space-y-2">
            {expiringSoon.map((b) => (
              <div key={b.user_id} className="card flex justify-between items-center gap-3">
                <p className="text-text-muted text-xs font-mono">{b.user_id.slice(0, 8)}...</p>
                <div className="text-right">
                  <p className="text-text-secondary text-xs">
                    {b.expires_at ? new Date(b.expires_at).toLocaleDateString('ko-KR') : ''}
                  </p>
                  <p className="text-text-muted text-[11px]">{b.is_public ? '공개 중' : '비공개'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
