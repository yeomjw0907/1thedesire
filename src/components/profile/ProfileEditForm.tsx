'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/profile'
import { REGIONS } from '@/lib/constants/signup'
import { AvatarUploadButton } from '@/components/profile/AvatarUploadButton'
import { ProfileGalleryEditor } from '@/components/profile/ProfileGalleryEditor'
import type { ApiResponse, Profile } from '@/types'

const ROLE_OPTIONS = [
  { value: 'Dom', label: 'Dom' },
  { value: 'Sub', label: 'Sub' },
  { value: 'Switch', label: 'Switch' },
] as const

function getRoleDefault(role: string | undefined): string {
  if (!role) return 'Sub'
  const r = role.trim()
  if (r === 'Dom' || r === 'Sub' || r === 'Switch') return r
  const first = r.split(/[,·\s·]+/)[0]?.trim()
  return first === 'Dom' || first === 'Switch' ? first : 'Sub'
}

interface Props {
  profile: Pick<Profile, 'id' | 'nickname' | 'gender' | 'age_group' | 'region' | 'role' | 'bio' | 'avatar_url' | 'gallery_url_1' | 'gallery_url_2' | 'gallery_url_3' | 'gallery_url_4' | 'gallery_url_5'>
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

      {/* 프로필 이미지 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-text-primary text-sm font-medium">프로필 이미지</span>
          <span className="text-text-muted text-xs">선택</span>
        </div>
        <AvatarUploadButton
          userId={profile.id}
          nickname={profile.nickname}
          currentAvatarUrl={profile.avatar_url}
        />
      </div>

      {/* 프로필 갤러리 */}
      <div className="space-y-2">
        <ProfileGalleryEditor
          userId={profile.id}
          currentUrls={[
            profile.gallery_url_1 ?? null,
            profile.gallery_url_2 ?? null,
            profile.gallery_url_3 ?? null,
            profile.gallery_url_4 ?? null,
            profile.gallery_url_5 ?? null,
          ]}
        />
      </div>

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

      {/* 성향: Dom / Sub / Switch 중 1개 */}
      <FieldGroup label="성향" hint="나의 역할">
        <div className="flex gap-3">
          {ROLE_OPTIONS.map((option) => (
            <label key={option.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={profile.role === option.value || getRoleDefault(profile.role) === option.value}
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
