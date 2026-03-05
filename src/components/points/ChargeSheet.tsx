'use client'

import { useState, useCallback } from 'react'
import {
  createChargeRequest,
  createPendingNicePayCardCharge,
  createNicePayChargeRequest,
} from '@/lib/actions/points'
import { toast } from 'sonner'

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

const SUPPORT_EMAIL = 'yeomjw0907@onecation.co.kr'

const NICEPAY_SCRIPT_URL = 'https://pay.nicepay.co.kr/v1/js/'
const NICEPAY_RETURN_BASE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://1thedesire.com').replace(/\/$/, '')

type Step = 'select' | 'confirm' | 'bank_transfer' | 'va_issued' | 'done'

interface VaIssuedData {
  transactionId: string
  vAcctNo: string
  vAcctBank: string
  vAcctNm: string
  expiry: string
}

interface Props {
  nickname?: string
}

export function ChargeSheet({ nickname }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [showDetail, setShowDetail] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [depositorName, setDepositorName] = useState(nickname ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vaIssued, setVaIssued] = useState<VaIssuedData | null>(null)

  const selectedOption = CHARGE_OPTIONS.find((o) => o.points === selected)

  function handleClose() {
    setOpen(false)
    setStep('select')
    setSelected(null)
    setShowDetail(false)
    setCopied(null)
    setDepositorName(nickname ?? '')
    setIsSubmitting(false)
    setVaIssued(null)
  }

  function handleNext() {
    if (!selected) return
    setStep('confirm')
  }

  const loadNicePayScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('No document'))
        return
      }
      const existing = document.querySelector(`script[src="${NICEPAY_SCRIPT_URL}"]`)
      if (existing) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = NICEPAY_SCRIPT_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('NicePay script load failed'))
      document.body.appendChild(script)
    })
  }, [])

  async function handlePayWithCard() {
    if (!selectedOption) return
    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_KEY
    if (!clientId) {
      toast.error('결제 설정이 없습니다. 관리자에게 문의하세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await createPendingNicePayCardCharge(selectedOption.points, selectedOption.price)
      if (!res.success || !res.data) {
        toast.error(res.error?.message ?? '결제 준비에 실패했습니다')
        return
      }
      const { orderId } = res.data
      await loadNicePayScript()
      const w = typeof window !== 'undefined' ? window : null
      const AUTHNICE = w && (w as unknown as { AUTHNICE?: { requestPay: (opts: unknown) => void } }).AUTHNICE
      if (!AUTHNICE?.requestPay) {
        toast.error('결제창을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const returnUrl = `${NICEPAY_RETURN_BASE}/api/payment/nicepay/return`
      AUTHNICE.requestPay({
        clientId,
        method: 'card',
        orderId,
        amount: selectedOption.price,
        goodsName: '포인트 충전',
        returnUrl,
        fnError: (err: unknown) => {
          console.error('NicePay requestPay error:', err)
          toast.error('결제창 오류가 발생했습니다')
          setIsSubmitting(false)
        },
      })
    } catch {
      toast.error('결제 준비에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePayWithVa() {
    if (!selectedOption) return
    setIsSubmitting(true)
    try {
      const res = await createNicePayChargeRequest(selectedOption.points, selectedOption.price)
      if (res.success && res.data) {
        setVaIssued(res.data)
        setStep('va_issued')
      } else {
        toast.error(res.error?.message ?? '가상계좌 발급에 실패했습니다')
      }
    } catch {
      toast.error('가상계좌 발급에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function handleSubmitCharge() {
    if (!selectedOption) return
    const trimmed = depositorName.trim()
    if (!trimmed) {
      toast.error('입금자명을 입력해주세요')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await createChargeRequest(trimmed, selectedOption.points, selectedOption.price)
      if (res.success) {
        setStep('done')
      } else {
        toast.error(res.error?.message ?? '충전 요청에 실패했습니다')
      }
    } catch {
      toast.error('충전 요청에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
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
                  소액 충전을 권장합니다. 입금 확인 후 반영됩니다.
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
                  <p className="text-text-secondary text-xs">· 입금 후 &apos;입금 완료 신청&apos;을 눌러야 충전이 진행됩니다</p>
                  <p className="text-text-secondary text-xs">· 입금자명을 정확히 입력해야 확인됩니다</p>
                  <p className="text-text-secondary text-xs">· 확인 후 순차적으로 포인트가 반영됩니다</p>
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
                    <p>· 입금자명은 서비스 닉네임으로 정확히 입력하세요. 공백·특수문자 포함 시 처리 불가</p>
                    <p>· 입금자명 제한: 10자 이내, 영문·한글·숫자만 허용</p>
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
                <h3 className="text-text-strong text-lg font-semibold mb-1">결제 수단 선택</h3>
                <p className="text-text-muted text-xs mb-5">
                  충전할 포인트와 금액을 확인한 뒤 결제 방법을 선택하세요
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
                    <span className="text-text-muted text-sm">결제 금액</span>
                    <span className="text-desire-400 font-bold tabular-nums text-base">
                      {selectedOption.price.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 결제 수단 버튼 */}
                <div className="space-y-2 mb-5">
                  <button
                    type="button"
                    onClick={handlePayWithCard}
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl border border-surface-700 bg-surface-750
                               text-text-primary font-medium active:bg-surface-700 disabled:opacity-50
                               flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? '처리 중...' : '카드로 결제'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePayWithVa}
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl border border-surface-700 bg-surface-750
                               text-text-primary font-medium active:bg-surface-700 disabled:opacity-50
                               flex items-center justify-center gap-2"
                  >
                    가상계좌로 충전
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('bank_transfer')}
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl border border-surface-700 bg-surface-750
                               text-text-primary font-medium active:bg-surface-700 disabled:opacity-50"
                  >
                    계좌이체 후 신청
                  </button>
                </div>

                <button
                  onClick={() => setStep('select')}
                  className="w-full py-3 rounded-chip bg-surface-750 text-text-secondary
                             border border-surface-700 font-medium active:bg-surface-700"
                >
                  이전
                </button>
              </>
            )}

            {step === 'bank_transfer' && selectedOption && (
              <>
                <h3 className="text-text-strong text-lg font-semibold mb-1">입금 안내</h3>
                <p className="text-text-muted text-xs mb-5">
                  아래 계좌로 입금 후 입금 완료 신청을 눌러주세요
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

                {/* 입금자명 입력 */}
                <div className="mb-4">
                  <label className="text-text-muted text-[11px] mb-1.5 block px-1">
                    입금자명 <span className="text-state-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    placeholder="입금 시 사용할 이름을 입력하세요"
                    maxLength={20}
                    className="input-field w-full"
                  />
                  <p className="text-text-muted text-[11px] mt-1 px-1">
                    입금자명과 실제 입금자명이 일치해야 처리됩니다
                  </p>
                </div>

                {/* 주의사항 */}
                <div className="bg-state-warning/10 rounded-xl px-4 py-3 mb-5 border border-state-warning/20 space-y-1.5">
                  <p className="text-state-warning text-xs font-medium">입금 전 확인하세요</p>
                  <p className="text-state-warning/80 text-xs">
                    · 입금 후 아래 &apos;입금 완료 신청&apos; 버튼을 눌러야 처리가 시작됩니다
                  </p>
                  <p className="text-state-warning/80 text-xs">
                    · 오류·환불 문의: {SUPPORT_EMAIL}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('confirm')}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                               border border-surface-700 font-medium active:bg-surface-700 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleSubmitCharge}
                    disabled={isSubmitting || !depositorName.trim()}
                    className="flex-1 py-4 rounded-chip bg-desire-500 text-white
                               font-semibold active:bg-desire-400 disabled:opacity-40"
                  >
                    {isSubmitting ? '신청 중...' : '입금 완료 신청'}
                  </button>
                </div>
              </>
            )}

            {step === 'va_issued' && vaIssued && (
              <>
                <h3 className="text-text-strong text-lg font-semibold mb-1">가상계좌 입금 안내</h3>
                <p className="text-text-muted text-xs mb-5">
                  아래 가상계좌로 입금해 주세요. 입금 확인 후 자동으로 포인트가 충전됩니다.
                </p>

                <div className="bg-surface-750 rounded-2xl border border-surface-700/50 divide-y divide-surface-700/50 mb-5">
                  <button
                    type="button"
                    onClick={() => handleCopy(vaIssued.vAcctNo, 'vAcctNo')}
                    className="w-full flex justify-between items-center px-4 py-3 active:bg-surface-700/40 transition-colors text-left"
                  >
                    <span className="text-text-muted text-sm">계좌번호</span>
                    <span className="flex items-center gap-2">
                      <span className="text-text-primary text-sm tabular-nums font-medium">
                        {vaIssued.vAcctNo}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-chip transition-colors
                                        ${copied === 'vAcctNo' ? 'bg-trust-500/20 text-trust-400' : 'bg-surface-700 text-text-muted'}`}>
                        {copied === 'vAcctNo' ? '복사됨' : '복사'}
                      </span>
                    </span>
                  </button>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-text-muted text-sm">은행</span>
                    <span className="text-text-primary text-sm font-medium">{vaIssued.vAcctBank}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-text-muted text-sm">예금주</span>
                    <span className="text-text-primary text-sm">{vaIssued.vAcctNm}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-text-muted text-sm">입금 만료</span>
                    <span className="text-text-primary text-sm">{vaIssued.expiry}</span>
                  </div>
                </div>

                <div className="bg-state-warning/10 rounded-xl px-4 py-3 mb-5 border border-state-warning/20 space-y-1.5">
                  <p className="text-state-warning text-xs font-medium">입금 전 확인</p>
                  <p className="text-state-warning/80 text-xs">
                    · 입금 후 자동으로 포인트가 충전됩니다. 별도 신청 불필요
                  </p>
                  <p className="text-state-warning/80 text-xs">
                    · 오류·환불 문의: {SUPPORT_EMAIL}
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-4 rounded-chip bg-desire-500 text-white font-semibold active:bg-desire-400"
                >
                  확인
                </button>
              </>
            )}

            {step === 'done' && (
              <>
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-trust-500/15 border border-trust-500/30
                                  flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="text-trust-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-text-strong text-lg font-semibold mb-2">충전 신청 완료</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    입금 확인 후 순차적으로 포인트가 반영됩니다.{'\n'}
                    포인트 내역에서 처리 상태를 확인할 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-4 rounded-chip bg-desire-500 text-white font-semibold active:bg-desire-400"
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
