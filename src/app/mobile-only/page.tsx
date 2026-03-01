/**
 * PC/데스크톱 접속 시 리다이렉트되는 안내 페이지
 * 모바일에서만 이용 가능하다는 메시지 표시
 */
export default function MobileOnlyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <p className="text-text-muted text-sm font-serif tracking-widest uppercase">
          Desire Ledger
        </p>
        <h1 className="text-text-strong font-serif text-2xl">
          모바일에서 이용해 주세요
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          욕망백서는 스마트폰에서만 이용할 수 있습니다.<br />
          휴대폰 브라우저로 접속해 주세요.
        </p>
      </div>
    </main>
  )
}
