'use server'

/**
 * DM 상태 머신 서버 액션
 * 기준 문서: state-based-functional-spec-v0.1.md, api-contracts-v0.1.md
 *
 * 상태 전이:
 *   pending → agreed    (receiver 수락)
 *   pending → declined  (receiver 거절) + 45P 환불
 *   pending → expired   (cron, 24h 미응답) + 90P 환불
 *   pending → blocked   (any party 차단) + 환불 없음
 *   agreed  → blocked   (any party 차단) + 환불 없음
 *
 * 환불 중복 방지:
 *   .eq('status', 'pending') 조건으로 atomic update.
 *   update가 0 rows 영향 시 이미 처리된 것으로 간주, 환불 skip.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'
import { POINTS } from '@/types'

function err<T = never>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } }
}

// ──────────────────────────────────────────────────────────────
// 1. DM 요청 생성 (90P 차감, pending 생성)
// ──────────────────────────────────────────────────────────────
export async function sendDmRequest(
  receiverId: string
): Promise<ApiResponse<{ room_id: string }>> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  // 차단 관계 확인 (양방향)
  const { data: block } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${receiverId}),` +
      `and(blocker_id.eq.${receiverId},blocked_id.eq.${user.id})`
    )
    .maybeSingle()

  if (block) return err('BLOCKED_RELATIONSHIP', '이 사용자에게 요청할 수 없습니다')

  // RPC: 포인트 차감 + 채팅방 생성 + 로그를 하나의 트랜잭션으로
  const { data: roomId, error: rpcErr } = await admin.rpc('debit_points_and_create_room', {
    p_initiator_id: user.id,
    p_receiver_id: receiverId,
    p_cost: POINTS.DM_REQUEST_COST,
    p_expires_hours: 24,
  })

  if (rpcErr) {
    const msg = rpcErr.message ?? ''
    if (msg.includes('INSUFFICIENT_POINTS')) return err('INSUFFICIENT_POINTS', `포인트가 부족합니다. DM 요청에는 ${POINTS.DM_REQUEST_COST}P가 필요합니다`)
    if (msg.includes('ALREADY_PENDING')) return err('ALREADY_PENDING', '이미 대기 중인 요청이 있습니다')
    if (msg.includes('USER_NOT_FOUND')) return err('NOT_FOUND', '사용자를 찾을 수 없습니다')
    return err('DB_ERROR', 'DM 요청에 실패했습니다')
  }

  return { success: true, data: { room_id: roomId as string }, error: null }
}

// ──────────────────────────────────────────────────────────────
// 2. 수락 (pending → agreed)
// ──────────────────────────────────────────────────────────────
export async function acceptDmRequest(roomId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, initiator_id, receiver_id, status, request_expires_at')
    .eq('id', roomId)
    .single()

  if (!room) return err('NOT_FOUND', '요청을 찾을 수 없습니다')
  if (room.receiver_id !== user.id) return err('FORBIDDEN', '수신자만 수락할 수 있습니다')
  if (room.status !== 'pending') return err('INVALID_ROOM_STATE', '이미 처리된 요청입니다')
  if (new Date(room.request_expires_at) < new Date()) {
    return err('REQUEST_EXPIRED', '이미 만료된 요청입니다')
  }

  // 차단 관계 재확인
  const { data: block } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${room.initiator_id}),` +
      `and(blocker_id.eq.${room.initiator_id},blocked_id.eq.${user.id})`
    )
    .maybeSingle()

  if (block) return err('BLOCKED_RELATIONSHIP', '차단 관계로 수락할 수 없습니다')

  // Atomic 상태 전이: pending → agreed
  // .eq('status', 'pending') 조건 → 이미 변경된 row는 영향받지 않음 (환불 중복 방지와 동일 원리)
  const { data: updated } = await admin
    .from('chat_rooms')
    .update({
      status: 'agreed',
      agreed_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('status', 'pending')
    .select('id')

  if (!updated || updated.length === 0) {
    return err('INVALID_ROOM_STATE', '이미 처리된 요청입니다')
  }

  // consent_event 기록
  await admin.from('consent_events').insert({
    room_id: roomId,
    actor_id: user.id,
    event_type: 'agreement_accepted',
    metadata: {},
  })

  // 시스템 메시지 삽입
  await admin.from('messages').insert({
    room_id: roomId,
    sender_id: user.id,
    content: '대화가 시작되었습니다. 자유롭게 이야기를 나눠보세요.',
    message_type: 'system',
  })

  return { success: true, data: null, error: null }
}

// ──────────────────────────────────────────────────────────────
// 3. 거절 (pending → declined) + 45P 환불
//    핵심: .eq('status','pending') atomic update로 환불 중복 방지
// ──────────────────────────────────────────────────────────────
export async function declineDmRequest(roomId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const refundAmount = POINTS.DM_DECLINE_REFUND // 45P

  // RPC: 상태 전이 + 환불 + 로그를 하나의 트랜잭션으로
  const { data: result, error: rpcErr } = await admin.rpc('decline_and_refund', {
    p_room_id: roomId,
    p_actor_id: user.id,
    p_refund_amount: refundAmount,
  })

  if (rpcErr) {
    const msg = rpcErr.message ?? ''
    if (msg.includes('NOT_FOUND')) return err('NOT_FOUND', '요청을 찾을 수 없습니다')
    if (msg.includes('FORBIDDEN')) return err('FORBIDDEN', '수신자만 거절할 수 있습니다')
    return err('DB_ERROR', '거절 처리에 실패했습니다')
  }

  if (result === false) {
    return err('REFUND_ALREADY_APPLIED', '이미 처리된 요청입니다')
  }

  return { success: true, data: null, error: null }
}

// ──────────────────────────────────────────────────────────────
// 4. 채팅룸에서 차단 (pending/agreed → blocked, 환불 없음)
// ──────────────────────────────────────────────────────────────
export async function blockFromRoom(roomId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const admin = createAdminClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('UNAUTHORIZED', '로그인이 필요합니다')

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, initiator_id, receiver_id, status')
    .eq('id', roomId)
    .single()

  if (!room) return err('NOT_FOUND', '채팅방을 찾을 수 없습니다')

  const isParticipant = room.initiator_id === user.id || room.receiver_id === user.id
  if (!isParticipant) return err('FORBIDDEN', '권한이 없습니다')
  if (room.status === 'blocked') return err('ALREADY_PROCESSED', '이미 차단된 상태입니다')
  if (!['pending', 'agreed'].includes(room.status)) {
    return err('INVALID_ROOM_STATE', '이미 종료된 대화입니다')
  }

  const targetId = room.initiator_id === user.id ? room.receiver_id : room.initiator_id

  // Atomic 전이: pending 또는 agreed 상태만 blocked으로
  const { data: updated } = await admin
    .from('chat_rooms')
    .update({
      status: 'blocked',
      refund_amount: 0,
      refund_policy: 'blocked_no_refund',
      blocked_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .in('status', ['pending', 'agreed']) // 이미 종료된 room은 영향 안 받음
    .select('id')

  if (!updated || updated.length === 0) {
    return err('INVALID_ROOM_STATE', '이미 종료된 대화입니다')
  }

  // blocks 테이블 추가
  await supabase.from('blocks').upsert({
    blocker_id: user.id,
    blocked_id: targetId,
  })

  // consent_event 기록
  await admin.from('consent_events').insert({
    room_id: roomId,
    actor_id: user.id,
    event_type: 'blocked',
    metadata: { via: 'room_block' },
  })

  return { success: true, data: null, error: null }
}
