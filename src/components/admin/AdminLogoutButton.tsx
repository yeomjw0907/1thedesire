'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AdminLogoutButton() {
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
      className="px-3 py-1.5 rounded-chip text-xs font-medium
                 text-text-muted border border-surface-700
                 hover:text-text-secondary hover:border-surface-600
                 active:bg-surface-750 transition-colors"
    >
      로그아웃
    </button>
  )
}
