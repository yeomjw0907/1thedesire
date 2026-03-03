-- point_transactions: 입금자명, 충전 상태, 거절 사유, 입금 금액(원)
ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS depositor_name text,
  ADD COLUMN IF NOT EXISTS charge_status text
    CHECK (charge_status IS NULL OR charge_status IN ('pending', 'completed', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS amount_krw integer;

-- 기존 charge 건은 완료로 간주
UPDATE public.point_transactions
SET charge_status = 'completed'
WHERE type = 'charge' AND (charge_status IS NULL OR charge_status = '');

-- notifications: 알림 본문(충전 완료/거절 메시지)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message text;
