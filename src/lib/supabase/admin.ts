import { createClient } from '@supabase/supabase-js'

// service_role 클라이언트: RLS 우회, 서버 액션에서만 사용
// 포인트 차감 + 채팅방 생성 등 원자적 처리가 필요한 경우에 사용
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
