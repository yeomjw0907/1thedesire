'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { createPost } from '@/lib/actions/posts'
import type { ApiResponse } from '@/types'

const MAX_CHARS = 300
const TAGS_SEP = ' · '
const POST_TAG_OPTIONS = ['FWB', '감성 연애', '대화 위주', '만남 위주'] as const

export default function WritePostPage() {
  const [state, action, isPending] = useActionState<ApiResponse | null, FormData>(
    createPost,
    null
  )
  const [content, setContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleTag(value: string) {
    setSelectedTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canSubmit = content.trim().length >= 10 && !isPending
  const nearLimit = content.length > MAX_CHARS * 0.85

  return (
    <div className="flex flex-col min-h-screen bg-bg-900">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3
                         border-b border-surface-700 bg-bg-900 sticky top-0 z-10">
        <Link
          href="/home"
          className="p-2 -ml-2 text-text-secondary active:text-text-primary transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className="text-text-strong text-base font-medium">분위기 남기기</span>
        <button
          form="write-form"
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-1.5 rounded-chip bg-desire-500 text-white text-sm font-semibold
                     disabled:opacity-40 active:bg-desire-400 transition-colors"
        >
          {isPending ? '게시 중...' : '게시'}
        </button>
      </header>

      <form id="write-form" action={action} className="flex flex-col flex-1">
        {/* 에러 메시지 */}
        {state?.error && (
          <div className="mx-4 mt-4 px-4 py-3 bg-state-danger/10 rounded-xl
                          text-state-danger text-sm border border-state-danger/20">
            {state.error.message}
          </div>
        )}

        {/* 텍스트 입력 */}
        <div className="flex-1 px-5 pt-5">
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="대화를 시작하기 전에 보여주고 싶은 분위기를 적어보세요"
            maxLength={MAX_CHARS}
            rows={10}
            className="w-full bg-transparent text-text-primary placeholder-text-muted
                       text-[15px] leading-7 resize-none focus:outline-none"
          />
        </div>

        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div className="relative mx-4 mt-2 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="미리보기"
              className="w-full max-h-64 object-cover opacity-80"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-bg-900/80
                         flex items-center justify-center text-text-primary active:opacity-70"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* 글 태그 (선택) */}
        <div className="px-5 pt-4 pb-2 border-t border-surface-700/50">
          <p className="text-text-muted text-xs font-medium mb-2">이 글의 맥락 (선택)</p>
          <div className="flex flex-wrap gap-2">
            {POST_TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`min-h-[40px] px-3 py-2 rounded-chip text-xs font-medium transition-colors
                  ${selectedTags.includes(tag)
                    ? 'bg-desire-500/20 text-desire-400 border border-desire-500/40'
                    : 'bg-surface-700 text-text-secondary border border-transparent hover:bg-surface-750'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <input type="hidden" name="tags" value={selectedTags.join(TAGS_SEP)} />
        </div>

        {/* 파일 입력 (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* 하단 툴바 */}
        <div className="flex items-center justify-between px-4 py-3 mt-4
                        border-t border-surface-700">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-text-muted text-sm
                       active:text-text-secondary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>사진 {imagePreview ? '(1)' : ''}</span>
          </button>
          <span className={`text-xs tabular-nums ${
            nearLimit ? 'text-state-warning' : 'text-text-muted'
          }`}
            style={{ fontFamily: 'Montserrat, monospace' }}>
            {content.length} / {MAX_CHARS}
          </span>
        </div>
      </form>
    </div>
  )
}
