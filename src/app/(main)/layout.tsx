import dynamic from 'next/dynamic'
import { BottomNav } from '@/components/layout/BottomNav'
import { NotificationProvider } from '@/lib/context/NotificationContext'
import { createServerClient } from '@/lib/supabase/server'

const NotificationListener = dynamic(
  () => import('@/components/layout/NotificationListener').then((m) => ({ default: m.NotificationListener }))
)

/**
 * 메인 앱 레이아웃
 * 하단 탭 바 포함
 * 기준 문서: frontend-implementation-checklist-v0.1.md §3
 * 탭: 홈 / DM / 포인트 / 프로필
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <NotificationProvider>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
        {user && <NotificationListener userId={user.id} />}
      </div>
    </NotificationProvider>
  )
}
