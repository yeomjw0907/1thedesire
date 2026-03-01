'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function createPost(
  _prevState: ApiResponse | null,
  formData: FormData
): Promise<ApiResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const content = (formData.get('content') as string | null)?.trim() ?? ''
  const tagsRaw = (formData.get('tags') as string | null)?.trim() ?? ''
  const tags = tagsRaw.length > 0 ? tagsRaw.slice(0, 100) : null
  const imageFile = formData.get('image') as File | null

  if (content.length < 2) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '2자 이상 입력해주세요' } }
  }
  if (content.length > 300) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '300자를 초과할 수 없습니다' } }
  }

  let image_url: string | null = null

  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { success: false, data: null, error: { code: 'VALIDATION', message: '이미지는 5MB 이하만 가능합니다' } }
    }
    const ext = imageFile.name.split('.').pop() ?? 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, imageFile, { upsert: false })

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(uploadData.path)
      image_url = urlData.publicUrl
    }
    // 업로드 실패 시 이미지 없이 게시글 생성 진행
  }

  const { error: insertError } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content,
      image_url,
      tags,
      is_auto_generated: false,
      status: 'published',
    })

  if (insertError) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '게시글 작성에 실패했습니다' } }
  }

  redirect('/home')
}

export async function deletePost(postId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { error } = await supabase
    .from('posts')
    .update({ status: 'deleted' })
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '삭제에 실패했습니다' } }
  }

  return { success: true, data: null, error: null }
}
