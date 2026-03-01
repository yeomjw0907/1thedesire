'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/profile'
import { REGIONS } from '@/lib/actions/signup'
import type { ApiResponse, Profile } from '@/types'

const ROLE_SUGGESTIONS = [
  'Dom', 'Sub', 'Switch',
  'Daddy/Mommy', 'Little',
  'Sadist', 'Masochist',
  'FWB', '감성 연애',
  '대화 위주', '만남 위주',
]

interface Props {
  profile: Pick<Profile, 'nickname' | 'gender' | 'age_group' | 'region' | 'role' | 'bio'>
}

export function ProfileEditForm({ profile }: Props) {
  const [state, formAction, isPending] = useActionState<ApiResponse | null, FormData>(
    updateProfile,
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.success && state.error && (
        <div className="p-3 bg-state-danger/10 border border-state-danger/30 rounded-xl">
          <p className="text-state-danger text-sm">{state.error.message}</p>
        </div>
      )}

      {/* 닉네임 */}
      <FieldGroup label="닉네임" hint="2~20자">
        <input
          type="text"
          name="nickname"
          defaultValue={profile.nickname}
          maxLength={20}
          required
          className="input-field"
        />
      </FieldGroup>

      {/* 성별 · 연령대 (읽기 전용) */}
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="성별">
          <div className="input-field text-text-muted text-sm py-3">
            {profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : '기타'}
          </div>
        </FieldGroup>
        <FieldGroup label="연령대">
          <div className="input-field text-text-muted text-sm py-3">
            {profile.age_group}
          </div>
        </FieldGroup>
      </div>
      <p className="text-text-muted text-xs -mt-4 px-1">성별과 연령대는 변경할 수 없습니다</p>

      {/* 지역 */}
      <FieldGroup label="지역">
        <select name="region" defaultValue={profile.region} required className="input-field">
          {(REGIONS as readonly string[]).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </FieldGroup>

      {/* 성향 */}
      <FieldGroup label="성향" hint="나를 설명하는 취향 한두 가지">
        <input
          type="text"
          name="role"
          defaultValue={profile.role}
          placeholder="예: Sub · FWB, 감성 연애"
          maxLength={50}
          required
          className="input-field"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {ROLE_SUGGESTIONS.map((s) => (
            <RoleSuggestionChip key={s} value={s} />
          ))}
        </div>
      </FieldGroup>

      {/* 자기소개 */}
      <FieldGroup label="자기소개" hint="최대 300자">
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          maxLength={300}
          className="input-field resize-none"
        />
      </FieldGroup>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? '저장 중...' : '저장하기'}
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

function RoleSuggestionChip({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const form = (e.target as HTMLButtonElement).closest('form')
        const input = form?.querySelector<HTMLInputElement>('input[name="role"]')
        if (input) {
          const current = input.value
          input.value = current
            ? current.includes(value) ? current : `${current} · ${value}`
            : value
        }
      }}
      className="px-3 py-1.5 rounded-chip text-xs font-medium
                 bg-surface-700 text-text-secondary
                 active:bg-surface-750 transition-colors duration-100"
    >
      {value}
    </button>
  )
}
