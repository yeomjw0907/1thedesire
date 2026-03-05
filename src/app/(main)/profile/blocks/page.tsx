import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { BlockListClient } from '@/components/profile/BlockListClient'

export default async function ProfileBlocksPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: blocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)
    .order('blocked_id')

  const blockedIds = (blocks ?? []).map((b) => b.blocked_id)
  let blockedProfiles: { id: string; nickname: string | null; avatar_url: string | null }[] = []

  if (blockedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', blockedIds)
    blockedProfiles = profiles ?? []
  }

  return (
    <div className="flex flex-col min-h-full pb-8">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3
                         border-b border-surface-700/60 sticky top-0 z-10
                         bg-bg-900/95 backdrop-blur-sm">
        <Link
          href="/profile"
          className="text-text-muted active:text-text-secondary transition-colors p-1 -ml-1"
          aria-label="프로필로 돌아가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-text-strong text-base font-semibold">차단한 사용자</h1>
      </header>

      <div className="px-4 py-4">
        {blockedProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-700/80 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className="text-text-muted">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <p className="text-text-muted text-sm">차단한 사용자가 없습니다.</p>
          </div>
        ) : (
          <BlockListClient initialList={blockedProfiles} />
        )}
      </div>
    </div>
  )
}
