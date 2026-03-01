'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    startTransition(() => {
      router.refresh()
    })
    // 최소 0.6s 이상 돌게 보장 (너무 빠른 새로고침도 피드백이 보이도록)
    setTimeout(() => setSpinning(false), 700)
  }

  const isAnimating = spinning || isPending

  return (
    <button
      onClick={handleRefresh}
      aria-label="새로고침"
      className="p-2 text-text-muted active:text-text-secondary transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isAnimating ? 'animate-spin' : ''}
        style={isAnimating ? { animationDuration: '0.6s' } : undefined}
      >
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  )
}
