import Link from 'next/link'

/**
 * 전역 404 페이지
 * 잘못된 URL·삭제된 리소스 등에서 일관된 UX 제공
 */
export default function NotFound() {
  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-6 bg-bg-900">
      <h1 className="text-text-strong text-xl font-semibold mb-2">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-text-muted text-sm mb-8 text-center">
        주소가 잘못되었거나 페이지가 삭제되었을 수 있습니다
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-chip bg-desire-500 text-white font-medium
                   active:bg-desire-400 transition-colors"
      >
        홈으로 이동
      </Link>
    </main>
  )
}
