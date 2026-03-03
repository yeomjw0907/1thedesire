'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full flex items-center justify-between py-3 px-4 text-left text-text-primary text-sm
                 active:bg-surface-750/50 transition-colors rounded-xl"
    >
      <span>로그아웃</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
