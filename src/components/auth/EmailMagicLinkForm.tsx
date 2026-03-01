'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

/**
 * 이메일 매직 링크 로그인 폼
 * signInWithOtp 후 이메일로 전송된 링크 클릭 시 /auth/confirm 으로 이동
 */
export function EmailMagicLinkForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) {
      setError('이메일을 입력해 주세요.')
      return
    }
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    setLoading(false)
    if (err) {
      setError(err.message === 'Email rate limit exceeded' ? '잠시 후 다시 시도해 주세요.' : '발송에 실패했습니다. 이메일 주소를 확인해 주세요.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="p-4 rounded-xl bg-state-success/10 border border-state-success/30">
        <p className="text-state-success text-sm text-center">
          로그인 링크를 이메일로 보냈습니다.<br />메일함을 확인해 주세요.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        disabled={loading}
        className="input-base w-full"
        autoComplete="email"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-secondary w-full"
      >
        {loading ? '보내는 중...' : '로그인 링크 받기'}
      </button>
      {error && (
        <p className="text-state-danger text-xs text-center">{error}</p>
      )}
    </form>
  )
}
