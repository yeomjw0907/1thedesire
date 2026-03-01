'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * 매직 링크 클릭 후 리다이렉트 대상
 * URL 해시(#access_token=...&refresh_token=...)를 파싱해 세션 설정 후 /signup 또는 /home 으로 이동
 */
export default function AuthConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash?.slice(1)
      if (!hash) {
        router.replace('/login?error=auth_failed')
        return
      }

      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (!access_token || !refresh_token) {
        router.replace('/login?error=auth_failed')
        return
      }

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })

      if (sessionError) {
        router.replace('/login?error=auth_failed')
        return
      }

      // URL에서 해시 제거 (보안)
      window.history.replaceState(null, '', window.location.pathname + window.location.search)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login?error=auth_failed')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      setStatus('ok')
      if (profile) {
        router.replace('/home')
      } else {
        router.replace('/signup')
      }
    }

    run()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-text-secondary text-sm">
        {status === 'loading' && '로그인 처리 중...'}
        {status === 'ok' && '이동 중...'}
        {status === 'error' && '오류가 발생했습니다.'}
      </p>
    </main>
  )
}
