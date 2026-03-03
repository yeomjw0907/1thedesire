import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function assertSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim()) {
    throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!key?.trim()) {
    throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return { url, key }
}

export async function createServerClient() {
  const { url, key } = assertSupabaseEnv()
  const cookieStore = await cookies()

  return createSSRServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 쓰기 불가 - 무시
          }
        },
      },
    }
  )
}
