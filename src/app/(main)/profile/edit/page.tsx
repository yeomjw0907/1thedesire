import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'

export default async function ProfileEditPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, gender, age_group, region, role, bio')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/signup')

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* 헤더 */}
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
        <h1 className="text-text-strong text-base font-semibold">프로필 수정</h1>
      </header>

      <div className="px-5 pt-6">
        <ProfileEditForm profile={profile} />
      </div>
    </div>
  )
}
