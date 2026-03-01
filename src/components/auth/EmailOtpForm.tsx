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

/**
 * 이메일 OTP 로그인
 * signInWithOtp → 이메일로 6자리 코드 발송 → verifyOtp 후 세션 생성
 */
export function EmailOtpForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  const localPart = email.includes('@') ? email.slice(0, email.indexOf('@')) : email
  const localTrimmed = localPart.trim()
  const showDomainSuggestions = localTrimmed.length > 0 && !email.includes('@')

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value) {
      toast.error('이메일을 입력해 주세요.')
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: value,
    })

    setLoading(false)
    if (err) {
      toast.error(
        err.message === 'Email rate limit exceeded'
          ? '잠시 후 다시 시도해 주세요.'
          : '발송에 실패했습니다. 이메일 주소를 확인해 주세요.'
      )
      return
    }
    setSentEmail(value)
    setSent(true)
    toast.success('인증번호를 이메일로 보냈습니다.')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otpCode.trim().replace(/\s/g, '')
    if (!code) {
      toast.error('인증번호를 입력해 주세요.')
      return
    }
    setVerifyLoading(true)

    const supabase = createClient()
    const { data, error: err } = await supabase.auth.verifyOtp({
      email: sentEmail,
      token: code,
      type: 'email',
    })

    setVerifyLoading(false)
    if (err) {
      toast.error(
        err.message === 'Token has expired' || err.message?.includes('expired')
          ? '인증번호가 만료되었습니다. 다시 받아 주세요.'
          : '인증번호가 맞지 않습니다.'
      )
      return
    }
    if (!data.user) {
      toast.error('인증에 실패했습니다.')
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

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-state-success/10 border border-state-success/30">
          <p className="text-state-success text-sm text-center">
            이메일로 인증번호를 보냈어요.<br />아래에 6자리 번호를 입력하세요.
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            disabled={verifyLoading}
            className="input-field w-full py-4 rounded-chip text-center text-lg tracking-[0.4em] font-medium
                       placeholder:text-text-muted/60
                       focus:ring-2 focus:ring-desire-500/30
                       disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={verifyLoading || otpCode.trim().length < 6}
            className="btn-primary w-full"
          >
            {verifyLoading ? '확인 중...' : '인증하기'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-3">
      <p className="text-text-secondary text-sm font-medium">이메일로 로그인</p>
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소 (예: you@gmail.com)"
          disabled={loading}
          className="input-field w-full py-4 rounded-chip text-base
                     placeholder:text-text-muted/80
                     focus:ring-2 focus:ring-desire-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
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
      <button
        type="submit"
        disabled={loading}
        className="btn-secondary w-full"
      >
        {loading ? '보내는 중...' : '인증번호 받기'}
      </button>
    </form>
  )
}
