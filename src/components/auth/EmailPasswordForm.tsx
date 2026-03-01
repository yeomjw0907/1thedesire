'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

const EMAIL_DOMAINS = [
  '@gmail.com',
  '@naver.com',
  '@kakao.com',
  '@daum.net',
  '@hanmail.net',
  '@nate.com',
  '@yahoo.com',
  '@outlook.com',
  '@hotmail.com',
] as const

export function EmailPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const localPart = email.includes('@') ? email.slice(0, email.indexOf('@')) : email
  const localTrimmed = localPart.trim()
  const showDomainSuggestions = localTrimmed.length > 0 && !email.includes('@')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const eTrim = email.trim()
    if (!eTrim) {
      toast.error('이메일을 입력해 주세요.')
      return
    }
    if (!password) {
      toast.error('비밀번호를 입력해 주세요.')
      return
    }
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
        ? '이메일 인증이 완료되지 않았습니다. 인증번호로 로그인해 주세요.'
        : isInvalid
          ? '이메일 또는 비밀번호가 맞지 않습니다.'
          : err.message ?? '로그인에 실패했습니다.'
      toast.error(msg)
      return
    }
    if (!data.user) {
      toast.error('로그인에 실패했습니다.')
      return
    }

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
    if (adminEmails.includes(eTrim)) {
      router.push('/admin')
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
      <div className="relative">
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
        {showDomainSuggestions && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50
                       scrollbar-thin max-h-44 overflow-y-auto overflow-x-hidden
                       rounded-xl border border-surface-700 bg-surface-750/95
                       shadow-lg backdrop-blur-sm"
          >
            <ul className="py-1">
              {EMAIL_DOMAINS.map((domain, i) => {
                const fullEmail = `${localTrimmed}${domain}`
                const isFirst = i === 0
                const isLast = i === EMAIL_DOMAINS.length - 1
                return (
                  <li key={domain}>
                    <button
                      type="button"
                      onClick={() => setEmail(fullEmail)}
                      className={`w-full px-4 py-3 text-left text-sm text-text-primary
                                  hover:bg-surface-700/60 active:bg-surface-700
                                  transition-colors duration-150
                                  ${isFirst ? 'rounded-t-[10px]' : ''}
                                  ${isLast ? 'rounded-b-[10px]' : ''}`}
                    >
                      {fullEmail}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
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
    </form>
  )
}
