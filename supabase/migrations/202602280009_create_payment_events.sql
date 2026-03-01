-- Payment events
-- 외부 결제/입금 이벤트 원본 로그

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  status text not null,
  amount integer not null check (amount >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_events_user_id_created_at
  on public.payment_events(user_id, created_at desc);
