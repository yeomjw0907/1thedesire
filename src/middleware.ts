import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 미들웨어: 세션 유지 + 라우팅 보호
 *
 * 라우팅 규칙:
 * - 비인증 → /login 으로 이동
 * - 인증 + 프로필 없음 → /signup 으로 이동
 * - 인증 + 프로필 있음 + /login 접근 → /home 으로 이동
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const pathname = request.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 (중요: getUser()를 반드시 호출해야 토큰 자동 갱신됨)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // OAuth 콜백·매직 링크 확인은 항상 통과 (해시는 클라이언트에서만 처리)
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/confirm')) {
    return supabaseResponse
  }

  // 비인증 사용자
  if (!user) {
    if (pathname === '/login') return supabaseResponse

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 인증된 사용자가 /login 에 접근하면 홈으로
  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // /signup, /signup/complete 는 프로필 없는 상태에서 접근 허용
  if (pathname.startsWith('/signup')) {
    return supabaseResponse
  }

  // 그 외 메인 페이지 접근 시 프로필 존재 여부 확인
  // 프로필이 없으면 가입 페이지로
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const url = request.nextUrl.clone()
    url.pathname = '/signup'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
