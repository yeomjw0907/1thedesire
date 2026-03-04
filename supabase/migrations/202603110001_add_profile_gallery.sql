-- 프로필 갤러리: 최대 5장, 1~5번 슬롯 순서대로 채움
alter table public.profiles
  add column if not exists gallery_url_1 text,
  add column if not exists gallery_url_2 text,
  add column if not exists gallery_url_3 text,
  add column if not exists gallery_url_4 text,
  add column if not exists gallery_url_5 text;
