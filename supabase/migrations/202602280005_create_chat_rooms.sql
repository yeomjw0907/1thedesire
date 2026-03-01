-- Chat rooms
-- DM 요청 상태머신 중심 테이블
-- status: pending / agreed / declined / expired / blocked / closed
-- refund_policy: decline_half_refund / expire_full_refund / blocked_no_refund

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'agreed', 'declined', 'expired', 'blocked', 'closed')),
  request_cost integer not null default 90 check (request_cost >= 0),
  refund_amount integer not null default 0 check (refund_amount >= 0),
  refund_policy text not null default 'decline_half_refund'
    check (refund_policy in ('decline_half_refund', 'expire_full_refund', 'blocked_no_refund')),
  agreed_at timestamptz,
  declined_at timestamptz,
  expired_at timestamptz,
  blocked_at timestamptz,
  request_expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_rooms_not_self check (initiator_id <> receiver_id)
);

create index if not exists idx_chat_rooms_initiator_id on public.chat_rooms(initiator_id);
create index if not exists idx_chat_rooms_receiver_id on public.chat_rooms(receiver_id);
create index if not exists idx_chat_rooms_status_created_at on public.chat_rooms(status, created_at desc);
-- 만료 배치 처리에서 pending + expires_at 조회에 사용
create index if not exists idx_chat_rooms_pending_expires on public.chat_rooms(request_expires_at)
  where status = 'pending';

create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row
execute function public.set_updated_at();
