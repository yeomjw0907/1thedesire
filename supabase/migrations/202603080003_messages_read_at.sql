-- 읽음 표시: 수신자가 채팅방에서 확인한 시각
alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists idx_messages_read_at on public.messages(room_id, read_at) where read_at is not null;
