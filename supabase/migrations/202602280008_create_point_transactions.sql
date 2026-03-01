-- Point transactions
-- 포인트 변화의 모든 이력 기록
-- 일반 사용자는 직접 생성 불가 (RLS에서 차단)
-- policy_code로 어떤 정책에 의한 거래인지 추적

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('signup_bonus', 'charge', 'debit', 'refund', 'manual_adjustment')),
  amount integer not null,
  balance_after integer not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  description text,
  policy_code text not null
    check (policy_code in (
      'signup_bonus_female',
      'dm_request_cost',
      'dm_decline_refund_half',
      'dm_expire_refund_full',
      'manual_adjustment',
      'charge'
    )),
  created_at timestamptz not null default now()
);

create index if not exists idx_point_transactions_user_id_created_at
  on public.point_transactions(user_id, created_at desc);
