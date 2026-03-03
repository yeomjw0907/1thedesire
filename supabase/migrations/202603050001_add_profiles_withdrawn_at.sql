-- 탈퇴 시각 로그 (B안: Auth 삭제 + 프로필 익명화 시 사용)
alter table public.profiles
  add column if not exists withdrawn_at timestamptz;

-- 탈퇴 시 익명화를 위해 nullable 허용 (nickname, bio, role)
alter table public.profiles alter column nickname drop not null;
alter table public.profiles alter column bio drop not null;
alter table public.profiles alter column role drop not null;
