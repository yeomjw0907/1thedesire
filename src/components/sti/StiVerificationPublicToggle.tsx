'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setStiBadgeVisibility } from '@/lib/actions/sti'

interface Props {
  currentIsPublic: boolean
}

export function StiVerificationPublicToggle({ currentIsPublic }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isPublic, setIsPublic] = useState(currentIsPublic)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(value: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await setStiBadgeVisibility(value)
      if (result.success) {
        setIsPublic(value)
        router.refresh()
      } else {
        setError(result.error?.message ?? '설정 변경에 실패했습니다.')
      }
    })
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium">프로필 공개</p>
          <p className="text-text-muted text-xs mt-0.5">
            {isPublic ? '최근검사 확인 배지가 프로필에 표시됩니다.' : '프로필에서 배지가 숨겨진 상태입니다.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => handleToggle(!isPublic)}
          disabled={isPending}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0
                      ${isPublic ? 'bg-desire-500' : 'bg-surface-700'}
                      disabled:opacity-40`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform
                        ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {error && <p className="text-state-danger text-xs">{error}</p>}
    </div>
  )
}
