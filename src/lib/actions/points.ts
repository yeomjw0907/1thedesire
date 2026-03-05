'use server'

import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requestVirtualAccount } from '@/lib/nicepay/client'
import type { ApiResponse } from '@/types'

/** NicePay 카드 결제: 대기 건 생성. orderId 반환 후 결제창 requestPay 호출용. */
export async function createPendingNicePayCardCharge(
  points: number,
  amountKrw: number
): Promise<ApiResponse<{ orderId: string; transactionId: string }>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single()
  const currentPoints = profile?.points ?? 0
  const orderId = randomUUID()

  const admin = createAdminClient()
  const { data: row, error: insertErr } = await admin
    .from('point_transactions')
    .insert({
      user_id: user.id,
      type: 'charge',
      amount: points,
      balance_after: currentPoints,
      policy_code: 'charge',
      charge_status: 'pending',
      amount_krw: amountKrw > 0 ? amountKrw : null,
      payment_provider: 'nicepay_card',
      payment_moid: orderId,
      description: `${points}P 충전 (카드 결제 대기)`,
    })
    .select('id')
    .single()

  if (insertErr || !row) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '충전 요청 등록에 실패했습니다' } }
  }

  return {
    success: true,
    data: { orderId, transactionId: row.id },
    error: null,
  }
}

/** NicePay 가상계좌: 발급 요청 후 VA 정보 반환. 입금 시 웹훅으로 approve_charge_atomic 호출됨. */
export async function createNicePayChargeRequest(
  points: number,
  amountKrw: number
): Promise<ApiResponse<{ transactionId: string; vAcctNo: string; vAcctBank: string; vAcctNm: string; expiry: string }>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  const { data: profile } = await supabase.from('profiles').select('points').eq('id', user.id).single()
  const currentPoints = profile?.points ?? 0
  const moid = randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1thedesire.com'
  const notiUrl = `${baseUrl.replace(/\/$/, '')}/api/payment/nicepay/webhook`

  const admin = createAdminClient()
  const { data: row, error: insertErr } = await admin
    .from('point_transactions')
    .insert({
      user_id: user.id,
      type: 'charge',
      amount: points,
      balance_after: currentPoints,
      policy_code: 'charge',
      charge_status: 'pending',
      amount_krw: amountKrw > 0 ? amountKrw : null,
      payment_provider: 'nicepay_va',
      payment_moid: moid,
      description: `${points}P 충전 (가상계좌 입금 대기)`,
    })
    .select('id')
    .single()

  if (insertErr || !row) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '충전 요청 등록에 실패했습니다' } }
  }

  const vaResult = await requestVirtualAccount({
    orderId: moid,
    amount: amountKrw,
    goodsName: `${points}P 포인트 충전`,
    notiUrl,
    validHours: 72,
  })

  if (!vaResult.success || !vaResult.data) {
    return {
      success: false,
      data: null,
      error: { code: 'UPLOAD_FAILED', message: vaResult.error ?? '가상계좌 발급에 실패했습니다.' },
    }
  }

  return {
    success: true,
    data: {
      transactionId: row.id,
      vAcctNo: vaResult.data.vAcctNo,
      vAcctBank: vaResult.data.vAcctBank,
      vAcctNm: vaResult.data.vAcctNm,
      expiry: vaResult.data.expiry,
    },
    error: null,
  }
}

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
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter((e) => e.length > 0)
  const isAdmin = profile?.is_admin === true || (user.email ? adminEmails.includes(user.email) : false)
  if (!isAdmin) {
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }
  }

  // approve_charge_atomic RPC: FOR UPDATE 락으로 포인트 차감과의 레이스 컨디션 방지
  // (notification도 내부에서 best-effort 처리)
  const { error: rpcErr } = await admin.rpc('approve_charge_atomic', {
    p_transaction_id: transactionId,
    p_actor_id: user.id,
  })

  if (rpcErr) {
    const msg = rpcErr.message ?? ''
    if (msg.includes('ALREADY_PROCESSED')) return { success: false, data: null, error: { code: 'ALREADY_PROCESSED', message: '이미 처리된 요청입니다' } }
    if (msg.includes('NOT_FOUND')) return { success: false, data: null, error: { code: 'NOT_FOUND', message: '해당 충전 요청을 찾을 수 없습니다' } }
    if (msg.includes('USER_NOT_FOUND')) return { success: false, data: null, error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다' } }
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '충전 처리에 실패했습니다' } }
  }

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
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter((e) => e.length > 0)
  const isAdmin = profile?.is_admin === true || (user.email ? adminEmails.includes(user.email) : false)
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
