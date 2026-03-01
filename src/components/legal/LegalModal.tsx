'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

const modalArticleClass =
  'text-text-primary text-sm leading-relaxed [&_h1]:text-base [&_h1]:font-medium [&_h1]:mb-4 [&_h1]:text-text-strong [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-text-strong [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:mb-3'

type LegalModalProps = {
  title: string
  content: string
}

export function LegalModal({ title, content }: LegalModalProps) {
  const router = useRouter()

  const close = () => router.replace('/login')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className="bg-bg-900 border border-white/10 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-white/10">
          <h2 id="legal-modal-title" className="text-text-strong text-base font-medium">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-text-muted hover:text-text-primary p-2 -m-2 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <article className={modalArticleClass}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10"
        aria-label="닫기"
        onClick={close}
      />
    </div>
  )
}
