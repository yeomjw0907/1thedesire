/**
 * 전역 로딩 UI (루트 및 하위 세그먼트에서 대기 시 표시)
 * 로고: public/logo-loading.svg
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen bg-bg-900 flex-col items-center justify-center gap-6">
      <div className="flex h-12 w-48 items-center justify-center">
        <img src="/logo-loading.svg" alt="욕망백서" className="h-8 w-auto max-w-full object-contain" />
      </div>
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-surface-600 border-t-desire-500" />
    </div>
  )
}
