'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function PostImageViewer({ src }: { src: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 열림/닫힘 시 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* 썸네일 — 클릭하면 라이트박스 열림 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mt-3 block active:opacity-70 transition-opacity"
        aria-label="이미지 크게 보기"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="w-full max-h-52 object-cover rounded-2xl opacity-80"
        />
      </button>

      {/* 라이트박스 오버레이 */}
      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 뷰어"
          className="fixed inset-0 z-[300] flex items-center justify-center
                     bg-black/92 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* 풀사이즈 이미지 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-w-full max-h-[88vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute top-5 right-5 w-9 h-9 rounded-full
                       bg-white/10 hover:bg-white/20 active:bg-white/30
                       flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
