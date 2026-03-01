'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sendDmRequest } from '@/lib/actions/dm'
import { POINTS } from '@/types'
import type { Profile } from '@/types'

interface Props {
  targetUserId: string
  targetProfile: Pick<Profile, 'nickname' | 'age_group' | 'region' | 'role' | 'gender'>
  myPoints: number
  /** 상대의 DM 응답률 (0~100). 데이터 없으면 null */
  responseRate?: number | null
  /** 상대의 마지막 활동 시각(ISO 문자열) */
  lastActiveAt?: string | null
}

export function DmRequestSheet({ targetUserId, targetProfile, myPoints, responseRate, lastActiveAt }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const hasPoints = myPoints >= POINTS.DM_REQUEST_COST

  function handleRequest() {
    setError(null)
    startTransition(async () => {
      const result = await sendDmRequest(targetUserId)
      if (result.success) {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          router.push('/dm')
        }, 1400)
      } else {
        setError(result.error?.message ?? '요청에 실패했습니다')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-chip bg-desire-500 text-white font-semibold
                   active:bg-desire-400 transition-colors"
      >
        대화 요청 보내기
      </button>
      <p className="text-center text-text-muted text-xs mt-2">
        요청 시 {POINTS.DM_REQUEST_COST}P 차감 · 거절 시 {POINTS.DM_DECLINE_REFUND}P 환불 · 미응답 시 전액 환불
      </p>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative bg-surface-800 rounded-t-[24px] px-5 pt-2 pb-10
                          border-t border-surface-700 max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-surface-700 rounded-chip mx-auto mt-3 mb-5" />

            <h3 className="text-text-strong text-lg font-semibold mb-4">대화 요청 보내기</h3>

            {/* 상대 정보 */}
            <div className="bg-surface-750 rounded-2xl px-4 py-3 mb-4
                            border border-surface-700/50">
              <p className="text-text-strong font-medium">{targetProfile.nickname}</p>
              <p className="text-text-secondary text-sm mt-0.5">
                {targetProfile.age_group} · {targetProfile.region}
              </p>
              {targetProfile.role && (
                <p className="text-text-muted text-xs mt-1">{targetProfile.role}</p>
              )}
            </div>

            {/* 상대 활동 신뢰 지표 */}
            {(responseRate != null || lastActiveAt) && (
              <div className="flex gap-2 mb-4">
                {responseRate != null && (
                  <div className="flex-1 bg-surface-750 rounded-xl px-3 py-2 border border-surface-700/50 text-center">
                    <p className="text-trust-400 text-sm font-semibold">{responseRate}%</p>
                    <p className="text-text-muted text-[11px]">응답률</p>
                  </div>
                )}
                {lastActiveAt && (
                  <div className="flex-1 bg-surface-750 rounded-xl px-3 py-2 border border-surface-700/50 text-center">
                    <p className="text-text-secondary text-sm font-medium">{formatLastActive(lastActiveAt)}</p>
                    <p className="text-text-muted text-[11px]">최근 활동</p>
                  </div>
                )}
              </div>
            )}

            {/* 정책 패널 */}
            <div className="bg-surface-750 rounded-2xl px-4 py-3 mb-5
                            border border-surface-700/50 space-y-2.5">
              <PolicyRow label={`요청 시 ${POINTS.DM_REQUEST_COST}P가 차감됩니다`} variant="debit" />
              <PolicyRow label={`상대가 거절하면 ${POINTS.DM_DECLINE_REFUND}P가 환불됩니다`} variant="refund" />
              <PolicyRow label="24시간 내 응답이 없으면 전액 환불됩니다" variant="refund" />
              <PolicyRow label="수락 후 대화는 무료입니다" variant="free" />
              <PolicyRow label="차단 또는 요청 취소 시에는 환불되지 않습니다" variant="debit" />
              <PolicyRow label="원치 않는 요청은 거절·차단할 수 있으며, 프로필에서 신고할 수 있습니다" variant="free" />
            </div>

            {!hasPoints && (
              <div className="mb-4 space-y-2">
                <div className="px-4 py-3 bg-state-warning/10 rounded-xl
                                text-state-warning text-sm border border-state-warning/20">
                  포인트가 부족합니다. 현재 {myPoints}P 보유 중입니다
                </div>
                <Link
                  href="/points"
                  className="block w-full py-3 rounded-chip bg-desire-500/15 text-desire-400
                             text-sm font-semibold text-center active:bg-desire-500/25 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  포인트 충전하러 가기
                </Link>
              </div>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 bg-state-danger/10 rounded-xl
                              text-state-danger text-sm border border-state-danger/20">
                {error}
              </div>
            )}

            {sent && (
              <div className="mb-4 px-4 py-3 bg-trust-500/10 rounded-xl
                              text-trust-400 text-sm border border-trust-500/20">
                요청을 보냈습니다. DM 화면으로 이동합니다.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => !isPending && setOpen(false)}
                disabled={isPending}
                className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                           border border-surface-700 font-medium active:bg-surface-700
                           disabled:opacity-40 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRequest}
                disabled={isPending || !hasPoints || sent}
                className="flex-1 py-4 rounded-chip bg-desire-500 text-white
                           font-semibold active:bg-desire-400
                           disabled:opacity-40 transition-colors"
              >
                {isPending ? '요청 중...' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function formatLastActive(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return '7일 이상 전'
}

function PolicyRow({ label, variant }: { label: string; variant: 'debit' | 'refund' | 'free' }) {
  const color =
    variant === 'debit'
      ? 'text-text-secondary'
      : variant === 'refund'
      ? 'text-trust-400'
      : 'text-state-success'

  const dot =
    variant === 'debit' ? '—' : variant === 'refund' ? '↩' : '✓'

  return (
    <div className="flex items-start gap-3">
      <span className="text-xs mt-0.5 w-3 flex-shrink-0 text-center"
            style={{ fontFamily: 'Montserrat, monospace' }}>
        {dot}
      </span>
      <span className={`text-sm leading-5 ${color}`}>{label}</span>
    </div>
  )
}
