-- Consent events
-- 합의 흐름 기록: 요청, 조회, 수락, 거절, 만료, 차단

create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'request_created',
      'request_viewed',
      'agreement_accepted',
      'agreement_declined',
      'request_expired',
      'blocked'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_consent_events_room_id on public.consent_events(room_id);
create index if not exists idx_consent_events_actor_id on public.consent_events(actor_id);
