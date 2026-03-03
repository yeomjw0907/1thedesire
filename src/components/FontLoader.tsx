'use client'

/**
 * Pretendard 폰트 비동기 로드 (렌더 블로킹 방지)
 * media="print" → onLoad 시 media="all"로 전환
 */
export function FontLoader() {
  return (
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
      media="print"
      onLoad={(e) => {
        ;(e.target as HTMLLinkElement).media = 'all'
      }}
    />
  )
}
