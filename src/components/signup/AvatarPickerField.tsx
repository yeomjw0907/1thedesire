'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

const BUCKET = 'avatars'
const MAX_SIZE_MB = 5
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export function AvatarPickerField({ userId }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState('')
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
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      setUploadedUrl(publicUrl)
    } catch (err) {
      console.error('[AvatarPicker]', err)
      setError('업로드에 실패했습니다.')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="프로필 사진 선택"
        className="relative group w-20 h-20 rounded-full overflow-hidden
                   flex-shrink-0 disabled:opacity-60 transition-opacity"
      >
        <div className="w-full h-full bg-surface-700 border border-surface-600
                        flex items-center justify-center rounded-full
                        text-text-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>

        {/* 오버레이 */}
        <div className="absolute inset-0 rounded-full bg-black/40
                        flex items-center justify-center
                        opacity-0 group-active:opacity-100 transition-opacity">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>
      </button>

      <span className="text-text-muted text-xs">
        {uploading
          ? '업로드 중...'
          : previewUrl
          ? '탭하여 변경'
          : '프로필 사진 (선택)'}
      </span>

      {error && (
        <p className="text-state-danger text-[11px] text-center">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* 서버 액션에 URL 전달 */}
      <input type="hidden" name="avatar_url" value={uploadedUrl} />
    </div>
  )
}
