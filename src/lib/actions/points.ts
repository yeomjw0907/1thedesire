'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'

/** 충전 요청 생성 (입금 완료 클릭 시). Admin client로 insert. */
export async function createChargeRequest(
  depositorName: string,
  points: number,
  amountKrw: number
): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single()
  const currentPoints = profile?.points ?? 0

  const admin = createAdminClient()
  const { error: insertErr } = await admin.from('point_transactions').insert({
    user_id: user.id,
    type: 'charge',
    amount: points,
    balance_after: currentPoints,
    policy_code: 'charge',
    depositor_name: depositorName.trim() || null,
    charge_status: 'pending',
    amount_krw: amountKrw > 0 ? amountKrw : null,
    description: `${points}P 충전 (입금 대기)`,
  })

  if (insertErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '충전 요청 등록에 실패했습니다' } }
  }

  // 선택: payment_events 로그 (예외 처리·감사)
  await admin.from('payment_events').insert({
    user_id: user.id,
    provider: 'bank_transfer',
    status: 'pending',
    amount: amountKrw,
    raw_payload: { points, depositor_name: depositorName },
  }).then(() => {}, () => {})

  return { success: true, data: null, error: null }
}

/** 관리자: 충전 승인. pending인 경우에만 처리(중복 방지). */
export async function approveCharge(transactionId: string): Promise<ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  const isAdmin = profile?.is_admin === true || adminEmails.includes(user.email ?? '')
  if (!isAdmin) {
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }
  }

  const { data: row, error: fetchErr } = await admin
    .from('point_transactions')
    .select('id, user_id, amount, charge_status')
    .eq('id', transactionId)
    .eq('type', 'charge')
    .single()

  if (fetchErr || !row) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '해당 충전 요청을 찾을 수 없습니다' } }
  }

  if (row.charge_status !== 'pending') {
    return { success: false, data: null, error: { code: 'ALREADY_PROCESSED', message: '이미 처리된 요청입니다' } }
  }

  const { data: targetProfile } = await admin.from('profiles').select('points').eq('id', row.user_id).single()
  const newBalance = (targetProfile?.points ?? 0) + row.amount

  const { error: updateTxErr } = await admin
    .from('point_transactions')
    .update({ charge_status: 'completed', balance_after: newBalance })
    .eq('id', transactionId)
    .eq('charge_status', 'pending')

  if (updateTxErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '충전 처리에 실패했습니다' } }
  }

  const { error: updateProfileErr } = await admin
    .from('profiles')
    .update({ points: newBalance })
    .eq('id', row.user_id)

  if (updateProfileErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '포인트 반영에 실패했습니다' } }
  }

  await admin.from('notifications').insert({
    user_id: row.user_id,
    type: 'charge_completed',
    message: '정상적으로 충전되었습니다.',
  }).then(() => {}, () => {})

  return { success: true, data: null, error: null }
}

/** 관리자: 충전 거절. 반려 사유 필수(공백 불가). */
export async function rejectCharge(transactionId: string, reason: string): Promise<ApiResponse> {
  const trimmed = reason?.trim() ?? ''
  if (!trimmed) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '반려 사유를 입력해주세요' } }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  const isAdmin = profile?.is_admin === true || adminEmails.includes(user.email ?? '')
  if (!isAdmin) {
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }
  }

  const { data: row, error: fetchErr } = await admin
    .from('point_transactions')
    .select('id, user_id, charge_status')
    .eq('id', transactionId)
    .eq('type', 'charge')
    .single()

  if (fetchErr || !row) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '해당 충전 요청을 찾을 수 없습니다' } }
  }

  if (row.charge_status !== 'pending') {
    return { success: false, data: null, error: { code: 'ALREADY_PROCESSED', message: '이미 처리된 요청입니다' } }
  }

  const { error: updateErr } = await admin
    .from('point_transactions')
    .update({ charge_status: 'rejected', rejection_reason: trimmed })
    .eq('id', transactionId)
    .eq('charge_status', 'pending')

  if (updateErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '거절 처리에 실패했습니다' } }
  }

  const message = `반려되었습니다. (${trimmed})`
  await admin.from('notifications').insert({
    user_id: row.user_id,
    type: 'charge_rejected',
    message,
  }).then(() => {}, () => {})

  return { success: true, data: null, error: null }
}
