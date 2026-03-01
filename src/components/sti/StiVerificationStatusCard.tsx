'use client'

import Link from 'next/link'
import type { StiCheckBadge } from '@/types/sti'

interface Props {
  badge: StiCheckBadge | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function StiVerificationStatusCard({ badge }: Props) {
  const status = badge?.verification_status ?? 'none'

  if (status === 'none') {
    return (
      <div className="card space-y-3">
        <div>
          <h3 className="text-text-primary text-sm font-medium mb-1">최근검사 확인</h3>
          <p className="text-text-muted text-xs leading-relaxed">
            최근 STI 검사 확인 정보를 프로필에 표시할 수 있습니다.
            이 정보는 검사 시점 기준이며 현재 상태를 보증하지 않습니다.
          </p>
        </div>
        <Link
          href="/profile/verification/submit"
          className="block w-full text-center py-2.5 rounded-chip text-sm font-medium
                     bg-surface-750 border border-surface-700 text-text-secondary
                     active:bg-surface-700 transition-colors"
        >
          최근검사 확인 시작
        </Link>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; className: string; desc: string }> = {
    pending: {
      label: '검수 대기 중',
      className: 'bg-state-warning/15 text-state-warning border-state-warning/30',
      desc: '아직 검수가 시작되지 않았습니다. 보통 24~48시간 내 처리됩니다.',
    },
    under_review: {
      label: '검토 중',
      className: 'bg-trust-500/15 text-trust-400 border-trust-500/30',
      desc: '운영자가 제출 내용을 확인 중입니다.',
    },
    verified: {
      label: '검증 완료',
      className: 'bg-state-success/15 text-state-success border-state-success/30',
      desc: '',
    },
    rejected: {
      label: '반려됨',
      className: 'bg-state-danger/15 text-state-danger border-state-danger/30',
      desc: '',
    },
    expired: {
      label: '만료됨',
      className: 'bg-surface-750 text-text-muted border-surface-700',
      desc: '유효기간이 지났습니다. 재검증을 시작해주세요.',
    },
    revoked: {
      label: '철회됨',
      className: 'bg-surface-750 text-text-muted border-surface-700',
      desc: '최근검사 확인 정보가 철회되었습니다.',
    },
  }

  const cfg = statusConfig[status] ?? statusConfig.none

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary text-sm font-medium mb-1">최근검사 확인</h3>
          {cfg.desc && (
            <p className="text-text-muted text-xs leading-relaxed">{cfg.desc}</p>
          )}
          {status === 'rejected' && badge?.rejection_reason && (
            <p className="text-state-danger text-xs mt-1 leading-relaxed">
              반려 사유: {badge.rejection_reason}
            </p>
          )}
          {status === 'verified' && (
            <div className="space-y-0.5 mt-1">
              {badge?.test_date && (
                <p className="text-text-secondary text-xs">검사일: {formatDate(badge.test_date)}</p>
              )}
              {badge?.expires_at && (
                <p className="text-text-muted text-xs">{formatDate(badge.expires_at)}까지 표시</p>
              )}
              <p className="text-text-muted text-xs mt-1">
                공개 여부: {badge?.is_public ? '공개 중' : '비공개'}
              </p>
            </div>
          )}
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-chip text-[11px] border ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex gap-2">
        <Link
          href="/profile/verification/status"
          className="flex-1 text-center py-2 rounded-xl text-xs font-medium
                     bg-surface-750 border border-surface-700 text-text-secondary
                     active:bg-surface-700 transition-colors"
        >
          상태 보기
        </Link>
        {(status === 'rejected' || status === 'expired' || status === 'revoked') && (
          <Link
            href="/profile/verification/submit"
            className="flex-1 text-center py-2 rounded-xl text-xs font-medium
                       bg-desire-500/15 text-desire-400
                       active:bg-desire-500/25 transition-colors"
          >
            재제출
          </Link>
        )}
      </div>
    </div>
  )
}
