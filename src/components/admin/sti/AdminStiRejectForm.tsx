'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { rejectStiVerificationSubmission } from '@/lib/actions/sti'

interface Props {
  submissionId: string
}

export function AdminStiRejectForm({ submissionId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    if (!reviewNote.trim()) { setError('반려 사유를 입력해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await rejectStiVerificationSubmission({
        submission_id: submissionId,
        review_note: reviewNote.trim(),
      })
      if (result.success) {
        router.push('/admin/sti')
      } else {
        setError(result.error?.message ?? '반려에 실패했습니다.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 py-3 rounded-chip text-sm font-semibold
                   bg-state-danger/20 text-state-danger
                   active:bg-state-danger/30 transition-colors"
      >
        반려
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md bg-bg-900 rounded-t-2xl p-6 space-y-4">
            <h3 className="text-text-strong text-base font-semibold">반려 확정</h3>

            <div>
              <label className="block text-text-secondary text-sm mb-2">반려 사유</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="반려 사유를 입력해주세요. 사용자에게 표시됩니다."
                className="input-field resize-none"
              />
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
                onClick={handleReject}
                disabled={isPending}
                className="flex-1 py-3.5 rounded-chip text-sm font-semibold
                           bg-state-danger/20 text-state-danger
                           active:bg-state-danger/30 transition-colors
                           disabled:opacity-40"
              >
                {isPending ? '처리 중...' : '반려 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
