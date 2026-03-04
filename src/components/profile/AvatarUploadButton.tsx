'use client'

import { useRef, useState } from 'react'
import { uploadProfileAvatar } from '@/lib/actions/profile'

interface Props {
  userId: string
  nickname: string
  currentAvatarUrl?: string | null
}

const MAX_SIZE_MB = 15
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export function AvatarUploadButton({ userId: _userId, nickname, currentAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED.includes(file.type)) {
      setError('JPG, PNG, WEBP만 업로드할 수 있습니다.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.set('avatar', file)
      const result = await uploadProfileAvatar(formData)
      if (!result.success) {
        throw new Error(result.error?.message ?? '프로필 이미지를 저장하는 데 실패했습니다.')
      }
      if (result.data?.avatar_url) setAvatarUrl(result.data.avatar_url)
    } catch (err) {
      console.error('[AvatarUpload]', err)
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="프로필 이미지 변경"
        className="relative group w-16 h-16 rounded-full overflow-hidden
                   flex-shrink-0 disabled:opacity-60 transition-opacity"
      >
        {/* 아바타 */}
        <div className="w-full h-full bg-surface-700 border border-surface-600
                        flex items-center justify-center rounded-full
                        text-2xl font-semibold text-text-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={nickname} className="w-full h-full object-cover" />
          ) : (
            <span>{nickname?.[0] ?? '?'}</span>
          )}
        </div>

        {/* 카메라 오버레이 */}
        <div className="absolute inset-0 rounded-full bg-black/50
                        flex items-center justify-center
                        opacity-0 group-active:opacity-100
                        sm:group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.2" strokeLinecap="round"
              className="animate-spin">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </button>

      {/* "이미지 등록" 라벨 */}
      <span className="text-text-muted text-[11px] leading-none">
        {uploading ? '업로드 중...' : avatarUrl ? '이미지 변경' : '이미지 등록'}
      </span>

      {error && (
        <p className="text-state-danger text-[11px] text-center max-w-[120px] leading-tight">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
