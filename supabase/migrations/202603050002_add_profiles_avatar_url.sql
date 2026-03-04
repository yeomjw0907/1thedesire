-- 프로필 대표 이미지 (아바타) URL. 앱에서 사용 중이므로 스키마에 명시.
alter table public.profiles
  add column if not exists avatar_url text;
