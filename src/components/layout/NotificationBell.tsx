'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/lib/context/NotificationContext'
import { markNotificationsRead } from '@/lib/actions/posts'

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '방금'
  if (diffMins < 60) return `${diffMins}분 전`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}시간 전`
  return `${Math.floor(diffHours / 24)}일 전`
}

export function NotificationBell() {
  const { likeNotifications, likeUnreadCount, markAllLikesRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  function handleOpen() {
    setOpen((prev) => {
      if (!prev) {
        const unreadIds = likeNotifications.filter((n) => !n.read).map((n) => n.id)
        if (unreadIds.length > 0) {
          markAllLikesRead()
          startTransition(() => { markNotificationsRead(unreadIds) })
        }
      }
      return !prev
    })
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      {/* 벨 버튼 */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8
                   text-text-muted active:text-text-secondary transition-colors"
        aria-label="알림"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {likeUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
                           rounded-full bg-desire-500 text-white text-[10px]
                           font-bold flex items-center justify-center leading-none">
            {likeUnreadCount > 9 ? '9+' : likeUnreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div className="absolute right-0 top-10 w-72 rounded-2xl
                        bg-surface-800 border border-surface-700 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-700/60">
            <p className="text-text-strong text-sm font-semibold">알림</p>
          </div>

          {likeNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-text-muted text-sm">아직 알림이 없습니다</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-surface-700/40">
              {likeNotifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 flex flex-col gap-1
                    ${!n.read ? 'bg-desire-500/5' : ''}`}
                >
                  <p className="text-text-primary text-xs leading-relaxed">
                    <span className="font-medium text-text-strong">{n.actorNickname}</span>
                    가 좋아요를 눌렀습니다.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-[11px]">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                    {n.actorId && (
                      <Link
                        href={`/profile/${n.actorId}`}
                        onClick={() => setOpen(false)}
                        className="text-desire-400 text-[11px] font-medium
                                   active:opacity-70 transition-opacity"
                      >
                        프로필 보러가기
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
