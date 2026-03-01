-- Blocks
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_unique unique (blocker_id, blocked_id),
  constraint blocks_self_block check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocker_id on public.blocks(blocker_id);
create index if not exists idx_blocks_blocked_id on public.blocks(blocked_id);
