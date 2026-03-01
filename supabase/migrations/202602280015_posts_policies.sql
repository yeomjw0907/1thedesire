-- Posts RLS Policies
-- 기준 문서: rls-policy-spec-v0.1.md

-- published 게시글 조회: 인증된 사용자 모두 가능
create policy "posts_select_published"
  on public.posts
  for select
  to authenticated
  using (status = 'published' or user_id = auth.uid());

-- 게시글 생성: 인증된 사용자 (자동 소개글 포함)
create policy "posts_insert_own"
  on public.posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- 게시글 수정/삭제: 작성자 본인만
create policy "posts_update_own"
  on public.posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "posts_delete_own"
  on public.posts
  for delete
  to authenticated
  using (user_id = auth.uid());
