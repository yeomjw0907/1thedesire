import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StiVerificationStatusCard } from '@/components/sti/StiVerificationStatusCard'
import type { StiCheckBadge } from '@/types/sti'

export default async function StiVerificationPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: badge } = await admin
    .from('sti_check_badges')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-full pb-10">
      <header className="sticky top-0 z-10 flex items-center px-2 py-2
                         bg-bg-900/95 backdrop-blur-sm border-b border-surface-700/40">
        <Link
          href="/profile"
          className="p-2 text-text-secondary active:text-text-primary transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-text-strong text-base font-semibold ml-1">최근검사 확인</h1>
      </header>

      <div className="px-4 pt-5 space-y-4">
        <StiVerificationStatusCard badge={badge as StiCheckBadge | null} />

        <div className="bg-surface-750 rounded-xl p-4 border border-surface-700/50 space-y-1.5">
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest mb-2">이 기능에 대해</p>
          <p className="text-text-muted text-xs leading-relaxed">
            최근 STI 검사 확인 정보를 선택적으로 프로필에 표시할 수 있는 기능입니다.
          </p>
          <p className="text-text-muted text-xs leading-relaxed">
            이 표시는 검사 시점 기준 정보이며, 현재 상태를 보증하지 않습니다.
          </p>
          <p className="text-text-muted text-xs leading-relaxed">
            원본 자료는 검수 완료 후 즉시 삭제되며, 공개 여부는 언제든지 변경할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
