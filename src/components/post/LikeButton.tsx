'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/lib/actions/posts'

export function LikeButton({
  postId,
  initialCount,
  initialLiked,
}: {
  postId: string
  initialCount: number
  initialLiked: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    if (isPending) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((prev) => (nextLiked ? prev + 1 : Math.max(prev - 1, 0)))

    startTransition(async () => {
      const result = await toggleLike(postId)
      if (!result.success) {
        // 실패 시 롤백
        setLiked(liked)
        setCount(count)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 text-xs tabular-nums transition-colors
        ${liked ? 'text-desire-400' : 'text-text-muted active:text-text-secondary'}`}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
