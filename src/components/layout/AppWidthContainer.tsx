'use client'

import { usePathname } from 'next/navigation'

/**
 * 루트 레이아웃에서 children 감싸기.
 * /admin 하위일 때는 max-w 제한 없이 전폭, 그 외에는 max-w-md 유지.
 */
export function AppWidthContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false

  return (
    <div
      className={`min-h-screen relative pt-[env(safe-area-inset-top)] ${isAdmin ? 'w-full' : 'mx-auto max-w-md'}`}
    >
      {children}
    </div>
  )
}
