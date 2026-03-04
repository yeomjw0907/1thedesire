'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

const BUCKET = 'avatars'
const MAX_SIZE_MB = 5
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const GALLERY_KEYS = ['gallery_url_1', 'gallery_url_2', 'gallery_url_3', 'gallery_url_4', 'gallery_url_5'] as const

function err<T = never>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } }
}

/** Public URL에서 storage object path 추출 (avatars 버킷) */
function pathFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

export type UploadProfileGalleryResult = ApiResponse<{ added: number; totalSlots: number }>

/**
 * 프로필 갤러리 이미지 업로드. 빈 슬롯 1번부터 순서대로 채움.
 * FormData 필드: 'gallery' (File 또는 multiple File)
 */
export async function uploadProfileGalleryImages(formData: FormData): Promise<UploadProfileGalleryResult> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const { data: profile } = await supabase
    .from('profiles')
    .select('gallery_url_1, gallery_url_2, gallery_url_3, gallery_url_4, gallery_url_5')
    .eq('id', user.id)
    .single()

  if (!profile) return err('NOT_FOUND', '프로필을 찾을 수 없습니다')

  const urls = [
    profile.gallery_url_1,
    profile.gallery_url_2,
    profile.gallery_url_3,
    profile.gallery_url_4,
    profile.gallery_url_5,
  ]
  const emptySlots: number[] = []
  urls.forEach((u, i) => { if (u == null || u === '') emptySlots.push(i + 1) })

  if (emptySlots.length === 0) return err('FULL', '갤러리가 가득 찼습니다. (최대 5장)')

  const files: File[] = []
  const raw = formData.getAll('gallery')
  for (const r of raw) {
    if (r instanceof File && r.size > 0) files.push(r)
  }
  if (files.length === 0) return err('INVALID_INPUT', '이미지를 선택해주세요.')

  const toProcess = files.slice(0, emptySlots.length)
  const updates: Record<string, string> = {}

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i]
    const slot = emptySlots[i]
    if (!ALLOWED_MIMES.includes(file.type)) {
      return err('INVALID_TYPE', 'JPG, PNG, WEBP만 업로드할 수 있습니다.')
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return err('TOO_LARGE', `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/gallery/${slot}.${ext}`

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
    if (uploadErr) {
      return err('UPLOAD_FAILED', '이미지 업로드에 실패했습니다.')
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    updates[GALLERY_KEYS[slot - 1]] = publicUrl
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (updateErr) return err('DB_ERROR', '저장에 실패했습니다.')

  return {
    success: true,
    data: { added: toProcess.length, totalSlots: 5 },
    error: null,
  }
}

/**
 * 프로필 갤러리 슬롯 삭제. 해당 슬롯을 비우고 뒤쪽 URL을 앞으로 당김.
 */
export async function deleteProfileGallerySlot(slotIndex: number): Promise<ApiResponse> {
  if (slotIndex < 1 || slotIndex > 5) return err('INVALID_SLOT', '잘못된 슬롯입니다.')

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('gallery_url_1, gallery_url_2, gallery_url_3, gallery_url_4, gallery_url_5')
    .eq('id', user.id)
    .single()

  if (fetchErr || !profile) return err('NOT_FOUND', '프로필을 찾을 수 없습니다.')

  const urls = [
    profile.gallery_url_1,
    profile.gallery_url_2,
    profile.gallery_url_3,
    profile.gallery_url_4,
    profile.gallery_url_5,
  ]

  const toRemovePath = urls[slotIndex - 1] ? pathFromPublicUrl(urls[slotIndex - 1]!) : null
  if (toRemovePath) {
    await supabase.storage.from(BUCKET).remove([toRemovePath])
  }

  const shifted = [...urls]
  for (let i = slotIndex - 1; i < 4; i++) {
    shifted[i] = shifted[i + 1] ?? null
  }
  shifted[4] = null

  const updatePayload = {
    gallery_url_1: shifted[0] ?? null,
    gallery_url_2: shifted[1] ?? null,
    gallery_url_3: shifted[2] ?? null,
    gallery_url_4: shifted[3] ?? null,
    gallery_url_5: shifted[4] ?? null,
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateErr) return err('DB_ERROR', '삭제 반영에 실패했습니다.')

  return { success: true, data: null, error: null }
}
