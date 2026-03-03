'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  src: string
  src2?: string | null
}

export function PostImageViewer({ src, src2 }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 열림/닫힘 시 body 스크롤 잠금
  useEffect(() => {
    if (lightboxSrc) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxSrc])

  // ESC 키로 닫기
  useEffect(() => {
    if (!lightboxSrc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxSrc])

  const hasTwoImages = !!src2

  return (
    <>
      {hasTwoImages ? (
        /* ── 2장: 좌우 분할 그리드 ── */
        <div className="grid grid-cols-2 gap-1 mt-3 rounded-2xl overflow-hidden">
          {[src, src2].map((imgSrc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxSrc(imgSrc)}
              className="active:opacity-70 transition-opacity"
              aria-label={`이미지 ${i + 1} 크게 보기`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt=""
                className="w-full aspect-square object-cover opacity-80"
              />
            </button>
          ))}
        </div>
      ) : (
        /* ── 1장: 풀 너비 ── */
        <button
          type="button"
          onClick={() => setLightboxSrc(src)}
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
      )}

      {/* 라이트박스 오버레이 */}
      {mounted && lightboxSrc && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 뷰어"
          className="fixed inset-0 z-[300] flex items-center justify-center
                     bg-black/92 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="max-w-full max-h-[88vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
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

          {/* 2장일 때 좌우 전환 화살표 */}
          {hasTwoImages && (
            <>
              <button
                type="button"
                aria-label="이전 이미지"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxSrc((prev) => prev === src2 ? src : src2)
                }}
                className="absolute left-4 w-9 h-9 rounded-full
                           bg-white/10 hover:bg-white/20 active:bg-white/30
                           flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="다음 이미지"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxSrc((prev) => prev === src ? src2 : src)
                }}
                className="absolute right-4 w-9 h-9 rounded-full
                           bg-white/10 hover:bg-white/20 active:bg-white/30
                           flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
