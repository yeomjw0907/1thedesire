'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createStiVerificationSubmission } from '@/lib/actions/sti'

interface Props {
  consentPublic: boolean
  onBack: () => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_MB = 10

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function StiVerificationUploadForm({ consentPublic, onBack }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 날짜 필드
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [days, setDays] = useState<number[]>([])

  useEffect(() => {
    if (year && month) {
      const d = daysInMonth(Number(year), Number(month))
      setDays(Array.from({ length: d }, (_, i) => i + 1))
      if (day && Number(day) > d) setDay('')
    }
  }, [year, month, day])

  const testDate =
    year && month && day
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : ''

  // 파일 + 미리보기
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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

    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  // 미리보기 URL 메모리 해제
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  const selectClass =
    'flex-1 bg-surface-750 border border-surface-700 rounded-xl px-3 py-3 ' +
    'text-text-primary text-sm appearance-none text-center ' +
    'focus:outline-none focus:border-desire-500/60 transition-colors'

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
        {/* 검사일 - 년/월/일 셀렉트 */}
        <div>
          <label className="block text-text-secondary text-sm mb-2">검사일</label>
          <div className="flex gap-2">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={selectClass}
              aria-label="년"
            >
              <option value="" disabled>년</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={selectClass}
              aria-label="월"
            >
              <option value="" disabled>월</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={selectClass}
              disabled={!year || !month}
              aria-label="일"
            >
              <option value="" disabled>일</option>
              {days.map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </div>
        </div>

        {/* 파일 업로드 + 미리보기 */}
        <div>
          <label className="block text-text-secondary text-sm mb-2">검수용 파일</label>
          <label className="block cursor-pointer">
            {previewUrl ? (
              /* 이미지 미리보기 */
              <div className="relative w-full rounded-xl overflow-hidden border border-desire-500/40
                              bg-desire-500/5 active:opacity-80 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="미리보기"
                  className="w-full max-h-64 object-contain"
                />
                <div className="absolute bottom-0 inset-x-0 px-3 py-2
                                bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs truncate">{file?.name}</p>
                  <p className="text-white/60 text-[11px]">
                    {((file?.size ?? 0) / 1024 / 1024).toFixed(1)}MB · 탭하여 변경
                  </p>
                </div>
              </div>
            ) : (
              /* PDF 또는 미선택 */
              <div className={`w-full py-8 rounded-xl border-2 border-dashed text-center transition-colors
                              ${file ? 'border-desire-500/40 bg-desire-500/5' : 'border-surface-700 bg-surface-750'}
                              active:bg-surface-700`}>
                {file ? (
                  <div>
                    <div className="flex justify-center mb-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                        className="text-desire-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <p className="text-text-primary text-sm">{file.name}</p>
                    <p className="text-text-muted text-xs mt-1">
                      {(file.size / 1024 / 1024).toFixed(1)}MB · 탭하여 변경
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center mb-2">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                        className="text-text-muted">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="text-text-secondary text-sm">파일을 선택하세요</p>
                    <p className="text-text-muted text-xs mt-1">
                      JPG, PNG, WEBP, PDF · 최대 {MAX_SIZE_MB}MB
                    </p>
                  </div>
                )}
              </div>
            )}
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
        <p className="text-text-muted text-xs leading-relaxed">• 검수 예상 시간: 24~48시간</p>
        <p className="text-text-muted text-xs leading-relaxed">• 검수 완료 후 원본 파일은 즉시 삭제됩니다.</p>
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
