'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const eTrim = email.trim()
    if (!eTrim) {
      toast.error('이메일을 입력해 주세요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login/reset-password`
        : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(eTrim, { redirectTo })

    setLoading(false)
    if (error) {
      toast.error(error.message ?? '메일 발송에 실패했습니다.')
      return
    }
    setSent(true)
    toast.success('재설정 메일을 보냈습니다. 이메일을 확인해 주세요.')
  }

  if (sent) {
    return (
      <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h1 className="text-text-strong font-semibold text-lg mb-2">비밀번호 재설정</h1>
          <p className="text-text-secondary text-sm mb-6">
            입력한 이메일로 재설정 링크를 보냈습니다. 메일함을 확인한 뒤 링크를 클릭해 새 비밀번호를
            설정해 주세요.
          </p>
          <Link
            href="/login"
            className="text-desire-400 text-sm font-medium underline hover:text-desire-300"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-text-strong font-semibold text-lg mb-2">비밀번호 찾기</h1>
        <p className="text-text-muted text-sm mb-6">
          가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            disabled={loading}
            className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80 focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
            autoComplete="email"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? '발송 중...' : '재설정 메일 보내기'}
          </button>
        </form>
        <p className="text-center mt-6">
          <Link href="/login" className="text-text-muted text-xs underline hover:text-text-secondary">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  )
}
