'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { reportUser } from '@/lib/actions/social'

const REPORT_REASONS = [
  '불건전한 목적으로 연락',
  '부적절한 언어 사용',
  '허위 정보 작성',
  '스팸 또는 도배',
  '기타',
]

interface Props {
  targetUserId: string
  targetNickname: string
}

export function ReportSheet({ targetUserId, targetNickname }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleReport() {
    if (!reason) return
    startTransition(async () => {
      await reportUser(targetUserId, reason)
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setReason('')
      }, 1400)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-text-muted text-sm active:text-text-secondary transition-colors"
      >
        신고
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative bg-surface-800 rounded-t-[24px] px-5 pt-2 pb-10
                          border-t border-surface-700">
            <div className="w-10 h-1 bg-surface-700 rounded-chip mx-auto mt-3 mb-5" />

            <h3 className="text-text-strong text-lg font-semibold mb-1">
              이 사용자를 신고할까요
            </h3>
            <p className="text-text-muted text-sm mb-5">
              불편하거나 부적절한 행동이 있었다면 알려주세요
            </p>

            {done ? (
              <div className="py-6 text-center text-trust-400 text-sm">
                신고가 접수되었습니다
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm
                                  border transition-colors ${
                        reason === r
                          ? 'bg-desire-500/10 border-desire-500/40 text-desire-300'
                          : 'bg-surface-750 border-surface-700 text-text-secondary'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                    className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                               border border-surface-700 font-medium active:bg-surface-700
                               disabled:opacity-40 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reason || isPending}
                    className="flex-1 py-4 rounded-chip bg-state-danger/80 text-white
                               font-semibold disabled:opacity-40 active:opacity-70 transition-colors"
                  >
                    {isPending ? '접수 중...' : '신고하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
