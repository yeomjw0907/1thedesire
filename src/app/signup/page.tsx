import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { SignupForm } from '@/components/signup/SignupForm'

/**
 * 가입 정보 입력 화면
 * 기준 문서: onboarding-signup-spec-v0.1.md §4-3, §4-4
 *
 * - 인증된 사용자만 접근 가능 (미들웨어에서 보호)
 * - 이미 프로필이 있으면 홈으로 이동
 */
export default async function SignupPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 이미 프로필이 있으면 홈으로
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    redirect('/home')
  }

  return (
    <main className="min-h-screen pb-10">
      {/* 진행 단계 표시 */}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: '50%' }} />
      </div>

      <div className="px-6 pt-8">
        <div className="mb-8">
          <p className="text-text-muted text-sm mb-2">프로필 설정</p>
          <h1 className="text-text-strong text-2xl font-semibold leading-snug">
            이 공간에서의<br />분위기를 알려주세요
          </h1>
          <p className="text-text-secondary text-sm mt-3 leading-relaxed">
            기본 정보를 입력하고 내 분위기를 소개해보세요.<br />
            가입이 완료되면 기본 소개글이 자동으로 등록됩니다.
          </p>
        </div>

        <SignupForm />
      </div>
    </main>
  )
}
