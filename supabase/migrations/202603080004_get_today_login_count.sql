-- 오늘 로그인한 사용자 수 (관리자 대시보드용)
-- auth.users.last_sign_in_at 기준, 서버에서만 호출
create or replace function public.get_today_login_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from auth.users
  where last_sign_in_at is not null
    and last_sign_in_at >= current_date
    and last_sign_in_at < current_date + interval '1 day';
$$;

comment on function public.get_today_login_count() is 'Admin dashboard: count of users who signed in today';
