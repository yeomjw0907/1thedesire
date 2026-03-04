'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', section: null, pathMatch: null },
  { href: '/admin?section=charges', label: '충전', section: 'charges', pathMatch: null },
  { href: '/admin?section=reports', label: '신고', section: 'reports', pathMatch: null },
  { href: '/admin?section=users', label: '유저', section: 'users', pathMatch: null },
  { href: '/admin?section=posts', label: '게시글', section: 'posts', pathMatch: null },
  { href: '/admin?section=logs', label: '운영 로그', section: 'logs', pathMatch: null },
  { href: '/admin/sti', label: '최근검사 확인 검수', section: null, pathMatch: '/admin/sti' },
] as const

function NavLinks({
  currentPath,
  section,
  onLinkClick,
}: {
  currentPath: string
  section: string | null
  onLinkClick?: () => void
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="어드민 메뉴">
      {NAV_ITEMS.map((item) => {
        const isSti = item.pathMatch != null && currentPath.startsWith(item.pathMatch)
        const isDashboard = item.href === '/admin' && !item.section && currentPath === '/admin'
        const isSectionActive =
          item.section != null && currentPath === '/admin' && section === item.section
        const isActive = isSti || isDashboard || isSectionActive

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-desire-500 focus:ring-offset-2 focus:ring-offset-bg-900
              ${isActive ? 'bg-desire-500/15 text-desire-400' : 'text-text-secondary hover:bg-surface-750 hover:text-text-primary'}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** 데스크톱 전용: lg 이상에서 좌측 고정 사이드바 */
export function AdminNavSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const section = searchParams.get('section')
  const currentPath = pathname ?? ''

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-52 lg:flex-shrink-0 lg:border-r lg:border-surface-700/40 lg:bg-surface-800/50 lg:p-4"
      aria-label="어드민 메뉴"
    >
      <NavLinks currentPath={currentPath} section={section} />
    </aside>
  )
}

/** 모바일 전용: 햄버거 + 드로어, lg 미만에서만 표시 */
export function AdminNavMobile() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const section = searchParams.get('section')
  const currentPath = pathname ?? ''
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden p-2 -ml-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-750 transition-colors focus:outline-none focus:ring-2 focus:ring-desire-500 focus:ring-offset-2 focus:ring-offset-bg-900"
        aria-label="메뉴 열기"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="어드민 메뉴"
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
            aria-label="메뉴 닫기"
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[85vw] bg-surface-800 border-r border-surface-700/40 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-strong text-sm font-semibold">메뉴</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-750 focus:outline-none focus:ring-2 focus:ring-desire-500"
                aria-label="메뉴 닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <NavLinks currentPath={currentPath} section={section} onLinkClick={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
