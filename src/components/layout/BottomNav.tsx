'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useNotifications } from '@/lib/context/NotificationContext'

/**
 * 하단 탭 바
 * 기준 문서: home-centered-ia-v0.1.md §3
 * 탭: 홈 / DM / 포인트 / 프로필
 * (검색 탭 제거 - 홈 필터로 흡수)
 */
const NAV_ITEMS = [
  { href: '/home', label: '홈', icon: HomeIcon },
  { href: '/dm', label: 'DM', icon: ChatIcon },
  { href: '/points', label: '포인트', icon: PointIcon },
  { href: '/profile', label: '프로필', icon: ProfileIcon },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const { dmCount, resetDm } = useNotifications()

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  // 채팅방에서는 하단 네비 숨김 — 채팅에만 집중
  const isChatRoom = pathname.startsWith('/dm/')
  if (isChatRoom) return null

  function handleNav(href: string) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return
    setPendingHref(href)
    if (href === '/dm') resetDm()
    router.push(href)
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                    bg-bg-850 border-t border-surface-700
                    safe-area-pb">
      {/* 상단 로딩 바 */}
      {pendingHref && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-surface-700 overflow-hidden">
          <div className="h-full bg-desire-500 animate-nav-loading" />
        </div>
      )}
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          const isLoading = pendingHref === href
          const showDmBadge = href === '/dm' && dmCount > 0
          return (
            <button
              key={href}
              onClick={() => handleNav(href)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5
                         transition-colors duration-150
                         ${isActive ? 'text-desire-400' : 'text-text-muted'}`}
            >
              <div className="relative">
                <Icon active={isActive || isLoading} />
                {isLoading && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-desire-400
                                   animate-pulse" />
                )}
                {showDmBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5
                                   rounded-full bg-desire-500 text-white text-[9px] font-bold
                                   flex items-center justify-center leading-none">
                    {dmCount > 9 ? '9+' : dmCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#DB315E' : '#7C756F'} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#DB315E' : '#7C756F'} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function PointIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#DB315E' : '#7C756F'} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#DB315E' : '#7C756F'} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
