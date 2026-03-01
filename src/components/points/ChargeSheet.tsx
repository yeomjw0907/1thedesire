'use client'

import { useState } from 'react'

const CHARGE_OPTIONS = [
  { points: 100, price: 1100 },
  { points: 300, price: 3000 },
  { points: 500, price: 5000 },
  { points: 1000, price: 9900 },
] as const

const BANK_INFO = {
  bank: '우리은행',
  account: '1005-90-369058',
  holder: '주식회사 98점7도',
}

const SUPPORT_EMAIL = 'tweetyhelpservice@gmail.com'

type Step = 'select' | 'confirm'

export function ChargeSheet() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [showDetail, setShowDetail] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const selectedOption = CHARGE_OPTIONS.find((o) => o.points === selected)

  function handleClose() {
    setOpen(false)
    setStep('select')
    setSelected(null)
    setShowDetail(false)
    setCopied(null)
  }

  function handleNext() {
    if (!selected) return
    setStep('confirm')
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-4 py-3 rounded-chip bg-surface-750 text-text-secondary
                   text-sm font-medium border border-surface-700
                   active:bg-surface-700 transition-colors"
      >
        포인트 충전
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={handleClose}
          />
          <div className="relative bg-surface-800 rounded-t-[24px] px-5 pt-2 pb-10
                          border-t border-surface-700 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-surface-700 rounded-chip mx-auto mt-3 mb-5" />

            {step === 'select' && (
              <>
                <h3 className="text-text-strong text-lg font-semibold mb-1">포인트 충전</h3>
                <p className="text-text-muted text-xs mb-5">
                  소액 충전을 권장합니다. 결제 후 1~3분 내 자동 충전됩니다.
                </p>

                {/* 충전 상품 선택 */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {CHARGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.points}
                      onClick={() => setSelected(opt.points)}
                      className={`py-4 rounded-2xl border text-center transition-all
                                 ${selected === opt.points
                                   ? 'border-desire-500 bg-desire-500/10'
                                   : 'border-surface-700 bg-surface-750'}`}
                    >
                      <p className={`text-xl font-bold tabular-nums
                                    ${selected === opt.points ? 'text-desire-400' : 'text-text-strong'}`}>
                        {opt.points}P
                      </p>
                      <p className="text-text-muted text-xs mt-1">
                        {opt.price.toLocaleString()}원
                      </p>
                    </button>
                  ))}
                </div>

                {/* 핵심 안내 */}
                <div className="bg-surface-750/60 rounded-xl px-4 py-3 mb-3 space-y-1.5 border border-surface-700/40">
                  <p className="text-text-secondary text-xs">· 결제 후 1~3분 내 자동 충전됩니다</p>
                  <p className="text-text-secondary text-xs">· 입금자명을 정확히 입력해야 자동 충전됩니다</p>
                  <p className="text-text-secondary text-xs">· 충전 오류 시 새로고침 후 내역을 확인해 주세요</p>
                </div>

                {/* 상세 안내 토글 */}
                <button
                  type="button"
                  onClick={() => setShowDetail(!showDetail)}
                  className="text-text-muted text-xs mb-4 flex items-center gap-1"
                >
                  안내사항 {showDetail ? '접기' : '더보기'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    className={`transition-transform ${showDetail ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showDetail && (
                  <div className="bg-surface-750/40 rounded-xl px-4 py-3 mb-4 space-y-2
                                  border border-surface-700/30 text-xs text-text-muted leading-relaxed">
                    <p>· 소액 충전 권장 — 처음 이용 시 100P~300P로 테스트해 보세요</p>
                    <p>· 입금자명은 서비스 닉네임으로 정확히 입력하세요. 공백·특수문자 포함 시 자동 처리 불가</p>
                    <p>· 입금자명 제한: 10자 이내, 영문·한글·숫자만 허용</p>
                    <p>· 오류 시 문의: <span className="text-text-secondary">{SUPPORT_EMAIL}</span></p>
                    <p>· 포인트는 새로운 DM 요청에만 사용됩니다. 수락 후 대화는 무료</p>
                    <p>· 중요한 대화 내용은 별도 보관하세요. 일정 기간 후 자동 삭제될 수 있습니다</p>
                    <p>· 환불 및 이용 정책은 서비스 약관을 참고해 주세요</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                               border border-surface-700 font-medium active:bg-surface-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!selected}
                    className="flex-1 py-4 rounded-chip bg-desire-500 text-white
                               font-semibold active:bg-desire-400 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              </>
            )}

            {step === 'confirm' && selectedOption && (
              <>
                <h3 className="text-text-strong text-lg font-semibold mb-1">입금 안내</h3>
                <p className="text-text-muted text-xs mb-5">
                  아래 계좌로 입금하면 1~3분 내 자동 충전됩니다
                </p>

                {/* 충전 요약 */}
                <div className="bg-surface-750 rounded-2xl p-4 mb-4 border border-surface-700/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">충전 포인트</span>
                    <span className="text-text-strong font-semibold tabular-nums">
                      {selectedOption.points}P
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">입금 금액</span>
                    <span className="text-desire-400 font-bold tabular-nums text-base">
                      {selectedOption.price.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 계좌 정보 - 탭하여 복사 */}
                <p className="text-text-muted text-[11px] mb-2 px-1">계좌 정보 (탭하면 복사)</p>
                <div className="bg-surface-750 rounded-2xl border border-surface-700/50 divide-y divide-surface-700/50 mb-4">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-text-muted text-sm">은행</span>
                    <span className="text-text-primary text-sm font-medium">{BANK_INFO.bank}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(BANK_INFO.account, 'account')}
                    className="w-full flex justify-between items-center px-4 py-3 active:bg-surface-700/40 transition-colors"
                  >
                    <span className="text-text-muted text-sm">계좌번호</span>
                    <span className="flex items-center gap-2">
                      <span className="text-text-primary text-sm tabular-nums font-medium">
                        {BANK_INFO.account}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-chip transition-colors
                                        ${copied === 'account' ? 'bg-trust-500/20 text-trust-400' : 'bg-surface-700 text-text-muted'}`}>
                        {copied === 'account' ? '복사됨' : '복사'}
                      </span>
                    </span>
                  </button>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-text-muted text-sm">예금주</span>
                    <span className="text-text-primary text-sm">{BANK_INFO.holder}</span>
                  </div>
                </div>

                {/* 입금 전 필독 안내 */}
                <div className="bg-state-warning/10 rounded-xl px-4 py-3 mb-5 border border-state-warning/20 space-y-1.5">
                  <p className="text-state-warning text-xs font-medium">입금 전 확인하세요</p>
                  <p className="text-state-warning/80 text-xs">
                    · 입금자명은 서비스 닉네임으로 정확히 입력해 주세요 (공백·특수문자 제외)
                  </p>
                  <p className="text-state-warning/80 text-xs">
                    · 결제 후 1~3분 내 자동 충전됩니다. 오류 시 새로고침해 주세요.
                  </p>
                  <p className="text-state-warning/80 text-xs">
                    · 오류·환불 문의: {SUPPORT_EMAIL}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('select')}
                    className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                               border border-surface-700 font-medium active:bg-surface-700"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-4 rounded-chip bg-desire-500 text-white
                               font-semibold active:bg-desire-400"
                  >
                    확인했어요
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
