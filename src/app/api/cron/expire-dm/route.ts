/**
 * DM 만료 cron job
 * 기준 문서: cron-jobs-spec-v0.1.md, state-based-functional-spec-v0.1.md
 *
 * 호출: POST /api/cron/expire-dm
 * 보호: Authorization: Bearer {CRON_SECRET}
 *
 * 동작:
 *   1. status='pending' && request_expires_at < now() 인 room 일괄 처리
 *   2. 각 room에 대해 atomic update (status→expired)
 *      - 0 rows 영향 시 이미 처리됨 → skip (환불 중복 방지)
 *   3. 실제 update된 room만 90P 전액 환불
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POINTS } from '@/types'

export async function POST(req: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 만료 대상 room 조회
  const { data: expiredRooms, error: fetchErr } = await admin
    .from('chat_rooms')
    .select('id, initiator_id, request_cost')
    .eq('status', 'pending')
    .lt('request_expires_at', now)

  if (fetchErr) {
    console.error('[expire-dm] fetch error:', fetchErr)
    return NextResponse.json({ error: 'DB fetch error' }, { status: 500 })
  }

  if (!expiredRooms || expiredRooms.length === 0) {
    return NextResponse.json({ processed: 0, refunded: 0 })
  }

  let processedCount = 0
  let refundedCount = 0

  for (const room of expiredRooms) {
    // Atomic 상태 전이: pending → expired
    // .eq('status', 'pending') 조건 → 이미 다른 처리(거절, 차단 등)된 room은 0 rows 반환 → skip
    const { data: updated } = await admin
      .from('chat_rooms')
      .update({
        status: 'expired',
        refund_amount: POINTS.DM_EXPIRE_REFUND,
        refund_policy: 'expire_full_refund',
        expired_at: now,
      })
      .eq('id', room.id)
      .eq('status', 'pending')
      .select('id')

    if (!updated || updated.length === 0) {
      // 이미 처리됨 → skip
      continue
    }

    processedCount++

    // 환불 처리
    const { data: initiatorProfile } = await admin
      .from('profiles')
      .select('points')
      .eq('id', room.initiator_id)
      .single()

    if (!initiatorProfile) continue

    const refundAmount = POINTS.DM_EXPIRE_REFUND
    const newBalance = initiatorProfile.points + refundAmount

    await admin
      .from('profiles')
      .update({ points: newBalance })
      .eq('id', room.initiator_id)

    await admin.from('point_transactions').insert({
      user_id: room.initiator_id,
      type: 'refund',
      amount: refundAmount,
      balance_after: newBalance,
      reference_type: 'chat_room',
      reference_id: room.id,
      policy_code: 'dm_expire_refund_full',
      description: `DM 만료 환불 (${refundAmount}P)`,
    })

    await admin.from('consent_events').insert({
      room_id: room.id,
      actor_id: room.initiator_id,
      event_type: 'request_expired',
      metadata: { refund_amount: refundAmount },
    })

    refundedCount++
  }

  console.log(`[expire-dm] processed=${processedCount}, refunded=${refundedCount}`)
  return NextResponse.json({ processed: processedCount, refunded: refundedCount })
}
