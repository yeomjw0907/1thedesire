'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const SLOT_COUNT = 5

interface Props {
  urls: (string | null)[]
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [error, setError] = useState(false)
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-surface-700 text-text-muted ${className}`}>
        <span className="text-[10px]">오류</span>
      </div>
    )
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  )
}

export function ProfileGallery({ urls }: Props) {
  const normalized = Array.from({ length: SLOT_COUNT }, (_, i) => urls[i] ?? null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (lightboxIndex != null) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxIndex])

  useEffect(() => {
    if (lightboxIndex == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      const filled = normalized.filter(Boolean) as string[]
      if (filled.length === 0) return
      if (e.key === 'ArrowLeft') {
        const idx = filled.indexOf(normalized[lightboxIndex] ?? '')
        setLightboxIndex(idx <= 0 ? null : normalized.indexOf(filled[idx - 1]))
      }
      if (e.key === 'ArrowRight') {
        const idx = filled.indexOf(normalized[lightboxIndex] ?? '')
        if (idx >= 0 && idx < filled.length - 1) setLightboxIndex(normalized.indexOf(filled[idx + 1]))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, normalized])

  const filledUrls = normalized.filter(Boolean) as string[]
  const currentSrc = lightboxIndex != null ? normalized[lightboxIndex] : null

  return (
    <>
      <div className="grid grid-cols-5 gap-1.5">
        {normalized.map((url, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-800">
            {url ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="w-full h-full block active:opacity-80 transition-opacity"
                aria-label={`갤러리 이미지 ${i + 1} 크게 보기`}
              >
                <ImageWithFallback
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div
                className="w-full h-full bg-surface-700/50 rounded-xl border border-dashed border-surface-600"
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>

      {mounted && currentSrc && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="갤러리 이미지"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/92 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSrc}
            alt=""
            className="max-w-full max-h-[88vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
            onError={() => setLightboxIndex(null)}
          />

          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="닫기"
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {filledUrls.length > 1 && (
            <>
              <button
                type="button"
                aria-label="이전 이미지"
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = filledUrls.indexOf(currentSrc)
                  if (idx > 0) setLightboxIndex(normalized.indexOf(filledUrls[idx - 1]))
                }}
                className="absolute left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="다음 이미지"
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = filledUrls.indexOf(currentSrc)
                  if (idx >= 0 && idx < filledUrls.length - 1) setLightboxIndex(normalized.indexOf(filledUrls[idx + 1]))
                }}
                className="absolute right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
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
