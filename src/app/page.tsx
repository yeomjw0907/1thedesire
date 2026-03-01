import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

// 루트 진입점: 인증 상태에 따라 리디렉션
export default async function RootPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
  if (adminEmails.includes(user.email ?? '')) {
    redirect('/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/signup')
  }

  redirect('/home')
}
