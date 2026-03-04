'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadProfileGalleryImages, deleteProfileGallerySlot } from '@/lib/actions/profileGallery'

const SLOT_COUNT = 5

interface Props {
  userId: string
  currentUrls: (string | null)[]
}

export function ProfileGalleryEditor({ userId: _userId, currentUrls }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmSlot, setConfirmSlot] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const urls = Array.from({ length: SLOT_COUNT }, (_, i) => currentUrls[i] ?? null)
  const emptyCount = urls.filter((u) => u == null || u === '').length
  const hasEmpty = emptyCount > 0

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setError(null)
    setUploading(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('gallery', files[i])
    }
    try {
      const result = await uploadProfileGalleryImages(formData)
      if (result.success && result.data) {
        router.refresh()
        if (result.data.added < files.length) {
          toast.info(`${result.data.added}장만 추가되었습니다. (최대 5장)`)
        } else {
          toast.success('갤러리에 추가되었습니다.')
        }
      } else {
        const msg = result.error?.message ?? '업로드에 실패했습니다.'
        setError(msg)
        toast.error(msg)
      }
    } catch {
      setError('업로드에 실패했습니다.')
      toast.error('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(slotIndex: number) {
    if (deletingSlot != null) return
    setConfirmSlot(null)
    setError(null)
    setDeletingSlot(slotIndex)
    try {
      const result = await deleteProfileGallerySlot(slotIndex)
      if (result.success) {
        router.refresh()
        toast.success('삭제되었습니다.')
      } else {
        const msg = result.error?.message ?? '삭제에 실패했습니다.'
        setError(msg)
        toast.error(msg)
      }
    } catch {
      setError('삭제에 실패했습니다.')
      toast.error('삭제에 실패했습니다.')
    } finally {
      setDeletingSlot(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-text-primary text-sm font-medium">프로필 갤러리</span>
        <span className="text-text-muted text-xs">최대 5장, 앞에서부터 채워집니다</span>
      </div>
      {error && (
        <p className="text-state-danger text-xs">{error}</p>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {urls.map((url, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-800 relative">
            {url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmSlot(i + 1) }}
                  disabled={deletingSlot != null}
                  aria-label={`${i + 1}번 이미지 삭제`}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80
                             flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full h-full flex flex-col items-center justify-center gap-1
                           bg-surface-700/80 hover:bg-surface-700 disabled:opacity-60 transition-colors
                           text-text-muted"
              >
                {uploading ? (
                  <span className="text-[10px]">업로드 중...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-[10px]">추가</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
      {hasEmpty && !uploading && (
        <p className="text-text-muted text-[11px]">
          빈 칸을 눌러 이미지를 추가하세요. 한 번에 여러 장 선택 가능합니다.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 삭제 확인 팝업 */}
      {mounted && confirmSlot != null && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-gallery-title"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setConfirmSlot(null)}
        >
          <div
            className="bg-surface-800 rounded-2xl shadow-xl max-w-[280px] w-full p-5 border border-surface-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-gallery-title" className="text-text-primary text-sm font-medium text-center mb-5">
              이미지를 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmSlot(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-text-secondary
                           bg-surface-700 hover:bg-surface-600 active:bg-surface-600 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmSlot)}
                disabled={deletingSlot != null}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white
                           bg-state-danger hover:opacity-90 active:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {deletingSlot != null ? '삭제 중...' : '예'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
