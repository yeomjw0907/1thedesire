'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailSignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

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
    if (!EMAIL_REGEX.test(eTrim)) {
      toast.error('올바른 이메일 형식을 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email: eTrim,
      password,
    })

    setLoading(false)

    if (err) {
      toast.error(err.message ?? '가입에 실패했습니다.')
      return
    }
    if (!data.user) {
      toast.error('가입에 실패했습니다.')
      return
    }

    if (data.user.identities?.length === 0) {
      toast.error('이미 가입된 이메일입니다. 로그인 페이지를 이용해 주세요.')
      return
    }

    if (data.session) {
      router.push('/signup')
    } else {
      setOtpSent(true)
      setResendCooldown(60)
    }
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
      email: email.trim(),
      token: code,
      type: 'signup',
    })

    setVerifyLoading(false)
    if (err) {
      toast.error(
        err.message === 'Token has expired' || err.message?.includes('expired')
          ? '인증번호가 만료되었습니다. 다시 받아 주세요.'
          : '인증번호가 올바르지 않습니다.'
      )
      return
    }
    if (!data.user) {
      toast.error('인증에 실패했습니다.')
      return
    }

    router.push('/signup')
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })

    setResending(false)
    if (err) {
      toast.error(err.message ?? '재발송에 실패했습니다.')
      return
    }
    toast.success('인증번호를 다시 보냈습니다.')
    setResendCooldown(60)
  }, [email, resendCooldown, resending])

  if (otpSent) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-trust-500/10 border border-trust-500/30 rounded-xl text-center">
          <p className="text-trust-400 text-sm font-medium mb-1">인증번호를 보냈습니다</p>
          <p className="text-text-secondary text-xs leading-relaxed">
            <span className="text-text-primary font-medium">{email}</span> 으로 발송된
            6자리 인증번호를 입력해 주세요.
          </p>
          <p className="text-text-muted text-xs mt-2">
            메일이 안 보이면 스팸함도 확인해 주세요.
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
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={resendCooldown > 0 || resending}
            onClick={handleResend}
            className="text-trust-400 text-xs font-medium hover:text-trust-300 disabled:text-text-muted disabled:cursor-not-allowed transition-colors"
          >
            {resending
              ? '발송 중...'
              : resendCooldown > 0
                ? `다시 보내기 (${resendCooldown}초)`
                : '인증번호 다시 보내기'}
          </button>
          <button
            type="button"
            onClick={() => { setOtpSent(false); setOtpCode(''); setEmail(''); setPassword('') }}
            className="text-text-muted text-xs underline hover:text-text-secondary"
          >
            다른 이메일로 가입하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
        placeholder="비밀번호 (6자 이상)"
        disabled={loading}
        className="input-field w-full py-3 rounded-chip text-base placeholder:text-text-muted/80
                   focus:ring-2 focus:ring-desire-500/30 disabled:opacity-50"
        autoComplete="new-password"
      />
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? '가입 중...' : '이메일로 가입하기'}
      </button>
    </form>
  )
}
