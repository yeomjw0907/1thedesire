-- Posts
-- 기준 문서: supabase-sql-v0.1.md

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  is_auto_generated boolean not null default false,
  status text not null default 'published'
    check (status in ('draft', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_status_created_at on public.posts(status, created_at desc);

create trigger set_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();
