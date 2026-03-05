/**
 * NicePay 결제창 return URL (카드 Server 승인)
 * 결제창 인증 후 나이스페이가 이 URL로 POST (application/x-www-form-urlencoded).
 * authResultCode=0000 검증 → 금액 검증 → 승인 API 호출 → approve_charge_atomic → redirect
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { approvePayment } from '@/lib/nicepay/client'

const POINTS_PATH = '/points'

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    const formData = await req.formData()
    body = Object.fromEntries(
      Array.from(formData.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : (v as File).name ?? ''])
    ) as Record<string, string>
  } catch {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=invalid_body`, req.url))
  }

  const authResultCode = body.authResultCode
  const tid = body.tid
  const orderId = body.orderId
  const amountStr = body.amount

  if (authResultCode !== '0000') {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=auth_failed`, req.url))
  }
  if (!tid || !orderId || !amountStr) {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=missing_params`, req.url))
  }

  const amount = Number(amountStr)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=invalid_amount`, req.url))
  }

  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from('point_transactions')
    .select('id, user_id, amount_krw, charge_status')
    .eq('payment_moid', orderId)
    .eq('payment_provider', 'nicepay_card')
    .eq('type', 'charge')
    .eq('charge_status', 'pending')
    .single()

  if (fetchErr || !row) {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=not_found`, req.url))
  }
  if (row.amount_krw != null && row.amount_krw !== amount) {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=amount_mismatch`, req.url))
  }

  const approveResult = await approvePayment(tid, amount)
  if (!approveResult.success) {
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=approve_failed`, req.url))
  }

  const { error: rpcErr } = await admin.rpc('approve_charge_atomic', {
    p_transaction_id: row.id,
    p_actor_id: row.user_id,
  })

  if (rpcErr) {
    console.error('[nicepay/return] approve_charge_atomic:', rpcErr)
    return NextResponse.redirect(new URL(`${POINTS_PATH}?error=db_failed`, req.url))
  }

  return NextResponse.redirect(new URL(`${POINTS_PATH}?success=1`, req.url))
}
