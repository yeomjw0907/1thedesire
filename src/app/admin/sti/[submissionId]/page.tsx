import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { openStiSubmissionForReview } from '@/lib/actions/sti'
import { AdminStiApproveForm } from '@/components/admin/sti/AdminStiApproveForm'
import { AdminStiRejectForm } from '@/components/admin/sti/AdminStiRejectForm'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminStiDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const { submissionId } = await params

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

  const result = await openStiSubmissionForReview(submissionId)
  if (!result.success || !result.data) notFound()

  const { submission, badge, signedUrl } = result.data
  const canProcess = ['pending', 'under_review'].includes(submission.status)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Link href="/admin/sti" className="text-text-muted text-sm active:text-text-primary">
          ← 목록
        </Link>
        <h1 className="text-text-strong text-base font-semibold">제출 상세</h1>
        <span className="w-10" />
      </div>

      {/* 기본 정보 */}
      <div className="card space-y-2 mb-4">
        <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest mb-2">제출 정보</p>
        <Row label="제출 ID" value={submission.id.slice(0, 8) + '...'} />
        <Row label="사용자 ID" value={submission.user_id.slice(0, 8) + '...'} />
        <Row label="검사일" value={submission.test_date} />
        <Row label="제출 시각" value={formatDate(submission.submitted_at)} />
        <Row label="상태" value={submission.status} />
        {badge && (
          <Row label="공개 의사" value={badge.is_public ? '공개 동의' : '비공개'} />
        )}
      </div>

      {/* 제출 파일 미리보기 */}
      {signedUrl && (
        <div className="card mb-4 space-y-3">
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest">제출 파일</p>
          <p className="text-text-muted text-xs">
            링크는 5분간 유효합니다.
          </p>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2.5 rounded-xl text-sm font-medium
                       bg-surface-750 border border-surface-700 text-text-secondary
                       active:bg-surface-700 transition-colors"
          >
            파일 열기
          </a>
        </div>
      )}

      {!signedUrl && submission.file_path === null && (
        <div className="card mb-4">
          <p className="text-text-muted text-sm">원본 파일이 삭제되었습니다.</p>
        </div>
      )}

      {/* 검수 체크리스트 */}
      <div className="card mb-4 space-y-3">
        <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest">검수 체크리스트</p>
        {[
          '본인 자료 여부',
          '날짜 확인 가능 여부',
          '형식 적합 여부',
          '위조 의심 없음',
        ].map((item) => (
          <label key={item} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-desire-500" />
            <span className="text-text-secondary text-sm">{item}</span>
          </label>
        ))}
        <p className="text-text-muted text-xs mt-1">
          체크리스트는 참고용이며, 서버에 저장되지 않습니다.
        </p>
      </div>

      {/* 배지 현재 상태 */}
      {badge && (
        <div className="card mb-4 space-y-2">
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest mb-2">현재 배지 상태</p>
          <Row label="검증 상태" value={badge.verification_status} />
          {badge.verified_at && <Row label="검증일" value={formatDate(badge.verified_at)} />}
          {badge.rejection_reason && <Row label="이전 반려 사유" value={badge.rejection_reason} />}
        </div>
      )}

      {/* 승인/반려 버튼 */}
      {canProcess && (
        <div className="flex gap-3">
          <AdminStiRejectForm submissionId={submission.id} />
          <AdminStiApproveForm submissionId={submission.id} userId={submission.user_id} />
        </div>
      )}

      {!canProcess && (
        <div className="card">
          <p className="text-text-muted text-sm text-center">
            이미 처리된 제출입니다. ({submission.status})
          </p>
          {submission.review_note && (
            <p className="text-text-secondary text-xs text-center mt-1">
              메모: {submission.review_note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-muted text-xs flex-shrink-0">{label}</span>
      <span className="text-text-secondary text-xs text-right truncate">{value}</span>
    </div>
  )
}
