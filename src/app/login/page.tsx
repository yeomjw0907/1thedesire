import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { EmailMagicLinkForm } from '@/components/auth/EmailMagicLinkForm'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { TwitterLoginButton } from '@/components/auth/TwitterLoginButton'
import { LegalModal } from '@/components/legal/LegalModal'

/**
 * 로그인 화면
 * 기준 문서: onboarding-signup-spec-v0.1.md §4-2, copy-library-v0.1.md §4
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; legal?: string }>
}) {
  const params = await searchParams
  const legal = params.legal === 'privacy' || params.legal === 'terms' ? params.legal : null

  let modalContent: string | null = null
  let modalTitle = ''
  if (legal === 'privacy') {
    const filePath = path.join(process.cwd(), 'docs', 'legal', 'privacy-policy-v0.1.md')
    modalContent = fs.readFileSync(filePath, 'utf-8')
    modalTitle = '개인정보 처리방침'
  } else if (legal === 'terms') {
    const filePath = path.join(process.cwd(), 'docs', 'legal', 'terms-of-service-v0.1.md')
    modalContent = fs.readFileSync(filePath, 'utf-8')
    modalTitle = '이용약관'
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
      {/* 로고 영역 */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-16">
          <p className="text-text-muted text-sm font-serif tracking-widest mb-3 uppercase">
            Desire Ledger
          </p>
          <h1 className="text-text-strong font-serif text-4xl leading-tight mb-4">
            욕망백서
          </h1>
          <p className="text-text-primary text-lg leading-relaxed">
            분위기를 먼저 보고,<br />대화는 그 다음에
          </p>
        </div>

        <div className="mb-10">
          <p className="text-text-secondary text-sm leading-relaxed">
            취향을 안전하게 나누는 익명 플랫폼입니다.<br />
            피드와 프로필을 먼저 보고, 요청이 수락된<br />
            뒤에만 대화를 시작하세요.
          </p>
        </div>

        {/* 에러 메시지 */}
        <ErrorMessage searchParams={searchParams} />

        {/* 로그인 버튼 */}
        <div className="space-y-3">
          <GoogleLoginButton />
          <TwitterLoginButton />

          <div className="relative my-6">
            <span className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border-primary" />
            </span>
            <span className="relative flex justify-center text-xs">
              <span className="bg-bg-primary px-2 text-text-muted">또는</span>
            </span>
          </div>
          <EmailMagicLinkForm />

          <p className="text-center text-text-muted text-xs mt-6 leading-relaxed">
            원치 않는 요청은 언제든 거절하거나 차단할 수 있습니다
          </p>
        </div>
      </div>

      {/* 법률 문서 링크 (모달로 열림) */}
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

      {modalContent && <LegalModal title={modalTitle} content={modalContent} />}
    </main>
  )
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  if (!error) return null

  const messages: Record<string, string> = {
    no_code: '로그인 중 오류가 발생했습니다.',
    auth_failed: '인증에 실패했습니다. 다시 시도해 주세요.',
  }

  return (
    <div className="mb-4 p-3 bg-state-danger/10 border border-state-danger/30 rounded-xl">
      <p className="text-state-danger text-sm text-center">
        {messages[error] ?? '오류가 발생했습니다.'}
      </p>
    </div>
  )
}
