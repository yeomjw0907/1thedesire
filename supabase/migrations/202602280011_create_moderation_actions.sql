-- Moderation actions
-- action_type: warn / restrict / suspend / ban / hide_post (rls-policy-spec 기준)
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null
    check (action_type in ('warn', 'restrict', 'suspend', 'ban', 'hide_post')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_actions_target_user_id_created_at
  on public.moderation_actions(target_user_id, created_at desc);
