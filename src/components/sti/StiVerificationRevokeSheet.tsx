'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revokeStiVerification } from '@/lib/actions/sti'

export function StiVerificationRevokeSheet() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRevoke() {
    setError(null)
    startTransition(async () => {
      const result = await revokeStiVerification()
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error?.message ?? '철회에 실패했습니다.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-chip text-sm font-medium
                   text-state-danger border border-state-danger/30
                   active:bg-state-danger/10 transition-colors"
      >
        최근검사 확인 철회
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md bg-bg-900 rounded-t-2xl p-6 space-y-4">
            <h3 className="text-text-strong text-base font-semibold">철회하시겠습니까?</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              철회하면 프로필에서 즉시 숨김 처리됩니다.
              원하면 나중에 다시 재신청할 수 있습니다.
            </p>
            {error && <p className="text-state-danger text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-chip text-sm font-medium
                           bg-surface-750 border border-surface-700 text-text-secondary
                           active:bg-surface-700 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-chip text-sm font-semibold
                           bg-state-danger/20 text-state-danger
                           active:bg-state-danger/30 transition-colors
                           disabled:opacity-40"
              >
                {isPending ? '처리 중...' : '철회'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
