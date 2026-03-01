import { BottomNav } from '@/components/layout/BottomNav'

/**
 * 메인 앱 레이아웃
 * 하단 탭 바 포함
 * 기준 문서: frontend-implementation-checklist-v0.1.md §3
 * 탭: 홈 / 검색 / DM / 포인트 / 프로필
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
