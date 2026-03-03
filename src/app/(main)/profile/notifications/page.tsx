import Link from 'next/link'

export default function ProfileNotificationsPage() {
  return (
    <div className="flex flex-col min-h-full pb-8">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3
                         border-b border-surface-700/60 sticky top-0 z-10
                         bg-bg-900/95 backdrop-blur-sm">
        <Link
          href="/profile"
          className="text-text-muted active:text-text-secondary transition-colors p-1 -ml-1"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-text-strong text-base font-semibold">알림</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-surface-700/80 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className="text-text-muted">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <p className="text-text-muted text-sm">알림 기능은 준비 중입니다.</p>
      </div>
    </div>
  )
}
