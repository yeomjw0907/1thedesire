/**
 * 전역 로딩 UI (루트 및 하위 세그먼트에서 대기 시 표시)
 * 로고 전달 시 public/logo-loading.png 등으로 교체 가능
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen bg-bg-900 flex-col items-center justify-center gap-6">
      {/* 로고 영역 — 전달 시 <img src="/logo-loading.png" alt="욕망백서" /> 로 교체 */}
      <div className="flex h-12 w-48 items-center justify-center">
        <span className="text-text-secondary text-xl font-semibold tracking-tight">욕망백서</span>
      </div>
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-surface-600 border-t-desire-500" />
    </div>
  )
}
