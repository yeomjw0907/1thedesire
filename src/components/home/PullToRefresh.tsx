'use client'

import { useRef, useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const PULL_THRESHOLD = 72
const MAX_PULL = 100

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const startYRef = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // 페이지 스크롤 기준으로 최상단 여부 판단
  const isAtTop = useCallback(() => {
    return window.scrollY <= 0
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    if (!isAtTop()) return
    startYRef.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current == null || refreshing) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy <= 0) {
      startYRef.current = null
      return
    }
    if (dy > 4) e.preventDefault()
    setPullDistance(Math.min(dy * 0.5, MAX_PULL))
  }

  function onTouchEnd() {
    if (startYRef.current == null) return
    startYRef.current = null

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true)
      setPullDistance(0)
      startTransition(() => router.refresh())
      setTimeout(() => setRefreshing(false), 800)
    } else {
      setPullDistance(0)
    }
  }

  const indicatorVisible = pullDistance > 0 || refreshing
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const isReady = pullDistance >= PULL_THRESHOLD

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-x pan-down' }}
    >
      {/* 인디케이터 — 피드 위, 헤더 아래 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: indicatorVisible ? `${refreshing ? 44 : pullDistance}px` : 0 }}
        aria-hidden
      >
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
            ${isReady || refreshing ? 'border-desire-400' : 'border-surface-600'}`}
          style={{ opacity: refreshing ? 1 : progress }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            className={`transition-colors ${isReady || refreshing ? 'text-desire-400' : 'text-text-muted'} ${refreshing ? 'animate-spin' : ''}`}
            style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
          >
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </div>
      </div>

      {children}
    </div>
  )
}
