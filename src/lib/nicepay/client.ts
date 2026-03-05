/**
 * NicePay API client (Server 승인, Basic 인증)
 * - 결제(승인) API: POST /v1/payments/{tid}
 * - 가상계좌 발급: 문서 기준 엔드포인트 (한국 나이스페이 매뉴얼 확인)
 */

const DEFAULT_SANDBOX = 'https://sandbox-api.nicepay.co.kr'
const DEFAULT_LIVE = 'https://api.nicepay.co.kr'

function getBaseUrl(): string {
  const url = process.env.NICEPAY_API_BASE_URL
  if (url) return url.replace(/\/$/, '')
  return process.env.NODE_ENV === 'production' ? DEFAULT_LIVE : DEFAULT_SANDBOX
}

function getBasicAuth(): string {
  const clientKey = process.env.NICEPAY_CLIENT_KEY
  const secretKey = process.env.NICEPAY_SECRET_KEY
  if (!clientKey || !secretKey) {
    throw new Error('NICEPAY_CLIENT_KEY and NICEPAY_SECRET_KEY are required')
  }
  const credentials = `${clientKey}:${secretKey}`
  return Buffer.from(credentials, 'utf8').toString('base64')
}

export interface ApprovePaymentResult {
  resultCode: string
  resultMsg: string
  status: string
  tid: string
  orderId: string
  amount: number
}

/**
 * 결제(승인) API - 카드 인증 후 최종 승인
 * POST /v1/payments/{tid}, body: { amount }
 */
export async function approvePayment(
  tid: string,
  amount: number
): Promise<{ success: boolean; data?: ApprovePaymentResult; error?: string }> {
  const baseUrl = getBaseUrl()
  const auth = getBasicAuth()
  const res = await fetch(`${baseUrl}/v1/payments/${tid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ amount }),
  })
  const data = (await res.json()) as ApprovePaymentResult & { resultCode?: string; resultMsg?: string }
  const resultCode = data.resultCode ?? (data as unknown as { resultCode?: string }).resultCode
  const status = data.status
  if (res.ok && resultCode === '0000' && status === 'paid') {
    return { success: true, data: data as ApprovePaymentResult }
  }
  return {
    success: false,
    error: (data as { resultMsg?: string }).resultMsg ?? data.resultMsg ?? `승인 실패 (${res.status})`,
  }
}

export interface VirtualAccountResult {
  vAcctNo: string
  vAcctBank: string
  vAcctNm: string
  expiry: string
}

export interface RequestVirtualAccountParams {
  orderId: string
  amount: number
  goodsName: string
  notiUrl: string
  buyerName?: string
  buyerTel?: string
  buyerEmail?: string
  validHours?: number
}

/**
 * 가상계좌 발급 요청
 * 한국 나이스페이: REST API 명세는 개발자 매뉴얼 확인.
 * 일부 환경은 webapi.nicepay.co.kr/webapi/get_vacount.jsp (form) 사용.
 */
export async function requestVirtualAccount(
  params: RequestVirtualAccountParams
): Promise<{ success: boolean; data?: VirtualAccountResult; error?: string }> {
  const baseUrl = getBaseUrl()
  const auth = getBasicAuth()

  // REST 스타일 시도 (일부 나이스페이 환경)
  const body = {
    orderId: params.orderId,
    amount: params.amount,
    goodsName: params.goodsName,
    notiUrl: params.notiUrl,
    buyerName: params.buyerName ?? '',
    buyerTel: params.buyerTel ?? '',
    buyerEmail: params.buyerEmail ?? '',
    validHours: params.validHours ?? 72,
  }

  const res = await fetch(`${baseUrl}/v1/virtual-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  })

  const raw = (await res.json()) as Record<string, unknown>
  const resultCode = String(raw.resultCode ?? raw.ResultCode ?? '')
  const success = res.ok && (resultCode === '0000' || resultCode === '4100')

  if (success) {
    const vAcctNo = String(raw.vAcctNo ?? raw.VbankNum ?? '')
    const vAcctBank = String(raw.vAcctBank ?? raw.VbankBankName ?? '')
    const vAcctNm = String(raw.vAcctNm ?? raw.VbankInputName ?? '')
    const expiry = String(raw.expiry ?? raw.VbankExpDate ?? '')
    if (vAcctNo) {
      return {
        success: true,
        data: { vAcctNo, vAcctBank, vAcctNm, expiry },
      }
    }
  }

  return {
    success: false,
    error: String(raw.resultMsg ?? raw.ResultMsg ?? raw.message ?? `가상계좌 발급 실패 (${res.status})`),
  }
}
