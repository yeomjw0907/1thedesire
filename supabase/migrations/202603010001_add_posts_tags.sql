-- posts.tags: 글(분위기) 단위 태그 (FWB, 감성 연애 등). 구분자 " · "
alter table public.posts
  add column if not exists tags text;

comment on column public.posts.tags is 'Optional post-level tags, e.g. "FWB · 감성 연애", separated by " · "';
