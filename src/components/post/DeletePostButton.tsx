'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePost } from '@/lib/actions/posts'

interface Props {
  postId: string
  /** true이면 텍스트 없이 휴지통 아이콘만 표시 */
  iconOnly?: boolean
}

export function DeletePostButton({ postId, iconOnly = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    setOpen(false)
    startTransition(async () => {
      await deletePost(postId)
      router.refresh()
    })
  }

  const triggerButton = iconOnly ? (
    <button
      onClick={() => setOpen(true)}
      disabled={isPending}
      aria-label="글 삭제"
      className="w-7 h-7 flex items-center justify-center rounded-full
                 text-text-muted active:text-state-danger
                 disabled:opacity-40 transition-colors"
    >
      {isPending ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="animate-spin">
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      )}
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      disabled={isPending}
      className="text-text-muted text-xs active:text-state-danger
                 disabled:opacity-40 transition-colors"
    >
      {isPending ? '삭제 중...' : '삭제'}
    </button>
  )

  return (
    <>
      {triggerButton}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          {/* 딤 배경 */}
          <div className="absolute inset-0 bg-black/60" />

          {/* 바텀시트 */}
          <div
            className="relative w-full max-w-md bg-surface-800 rounded-t-2xl px-5 pt-5 pb-8
                       border-t border-surface-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="w-9 h-1 rounded-full bg-surface-600 mx-auto mb-5" />

            {/* 내용 */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-state-danger/15 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="text-state-danger">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div>
                <p className="text-text-strong font-semibold text-[15px]">글을 삭제할까요?</p>
                <p className="text-text-muted text-xs mt-0.5">삭제한 글은 복구할 수 없습니다.</p>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-chip bg-surface-750 border border-surface-700
                           text-text-secondary text-sm font-medium active:bg-surface-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-chip bg-state-danger/15 border border-state-danger/30
                           text-state-danger text-sm font-semibold active:bg-state-danger/25 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
