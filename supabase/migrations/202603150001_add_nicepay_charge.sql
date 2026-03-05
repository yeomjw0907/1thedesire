-- NicePay 연동: 주문번호(moid) 및 결제 수단 구분
-- 카드: payment_moid = orderId, payment_provider = 'nicepay_card'
-- 가상계좌: payment_moid = moid, payment_provider = 'nicepay_va'
-- 기존 계좌이체: payment_provider null 또는 'bank_transfer'

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS payment_moid text,
  ADD COLUMN IF NOT EXISTS payment_provider text;

-- 선택: 검색용 인덱스 (웹훅/return에서 moid로 조회)
CREATE INDEX IF NOT EXISTS idx_point_transactions_payment_moid_pending
  ON public.point_transactions(payment_moid)
  WHERE type = 'charge' AND charge_status = 'pending' AND payment_moid IS NOT NULL;
