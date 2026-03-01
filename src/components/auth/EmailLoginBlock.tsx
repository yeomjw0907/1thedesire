'use client'

import { useState } from 'react'
import { EmailOtpForm } from './EmailOtpForm'
import { EmailPasswordForm } from './EmailPasswordForm'

/**
 * 이메일 로그인: 기본은 아이디(이메일)+비밀번호, "인증번호로 로그인" 클릭 시 OTP 폼 표시
 */
export function EmailLoginBlock() {
  const [useOtp, setUseOtp] = useState(false)

  return (
    <div className="space-y-3">
      {useOtp ? (
        <>
          <EmailOtpForm />
          <button
            type="button"
            onClick={() => setUseOtp(false)}
            className="w-full text-center text-text-muted text-xs underline hover:text-text-secondary"
          >
            이메일 · 비밀번호로 로그인
          </button>
        </>
      ) : (
        <>
          <EmailPasswordForm />
          <button
            type="button"
            onClick={() => setUseOtp(true)}
            className="w-full text-center text-text-muted text-xs underline hover:text-text-secondary"
          >
            인증번호로 로그인
          </button>
        </>
      )}
    </div>
  )
}