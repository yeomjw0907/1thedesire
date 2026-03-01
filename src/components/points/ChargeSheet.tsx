'use client'

import { useState } from 'react'

const CHARGE_OPTIONS = [
  { points: 100, price: 1100 },
  { points: 300, price: 3000 },
  { points: 500, price: 5000 },
  { points: 1000, price: 9900 },
] as const

const BANK_INFO = {
  bank: '카카오뱅크',
  account: '3333-09-1234567',
  holder: '욕망백서(주)',
}

export function ChargeSheet() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [step, setStep] = useState<'select' | 'confirm'>('select')

  const selectedOption = CHARGE_OPTIONS.find((o) => o.points === selected)

  function handleClose() {
    setOpen(false)
    setStep('select')
    setSelected(null)
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
                <h3 className="text-text-strong text-lg font-semibold mb-2">포인트 충전</h3>
                <p className="text-text-muted text-xs mb-5">
                  충전을 원하는 금액을 선택하고 무통장 입금 후 확인됩니다.
                  <br />보통 1~2시간 내 처리됩니다.
                </p>

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
                      <p
                        className={`text-xl font-bold tabular-nums ${selected === opt.points ? 'text-desire-400' : 'text-text-strong'}`}
                        style={{ fontFamily: 'Montserrat, monospace' }}
                      >
                        {opt.points}P
                      </p>
                      <p className="text-text-muted text-xs mt-1">
                        {opt.price.toLocaleString()}원
                      </p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-4 rounded-chip bg-surface-750 text-text-secondary
                               border border-surface-700 font-medium active:bg-surface-700"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => selected && setStep('confirm')}
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
                <h3 className="text-text-strong text-lg font-semibold mb-5">입금 안내</h3>

                <div className="bg-surface-750 rounded-2xl p-4 mb-5 border border-surface-700/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">충전 포인트</span>
                    <span className="text-text-strong font-semibold tabular-nums"
                          style={{ fontFamily: 'Montserrat, monospace' }}>
                      {selectedOption.points}P
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">입금 금액</span>
                    <span className="text-desire-400 font-semibold">
                      {selectedOption.price.toLocaleString()}원
                    </span>
                  </div>
                  <div className="border-t border-surface-700/60 pt-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">은행</span>
                      <span className="text-text-primary text-sm">{BANK_INFO.bank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">계좌번호</span>
                      <span className="text-text-primary text-sm font-mono">{BANK_INFO.account}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">예금주</span>
                      <span className="text-text-primary text-sm">{BANK_INFO.holder}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-state-warning/10 rounded-xl p-3 mb-5 border border-state-warning/20">
                  <p className="text-state-warning text-xs leading-relaxed">
                    입금자명을 닉네임으로 입력해주세요.
                    입금 확인 후 1~2시간 내 포인트가 지급됩니다.
                    문의: support@1thedesire.com
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
                    확인
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
