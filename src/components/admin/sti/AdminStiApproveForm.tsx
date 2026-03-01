'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveStiVerificationSubmission } from '@/lib/actions/sti'

interface Props {
  submissionId: string
  userId: string
}

// 기본 60일 유효기간
function defaultExpiresAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

export function AdminStiApproveForm({ submissionId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt())
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    if (!expiresAt) { setError('유효기간을 입력해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await approveStiVerificationSubmission({
        submission_id: submissionId,
        expires_at: new Date(expiresAt).toISOString(),
        review_note: reviewNote.trim() || undefined,
      })
      if (result.success) {
        router.push('/admin/sti')
      } else {
        setError(result.error?.message ?? '승인에 실패했습니다.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 py-3 rounded-chip text-sm font-semibold
                   bg-state-success/20 text-state-success
                   active:bg-state-success/30 transition-colors"
      >
        승인
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md bg-bg-900 rounded-t-2xl p-6 space-y-4">
            <h3 className="text-text-strong text-base font-semibold">승인 확정</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-sm mb-2">유효기간 만료일</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">검수 메모 (선택)</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="내부 메모"
                  className="input-field resize-none"
                />
              </div>
            </div>

            {error && <p className="text-state-danger text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-chip text-sm font-medium
                           bg-surface-750 border border-surface-700 text-text-secondary
                           active:bg-surface-700 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-chip text-sm font-semibold
                           bg-state-success/20 text-state-success
                           active:bg-state-success/30 transition-colors
                           disabled:opacity-40"
              >
                {isPending ? '처리 중...' : '승인 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
