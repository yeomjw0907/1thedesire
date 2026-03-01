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

  // 포인트 확인
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single()

  if (!myProfile || myProfile.points < POINTS.DM_REQUEST_COST) {
    return err(
      'INSUFFICIENT_POINTS',
      `포인트가 부족합니다. DM 요청에는 ${POINTS.DM_REQUEST_COST}P가 필요합니다`
    )
  }

  // 이미 pending인 요청 확인 (중복 방지)
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('initiator_id', user.id)
    .eq('receiver_id', receiverId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return err('ALREADY_PENDING', '이미 대기 중인 요청이 있습니다')

  const newBalance = myProfile.points - POINTS.DM_REQUEST_COST

  // 포인트 차감 (profiles.update은 authenticated user 가능)
  const { error: ptErr } = await supabase
    .from('profiles')
    .update({ points: newBalance })
    .eq('id', user.id)

  if (ptErr) return err('DB_ERROR', '포인트 차감에 실패했습니다')

  // 채팅룸 생성
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data: room, error: roomErr } = await supabase
    .from('chat_rooms')
    .insert({
      initiator_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
      request_cost: POINTS.DM_REQUEST_COST,
      request_expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (roomErr) {
    // 롤백: 포인트 복구
    await supabase.from('profiles').update({ points: myProfile.points }).eq('id', user.id)
    return err('DB_ERROR', 'DM 요청에 실패했습니다')
  }

  // 포인트 트랜잭션 로그 (service_role만 insert 가능)
  await admin.from('point_transactions').insert({
    user_id: user.id,
    type: 'debit',
    amount: -POINTS.DM_REQUEST_COST,
    balance_after: newBalance,
    reference_type: 'chat_room',
    reference_id: room.id,
    policy_code: 'dm_request_cost',
    description: 'DM 요청',
  })

  // consent_event 기록
  await admin.from('consent_events').insert({
    room_id: room.id,
    actor_id: user.id,
    event_type: 'request_created',
    metadata: { request_cost: POINTS.DM_REQUEST_COST },
  })

  return { success: true, data: { room_id: room.id }, error: null }
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

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('id, initiator_id, receiver_id, status, request_cost')
    .eq('id', roomId)
    .single()

  if (!room) return err('NOT_FOUND', '요청을 찾을 수 없습니다')
  if (room.receiver_id !== user.id) return err('FORBIDDEN', '수신자만 거절할 수 있습니다')
  if (room.status !== 'pending') return err('INVALID_ROOM_STATE', '이미 처리된 요청입니다')

  const refundAmount = POINTS.DM_DECLINE_REFUND // 45P

  // Atomic 상태 전이: pending → declined
  // 이 update가 0 rows를 반환하면 이미 다른 처리(만료, 차단 등)가 선행된 것 → 환불 skip
  const { data: updated } = await admin
    .from('chat_rooms')
    .update({
      status: 'declined',
      refund_amount: refundAmount,
      refund_policy: 'decline_half_refund',
      declined_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('status', 'pending') // ← 환불 중복 방지 핵심 조건
    .select('id')

  if (!updated || updated.length === 0) {
    return err('REFUND_ALREADY_APPLIED', '이미 처리된 요청입니다')
  }

  // 실제 update가 일어난 경우에만 환불 처리
  const { data: initiatorProfile } = await admin
    .from('profiles')
    .select('points')
    .eq('id', room.initiator_id)
    .single()

  if (initiatorProfile) {
    const newBalance = initiatorProfile.points + refundAmount
    await admin.from('profiles').update({ points: newBalance }).eq('id', room.initiator_id)
    await admin.from('point_transactions').insert({
      user_id: room.initiator_id,
      type: 'refund',
      amount: refundAmount,
      balance_after: newBalance,
      reference_type: 'chat_room',
      reference_id: roomId,
      policy_code: 'dm_decline_refund_half',
      description: `DM 거절 환불 (${refundAmount}P)`,
    })
  }

  // consent_event 기록
  await admin.from('consent_events').insert({
    room_id: roomId,
    actor_id: user.id,
    event_type: 'agreement_declined',
    metadata: { refund_amount: refundAmount },
  })

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
