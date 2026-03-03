/**
 * 전역 로딩 UI (루트 및 하위 세그먼트에서 대기 시 표시)
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-600 border-t-desire-500" />
    </div>
  )
}
