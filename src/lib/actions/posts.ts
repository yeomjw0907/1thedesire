'use server'

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
  const imageFile2 = formData.get('image_2') as File | null

  if (content.length < 2) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '2자 이상 입력해주세요' } }
  }
  if (content.length > 300) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '300자를 초과할 수 없습니다' } }
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (!file || file.size === 0) return null
    if (file.size > 5 * 1024 * 1024) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, file, { upsert: false })
    if (uploadError || !uploadData) return null
    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(uploadData.path)
    return urlData.publicUrl
  }

  if (imageFile && imageFile.size > 0 && imageFile.size > 5 * 1024 * 1024) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '이미지는 5MB 이하만 가능합니다' } }
  }
  if (imageFile2 && imageFile2.size > 0 && imageFile2.size > 5 * 1024 * 1024) {
    return { success: false, data: null, error: { code: 'VALIDATION', message: '이미지는 5MB 이하만 가능합니다' } }
  }

  const image_url = imageFile ? await uploadImage(imageFile) : null
  const image_url_2 = imageFile2 ? await uploadImage(imageFile2) : null

  const { error: insertError } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content,
      image_url,
      image_url_2,
      tags,
      is_auto_generated: false,
      status: 'published',
    })

  if (insertError) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '게시글 작성에 실패했습니다' } }
  }

  return { success: true, data: null, error: null }
}

export async function toggleLike(postId: string): Promise<ApiResponse<{ liked: boolean }>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { data, error } = await supabase.rpc('toggle_post_like', {
    p_post_id: postId,
    p_user_id: user.id,
  })

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '좋아요 처리에 실패했습니다' } }
  }

  return { success: true, data: data as { liked: boolean }, error: null }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<ApiResponse> {
  if (notificationIds.length === 0) return { success: true, data: null, error: null }
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .in('id', notificationIds)
  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '읽음 처리에 실패했습니다' } }
  }
  return { success: true, data: null, error: null }
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

const MY_POST_SELECT = 'id, content, image_url, image_url_2, like_count, created_at'
const MY_POST_LIMIT = 6

export type MyPostRow = {
  id: string
  content: string | null
  image_url: string | null
  image_url_2: string | null
  like_count: number | null
  created_at: string
}

export async function getMyPosts(offset: number): Promise<
  ApiResponse<{ posts: MyPostRow[]; hasMore: boolean }>
> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { data: posts, error } = await supabase
    .from('posts')
    .select(MY_POST_SELECT)
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + MY_POST_LIMIT - 1)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '글 목록을 불러오지 못했습니다' } }
  }

  const hasMore = (posts?.length ?? 0) === MY_POST_LIMIT
  return { success: true, data: { posts: posts ?? [], hasMore }, error: null }
}
