'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPost } from '@/lib/actions/posts'

const MAX_CHARS = 300
const TAGS_SEP = ' · '
const POST_TAG_OPTIONS = ['FWB', '감성 연애', '대화 위주', '만남 위주'] as const

export default function WritePostPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [imagePreview1, setImagePreview1] = useState<string | null>(null)
  const [imagePreview2, setImagePreview2] = useState<string | null>(null)
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const fileInputRef1 = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  function toggleTag(value: string) {
    setSelectedTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  function handleImage1Change(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('이미지는 5MB 이하만 가능합니다')
      e.target.value = ''
      return
    }
    setErrorMsg(null)
    setFile1(f)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview1(reader.result as string)
    reader.readAsDataURL(f)
  }

  function handleImage2Change(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('이미지는 5MB 이하만 가능합니다')
      e.target.value = ''
      return
    }
    setErrorMsg(null)
    setFile2(f)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview2(reader.result as string)
    reader.readAsDataURL(f)
  }

  function clearImage1() {
    setFile1(null)
    setFile2(null)
    setImagePreview1(null)
    setImagePreview2(null)
    if (fileInputRef1.current) fileInputRef1.current.value = ''
    if (fileInputRef2.current) fileInputRef2.current.value = ''
  }

  function clearImage2() {
    setFile2(null)
    setImagePreview2(null)
    if (fileInputRef2.current) fileInputRef2.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (content.trim().length < 2 || isPending) return
    setErrorMsg(null)

    const fd = new FormData()
    fd.append('content', content.trim())
    fd.append('tags', selectedTags.join(TAGS_SEP))
    if (file1) fd.append('image', file1)
    if (file2) fd.append('image_2', file2)

    startTransition(async () => {
      try {
        const result = await createPost(null, fd)
        if (result?.error) {
          setErrorMsg(result.error.message)
        } else {
          router.push('/home')
        }
      } catch {
        setErrorMsg('오류가 발생했습니다. 다시 시도해주세요.')
      }
    })
  }

  const imageCount = [imagePreview1, imagePreview2].filter(Boolean).length

  const canSubmit = content.trim().length >= 2 && !isPending
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
        <span className="text-text-strong text-base font-medium">글 작성하기</span>
        <button
          type="submit"
          form="write-post-form"
          disabled={!canSubmit}
          className="px-4 py-1.5 rounded-chip bg-desire-500 text-white text-sm font-semibold
                     disabled:opacity-40 active:bg-desire-400 transition-colors"
        >
          {isPending ? '게시 중...' : '게시'}
        </button>
      </header>

      <form id="write-post-form" className="flex flex-col flex-1" onSubmit={handleSubmit}>
        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="mx-4 mt-4 px-4 py-3 bg-state-danger/10 rounded-xl
                          text-state-danger text-sm border border-state-danger/20">
            {errorMsg}
          </div>
        )}

        {/* 텍스트 입력 */}
        <div className="flex-1 px-5 pt-5">
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="어떤 글을 작성하실건가요?"
            maxLength={MAX_CHARS}
            rows={10}
            className="w-full bg-transparent text-text-primary placeholder-text-muted
                       text-[15px] leading-7 resize-none focus:outline-none"
          />
        </div>

        {/* 이미지 미리보기 */}
        {imageCount > 0 && (
          <div className={`mx-4 mt-2 gap-1.5 ${imageCount === 2 ? 'grid grid-cols-2' : 'flex'}`}>
            {imagePreview1 && (
              <div className="relative rounded-2xl overflow-hidden flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview1}
                  alt="미리보기 1"
                  className="w-full max-h-64 object-cover opacity-80"
                />
                <button
                  type="button"
                  onClick={clearImage1}
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
            {imagePreview2 && (
              <div className="relative rounded-2xl overflow-hidden flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview2}
                  alt="미리보기 2"
                  className="w-full max-h-64 object-cover opacity-80"
                />
                <button
                  type="button"
                  onClick={clearImage2}
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
          </div>
        )}

        {/* 글 태그 (선택) */}
        <div className="px-5 pt-4 pb-2 border-t border-surface-700/50">
          <p className="text-text-muted text-xs font-medium mb-2">태그 (선택)</p>
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

        {/* 파일 입력 (hidden) x2 — label로 트리거되어야 하므로 id 필수 */}
        <input
          id="file-input-1"
          ref={fileInputRef1}
          type="file"
          name="image"
          accept="image/*"
          onChange={handleImage1Change}
          className="hidden"
        />
        <input
          id="file-input-2"
          ref={fileInputRef2}
          type="file"
          name="image_2"
          accept="image/*"
          onChange={handleImage2Change}
          className="hidden"
        />

        {/* 하단 툴바 */}
        <div className="flex items-center justify-between px-4 py-3 mt-4
                        border-t border-surface-700">
          <div className="flex items-center gap-3">
            {/* 1번째 사진 버튼 — label htmlFor 방식이 가장 안정적 */}
            <label
              htmlFor="file-input-1"
              className="flex items-center gap-1.5 text-text-muted text-sm
                         active:text-text-secondary transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>사진 {imageCount > 0 ? `(${imageCount}/2)` : ''}</span>
            </label>
            {/* 2번째 사진 추가 — 1장이 있을 때만 표시 */}
            {imagePreview1 && !imagePreview2 && (
              <label
                htmlFor="file-input-2"
                className="flex items-center gap-1 text-desire-400/80 text-xs
                           active:opacity-70 transition-opacity cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>추가</span>
              </label>
            )}
          </div>
          <span className={`text-xs tabular-nums ${
            nearLimit ? 'text-state-warning' : 'text-text-muted'
          }`}>
            {content.length} / {MAX_CHARS}
          </span>
        </div>

        {/* 게시글 작성 안내 */}
        <div className="px-5 pb-8 pt-2 space-y-3">
          <p className="text-text-muted text-[11px] font-semibold tracking-wide">게시글 작성 안내</p>
          <div className="space-y-1.5">
            <p className="text-text-muted text-[11px] font-medium">※ 불법촬영물 유통 금지</p>
            <p className="text-text-muted text-[11px] leading-relaxed">
              불법촬영물등을 게재할 경우 전기통신사업법에 따라 서비스 이용이 영구적으로 제한될 수 있으며 관련 법률에 따라 처벌됩니다.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-text-muted text-[11px] font-medium">※ 청소년 대상 범법행위 금지</p>
            <p className="text-text-muted text-[11px] leading-relaxed">
              청소년에 대한 착취, 성범죄, 자살 방조·동조, 약물 권유 등 각종 유해한 내용을 작성할 경우 관련 법률에 따라 처벌됩니다.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-text-muted text-[11px] font-medium">※ 음란물 유포 금지</p>
            <p className="text-text-muted text-[11px] leading-relaxed">
              이곳은 공개 게시판으로, 음란물을 게시할 경우 통신매체이용음란죄로 처벌받을 수 있습니다.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-text-muted text-[11px] font-medium">※ 기타 방통위 심의규정을 벗어난 게시글 금지</p>
            <p className="text-text-muted text-[11px] leading-relaxed">
              욕망백서는 방송통신위원회의 심의규정을 준수합니다. 이를 어기는 미디어를 게시할 경우 이용이 제한됩니다.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
