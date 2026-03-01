'use client'

import { useActionState } from 'react'
import { completeSignup, REGIONS, AGE_GROUPS } from '@/lib/actions/signup'
import type { ApiResponse, SignupResult } from '@/types'

/** 프로필 성향: Dom / Sub / Switch 중 1개만 */
const ROLE_OPTIONS = [
  { value: 'Dom', label: 'Dom' },
  { value: 'Sub', label: 'Sub' },
  { value: 'Switch', label: 'Switch' },
] as const

/**
 * 가입 폼 컴포넌트
 * 기준 문서: onboarding-signup-spec-v0.1.md, copy-library-v0.1.md §5
 */
export function SignupForm() {
  const [state, formAction, isPending] = useActionState<
    ApiResponse<SignupResult> | null,
    FormData
  >(completeSignup, null)

  return (
    <form action={formAction} className="space-y-6">
      {/* 서버 에러 메시지 */}
      {state && !state.success && state.error && (
        <div className="p-3 bg-state-danger/10 border border-state-danger/30 rounded-xl">
          <p className="text-state-danger text-sm">{state.error.message}</p>
        </div>
      )}

      {/* 닉네임 */}
      <FieldGroup label="닉네임" hint="이 공간에서 사용할 이름">
        <input
          type="text"
          name="nickname"
          placeholder="닉네임을 입력해 주세요"
          maxLength={20}
          required
          className="input-field"
        />
      </FieldGroup>

      {/* 성별 */}
      <FieldGroup label="성별">
        <div className="flex gap-3">
          {[
            { value: 'male', label: '남성' },
            { value: 'female', label: '여성' },
            { value: 'other', label: '기타' },
          ].map((option) => (
            <label key={option.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={option.value}
                required
                className="sr-only peer"
              />
              <div className="text-center py-3 rounded-xl border border-surface-700 text-text-secondary
                            peer-checked:border-desire-500 peer-checked:text-desire-400 peer-checked:bg-desire-500/10
                            transition-all duration-150 cursor-pointer text-sm font-medium">
                {option.label}
              </div>
            </label>
          ))}
        </div>
        {/* 여성 혜택 안내 */}
        <p className="text-trust-400 text-xs mt-2 leading-relaxed">
          여성 회원은 가입 시 270P가 지급되며, 받은 요청 수락 후 대화는 무료입니다.
        </p>
      </FieldGroup>

      {/* 연령대 */}
      <FieldGroup label="연령대">
        <select name="age_group" required className="input-field">
          <option value="" disabled>연령대를 선택해 주세요</option>
          {AGE_GROUPS.map((age) => (
            <option key={age} value={age}>{age}</option>
          ))}
        </select>
      </FieldGroup>

      {/* 지역 */}
      <FieldGroup label="지역" hint="너무 자세하지 않게 설정해도 괜찮습니다">
        <select name="region" required className="input-field">
          <option value="" disabled>지역을 선택해 주세요</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </FieldGroup>

      {/* 성향: Dom / Sub / Switch 중 1개 */}
      <FieldGroup label="성향" hint="나의 역할을 하나 골라주세요">
        <div className="flex gap-3">
          {ROLE_OPTIONS.map((option) => (
            <label key={option.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="role"
                value={option.value}
                required
                className="sr-only peer"
              />
              <div className="text-center py-3 rounded-xl border border-surface-700 text-text-secondary
                            peer-checked:border-desire-500 peer-checked:text-desire-400 peer-checked:bg-desire-500/10
                            transition-all duration-150 cursor-pointer text-sm font-medium">
                {option.label}
              </div>
            </label>
          ))}
        </div>
      </FieldGroup>

      {/* 자기소개 */}
      <FieldGroup
        label="자기소개"
        hint="대화를 시작하기 전에 보여주고 싶은 분위기"
      >
        <textarea
          name="bio"
          placeholder="한두 문장만으로도 괜찮습니다"
          rows={4}
          maxLength={300}
          required
          className="input-field resize-none"
        />
      </FieldGroup>

      {/* 약관 동의 */}
      <div className="card space-y-4">
        <p className="text-text-secondary text-sm font-medium">필수 동의</p>

        <CheckboxField
          name="is_adult_checked"
          label="본인은 19세 이상입니다"
        />
        <CheckboxField
          name="terms_agreed"
          label="운영정책 및 이용약관에 동의합니다"
        />

        <div className="pt-2 border-t border-surface-700 space-y-1">
          <p className="text-text-muted text-xs leading-relaxed">
            원치 않는 요청은 언제든 거절하거나 차단할 수 있습니다.
          </p>
          <p className="text-text-muted text-xs leading-relaxed">
            외부 연락처 요구, 금전 요구, 협박은 신고 대상입니다.
          </p>
        </div>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? '가입 처리 중...' : '가입 완료'}
      </button>
    </form>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <label className="text-text-primary text-sm font-medium">{label}</label>
        {hint && <span className="text-text-muted text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function CheckboxField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value="true"
        required
        className="mt-0.5 w-4 h-4 accent-desire-500 cursor-pointer flex-shrink-0"
      />
      <span className="text-text-secondary text-sm leading-relaxed">{label}</span>
    </label>
  )
}

