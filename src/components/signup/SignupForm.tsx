'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { completeSignup } from '@/lib/actions/signup'
import { REGIONS, AGES } from '@/lib/constants/signup'
import { AvatarPickerField } from '@/components/signup/AvatarPickerField'
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
export function SignupForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState<
    ApiResponse<SignupResult> | null,
    FormData
  >(completeSignup, null)
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    if (state && !state.success && state.error) {
      toast.error(state.error.message)
    }
  }, [state])

  return (
    <>
    <form action={formAction} className="space-y-6">

      {/* 프로필 사진 */}
      <div className="flex justify-center">
        <AvatarPickerField userId={userId} />
      </div>

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

      {/* 나이 */}
      <FieldGroup label="나이">
        <select name="age_group" defaultValue="" required className="input-field">
          <option value="" disabled>나이를 선택해 주세요</option>
          {AGES.map((age) => (
            <option key={age} value={String(age)}>{age}세</option>
          ))}
          <option value="50+">50세 이상</option>
        </select>
      </FieldGroup>

      {/* 지역 */}
      <FieldGroup label="지역">
        <select name="region" defaultValue="" required className="input-field">
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
      <FieldGroup label="자기소개">
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
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="terms_agreed"
            value="true"
            required
            className="mt-0.5 w-4 h-4 accent-desire-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-text-secondary text-sm leading-relaxed">
            <button
              type="button"
              onClick={() => setTermsOpen(true)}
              className="text-desire-400 underline underline-offset-2 hover:text-desire-300 transition-colors"
            >
              운영정책 및 이용약관
            </button>
            에 동의합니다
          </span>
        </label>

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
    {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </>
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

function TermsModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/legal/terms')
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json()
      })
      .then((data) => {
        if (!data.content) throw new Error('empty content')
        setContent(data.content)
        setLoading(false)
      })
      .catch(() => {
        setContent('이용약관을 불러오는 데 실패했습니다.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-text-strong text-base font-semibold">이용약관</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {loading ? (
            <p className="text-text-muted text-sm text-center py-8">불러오는 중...</p>
          ) : (
            <article className="text-text-primary text-sm leading-relaxed
                              [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-3 [&_h1]:text-text-strong
                              [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-text-strong
                              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                              [&_p]:mb-3 [&_li]:text-text-secondary [&_strong]:text-text-primary">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          )}
        </div>
        <div className="px-5 py-4 border-t border-surface-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-desire-500 text-white text-sm font-medium
                     hover:bg-desire-600 active:bg-desire-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

