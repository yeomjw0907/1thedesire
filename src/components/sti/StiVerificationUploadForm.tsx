'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createStiVerificationSubmission } from '@/lib/actions/sti'

interface Props {
  consentPublic: boolean
  onBack: () => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB = 10

export function StiVerificationUploadForm({ consentPublic, onBack }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [testDate, setTestDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('JPG, PNG, WEBP, PDF 파일만 업로드할 수 있습니다.')
      return
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
      return
    }
    setError(null)
    setFile(f)
  }

  function handleSubmit() {
    if (!testDate) { setError('검사일을 입력해주세요.'); return }
    if (!file) { setError('파일을 첨부해주세요.'); return }

    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('test_date', testDate)
      formData.set('file', file)
      formData.set('consent_sensitive', 'true')
      formData.set('consent_public', String(consentPublic))

      const result = await createStiVerificationSubmission(formData)
      if (result.success) {
        router.replace('/profile/verification/status')
      } else {
        setError(result.error?.message ?? '제출에 실패했습니다.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-text-strong text-lg font-semibold mb-1">검사 정보 제출</h2>
        <p className="text-text-muted text-sm leading-relaxed">
          검수용 자료를 업로드해주세요.
          검수 완료 후 원본은 즉시 삭제됩니다.
        </p>
      </div>

      <div className="space-y-4">
        {/* 검사일 */}
        <div>
          <label className="block text-text-secondary text-sm mb-2">검사일</label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="input-field"
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <label className="block text-text-secondary text-sm mb-2">검수용 파일</label>
          <label className="block cursor-pointer">
            <div className={`w-full py-8 rounded-xl border-2 border-dashed text-center transition-colors
                            ${file ? 'border-desire-500/40 bg-desire-500/5' : 'border-surface-700 bg-surface-750'}
                            active:bg-surface-700`}>
              {file ? (
                <div>
                  <p className="text-text-primary text-sm">{file.name}</p>
                  <p className="text-text-muted text-xs mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-text-secondary text-sm">파일을 선택하세요</p>
                  <p className="text-text-muted text-xs mt-1">JPG, PNG, WEBP, PDF · 최대 {MAX_SIZE_MB}MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* 안내 */}
      <div className="bg-surface-750 rounded-xl p-4 border border-surface-700/50 space-y-1.5">
        <p className="text-text-muted text-xs leading-relaxed">
          • 검수 예상 시간: 24~48시간
        </p>
        <p className="text-text-muted text-xs leading-relaxed">
          • 검수 완료 후 원본 파일은 즉시 삭제됩니다.
        </p>
        <p className="text-text-muted text-xs leading-relaxed">
          • 공개 여부: {consentPublic ? '검증 완료 시 공개' : '비공개 (나중에 변경 가능)'}
        </p>
      </div>

      {error && (
        <p className="text-state-danger text-sm px-1">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="flex-1 py-3.5 rounded-chip text-sm font-medium
                     bg-surface-750 border border-surface-700 text-text-secondary
                     active:bg-surface-700 transition-colors disabled:opacity-40"
        >
          뒤로
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !testDate || !file}
          className="flex-1 py-3.5 rounded-chip text-sm font-semibold
                     bg-desire-500 text-white
                     active:bg-desire-400 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? '제출 중...' : '검사 정보 제출'}
        </button>
      </div>
    </div>
  )
}
