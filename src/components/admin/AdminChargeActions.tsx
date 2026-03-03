'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveCharge, rejectCharge } from '@/lib/actions/points'
import { toast } from 'sonner'

interface AdminChargeActionsProps {
  transactionId: string
}

export function AdminChargeActions({ transactionId }: AdminChargeActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  function handleApprove() {
    startTransition(async () => {
      const res = await approveCharge(transactionId)
      if (res.success) {
        toast.success('충전완료되었습니다.')
        router.refresh()
      } else {
        toast.error(res.error?.message ?? '처리 실패')
      }
    })
  }

  function handleRejectSubmit() {
    const trimmed = rejectReason.trim()
    if (!trimmed) {
      toast.error('반려 사유를 입력해주세요')
      return
    }
    startTransition(async () => {
      const res = await rejectCharge(transactionId, trimmed)
      if (res.success) {
        setRejectOpen(false)
        setRejectReason('')
        toast.success('거절되었습니다.')
        router.refresh()
      } else {
        toast.error(res.error?.message ?? '처리 실패')
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="px-3 py-1.5 rounded-chip text-xs font-medium bg-trust-500/20 text-trust-400
                     active:bg-trust-500/30 disabled:opacity-50"
        >
          확인
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
          className="px-3 py-1.5 rounded-chip text-xs font-medium bg-state-danger/20 text-state-danger
                     active:bg-state-danger/30 disabled:opacity-50"
        >
          거절
        </button>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-surface-800 border border-surface-700 p-4 shadow-xl">
            <p className="text-text-strong text-sm font-medium mb-2">반려 사유</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              className="w-full min-h-[80px] px-3 py-2 rounded-xl bg-surface-900 border border-surface-700
                         text-text-primary text-sm placeholder:text-text-muted resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setRejectOpen(false); setRejectReason('') }}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-text-secondary bg-surface-750"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-state-danger disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
