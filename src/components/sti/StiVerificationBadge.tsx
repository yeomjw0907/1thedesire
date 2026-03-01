'use client'

import { useState } from 'react'
import type { PublicStiBadge } from '@/types/sti'

interface Props {
  badge: PublicStiBadge
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function StiVerificationBadge({ badge }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs
                   bg-surface-750 border border-surface-700 text-text-secondary
                   active:bg-surface-700 transition-colors"
        aria-label="최근검사 확인 정보 보기"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-trust-400 flex-shrink-0" />
        <span className="text-text-secondary">최근검사 확인</span>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-bg-900 rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-text-strong text-base font-semibold">최근검사 확인</h3>

            <div className="space-y-1.5">
              {badge.test_date && (
                <p className="text-text-secondary text-sm">
                  검사일: {formatDateShort(badge.test_date)}
                </p>
              )}
              {badge.expires_at && (
                <p className="text-text-muted text-sm">
                  {formatDateShort(badge.expires_at)}까지 표시
                </p>
              )}
            </div>

            <div className="bg-surface-750 rounded-xl p-4 border border-surface-700/50">
              <p className="text-text-muted text-xs leading-relaxed">
                이 프로필은 최근 STI 검사 확인 정보를 공개하고 있습니다.
                검사 시점 기준의 정보이며 현재 상태를 보증하지 않습니다.
                만남 전에는 대화와 보호수단 여부도 함께 확인해 주세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full py-3 rounded-chip text-sm font-medium
                         bg-surface-750 border border-surface-700 text-text-secondary
                         active:bg-surface-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
