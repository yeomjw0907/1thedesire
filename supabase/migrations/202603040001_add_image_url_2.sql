-- posts에 두 번째 이미지 URL 컬럼 추가
alter table public.posts
  add column if not exists image_url_2 text;
