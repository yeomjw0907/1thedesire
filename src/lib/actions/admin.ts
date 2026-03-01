'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse, AccountStatus } from '@/types'

async function checkAdmin(): Promise<{ userId: string } | ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  if (!adminEmails.includes(user.email ?? '')) {
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }
  }
  return { userId: user.id }
}

function isApiResponse(v: unknown): v is ApiResponse {
  return typeof v === 'object' && v !== null && 'success' in v
}

// ──────────────────────────────────────────────────────────────
// 1. 계정 상태 변경
// ──────────────────────────────────────────────────────────────
export async function updateAccountStatus(
  targetUserId: string,
  status: AccountStatus
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ account_status: status })
    .eq('id', targetUserId)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '상태 변경에 실패했습니다' } }
  }

  // 모더레이션 로그
  await admin.from('moderation_actions').insert({
    actor_id: check.userId,
    target_user_id: targetUserId,
    action_type: `account_${status}`,
    reason: `계정 상태 변경: ${status}`,
  })

  return { success: true, data: null, error: null }
}

// ──────────────────────────────────────────────────────────────
// 2. 게시글 숨김 / 복구
// ──────────────────────────────────────────────────────────────
export async function setPostStatus(
  postId: string,
  status: 'hidden' | 'published'
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  const admin = createAdminClient()
  const { error } = await admin
    .from('posts')
    .update({ status })
    .eq('id', postId)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '게시글 상태 변경에 실패했습니다' } }
  }

  return { success: true, data: null, error: null }
}

// ──────────────────────────────────────────────────────────────
// 3. 수동 포인트 조정
// ──────────────────────────────────────────────────────────────
export async function adjustPoints(
  targetUserId: string,
  amount: number,
  reason: string
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  if (!amount || !reason.trim()) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '금액과 사유를 입력해주세요' } }
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('points')
    .eq('id', targetUserId)
    .single()

  if (!profile) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } }
  }

  const newBalance = profile.points + amount
  if (newBalance < 0) {
    return { success: false, data: null, error: { code: 'INSUFFICIENT_POINTS', message: '포인트가 0 미만이 됩니다' } }
  }

  await admin.from('profiles').update({ points: newBalance }).eq('id', targetUserId)
  await admin.from('point_transactions').insert({
    user_id: targetUserId,
    type: 'manual_adjustment',
    amount,
    balance_after: newBalance,
    policy_code: 'manual_adjustment',
    description: `[관리자] ${reason}`,
  })

  return { success: true, data: null, error: null }
}

// ──────────────────────────────────────────────────────────────
// 4. 신고 상태 업데이트
// ──────────────────────────────────────────────────────────────
export async function updateReportStatus(
  reportId: string,
  status: 'reviewed' | 'dismissed'
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  const admin = createAdminClient()
  const { error } = await admin
    .from('reports')
    .update({ status })
    .eq('id', reportId)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '신고 상태 변경에 실패했습니다' } }
  }

  return { success: true, data: null, error: null }
}
