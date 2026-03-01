-- public_sti_badges 뷰의 보안 속성 수정
-- SECURITY DEFINER → SECURITY INVOKER
-- 뷰를 조회하는 사용자의 RLS 정책을 따르도록 변경
create or replace view public.public_sti_badges
  with (security_invoker = on)
as
select
  user_id,
  test_date,
  expires_at,
  verified_at
from public.sti_check_badges
where verification_status = 'verified'
  and is_public = true
  and expires_at is not null
  and expires_at > now();
