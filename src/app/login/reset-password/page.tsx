'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/**
 * 비밀번호 재설정 메일 링크 도착 후: 새 비밀번호 입력
 * URL hash에 access_token, type=recovery 등이 담겨 옴
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
      if (!session) {
        toast.error('재설정 링크가 만료되었거나 잘못되었습니다. 비밀번호 찾기를 다시 시도해 주세요.')
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (password !== confirm) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      toast.error(error.message ?? '비밀번호 변경에 실패했습니다.')
      return
    }
    toast.success('비밀번호가 변경되었습니다. 로그인해 주세요.')
    router.push('/login')
  }

  if (!ready) {
    return (
      <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <p className="text-text-muted text-sm mb-4">
            재설정 링크가 만료되었거나 잘못되었습니다.
          </p>
          <Link
            href="/login/forgot-password"
            className="text-desire-400 text-sm font-medium underline hover:text-desire-300"
          >
            비밀번호 찾기 다시 하기
          </Link>
          <Link href="/login" className="text-text-muted text-sm underline mt-3 inline-block">
            로그인으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen px-6 pt-20 pb-10">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h1 className="text-text-strong font-semibold text-lg mb-2">새 비밀번호 설정</h1>
        <p className="text-text-muted text-sm mb-6">사용할 새 비밀번호를 입력해 주세요.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            disabled={loading}
            minLength={6}
            className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80
                       focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            disabled={loading}
            minLength={6}
            className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80
                       focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
        <p className="text-center mt-6">
          <Link
            href="/login"
            className="text-text-muted text-xs underline hover:text-text-secondary"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </main>
  )
}
