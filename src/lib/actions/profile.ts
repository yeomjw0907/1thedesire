'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { REGIONS } from '@/lib/constants/signup'
import type { ApiResponse } from '@/types'

export async function withdrawAccount(): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      nickname: null,
      bio: null,
      avatar_url: null,
      gallery_url_1: null,
      gallery_url_2: null,
      gallery_url_3: null,
      gallery_url_4: null,
      gallery_url_5: null,
      role: null,
      withdrawn_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '탈퇴 처리에 실패했습니다' } }
  }

  try {
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(user.id)
  } catch {
    // 이미 삭제된 사용자 등은 무시하고 redirect
  }

  redirect('/login')
}

export async function updateProfile(
  _prev: ApiResponse | null,
  formData: FormData
): Promise<ApiResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const nickname = (formData.get('nickname') as string)?.trim()
  const region = formData.get('region') as string
  const role = (formData.get('role') as string)?.trim()
  const bio = (formData.get('bio') as string)?.trim()

  // 유효성 검사
  if (!nickname || nickname.length < 2 || nickname.length > 20) {
    return { success: false, data: null, error: { code: 'INVALID_NICKNAME', message: '닉네임은 2~20자 사이여야 합니다' } }
  }
  if (!region || !(REGIONS as readonly string[]).includes(region)) {
    return { success: false, data: null, error: { code: 'INVALID_REGION', message: '올바른 지역을 선택해주세요' } }
  }
  if (!role || !['Dom', 'Sub', 'Switch'].includes(role)) {
    return { success: false, data: null, error: { code: 'INVALID_ROLE', message: '성향을 선택해 주세요.' } }
  }
  if (!bio || bio.length > 300) {
    return { success: false, data: null, error: { code: 'INVALID_BIO', message: '자기소개는 300자 이내로 입력해주세요' } }
  }

  // 닉네임 중복 체크 (본인 제외)
  const { data: dup } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .neq('id', user.id)
    .maybeSingle()

  if (dup) {
    return { success: false, data: null, error: { code: 'NICKNAME_TAKEN', message: '이미 사용 중인 닉네임입니다' } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ nickname, region, role, bio })
    .eq('id', user.id)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '프로필 수정에 실패했습니다' } }
  }

  redirect('/profile')
}
