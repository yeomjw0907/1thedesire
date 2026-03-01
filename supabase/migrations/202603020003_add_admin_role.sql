-- profiles에 is_admin 컬럼 추가 (RBAC 전환 1단계)
-- 기존 ADMIN_EMAILS 환경변수 방식을 DB 기반으로 전환

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 관리자 확인용 인덱스
create index if not exists idx_profiles_is_admin
  on public.profiles(is_admin)
  where is_admin = true;
