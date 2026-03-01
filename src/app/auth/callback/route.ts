import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** OAuth 콜백 후 리다이렉트 허용 경로 (오픈 리다이렉트 방지) */
const ALLOWED_NEXT_PATHS = ['/home', '/profile', '/dm', '/points', '/search', '/signup'] as const

function getAllowedNext(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return '/home'
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/home'
  if ((ALLOWED_NEXT_PATHS as readonly string[]).includes(normalized)) {
    return normalized
  }
  return '/home'
}

/**
 * OAuth 콜백 핸들러
 * Google OAuth 완료 후 Supabase가 이 경로로 리디렉션
 *
 * 처리:
 * 1. code를 세션으로 교환
 * 2. 프로필 존재 여부 확인
 *    - 신규 사용자 → /signup (가입 폼)
 *    - 기존 사용자 → /home 또는 허용된 next 경로
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getAllowedNext(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createServerClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !sessionData.user) {
    console.error('[auth/callback] 세션 교환 실패:', sessionError)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // 신규 vs 기존 사용자 구분
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', sessionData.user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.redirect(`${origin}/signup`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
