import Link from 'next/link'

/**
 * 로그인 페이지 하단: 회원가입 버튼 → /join 으로 화면 전환
 */
export function SignupSection() {
  return (
    <section className="border-t border-surface-700/80 pt-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/join"
          className="block w-full py-3.5 rounded-chip bg-surface-750 border border-surface-700
                     text-text-primary font-medium text-sm text-center
                     hover:bg-surface-700 active:bg-surface-700/80 transition-colors"
        >
          회원가입
        </Link>
        <p className="text-text-muted text-xs text-center">
          계정이 없으시면 회원가입에서 가입하세요.
        </p>
      </div>
    </section>
  )
}
