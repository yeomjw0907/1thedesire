import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function PrivacyPage() {
  const filePath = path.join(process.cwd(), 'docs', 'legal', 'privacy-policy-v0.1.md')
  const content = fs.readFileSync(filePath, 'utf-8')

  return (
    <main className="min-h-screen px-6 pt-16 pb-20">
      <div className="mx-auto max-w-prose">
        <Link
          href="/login"
          className="text-text-muted text-sm hover:text-text-primary mb-6 inline-block"
        >
          ← 로그인으로
        </Link>
        <article className="legal-content text-text-primary text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:text-text-strong [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-text-strong [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:mb-3">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </main>
  )
}
