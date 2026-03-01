'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAccountStatus, adjustPoints } from '@/lib/actions/admin'
import type { AccountStatus } from '@/types'

interface Props {
  userId: string
  nickname: string
  currentStatus: AccountStatus
  currentPoints: number
}

export function AdminUserActions({ userId, nickname, currentStatus, currentPoints }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleStatusChange(status: AccountStatus) {
    if (!confirm(`${nickname}님의 계정 상태를 "${status}"로 변경하시겠습니까?`)) return
    setError(null)
    startTransition(async () => {
      const result = await updateAccountStatus(userId, status)
      if (result.success) {
        setSuccess(`상태가 "${status}"로 변경됐습니다`)
        router.refresh()
      } else {
        setError(result.error?.message ?? '실패')
      }
    })
  }

  function handleAdjust() {
    const amount = parseInt(adjustAmount)
    if (isNaN(amount) || amount === 0) { setError('올바른 금액을 입력해주세요'); return }
    if (!adjustReason.trim()) { setError('사유를 입력해주세요'); return }
    setError(null)
    startTransition(async () => {
      const result = await adjustPoints(userId, amount, adjustReason)
      if (result.success) {
        setSuccess(`포인트 ${amount > 0 ? '+' : ''}${amount}P 조정 완료`)
        setShowAdjust(false)
        setAdjustAmount('')
        setAdjustReason('')
        router.refresh()
      } else {
        setError(result.error?.message ?? '실패')
      }
    })
  }

  const STATUS_OPTIONS: { value: AccountStatus; label: string; color: string }[] = [
    { value: 'active', label: '정상', color: 'text-state-success' },
    { value: 'restricted', label: '제한', color: 'text-state-warning' },
    { value: 'suspended', label: '정지', color: 'text-state-danger' },
    { value: 'banned', label: '영구정지', color: 'text-state-danger' },
  ]

  return (
    <div className="mt-3 space-y-2">
      {(error || success) && (
        <p className={`text-xs px-1 ${error ? 'text-state-danger' : 'text-state-success'}`}>
          {error ?? success}
        </p>
      )}

      {/* 계정 상태 변경 */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.filter((o) => o.value !== currentStatus).map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            disabled={isPending}
            className={`px-2.5 py-1 rounded-chip text-[11px] font-medium border
                       bg-surface-750 border-surface-700 disabled:opacity-40
                       active:opacity-70 transition-opacity ${opt.color}`}
          >
            {opt.label}로 변경
          </button>
        ))}
        <button
          onClick={() => { setShowAdjust(!showAdjust); setError(null) }}
          className="px-2.5 py-1 rounded-chip text-[11px] font-medium border
                     bg-surface-750 border-surface-700 text-text-secondary
                     active:opacity-70 transition-opacity"
        >
          포인트 조정
        </button>
      </div>

      {/* 포인트 조정 입력 */}
      {showAdjust && (
        <div className="bg-surface-750 rounded-xl p-3 space-y-2 border border-surface-700/50">
          <p className="text-text-muted text-xs">현재 {currentPoints}P</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="+100 또는 -50"
              className="input-field text-sm py-2 flex-1"
            />
          </div>
          <input
            type="text"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="사유 입력"
            className="input-field text-sm py-2 w-full"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdjust(false)}
              className="flex-1 py-2 rounded-xl bg-surface-700 text-text-secondary text-xs"
            >
              취소
            </button>
            <button
              onClick={handleAdjust}
              disabled={isPending}
              className="flex-1 py-2 rounded-xl bg-desire-500/20 text-desire-400
                         text-xs font-medium disabled:opacity-40"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
