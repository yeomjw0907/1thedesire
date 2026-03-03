'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { blockFromRoom } from '@/lib/actions/dm'
import { reportUser } from '@/lib/actions/social'
import type { ChatRoomStatus } from '@/types'

const REPORT_REASONS = [
  '불건전한 목적으로 연락',
  '부적절한 언어 사용',
  '허위 정보 작성',
  '스팸 또는 도배',
  '기타',
]

interface Props {
  roomId: string
  otherUserId: string
  otherNickname: string
  roomStatus: ChatRoomStatus
}

export function ChatRoomHeaderMenu({ roomId, otherUserId, otherNickname, roomStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [action, setAction] = useState<'block' | 'report' | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportStep, setReportStep] = useState<'confirm' | 'reason'>('confirm')

  const canBlockOrReport = roomStatus === 'pending' || roomStatus === 'agreed'

  function openBlockConfirm() {
    setAction('block')
    setSheetOpen(false)
  }

  function openReportConfirm() {
    setAction('report')
    setReportStep('confirm')
    setSheetOpen(false)
  }

  function handleBlock() {
    startTransition(async () => {
      const result = await blockFromRoom(roomId)
      if (result.success) router.push('/dm')
    })
  }

  function handleReportSubmit() {
    if (!reportReason.trim()) return
    startTransition(async () => {
      const result = await reportUser(otherUserId, reportReason.trim(), roomId)
      if (result.success) {
        setAction(null)
        setReportReason('')
        router.refresh()
      }
    })
  }

  return (
    <>
      {canBlockOrReport && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="p-2 text-text-muted active:text-text-secondary transition-colors rounded-full -mr-1"
          aria-label="차단/신고"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      )}

      {/* 바텀시트: 차단 / 신고 선택 */}
      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSheetOpen(false)} />
          <div className="relative bg-surface-800 rounded-t-2xl border-t border-surface-700 px-4 pt-2 pb-10 safe-area-pb">
            <div className="w-10 h-1 bg-surface-600 rounded-full mx-auto mb-4" />
            <p className="text-text-strong text-sm font-medium mb-3">선택</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={openBlockConfirm}
                className="w-full text-left py-3 px-4 rounded-xl text-text-primary text-sm
                           active:bg-surface-750 transition-colors"
              >
                차단
              </button>
              <button
                type="button"
                onClick={openReportConfirm}
                className="w-full text-left py-3 px-4 rounded-xl text-text-primary text-sm
                           active:bg-surface-750 transition-colors"
              >
                신고
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="w-full mt-3 py-3 text-text-muted text-sm"
            >
              취소
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 차단 확인 모달 — 가운데 정렬 */}
      {action === 'block' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-2xl px-4 py-4 shadow-xl">
            <p className="text-text-primary text-sm mb-3">정말 차단하시겠습니까?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setAction(null)}
                className="flex-1 py-2.5 rounded-chip bg-surface-700 text-text-secondary text-sm"
              >
                취소
              </button>
              <button
                onClick={handleBlock}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-chip bg-state-danger/80 text-white text-sm font-medium disabled:opacity-40"
              >
                {isPending ? '처리 중...' : '차단'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 신고 확인 → 사유 선택 — 가운데 정렬 */}
      {action === 'report' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-surface-800 border border-surface-700 rounded-2xl px-4 py-4 max-h-[85vh] overflow-y-auto shadow-xl">
            {reportStep === 'confirm' ? (
              <>
                <p className="text-text-primary text-sm mb-3">정말 신고하시겠습니까?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAction(null)}
                    className="flex-1 py-2.5 rounded-chip bg-surface-700 text-text-secondary text-sm"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setReportStep('reason')}
                    className="flex-1 py-2.5 rounded-chip bg-state-danger/80 text-white text-sm font-medium"
                  >
                    신고하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-text-strong text-sm font-medium mb-3">신고 사유 선택</p>
                <div className="space-y-1 mb-4">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReportReason(r)}
                      className={`w-full text-left py-3 px-4 rounded-xl text-sm border transition-colors ${
                        reportReason === r
                          ? 'bg-desire-500/10 border-desire-500/40 text-text-primary'
                          : 'bg-surface-750 border-surface-700 text-text-secondary'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportStep('confirm')}
                    className="flex-1 py-2.5 rounded-chip bg-surface-700 text-text-secondary text-sm"
                  >
                    뒤로
                  </button>
                  <button
                    onClick={handleReportSubmit}
                    disabled={!reportReason.trim() || isPending}
                    className="flex-1 py-2.5 rounded-chip bg-state-danger/80 text-white text-sm font-medium disabled:opacity-40"
                  >
                    {isPending ? '접수 중...' : '신고 접수'}
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
