/**
 * NicePay 입금 통보 웹훅 (가상계좌)
 * 가상계좌 입금 시 나이스페이가 POST. moid로 pending 건 조회 후 approve_charge_atomic 호출.
 * 응답: 200 OK, body "OK" (문서 명시)
 *
 * GET: 일부 결제사가 URL 검증 시 GET 호출 → 200 반환해 등록 성공 처리
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OK = () => new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })

/** URL 검증용 (등록 시 200 응답 필요) */
export async function GET() {
  return OK()
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      body = (await req.json()) as Record<string, unknown>
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      body = Object.fromEntries(
        Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? v.name : v])
      ) as Record<string, unknown>
    } else {
      const text = await req.text()
      body = Object.fromEntries(
        new URLSearchParams(text).entries()
      ) as unknown as Record<string, unknown>
    }
  } catch {
    return OK()
  }

  const moid = (body.moid ?? body.MOID ?? body.Moid ?? body.orderId) as string | undefined
  if (!moid || typeof moid !== 'string') {
    return OK()
  }

  const admin = createAdminClient()
  const { data: row, error: fetchErr } = await admin
    .from('point_transactions')
    .select('id, user_id')
    .eq('payment_moid', moid)
    .eq('payment_provider', 'nicepay_va')
    .eq('type', 'charge')
    .eq('charge_status', 'pending')
    .single()

  if (fetchErr || !row) {
    return OK()
  }

  const { error: rpcErr } = await admin.rpc('approve_charge_atomic', {
    p_transaction_id: row.id,
    p_actor_id: row.user_id,
  })

  if (rpcErr) {
    console.error('[nicepay/webhook] approve_charge_atomic:', rpcErr)
  }

  return OK()
}
