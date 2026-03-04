import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton'
import { AdminNavMobile, AdminNavSidebar } from '@/components/admin/AdminNav'

/**
 * 관리자 전용 쉘: 헤더 + 사이드/드로어 내비 + 메인 영역
 * RBAC은 각 페이지에서 수행.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-900 flex flex-col lg:flex-row">
      <AdminNavSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-700/40 bg-surface-800/50 flex-shrink-0 lg:px-6">
          <div className="flex items-center gap-2">
            <AdminNavMobile />
            <h1 className="text-text-strong text-lg font-semibold">어드민</h1>
          </div>
          <AdminLogoutButton />
        </header>

        <main className="flex-1 px-4 py-6 pb-10">
          {children}
        </main>
      </div>
    </div>
  )
}
