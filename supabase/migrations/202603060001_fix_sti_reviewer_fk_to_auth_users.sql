-- Fix: reviewer_id, actor_id FK를 profiles → auth.users로 변경
-- 어드민 계정이 profiles 테이블에 없는 경우 발생하는 FK 위반 해결

-- sti_check_submissions.reviewer_id
alter table public.sti_check_submissions
  drop constraint if exists sti_check_submissions_reviewer_id_fkey;

alter table public.sti_check_submissions
  add constraint sti_check_submissions_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null;

-- sti_check_audit_logs.actor_id
alter table public.sti_check_audit_logs
  drop constraint if exists sti_check_audit_logs_actor_id_fkey;

alter table public.sti_check_audit_logs
  add constraint sti_check_audit_logs_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;
