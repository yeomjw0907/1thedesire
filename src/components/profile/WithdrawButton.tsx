'use client'

import { useTransition } from 'react'
import { withdrawAccount } from '@/lib/actions/profile'
import { toast } from 'sonner'

const WITHDRAW_CONFIRM_MESSAGE =
  '탈퇴하면 계정이 삭제되며 복구할 수 없습니다. 하지만 같은 이메일로 다시 가입할 수 있습니다. 진행할까요?'

export function WithdrawButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(WITHDRAW_CONFIRM_MESSAGE)) return
    startTransition(async () => {
      const result = await withdrawAccount()
      if (result?.error) {
        toast.error(result.error.message)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="w-full flex items-center justify-between py-3 px-4 text-left text-sm
                 text-state-danger/90 active:bg-surface-750/50 transition-colors rounded-xl
                 disabled:opacity-60"
    >
      <span>탈퇴</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
