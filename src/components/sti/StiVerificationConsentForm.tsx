'use client'

import { useState } from 'react'

interface Props {
  onNext: (consentPublic: boolean) => void
  onCancel: () => void
}

export function StiVerificationConsentForm({ onNext, onCancel }: Props) {
  const [consentSensitive, setConsentSensitive] = useState(false)
  const [consentProcess, setConsentProcess] = useState(false)
  const [consentPublic, setConsentPublic] = useState(false)

  const canProceed = consentSensitive && consentProcess

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-text-strong text-lg font-semibold mb-1">최근검사 확인</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          최근 STI 검사 확인 정보를 프로필에 표시할 수 있습니다.
          검증이 완료되면 공개 여부를 직접 선택할 수 있습니다.
          이 정보는 검사 시점 기준이며 현재 상태를 보증하지 않습니다.
        </p>
      </div>

      <div className="bg-surface-750 rounded-xl p-4 space-y-1.5 border border-surface-700/50">
        <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest mb-3">공개 정보</p>
        <InfoRow label="공개되는 정보" value="최근검사 확인, 검사일, 유효기간" />
        <InfoRow label="공개되지 않는 정보" value="세부 검사 항목, 병원 원본 문서" />
        <InfoRow label="원본 파일" value="검수 완료 후 즉시 삭제" />
        <InfoRow label="공개 철회" value="언제든지 가능" />
      </div>

      <div className="space-y-3">
        <p className="text-text-muted text-[11px] font-medium uppercase tracking-widest">동의 항목</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentSensitive}
            onChange={(e) => setConsentSensitive(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-desire-500 flex-shrink-0"
          />
          <span className="text-text-primary text-sm leading-relaxed">
            <span className="text-state-danger text-xs mr-1">[필수]</span>
            민감정보(건강 관련 정보) 수집·이용에 동의합니다.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentProcess}
            onChange={(e) => setConsentProcess(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-desire-500 flex-shrink-0"
          />
          <span className="text-text-primary text-sm leading-relaxed">
            <span className="text-state-danger text-xs mr-1">[필수]</span>
            검수 목적 처리(운영자 확인)에 동의합니다.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentPublic}
            onChange={(e) => setConsentPublic(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-desire-500 flex-shrink-0"
          />
          <span className="text-text-secondary text-sm leading-relaxed">
            <span className="text-text-muted text-xs mr-1">[선택]</span>
            검증 완료 시 프로필에 공개하는 것에 동의합니다.
          </span>
        </label>

        <p className="text-text-muted text-xs pl-7">공개 동의는 이후에도 철회할 수 있습니다.</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-chip text-sm font-medium
                     bg-surface-750 border border-surface-700 text-text-secondary
                     active:bg-surface-700 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onNext(consentPublic)}
          disabled={!canProceed}
          className="flex-1 py-3.5 rounded-chip text-sm font-semibold
                     bg-desire-500 text-white
                     active:bg-desire-400 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          다음
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-text-muted text-xs flex-shrink-0">{label}</span>
      <span className="text-text-secondary text-xs text-right">{value}</span>
    </div>
  )
}
