-- post_likes: 좋아요 테이블
-- 한 사용자가 한 글에 한 번만 좋아요 가능

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_post_likes_post_id on public.post_likes(post_id);
create index if not exists idx_post_likes_user_id on public.post_likes(user_id);

-- posts에 like_count 캐시 컬럼 추가 (카운트 SELECT 비용 절감)
alter table public.posts
  add column if not exists like_count bigint not null default 0;

-- RLS 활성화
alter table public.post_likes enable row level security;

-- 좋아요 조회: 인증된 사용자 모두
create policy "post_likes_select"
  on public.post_likes
  for select
  to authenticated
  using (true);

-- 좋아요 추가: 본인만
create policy "post_likes_insert_own"
  on public.post_likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- 좋아요 취소: 본인만
create policy "post_likes_delete_own"
  on public.post_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- like_count 증가/감소 RPC
create or replace function public.toggle_post_like(p_post_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_liked boolean;
begin
  -- 이미 좋아요 했는지 확인
  select exists(
    select 1 from public.post_likes
    where post_id = p_post_id and user_id = p_user_id
  ) into v_liked;

  if v_liked then
    -- 좋아요 취소
    delete from public.post_likes
    where post_id = p_post_id and user_id = p_user_id;

    update public.posts
    set like_count = greatest(like_count - 1, 0)
    where id = p_post_id;

    return jsonb_build_object('liked', false);
  else
    -- 좋아요 추가
    insert into public.post_likes(post_id, user_id)
    values (p_post_id, p_user_id);

    update public.posts
    set like_count = like_count + 1
    where id = p_post_id;

    return jsonb_build_object('liked', true);
  end if;
end;
$$;
