-- Profiles RLS Policies
-- 기준 문서: rls-policy-spec-v0.1.md

-- 공개 프로필 조회: 인증된 사용자는 active 계정의 프로필 조회 가능
create policy "profiles_select_public"
  on public.profiles
  for select
  to authenticated
  using (account_status = 'active' or auth.uid() = id);

-- 본인 프로필 생성: 가입 완료 시 한 번만 생성
-- 주의: 서버 액션(service_role)으로 처리하므로 일반 사용자 insert는 차단
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- 본인 프로필 수정
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
