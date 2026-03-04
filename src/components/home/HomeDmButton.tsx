'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sendDmRequest } from '@/lib/actions/dm'
import { POINTS } from '@/types'

interface Props {
  targetUserId: string
  targetNickname: string
  targetAgeGroup: string
  targetRegion: string
  targetRole: string | null
  myPoints: number
}

export function HomeDmButton({
  targetUserId,
  targetNickname,
  targetAgeGroup,
  targetRegion,
  targetRole,
  myPoints,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const hasPoints = myPoints >= POINTS.DM_REQUEST_COST

  function handleOpen() {
    setError(null)
    setSent(false)
    setOpen(true)
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
  }

  function handleRequest() {
    setError(null)
    startTransition(async () => {
      const result = await sendDmRequest(targetUserId)
      const roomId = result.success ? result.data?.room_id : undefined
      if (roomId) {
        setSent(true)
        setTimeout(() => {
          setOpen(false)
          router.push(`/dm/${roomId}`)
        }, 1200)
      } else {
        setError(result.error?.message ?? 'DM 보내기에 실패했습니다')
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-3 py-1.5 rounded-chip
                   bg-desire-500/10 text-desire-400 text-xs font-medium
                   active:bg-desire-500/20 transition-colors border border-desire-500/20"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        DM 보내기
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={handleClose}
          />
          <div className="relative bg-surface-800 rounded-t-[24px] px-5 pt-2 pb-10
                          border-t border-surface-700 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-surface-700 rounded-chip mx-auto mt-3 mb-5" />

            <h3 className="text-text-strong text-lg font-semibold mb-4">DM 보내기</h3>

            {/* 상대 정보 */}
            <div className="bg-surface-750 rounded-2xl px-4 py-3 mb-4 border border-surface-700/50">
              <p className="text-text-strong font-medium">{targetNickname}</p>
              <p className="text-text-secondary text-sm mt-0.5">
                {targetAgeGroup} · {targetRegion}
              </p>
              {targetRole && (
                <p className="text-text-muted text-xs mt-1">{targetRole}</p>
              )}
            </div>

            {/* 정책 안내 */}
            <div className="bg-surface-750 rounded-2xl px-4 py-3 mb-5 border border-surface-700/50 space-y-2.5">
              <PolicyRow label={`${POINTS.DM_REQUEST_COST}P 차감 후 바로 대화를 시작할 수 있습니다`} variant="debit" />
              <PolicyRow label="이미 대화 중인 상대는 추가 차감 없이 대화방으로 이동합니다" variant="free" />
              <PolicyRow label="차단 시에는 환불되지 않습니다" variant="debit" />
            </div>

            {/* 포인트 부족 */}
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
                대화방으로 이동합니다.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
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
                {isPending ? '처리 중...' : `${POINTS.DM_REQUEST_COST}P 차감하고 대화하기`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function PolicyRow({ label, variant }: { label: string; variant: 'debit' | 'refund' | 'free' }) {
  const color =
    variant === 'debit'
      ? 'text-text-secondary'
      : variant === 'refund'
      ? 'text-trust-400'
      : 'text-state-success'
  const dot = variant === 'debit' ? '—' : variant === 'refund' ? '↩' : '✓'
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs mt-0.5 w-3 flex-shrink-0 text-center">{dot}</span>
      <span className={`text-sm leading-5 ${color}`}>{label}</span>
    </div>
  )
}
