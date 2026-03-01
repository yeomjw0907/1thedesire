import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

/**
 * 가입 완료 화면
 * 기준 문서: onboarding-signup-spec-v0.1.md §4-5, copy-library-v0.1.md §5
 *
 * URL 파라미터:
 * - female=1: 여성 보너스 안내 표시
 * - points=270: 지급된 포인트 표시
 */
export default async function SignupCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ female?: string; points?: string }>
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 프로필 확인 (완료 화면에서 프로필 없으면 가입 폼으로)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, gender, points')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/signup')
  }

  const { female, points } = await searchParams
  const isFemale = female === '1' || profile.gender === 'female'
  const bonusPoints = isFemale ? (Number(points) || 270) : 0

  return (
    <main className="min-h-screen flex flex-col px-6 pb-10">
      {/* 진행 단계 표시 */}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: '100%' }} />
      </div>

      <div className="flex-1 flex flex-col justify-center pt-8">
        {/* 완료 아이콘 */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-desire-500/15 flex items-center justify-center">
            <CheckIcon />
          </div>
        </div>

        {/* 완료 메시지 */}
        <div className="mb-8 text-center">
          <h1 className="text-text-strong text-2xl font-semibold mb-3">
            이제 분위기를 둘러볼 수 있습니다
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            먼저 분위기를 둘러보고,<br />
            마음에 드는 사람의 프로필을 확인해보세요.
          </p>
        </div>

        {/* 완료 항목 카드 */}
        <div className="card space-y-3 mb-8">
          <CompletionItem
            icon="✓"
            text="첫 소개글이 등록되었습니다"
            sub="언제든 수정하거나 삭제할 수 있습니다"
          />

          {isFemale && bonusPoints > 0 && (
            <CompletionItem
              icon="◆"
              text={`가입 보너스로 ${bonusPoints}P가 지급되었습니다`}
              sub="받은 요청 수락 후 대화는 포인트가 들지 않습니다"
              color="trust"
            />
          )}

          <CompletionItem
            icon="○"
            text="원치 않는 요청은 언제든 거절하거나 차단할 수 있습니다"
          />
        </div>

        {/* 홈으로 이동 */}
        <Link href="/home" className="btn-primary text-center block">
          홈 피드 보기
        </Link>

        <Link
          href="/profile"
          className="block text-center text-text-muted text-sm mt-3 active:text-text-secondary transition-colors"
        >
          내 프로필 보기
        </Link>

        <p className="text-center text-text-muted text-xs mt-4">
          글과 분위기로 먼저 사람을 읽어보세요
        </p>
      </div>
    </main>
  )
}

function CompletionItem({
  icon,
  text,
  sub,
  color = 'desire',
}: {
  icon: string
  text: string
  sub?: string
  color?: 'desire' | 'trust'
}) {
  const iconColor = color === 'trust' ? 'text-trust-400' : 'text-desire-400'

  return (
    <div className="flex items-start gap-3">
      <span className={`${iconColor} text-sm mt-0.5 flex-shrink-0`}>{icon}</span>
      <div>
        <p className="text-text-primary text-sm">{text}</p>
        {sub && <p className="text-text-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C91F4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
