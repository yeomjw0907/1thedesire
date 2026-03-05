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

const AVATAR_MAX_SIZE_MB = 15
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** 프로필 아바타: 서버에서 파일 업로드 + DB 반영 (세션 일관성 보장) */
export async function uploadProfileAvatar(formData: FormData): Promise<ApiResponse<{ avatar_url: string }>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }
  const file = formData.get('avatar') as File | null
  if (!file?.size) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '이미지를 선택해주세요' } }
  }
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return { success: false, data: null, error: { code: 'INVALID_TYPE', message: 'JPG, PNG, WEBP만 업로드할 수 있습니다.' } }
  }
  if (file.size > AVATAR_MAX_SIZE_MB * 1024 * 1024) {
    return { success: false, data: null, error: { code: 'TOO_LARGE', message: `파일 크기는 ${AVATAR_MAX_SIZE_MB}MB 이하여야 합니다.` } }
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadErr) {
    console.error('[uploadProfileAvatar] storage', uploadErr)
    return { success: false, data: null, error: { code: 'UPLOAD_FAILED', message: '이미지 업로드에 실패했습니다.' } }
  }
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // RLS 우회: 이미 auth.getUser()로 신원 확인 완료, admin 클라이언트로 확실히 반영
  const admin = createAdminClient()
  const { error: dbErr } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
  if (dbErr) {
    console.error('[uploadProfileAvatar] db', dbErr)
    await supabase.storage.from('avatars').remove([path])
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '프로필 이미지를 저장하는 데 실패했습니다.' } }
  }
  return { success: true, data: { avatar_url: publicUrl }, error: null }
}
