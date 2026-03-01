'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'

export async function reportUser(
  targetUserId: string,
  reason: string
): Promise<ApiResponse> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_user_id: targetUserId,
      reason,
    })

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '신고 접수에 실패했습니다' } }
  }

  return { success: true, data: null, error: null }
}

export async function blockUser(targetUserId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  // blocks 테이블에 추가
  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: user.id, blocked_id: targetUserId })

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '차단에 실패했습니다' } }
  }

  // 해당 사용자와의 active rooms(pending/agreed) → blocked 전이 (환불 없음)
  const { data: activeRooms } = await supabase
    .from('chat_rooms')
    .select('id')
    .in('status', ['pending', 'agreed'])
    .or(
      `and(initiator_id.eq.${user.id},receiver_id.eq.${targetUserId}),` +
      `and(initiator_id.eq.${targetUserId},receiver_id.eq.${user.id})`
    )

  if (activeRooms && activeRooms.length > 0) {
    const roomIds = activeRooms.map((r) => r.id)
    await admin
      .from('chat_rooms')
      .update({
        status: 'blocked',
        refund_amount: 0,
        refund_policy: 'blocked_no_refund',
        blocked_at: new Date().toISOString(),
      })
      .in('id', roomIds)
      .in('status', ['pending', 'agreed'])

    // consent_events 기록
    const events = roomIds.map((room_id) => ({
      room_id,
      actor_id: user.id,
      event_type: 'blocked',
      metadata: { via: 'profile_block' },
    }))
    await admin.from('consent_events').insert(events)
  }

  return { success: true, data: null, error: null }
}
