-- notifications: 좋아요/DM 등 알림 테이블
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'like',
  actor_id uuid references public.profiles(id) on delete set null,
  actor_nickname text,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);

-- RLS 활성화
alter table public.notifications enable row level security;

-- 조회: 본인 알림만
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- 수정(read 표시): 본인만
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 삽입: 트리거(security definer)만 사용 — 실제 삽입은 함수에서
-- 인증 사용자는 직접 insert 불가
create policy "notifications_insert_system"
  on public.notifications
  for insert
  to authenticated
  with check (false);

-- post_likes INSERT 시 자동 알림 생성 함수
create or replace function public.create_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner_id uuid;
  v_actor_nickname text;
begin
  -- 게시글 작성자 조회
  select user_id into v_post_owner_id
  from public.posts
  where id = new.post_id;

  -- 자신의 글에 좋아요 누르면 알림 제외
  if v_post_owner_id is null or v_post_owner_id = new.user_id then
    return new;
  end if;

  -- 좋아요 누른 사람의 닉네임 조회
  select nickname into v_actor_nickname
  from public.profiles
  where id = new.user_id;

  -- 알림 삽입
  insert into public.notifications (user_id, type, actor_id, actor_nickname, post_id)
  values (v_post_owner_id, 'like', new.user_id, v_actor_nickname, new.post_id);

  return new;
end;
$$;

-- post_likes에 트리거 연결
create trigger on_post_liked
  after insert on public.post_likes
  for each row
  execute function public.create_like_notification();

-- Realtime 활성화 (notifications 테이블)
alter publication supabase_realtime add table public.notifications;
