-- Messages
-- agreed 상태의 채팅방에서만 실제 전송 가능 (RLS + 서버 액션에서 제어)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text'
    check (message_type in ('text', 'system')),
  message_status text not null default 'active'
    check (message_status in ('active', 'deleted', 'flagged')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_messages_room_id_created_at on public.messages(room_id, created_at asc);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
