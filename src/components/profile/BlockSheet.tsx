'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { blockUser } from '@/lib/actions/social'

interface Props {
  targetUserId: string
  targetNickname: string
  isBlocked: boolean
}

export function BlockSheet({ targetUserId, targetNickname, isBlocked }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleBlock() {
    startTransition(async () => {
      await blockUser(targetUserId)
      setOpen(false)
      router.push('/home')
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 text-sm transition-colors ${
          isBlocked
            ? 'text-state-danger/60 cursor-default'
            : 'text-text-muted active:text-text-secondary'
        }`}
        disabled={isBlocked}
      >
        {isBlocked ? '차단됨' : '차단'}
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
              이 사용자를 차단할까요
            </h3>
            <p className="text-text-muted text-sm mb-6">
              차단하면 서로의 프로필과 대화가 제한됩니다
            </p>

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
                onClick={handleBlock}
                disabled={isPending}
                className="flex-1 py-4 rounded-chip bg-state-danger/80 text-white
                           font-semibold disabled:opacity-40 active:opacity-70 transition-colors"
              >
                {isPending ? '처리 중...' : '차단하기'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
