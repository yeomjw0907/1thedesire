'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * 이메일(아이디) + 비밀번호 로그인
 * 매번 인증번호 받지 않고 바로 로그인
 */
export function EmailPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const eTrim = email.trim()
    if (!eTrim) {
      setError('이메일을 입력해 주세요.')
      return
    }
    if (!password) {
      setError('비밀번호를 입력해 주세요.')
      return
    }
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: eTrim,
      password,
    })

    setLoading(false)
    if (err) {
      const isInvalid =
        err.message?.includes('Invalid login') || err.message?.includes('invalid')
      const isNotConfirmed = err.message?.includes('Email not confirmed')
      const msg = isNotConfirmed
        ? '이메일 인증이 완료되지 않았습니다. 메일함에서 인증 링크를 클릭해 주세요.'
        : isInvalid
          ? '이메일 또는 비밀번호가 맞지 않습니다.'
          : err.message ?? '로그인에 실패했습니다.'
      setError(msg)
      return
    }
    if (!data.user) {
      setError('로그인에 실패했습니다.')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profile) {
      router.push('/home')
    } else {
      router.push('/signup')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-text-secondary text-sm font-medium">또는 이메일로 로그인</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        disabled={loading}
        className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80
                   focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
        autoComplete="email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        disabled={loading}
        className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80
                   focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      {error && (
        <p className="text-state-danger text-xs text-center">{error}</p>
      )}
    </form>
  )
}
