import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StiVerificationPublicToggle } from '@/components/sti/StiVerificationPublicToggle'
import { StiVerificationRevokeSheet } from '@/components/sti/StiVerificationRevokeSheet'
import type { StiCheckBadge, StiCheckSubmission } from '@/types/sti'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const STATUS_LABEL: Record<string, string> = {
  none: '미신청',
  pending: '검수 대기 중',
  under_review: '검토 중',
  verified: '검증 완료',
  rejected: '반려됨',
  expired: '만료됨',
  revoked: '철회됨',
}

const STATUS_CLASS: Record<string, string> = {
  none: 'bg-surface-750 text-text-muted border-surface-700',
  pending: 'bg-state-warning/15 text-state-warning border-state-warning/30',
  under_review: 'bg-trust-500/15 text-trust-400 border-trust-500/30',
  verified: 'bg-state-success/15 text-state-success border-state-success/30',
  rejected: 'bg-state-danger/15 text-state-danger border-state-danger/30',
  expired: 'bg-surface-750 text-text-muted border-surface-700',
  revoked: 'bg-surface-750 text-text-muted border-surface-700',
}

export default async function StiStatusPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: badge }, { data: submission }] = await Promise.all([
    admin
      .from('sti_check_badges')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    admin
      .from('sti_check_submissions')
      .select('id, status, test_date, submitted_at, reviewed_at, review_note, expires_at, created_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const b = badge as StiCheckBadge | null
  const s = submission as StiCheckSubmission | null
  const status = b?.verification_status ?? 'none'

  const canResubmit = ['rejected', 'expired', 'revoked'].includes(status)
  const isVerified = status === 'verified'

  return (
    <div className="min-h-full pb-10">
      <header className="sticky top-0 z-10 flex items-center px-2 py-2
                         bg-bg-900/95 backdrop-blur-sm border-b border-surface-700/40">
        <Link
          href="/profile/verification"
          className="p-2 text-text-secondary active:text-text-primary transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-text-strong text-base font-semibold ml-1">최근검사 확인 상태</h1>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* 현재 상태 카드 */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-text-primary text-sm font-medium">현재 상태</h2>
            <span className={`px-2 py-0.5 rounded-chip text-[11px] border flex-shrink-0
                              ${STATUS_CLASS[status] ?? STATUS_CLASS.none}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          {/* 상태별 상세 */}
          {(status === 'pending' || status === 'under_review') && (
            <p className="text-text-muted text-sm leading-relaxed">
              {status === 'pending'
                ? '아직 검수가 시작되지 않았습니다. 보통 24~48시간 내 처리됩니다.'
                : '운영자가 제출 내용을 확인 중입니다.'}
            </p>
          )}

          {isVerified && (
            <div className="space-y-1.5">
              {b?.test_date && (
                <div className="flex justify-between">
                  <span className="text-text-muted text-xs">검사일</span>
                  <span className="text-text-secondary text-xs">{formatDate(b.test_date)}</span>
                </div>
              )}
              {b?.verified_at && (
                <div className="flex justify-between">
                  <span className="text-text-muted text-xs">검증 완료일</span>
                  <span className="text-text-secondary text-xs">{formatDate(b.verified_at)}</span>
                </div>
              )}
              {b?.expires_at && (
                <div className="flex justify-between">
                  <span className="text-text-muted text-xs">표시 유효기간</span>
                  <span className="text-text-secondary text-xs">{formatDate(b.expires_at)}까지</span>
                </div>
              )}
            </div>
          )}

          {status === 'rejected' && b?.rejection_reason && (
            <div className="bg-state-danger/10 rounded-xl p-3 border border-state-danger/20">
              <p className="text-text-muted text-[11px] mb-1">반려 사유</p>
              <p className="text-text-primary text-sm leading-relaxed">{b.rejection_reason}</p>
            </div>
          )}

          {status === 'expired' && (
            <p className="text-text-muted text-sm leading-relaxed">
              유효기간이 지났습니다. 재검증을 시작해주세요.
            </p>
          )}

          {status === 'revoked' && (
            <p className="text-text-muted text-sm leading-relaxed">
              최근검사 확인 정보가 철회되었습니다. 필요하면 재신청할 수 있습니다.
            </p>
          )}
        </div>

        {/* 공개 토글: verified만 */}
        {isVerified && b && (
          <StiVerificationPublicToggle currentIsPublic={b.is_public} />
        )}

        {/* 최근 제출 이력 */}
        {s && (
          <div className="card space-y-2">
            <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest">최근 제출</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">제출일</span>
                <span className="text-text-secondary text-xs">{formatDate(s.submitted_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">검사일</span>
                <span className="text-text-secondary text-xs">{formatDate(s.test_date)}</span>
              </div>
              {s.reviewed_at && (
                <div className="flex justify-between">
                  <span className="text-text-muted text-xs">검토일</span>
                  <span className="text-text-secondary text-xs">{formatDate(s.reviewed_at)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 재제출 CTA */}
        {canResubmit && (
          <Link
            href="/profile/verification/submit"
            className="block w-full text-center py-3.5 rounded-chip text-sm font-semibold
                       bg-desire-500/15 text-desire-400
                       active:bg-desire-500/25 transition-colors"
          >
            {status === 'revoked' ? '재신청' : '재제출'}
          </Link>
        )}

        {/* 철회 버튼: verified 상태 */}
        {isVerified && (
          <StiVerificationRevokeSheet />
        )}

        <p className="text-text-muted text-xs text-center leading-relaxed px-2">
          이 표시는 검사 시점 기준 정보입니다. 현재 상태를 보증하지 않습니다.
        </p>
      </div>
    </div>
  )
}
