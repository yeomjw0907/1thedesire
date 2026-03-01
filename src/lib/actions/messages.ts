'use server'

/**
 * 메시지 서버 액션
 * 기준 문서: state-based-functional-spec-v0.1.md, api-contracts-v0.1.md
 *
 * 규칙:
 *   - agreed 상태 room만 메시지 전송 가능
 *   - 참여자(initiator/receiver)만 전송 가능
 *   - 차단 관계 시 전송 불가
 *   - soft delete: message_status = 'deleted'
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'

function err<T = never>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } }
}

// ──────────────────────────────────────────────────────────────
// 1. 메시지 전송
// ──────────────────────────────────────────────────────────────
export async function sendMessage(
  roomId: string,
  content: string
): Promise<ApiResponse<{ message_id: string }>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 1) return err('INVALID_CONTENT', '메시지를 입력해주세요')
  if (trimmed.length > 1000) return err('CONTENT_TOO_LONG', '메시지는 1000자 이내로 입력해주세요')

  // 채팅방 확인
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, initiator_id, receiver_id, status')
    .eq('id', roomId)
    .single()

  if (!room) return err('NOT_FOUND', '채팅방을 찾을 수 없습니다')

  const isParticipant = room.initiator_id === user.id || room.receiver_id === user.id
  if (!isParticipant) return err('FORBIDDEN', '권한이 없습니다')

  if (room.status !== 'agreed') {
    // 'declined': 현재 제품에서 신규 생성 불가 (DM 거절 기능 제거).
    // 과거 DB 레코드에서 읽힐 수 있으므로 사용자 노출 문구만 방어 처리.
    const statusMessages: Record<string, string> = {
      pending: '상대방이 아직 수락하지 않았습니다',
      declined: '종료된 요청입니다', // legacy DB record only — 새 코드에서 이 분기 진입 불가
      expired: '만료된 요청입니다',
      blocked: '차단된 채팅방입니다',
    }
    return err('ROOM_NOT_AGREED', statusMessages[room.status] ?? '메시지를 보낼 수 없습니다')
  }

  // 차단 관계 확인
  const otherId = room.initiator_id === user.id ? room.receiver_id : room.initiator_id
  const { data: block } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),` +
      `and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`
    )
    .maybeSingle()

  if (block) return err('BLOCKED_RELATIONSHIP', '차단 관계로 메시지를 보낼 수 없습니다')

  // 메시지 INSERT
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: user.id,
      content: trimmed,
      message_type: 'text',
    })
    .select('id')
    .single()

  if (msgErr || !message) return err('DB_ERROR', '메시지 전송에 실패했습니다')

  return { success: true, data: { message_id: message.id }, error: null }
}

// ──────────────────────────────────────────────────────────────
// 2. 메시지 삭제 (soft delete)
// ──────────────────────────────────────────────────────────────
export async function deleteMessage(messageId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  // 본인 메시지만 삭제 가능
  const { data: message } = await supabase
    .from('messages')
    .select('id, sender_id, message_status')
    .eq('id', messageId)
    .single()

  if (!message) return err('NOT_FOUND', '메시지를 찾을 수 없습니다')
  if (message.sender_id !== user.id) return err('FORBIDDEN', '본인 메시지만 삭제할 수 있습니다')
  if (message.message_status === 'deleted') return err('ALREADY_DELETED', '이미 삭제된 메시지입니다')

  await admin
    .from('messages')
    .update({
      message_status: 'deleted',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)

  return { success: true, data: null, error: null }
}
