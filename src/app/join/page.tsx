import Link from 'next/link'
import { EmailSignupForm } from '@/components/auth/EmailSignupForm'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { TwitterLoginButton } from '@/components/auth/TwitterLoginButton'

/**
 * 회원가입 전용 화면
 * 로그인과 동일한 레이아웃, 문구만 회원가입용. Google/X/이메일 가입 후 /signup(프로필)으로 이동
 */
export default function JoinPage() {
  return (
    <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-16">
          <p className="text-text-muted text-sm font-medium tracking-widest mb-3 uppercase">
            Desire Ledger
          </p>
          <h1 className="text-text-strong font-bold text-4xl leading-tight mb-4">
            욕망백서
          </h1>
          <p className="text-text-primary text-lg leading-relaxed">
            분위기를 먼저 보고,<br />대화는 그 다음에
          </p>
        </div>

        <div className="mb-10">
          <p className="text-text-secondary text-sm leading-relaxed">
            마음이 맞는 사람과만, 조금 더 천천히.<br />
            피드와 프로필로 먼저 만나보고,<br />
            서로 수락한 뒤에만 대화를 시작해요.
          </p>
        </div>

        {/* 회원가입 */}
        <section className="mb-8">
          <h2 className="text-text-strong text-sm font-semibold mb-3">회원가입</h2>
          <div className="space-y-3">
            <GoogleLoginButton />
            <TwitterLoginButton />

            <div className="relative my-6 flex items-center">
              <span className="flex-1 border-t border-border-primary" aria-hidden />
              <span className="shrink-0 px-3 text-xs text-text-muted">또는</span>
              <span className="flex-1 border-t border-border-primary" aria-hidden />
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium mb-3">또는 이메일로 회원가입</p>
              <EmailSignupForm />
            </div>
          </div>
        </section>

        {/* 로그인 링크 */}
        <section className="border-t border-surface-700/80 pt-6">
          <p className="text-text-muted text-xs text-center mb-3" title="이미 계정이 있으신가요?">
            이미 계정이 있으신가요?
          </p>
          <Link
            href="/login"
            className="block w-full py-3.5 rounded-chip bg-surface-750 border border-surface-700
                       text-text-primary font-medium text-sm text-center
                       hover:bg-surface-700 active:bg-surface-700/80 transition-colors"
          >
            로그인 바로가기
          </Link>
        </section>
      </div>

      <div className="text-center mt-auto pt-8">
        <p className="text-text-muted text-xs">
          <Link href="/login?legal=privacy" className="underline hover:text-text-secondary">
            개인정보 처리방침
          </Link>
          {' · '}
          <Link href="/login?legal=terms" className="underline hover:text-text-secondary">
            이용약관
          </Link>
        </p>
      </div>
    </main>
  )
}
