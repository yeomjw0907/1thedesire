/**
 * STI 배지 만료 cron job
 * 기준 문서: sti-verification-feature-spec-v0.1.md
 *
 * 호출: POST /api/cron/expire-sti-badges
 * 보호: Authorization: Bearer {CRON_SECRET}
 *
 * 동작:
 *   1. verification_status='verified' && expires_at <= now() 인 배지 조회
 *   2. 상태를 'expired'로 일괄 업데이트, is_public = false
 *   3. 감사 로그 기록
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 만료 대상 배지 조회
  const { data: expiredBadges, error: fetchErr } = await admin
    .from('sti_check_badges')
    .select('user_id, expires_at')
    .eq('verification_status', 'verified')
    .lte('expires_at', now)

  if (fetchErr) {
    console.error('[expire-sti-badges] fetch error:', fetchErr)
    return NextResponse.json({ error: 'DB fetch error' }, { status: 500 })
  }

  if (!expiredBadges || expiredBadges.length === 0) {
    return NextResponse.json({ expired: 0 })
  }

  let expiredCount = 0

  for (const badge of expiredBadges) {
    // 상태 전이: verified -> expired (이미 다른 상태로 변경된 경우 0 rows)
    const { data: updated } = await admin
      .from('sti_check_badges')
      .update({
        verification_status: 'expired',
        is_public: false,
        updated_at: now,
      })
      .eq('user_id', badge.user_id)
      .eq('verification_status', 'verified')
      .select('user_id')

    if (!updated || updated.length === 0) continue

    expiredCount++

    // 감사 로그
    await admin.from('sti_check_audit_logs').insert({
      user_id: badge.user_id,
      actor_id: badge.user_id,
      action_type: 'badge_expired',
      metadata: { expires_at: badge.expires_at, processed_at: now },
    })
  }

  console.log(`[expire-sti-badges] expired=${expiredCount}`)
  return NextResponse.json({ expired: expiredCount })
}
